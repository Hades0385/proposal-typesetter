#!/usr/bin/env node
/**
 * Model Context Protocol (MCP) Server for Proposal Typesetter
 * 本地端獨立 MCP 伺服器 (Node.js)
 *
 * 遵循規格書 第 7 章 MCP 介面規格
 * 支援 stdio JSON-RPC 2.0 通訊協定，可無縫串接 Claude Desktop, Cursor, Antigravity 等 AI 客戶端
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

import { normalizeText } from './core/normalize.js';
import { countWords, validateProject, reviewAsJudge } from './core/validator.js';
import { SECTIONS_META, OVERVIEW_GUIDE, PROMPTS_DEF, EVALUATION_DIMENSIONS } from './core/guides.js';
import { createDefaultProject } from './core/sample-data.js';
import { parseMarkdownToIR } from './core/md-parser.js';
import { irToHtml } from './core/ir-to-html.js';
import { buildDocxDocument } from './core/docx-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project storage directory
const DATA_DIR = path.join(__dirname, 'data', 'projects');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure default project exists on startup
const DEFAULT_PROJECT_FILE = path.join(DATA_DIR, 'default.json');
if (!fs.existsSync(DEFAULT_PROJECT_FILE)) {
  const initProj = createDefaultProject();
  initProj.id = 'default';
  fs.writeFileSync(DEFAULT_PROJECT_FILE, JSON.stringify(initProj, null, 2), 'utf8');
}

// Helper: load project
function loadProject(projectId) {
  const safeId = (projectId || 'default').replace(/[^a-zA-Z0-9_\-]/g, '');
  const filePath = path.join(DATA_DIR, `${safeId}.json`);
  if (!fs.existsSync(filePath)) {
    // If not found, fall back to default if requesting default
    if (safeId === 'default') {
      const p = createDefaultProject();
      p.id = 'default';
      fs.writeFileSync(filePath, JSON.stringify(p, null, 2), 'utf8');
      return p;
    }
    throw new Error(`找不到專案代號: ${projectId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Helper: save project with version snapshot
function saveProject(project, source = 'ai') {
  if (!project.id) project.id = `proj_${Date.now()}`;
  const safeId = project.id.replace(/[^a-zA-Z0-9_\-]/g, '');
  const filePath = path.join(DATA_DIR, `${safeId}.json`);

  if (!project.meta) project.meta = {};
  project.meta.updatedAt = new Date().toISOString();
  project.meta.version = (project.meta.version || 0) + 1;

  // Snapshot directory
  const snapshotDir = path.join(DATA_DIR, '.snapshots', safeId);
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const snapName = `v${project.meta.version}_${Date.now()}_${source}.json`;
  fs.writeFileSync(path.join(snapshotDir, snapName), JSON.stringify(project, null, 2), 'utf8');

  // Keep last 20 snapshots
  try {
    const snaps = fs.readdirSync(snapshotDir).sort();
    while (snaps.length > 20) {
      const oldest = snaps.shift();
      fs.unlinkSync(path.join(snapshotDir, oldest));
    }
  } catch (e) {
    // ignore
  }

  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf8');
  return project;
}

// ---------------------------------------------------------------------------
// Tool Implementations (Section 7.3)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'get_writing_guide',
    description: '取得專案計畫書各章節撰寫指南（目的、必含要素、禁忌、建議字數、評審提問、範例結構）',
    inputSchema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          description: '章節代號（summary | motivation | competitor | analysis | architecture | schedule | references，若省略則回傳全部）',
          enum: ['summary', 'motivation', 'competitor', 'analysis', 'architecture', 'schedule', 'references']
        }
      }
    }
  },
  {
    name: 'list_projects',
    description: '列出本機所有專案計畫書列表',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_project',
    description: '建立新的專案計畫書',
    inputSchema: {
      type: 'object',
      required: ['titleZh'],
      properties: {
        titleZh: { type: 'string', description: '計畫中文名稱' },
        titleEn: { type: 'string', description: '計畫英文名稱' },
        organization: { type: 'string', description: '申請/執行單位' },
        category: { type: 'string', description: '計畫類別或競賽名稱' }
      }
    }
  },
  {
    name: 'get_project',
    description: '讀取完整專案資料（封面、七大章節、圖表與設定）',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', description: '專案代號（如 default）' }
      }
    }
  },
  {
    name: 'update_cover',
    description: '更新專案封面欄位（名稱、成員、指導老師、期程等）',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'fields'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        fields: {
          type: 'object',
          description: '要更新的封面欄位 (titleZh, titleEn, organization, category, members, advisors, period, submitDate)'
        }
      }
    }
  },
  {
    name: 'get_section',
    description: '讀取單一章節內容、字數與品質檢查結果',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'section'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        section: {
          type: 'string',
          enum: ['summary', 'motivation', 'competitor', 'analysis', 'architecture', 'schedule', 'references']
        }
      }
    }
  },
  {
    name: 'set_section',
    description: '覆寫指定章節內容（系統將自動套用 R1–R6 輸入規範、去除段首空白並檢查格式）',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'section', 'markdown'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        section: {
          type: 'string',
          enum: ['summary', 'motivation', 'competitor', 'analysis', 'architecture', 'schedule', 'references']
        },
        markdown: { type: 'string', description: '章節 Markdown 內容（單換行即分段，章標題由系統產生勿重複輸入）' }
      }
    }
  },
  {
    name: 'append_section',
    description: '於指定章節尾端追加內容',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'section', 'markdown'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        section: {
          type: 'string',
          enum: ['summary', 'motivation', 'competitor', 'analysis', 'architecture', 'schedule', 'references']
        },
        markdown: { type: 'string', description: '追加之 Markdown 內容' }
      }
    }
  },
  {
    name: 'patch_section',
    description: '取代章節內的指定文字片段',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'section', 'find', 'replace'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        section: {
          type: 'string',
          enum: ['summary', 'motivation', 'competitor', 'analysis', 'architecture', 'schedule', 'references']
        },
        find: { type: 'string', description: '欲搜尋的舊文字' },
        replace: { type: 'string', description: '欲替換之新文字' }
      }
    }
  },
  {
    name: 'validate_project',
    description: '執行專案計畫書品質檢查器（規則 V001 至 V010）',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        section: { type: 'string', description: '可選：僅檢查特定章節' }
      }
    }
  },
  {
    name: 'review_as_judge',
    description: '以評審視角進行整體評估（7 大評審構面評分、痛點功能效益連貫性交叉檢查、冗長段落分析）',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', description: '專案代號' }
      }
    }
  },
  {
    name: 'get_stats',
    description: '取得專案計畫書之字數、段落數與圖表數統計',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', description: '專案代號' }
      }
    }
  },
  {
    name: 'upload_image',
    description: '上傳圖片至專案（Base64 編碼），回傳可用於 Markdown 內引用之 imageId（格式：img:ID）',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'base64', 'caption'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        base64: { type: 'string', description: '圖片 Base64 字串' },
        caption: { type: 'string', description: '圖說文字' },
        mime: { type: 'string', description: 'MIME 類型 (image/png, image/jpeg, image/webp)' }
      }
    }
  },
  {
    name: 'render_preview',
    description: '產生章節或整份專案的 A4 預覽 HTML 或 IR 中介結構',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        section: { type: 'string', description: '可選：僅預覽特定章節' },
        format: { type: 'string', enum: ['html', 'ir'], description: '輸出格式 (html 或 ir)' }
      }
    }
  },
  {
    name: 'export_docx',
    description: '匯出標準排版 Word (.docx) 檔（含封面、目錄、頁碼、Times New Roman 與標楷體中英混排）',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        force: { type: 'boolean', description: '若有 error 級檢查問題是否仍強制匯出（預設 false）' }
      }
    }
  },
  {
    name: 'export_all',
    description: '匯出專案之 Word 檔與 JSON 完整備份',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', description: '專案代號' }
      }
    }
  },
  {
    name: 'snapshot_restore',
    description: '列出或還原專案歷史版本快照',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'action'],
      properties: {
        projectId: { type: 'string', description: '專案代號' },
        action: { type: 'string', enum: ['list', 'restore'] },
        versionSnapshot: { type: 'string', description: '還原時指定的快照檔名' }
      }
    }
  }
];

// Tool Handlers
async function handleToolCall(name, args) {
  switch (name) {
    case 'get_writing_guide': {
      if (args.section) {
        const meta = SECTIONS_META.find(s => s.key === args.section);
        if (!meta) throw new Error(`未知的章節代號: ${args.section}`);
        return {
          section: args.section,
          overview: OVERVIEW_GUIDE,
          guide: meta
        };
      }
      return {
        overview: OVERVIEW_GUIDE,
        dimensions: EVALUATION_DIMENSIONS,
        sections: SECTIONS_META
      };
    }

    case 'list_projects': {
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.startsWith('.'));
      const projects = [];
      for (const f of files) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
          projects.push({
            id: content.id || f.replace('.json', ''),
            titleZh: content.cover?.titleZh || '未命名計畫',
            organization: content.cover?.organization || '',
            updatedAt: content.meta?.updatedAt || ''
          });
        } catch (e) {
          // ignore corrupted files
        }
      }
      return { projects };
    }

    case 'create_project': {
      const newProj = createDefaultProject();
      newProj.id = `proj_${Date.now()}`;
      newProj.cover.titleZh = args.titleZh;
      if (args.titleEn) newProj.cover.titleEn = args.titleEn;
      if (args.organization) newProj.cover.organization = args.organization;
      if (args.category) newProj.cover.category = args.category;
      saveProject(newProj, 'ai');
      return { ok: true, projectId: newProj.id, message: `專案建立成功: ${newProj.id}` };
    }

    case 'get_project': {
      const proj = loadProject(args.projectId);
      return proj;
    }

    case 'update_cover': {
      const proj = loadProject(args.projectId);
      if (!proj.cover) proj.cover = {};
      Object.assign(proj.cover, args.fields);
      saveProject(proj, 'ai');
      return { ok: true, cover: proj.cover, message: '封面資訊已更新' };
    }

    case 'get_section': {
      const proj = loadProject(args.projectId);
      const meta = SECTIONS_META.find(s => s.key === args.section);
      if (!meta) throw new Error(`未知的章節: ${args.section}`);

      const sec = (proj.sections && proj.sections[args.section]) || { markdown: '' };
      const wc = countWords(sec.markdown);
      const issues = validateProject(proj, args.section);

      return {
        section: args.section,
        title: `第${meta.number}章 ${meta.title}`,
        markdown: sec.markdown,
        wordCount: wc,
        suggestedRange: [meta.suggestedMin, meta.suggestedMax],
        issues,
        hint: wc < meta.suggestedMin
          ? `目前 ${wc} 字，低於建議下限 ${meta.suggestedMin} 字，建議補充內容。`
          : wc > meta.suggestedMax && meta.suggestedMax > 0
          ? `目前 ${wc} 字，高於建議上限 ${meta.suggestedMax} 字，建議精簡提煉。`
          : `字數 ${wc} 字，位於合理區間。`
      };
    }

    case 'set_section': {
      const proj = loadProject(args.projectId);
      const meta = SECTIONS_META.find(s => s.key === args.section);
      if (!meta) throw new Error(`未知的章節: ${args.section}`);

      // Apply R1-R6 Normalization
      const norm = normalizeText(args.markdown);
      if (!proj.sections) proj.sections = {};
      proj.sections[args.section] = { markdown: norm.normalizedText };

      saveProject(proj, 'ai');

      const wc = countWords(norm.normalizedText);
      const issues = validateProject(proj, args.section);

      let hint = '內容已更新。';
      if (meta.suggestedMin > 0 && wc < meta.suggestedMin) {
        hint = `字數 ${wc} 低於建議下限 ${meta.suggestedMin} 字，請補充重要細節。`;
      } else if (meta.suggestedMax > 0 && wc > meta.suggestedMax) {
        hint = `字數 ${wc} 超過建議上限 ${meta.suggestedMax} 字，評審閱讀時間有限，請精簡。`;
      }

      return {
        ok: true,
        section: args.section,
        wordCount: wc,
        suggestedRange: [meta.suggestedMin, meta.suggestedMax],
        issues,
        stats: {
          removedBlankLines: norm.stats.removedBlankLines,
          removedLeadingSpaces: norm.stats.removedLeadingSpaces
        },
        hint
      };
    }

    case 'append_section': {
      const proj = loadProject(args.projectId);
      const meta = SECTIONS_META.find(s => s.key === args.section);
      if (!meta) throw new Error(`未知的章節: ${args.section}`);

      if (!proj.sections) proj.sections = {};
      const current = (proj.sections[args.section] && proj.sections[args.section].markdown) || '';
      const combined = current ? `${current}\n${args.markdown}` : args.markdown;

      const norm = normalizeText(combined);
      proj.sections[args.section] = { markdown: norm.normalizedText };
      saveProject(proj, 'ai');

      const wc = countWords(norm.normalizedText);
      const issues = validateProject(proj, args.section);

      return {
        ok: true,
        section: args.section,
        wordCount: wc,
        issues,
        hint: `內容已追加，目前總字數 ${wc} 字。`
      };
    }

    case 'patch_section': {
      const proj = loadProject(args.projectId);
      if (!proj.sections || !proj.sections[args.section]) {
        throw new Error(`章節 ${args.section} 目前為空`);
      }
      const current = proj.sections[args.section].markdown;
      if (!current.includes(args.find)) {
        throw new Error(`找不到文字: "${args.find}"`);
      }
      const updated = current.replaceAll(args.find, args.replace);
      const norm = normalizeText(updated);
      proj.sections[args.section] = { markdown: norm.normalizedText };
      saveProject(proj, 'ai');

      return {
        ok: true,
        section: args.section,
        wordCount: countWords(norm.normalizedText),
        message: '文字替換成功'
      };
    }

    case 'validate_project': {
      const proj = loadProject(args.projectId);
      const issues = validateProject(proj, args.section || null);
      return {
        projectId: args.projectId,
        errorCount: issues.filter(i => i.level === 'error').length,
        warningCount: issues.filter(i => i.level === 'warning').length,
        infoCount: issues.filter(i => i.level === 'info').length,
        issues
      };
    }

    case 'review_as_judge': {
      const proj = loadProject(args.projectId);
      const review = reviewAsJudge(proj);
      return review;
    }

    case 'get_stats': {
      const proj = loadProject(args.projectId);
      let totalWords = 0;
      const sectionStats = {};

      for (const meta of SECTIONS_META) {
        const md = (proj.sections && proj.sections[meta.key]?.markdown) || '';
        const wc = countWords(md);
        totalWords += wc;
        sectionStats[meta.key] = {
          title: meta.title,
          wordCount: wc,
          paragraphs: md ? md.split(/\n+/).length : 0
        };
      }

      const imgCount = Object.keys(proj.images || {}).length;

      return {
        projectId: args.projectId,
        totalWords,
        imagesCount: imgCount,
        sections: sectionStats
      };
    }

    case 'upload_image': {
      const proj = loadProject(args.projectId);
      if (!proj.images) proj.images = {};
      const imgId = `img_${Date.now()}`;
      proj.images[imgId] = {
        mime: args.mime || 'image/png',
        dataBase64: args.base64,
        caption: args.caption || ''
      };
      saveProject(proj, 'ai');
      return {
        ok: true,
        imageId: imgId,
        markdownSnippet: `![${args.caption || '圖說'}](img:${imgId})`,
        message: '圖片已儲存，可於 Markdown 中以 markdownSnippet 引用'
      };
    }

    case 'render_preview': {
      const proj = loadProject(args.projectId);
      const secKey = args.section;
      if (secKey) {
        const md = (proj.sections && proj.sections[secKey]?.markdown) || '';
        const ir = parseMarkdownToIR(md, { autoHeadingNumber: true });
        if (args.format === 'ir') return { ir };
        return { html: irToHtml(ir.blocks, proj.images) };
      }

      // Full document preview
      const sectionsHtml = [];
      for (const meta of SECTIONS_META) {
        const md = (proj.sections && proj.sections[meta.key]?.markdown) || '';
        if (!md && !meta.required) continue;
        const ir = parseMarkdownToIR(md, { autoHeadingNumber: true });
        sectionsHtml.push(`<section class="doc-chapter"><h3>${meta.number}、${meta.title}</h3>${irToHtml(ir.blocks, proj.images)}</section>`);
      }
      return { html: sectionsHtml.join('\n') };
    }

    case 'export_docx': {
      const proj = loadProject(args.projectId);
      const issues = validateProject(proj);
      const errors = issues.filter(i => i.level === 'error');

      if (errors.length > 0 && !args.force) {
        return {
          ok: false,
          error: '計畫書尚有 error 級未修正問題，請修正或傳入 force: true 強制匯出。',
          errors
        };
      }

      const docx = await import('docx');
      const doc = await buildDocxDocument(proj, docx);
      const buffer = await docx.Packer.toBuffer(doc);

      const title = proj.cover?.titleZh ? proj.cover.titleZh.replace(/[\\/:*?"<>|]/g, '') : '專案計劃書';
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `${title}_${dateStr}.docx`;
      const outPath = path.join(DATA_DIR, fileName);
      fs.writeFileSync(outPath, buffer);

      return {
        ok: true,
        fileName,
        filePath: outPath,
        fileSize: buffer.length,
        message: `Word 計畫書已成功產出：${fileName}`
      };
    }

    case 'export_all': {
      const docxResult = await handleToolCall('export_docx', { projectId: args.projectId, force: true });
      const proj = loadProject(args.projectId);
      const jsonFileName = `${proj.cover?.titleZh || 'proposal'}_backup.json`;
      const jsonPath = path.join(DATA_DIR, jsonFileName);
      fs.writeFileSync(jsonPath, JSON.stringify(proj, null, 2), 'utf8');

      return {
        ok: true,
        docx: docxResult,
        jsonBackup: { fileName: jsonFileName, filePath: jsonPath }
      };
    }

    case 'snapshot_restore': {
      const safeId = args.projectId.replace(/[^a-zA-Z0-9_\-]/g, '');
      const snapshotDir = path.join(DATA_DIR, '.snapshots', safeId);
      if (!fs.existsSync(snapshotDir)) {
        return { snapshots: [] };
      }

      if (args.action === 'list') {
        const list = fs.readdirSync(snapshotDir).map(name => {
          const stats = fs.statSync(path.join(snapshotDir, name));
          return { name, createdAt: stats.mtime.toISOString(), size: stats.size };
        });
        return { snapshots: list };
      } else if (args.action === 'restore') {
        if (!args.versionSnapshot) throw new Error('請指定欲還原的 versionSnapshot');
        const snapPath = path.join(snapshotDir, args.versionSnapshot);
        if (!fs.existsSync(snapPath)) throw new Error('指定的快照不存在');
        const restored = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
        saveProject(restored, 'restore');
        return { ok: true, message: `已成功還原至快照: ${args.versionSnapshot}` };
      }
      break;
    }

    default:
      throw new Error(`未支援的工具名稱: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Resources & Prompts (Section 7.4 & 7.5)
// ---------------------------------------------------------------------------

const RESOURCES = [
  {
    uri: 'proposal://guide/overview',
    name: '專案計劃書評審視角與撰寫總則',
    mimeType: 'text/markdown',
    description: '整體撰寫原則、審查委員看點與評分重點'
  },
  {
    uri: 'proposal://syntax',
    name: 'Markdown 語法規範與輸入規則 (R1-R6)',
    mimeType: 'text/markdown',
    description: '單換行分段、段首空格自動清除、標題自動編號規則'
  }
];

// Add resource for each section
for (const s of SECTIONS_META) {
  RESOURCES.push({
    uri: `proposal://guide/${s.key}`,
    name: `第${s.number}章 ${s.title} 撰寫指南`,
    mimeType: 'application/json',
    description: s.purpose
  });
  RESOURCES.push({
    uri: `proposal://examples/${s.key}`,
    name: `第${s.number}章 ${s.title} 範本示範`,
    mimeType: 'text/markdown',
    description: `示範結構與語氣參考`
  });
}

function handleResourceRead(uri) {
  if (uri === 'proposal://guide/overview') {
    return { uri, mimeType: 'text/markdown', text: OVERVIEW_GUIDE };
  }
  if (uri === 'proposal://syntax') {
    const syntaxDoc = `# Markdown 語法規範與輸入規則 (R1-R6)
- R1: 按 Enter 換行即是新段落。
- R2: 連續空行自動忽略，不產生空段。
- R3: 行首全形空白、半形空格、Tab 一律自動去除。
- R4: 一般段落自動套用首行縮排 2 字元 (w:firstLineChars="200")。
- R5: 標題、清單、表格、圖片、引用區塊不套用首行縮排。
- R6: 行尾空白自動清除。
- 標題語法：# 為節（（一））、## 為小節（1.）、### 為細節（(1)）；章標題由系統產生，請勿在內文重複寫章名稱。
- 表格語法：使用 GFM 表格，上方可標註「表：標題」。
- 圖片語法：![圖說](img:ID)，系統自動編號。`;
    return { uri, mimeType: 'text/markdown', text: syntaxDoc };
  }

  const guideMatch = uri.match(/^proposal:\/\/guide\/([a-z]+)$/);
  if (guideMatch) {
    const meta = SECTIONS_META.find(s => s.key === guideMatch[1]);
    if (meta) return { uri, mimeType: 'application/json', text: JSON.stringify(meta, null, 2) };
  }

  const exampleMatch = uri.match(/^proposal:\/\/examples\/([a-z]+)$/);
  if (exampleMatch) {
    const meta = SECTIONS_META.find(s => s.key === exampleMatch[1]);
    if (meta) return { uri, mimeType: 'text/markdown', text: meta.template || '' };
  }

  const projMatch = uri.match(/^proposal:\/\/project\/([a-zA-Z0-9_\-]+)$/);
  if (projMatch) {
    const p = loadProject(projMatch[1]);
    return { uri, mimeType: 'application/json', text: JSON.stringify(p, null, 2) };
  }

  throw new Error(`找不到指定的資源 URI: ${uri}`);
}

function handlePromptGet(name, args) {
  if (name === 'draft_proposal') {
    return {
      description: '逐章撰寫計劃書',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `你是一位資深審查委員與專案計畫書輔導顧問。請針對以下構想，依據大專生計畫書七大章節規範與評審視角，逐章規劃撰寫整份計畫書：\n構想：${args.concept || ''}`
          }
        }
      ]
    };
  }
  if (name === 'review_proposal') {
    return {
      description: '審查委員檢閱計畫書',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `請呼叫 review_as_judge 與 validate_project 檢閱專案 ${args.projectId}，依據七大評分維度（問題明確性、創新與差異化、技術可行性、效益可衡量性、時程合理性、完整度與一致性、精簡度）提出具體修改建議。`
          }
        }
      ]
    };
  }
  if (name === 'tighten_section') {
    return {
      description: '精簡章節內容',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `請先讀取專案 ${args.projectId} 的 ${args.section} 章節，剔除冗贅形容詞、空話與重複句子，保留關鍵數據、對照表與量化目標，將字數降至建議範圍內。`
          }
        }
      ]
    };
  }
  if (name === 'ask_missing_info') {
    return {
      description: '追問缺漏資訊',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `撰寫 ${args.section} 章節前，若使用者提供的資訊不足以支撐該章節的核心評審要點，請列出最關鍵的 3 到 5 個具體問題向使用者詢問，不要自行編造空泛數據。`
          }
        }
      ]
    };
  }
  throw new Error(`未知的 Prompt: ${name}`);
}

// ---------------------------------------------------------------------------
// Stdio JSON-RPC 2.0 Server Loop
// ---------------------------------------------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id, result) {
  const payload = {
    jsonrpc: '2.0',
    id,
    result
  };
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function sendError(id, code, message, data = null) {
  const payload = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  };
  process.stdout.write(JSON.stringify(payload) + '\n');
}

rl.on('line', async line => {
  if (!line || !line.trim()) return;

  let msg;
  try {
    msg = JSON.parse(line);
  } catch (err) {
    sendError(null, -32700, 'Parse error');
    return;
  }

  const { id, method, params } = msg;

  // Handle Notifications (no id)
  if (id === undefined || id === null) {
    if (method === 'notifications/initialized') {
      // client ack
    }
    return;
  }

  try {
    switch (method) {
      case 'initialize': {
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          },
          serverInfo: {
            name: 'proposal-typesetter-mcp',
            version: '1.0.0'
          },
          instructions: OVERVIEW_GUIDE
        });
        break;
      }

      case 'ping': {
        sendResponse(id, {});
        break;
      }

      case 'tools/list': {
        sendResponse(id, { tools: TOOLS });
        break;
      }

      case 'tools/call': {
        const { name, arguments: args } = params;
        const result = await handleToolCall(name, args || {});
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        });
        break;
      }

      case 'resources/list': {
        sendResponse(id, { resources: RESOURCES });
        break;
      }

      case 'resources/read': {
        const { uri } = params;
        const res = handleResourceRead(uri);
        sendResponse(id, {
          contents: [res]
        });
        break;
      }

      case 'prompts/list': {
        sendResponse(id, { prompts: PROMPTS_DEF });
        break;
      }

      case 'prompts/get': {
        const { name, arguments: args } = params;
        const res = handlePromptGet(name, args || {});
        sendResponse(id, res);
        break;
      }

      default:
        sendError(id, -32601, `Method not found: ${method}`);
        break;
    }
  } catch (err) {
    sendError(id, -32000, err.message || 'Internal tool error');
  }
});

// Log readiness to stderr (does not interfere with JSON-RPC stdio on stdout)
console.error('[MCP Server] 專案計劃書排版工具 MCP Server 已啟動 (stdio JSON-RPC)');
console.error(`[MCP Server] 資料儲存路徑: ${DATA_DIR}`);
