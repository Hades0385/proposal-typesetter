/**
 * PDF Renderer for Server and Local MCP
 * Generates standalone A4 HTML and converts to high-fidelity PDF via headless browser or LibreOffice
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { SECTIONS_META, getProjectChapters } from './guides.js';
import { parseMarkdownToIR } from './md-parser.js';
import { irToHtml } from './ir-to-html.js';
import { formatSubmitDate } from './docx-builder.js';

/**
 * Finds available PDF rendering engine (Edge, Chrome, Chromium, LibreOffice)
 */
export function findPdfEngine() {
  const isWin = process.platform === 'win32';

  if (isWin) {
    const candidates = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return {
          type: c.toLowerCase().includes('soffice') ? 'libreoffice' : 'browser',
          path: c
        };
      }
    }
  } else {
    // Linux / macOS
    const candidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/msedge',
      '/usr/bin/soffice',
      '/usr/bin/libreoffice',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return {
          type: c.includes('soffice') || c.includes('libreoffice') ? 'libreoffice' : 'browser',
          path: c
        };
      }
    }
  }

  return null;
}

/**
 * Generates standalone HTML document formatted exactly like the live preview
 */
export function generateStandaloneA4Html(project) {
  const cover = project.cover || {};
  const sections = project.sections || {};
  const settings = project.settings || {};
  const images = project.images || {};

  // 1. Cover
  let logoHtml = '';
  if (cover.logoImageId && images[cover.logoImageId]) {
    const imgObj = images[cover.logoImageId];
    const src = imgObj.dataBase64.startsWith('data:') ? imgObj.dataBase64 : `data:${imgObj.mime || 'image/png'};base64,${imgObj.dataBase64}`;
    logoHtml = `<div class="cover-logo"><img src="${src}" style="max-width: 110px; max-height: 110px; object-fit: contain;" /></div>`;
  }

  const orgHtml = cover.organization ? `<div class="cover-org">${escapeHtml(cover.organization)}</div>` : '';
  const categoryHtml = `<div class="cover-category">${escapeHtml(cover.category || '大專生專題研究計畫書')}</div>`;
  const titleZhHtml = `<div class="cover-title-zh">${escapeHtml(cover.titleZh || '計畫中文名稱')}</div>`;
  const titleEnHtml = cover.titleEn ? `<div class="cover-title-en">${escapeHtml(cover.titleEn)}</div>` : '';

  let membersRows = '';
  if (Array.isArray(cover.members) && cover.members.length > 0) {
    const listStr = cover.members.map(m => {
      const parts = [m.name];
      if (m.studentId) parts.push(`(${m.studentId})`);
      if (m.role) parts.push(`- ${m.role}`);
      return escapeHtml(parts.join(' '));
    }).join('<br>');
    membersRows += `<tr><td class="label-col">執行團隊成員：</td><td class="val-col">${listStr}</td></tr>`;
  }

  if (Array.isArray(cover.advisors) && cover.advisors.length > 0) {
    const advStr = cover.advisors.map(a => escapeHtml(`${a.name || ''} ${a.title || ''}`.trim())).join('、');
    if (advStr) {
      membersRows += `<tr><td class="label-col">指導老師：</td><td class="val-col">${advStr}</td></tr>`;
    }
  }

  if (cover.period) {
    membersRows += `<tr><td class="label-col">執行期間：</td><td class="val-col">${escapeHtml(cover.period)}</td></tr>`;
  }

  const infoTableHtml = membersRows ? `<table class="cover-info-table"><tbody>${membersRows}</tbody></table>` : '';
  const dateFormatted = formatSubmitDate(cover.submitDate, settings.dateStyle || 'roc');
  const dateHtml = `<div class="cover-date">${escapeHtml(dateFormatted)}</div>`;

  // 2. Body Chapters & TOC
  const chapterEntries = [];
  let figureCounter = 1;
  let tableCounter = 1;
  const projectChapters = getProjectChapters(project);

  for (const ch of projectChapters) {
    const md = (ch.markdown || '').trim();
    if (!ch.required && !md) continue;

    const parseRes = parseMarkdownToIR(md, {
      autoHeadingNumber: settings.autoHeadingNumber !== false,
      figureStartIndex: figureCounter,
      tableStartIndex: tableCounter
    });
    figureCounter = parseRes.figureCounter;
    tableCounter = parseRes.tableCounter;

    const headings = [];
    for (const b of parseRes.blocks) {
      if (b.type === 'heading' && b.level <= (settings.tocLevels || 2)) {
        headings.push({ level: b.level, text: b.text });
      }
    }

    const fullTitle = ch.number ? `${ch.number}、${ch.title}` : ch.title;

    chapterEntries.push({
      meta: ch,
      title: fullTitle,
      blocks: parseRes.blocks,
      headings,
      htmlContent: irToHtml(parseRes.blocks, images)
    });
  }

  // TOC
  let tocItemsHtml = '';
  let simPage = 1;
  for (const ch of chapterEntries) {
    tocItemsHtml += `
      <div class="toc-item level-1">
        <span class="toc-item-title">${escapeHtml(ch.title)}</span>
        <span class="toc-item-leader"></span>
        <span class="toc-item-page">${simPage}</span>
      </div>
    `;
    for (const h of ch.headings) {
      tocItemsHtml += `
        <div class="toc-item level-2">
          <span class="toc-item-title">${escapeHtml(h.text)}</span>
          <span class="toc-item-leader"></span>
          <span class="toc-item-page">${simPage}</span>
        </div>
      `;
    }
    const roughWords = ch.blocks.reduce((acc, b) => acc + (b.text ? b.text.length : 150), 0);
    simPage += Math.max(1, Math.ceil(roughWords / 800));
  }

  // Chapters Pages HTML
  let chaptersHtml = '';
  for (let idx = 0; idx < chapterEntries.length; idx++) {
    const ch = chapterEntries[idx];
    const breakBefore = (idx > 0 && settings.chapterPageBreak !== false) ? 'page-break-before: always;' : '';
    chaptersHtml += `
      <div class="chapter-container" style="${breakBefore}">
        <h3 class="doc-chapter-title">${escapeHtml(ch.title)}</h3>
        ${ch.htmlContent}
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(cover.titleZh || '專案計劃書')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin-top: 25.4mm;
      margin-bottom: 25.4mm;
      margin-left: 31.7mm;
      margin-right: 31.7mm;
    }
    @page:first {
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: "Times New Roman", "標楷體", "DFKai-SB", "BiauKai", serif;
      color: #000000;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
    }

    /* Cover Page (Full A4) */
    .cover-page {
      width: 210mm;
      height: 297mm;
      padding: 30mm 31.7mm 25.4mm 31.7mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      page-break-after: always;
      position: relative;
    }
    .cover-org { font-size: 16pt; font-weight: bold; letter-spacing: 1px; margin-bottom: 20px; }
    .cover-category { font-size: 20pt; font-weight: bold; letter-spacing: 2px; margin-bottom: 30px; }
    .cover-title-zh { font-size: 24pt; font-weight: bold; line-height: 1.4; margin-bottom: 12px; }
    .cover-title-en { font-size: 16pt; font-style: italic; color: #222; margin-bottom: 35px; }
    .cover-info-table { width: 85%; margin: 0 auto; font-size: 12pt; line-height: 1.8; border-collapse: collapse; }
    .cover-info-table td.label-col { width: 40%; text-align: right; font-weight: bold; white-space: nowrap; padding: 4px 10px; }
    .cover-info-table td.val-col { width: 60%; text-align: left; padding: 4px 10px; }
    .cover-date { font-size: 14pt; font-weight: bold; margin-top: 25px; }

    /* TOC Page */
    .toc-page {
      page-break-after: always;
      padding-top: 10px;
    }
    .toc-title { text-align: center; font-size: 16pt; font-weight: bold; letter-spacing: 4px; margin-bottom: 30px; }
    .toc-item { display: flex; align-items: baseline; font-size: 12pt; line-height: 2.0; }
    .toc-item.level-1 { font-weight: bold; font-size: 12.5pt; }
    .toc-item.level-2 { padding-left: 24px; font-weight: normal; }
    .toc-item-title { white-space: nowrap; }
    .toc-item-leader { flex-grow: 1; border-bottom: 1px dotted #666; margin: 0 8px; position: relative; top: -4px; }
    .toc-item-page { font-family: "Times New Roman", serif; }

    /* Typography */
    .doc-chapter-title { font-size: 16pt; font-weight: bold; margin-top: 24px; margin-bottom: 14px; text-align: left; page-break-after: avoid; }
    .doc-heading-1 { font-size: 14pt; font-weight: bold; margin-top: 18px; margin-bottom: 8px; text-align: left; page-break-after: avoid; }
    .doc-heading-2 { font-size: 12pt; font-weight: bold; margin-top: 14px; margin-bottom: 6px; text-align: left; page-break-after: avoid; }
    .doc-heading-3 { font-size: 12pt; font-weight: bold; margin-top: 10px; margin-bottom: 4px; text-align: left; page-break-after: avoid; }
    .doc-body { font-size: 12pt; line-height: 1.5; text-indent: 2em; text-align: justify; margin: 0 0 0 0; word-break: break-word; }
    .doc-list { font-size: 12pt; line-height: 1.5; text-indent: 0 !important; margin: 6px 0; padding-left: 28px; }
    .doc-quote { border-left: 4px solid #adb5bd; padding-left: 14px; margin: 10px 0; color: #495057; font-style: italic; text-indent: 0 !important; font-size: 11pt; }
    .doc-code { font-family: "Consolas", monospace; font-size: 10pt; background: #f8f9fa; border: 1px solid #dee2e6; padding: 8px 12px; margin: 10px 0; white-space: pre-wrap; text-indent: 0 !important; }
    .doc-inline-code { font-family: "Consolas", monospace; font-size: 11pt; background: #f1f3f5; padding: 1px 4px; }

    /* Tables */
    .doc-table-wrapper { margin: 14px 0; text-indent: 0 !important; }
    .doc-table { width: 100%; border-collapse: collapse; font-size: 11pt; margin-top: 6px; }
    .doc-table th, .doc-table td { border: 1px solid #495057; padding: 6px 10px; }
    .doc-table th { background: #e9ecef; font-weight: bold; text-align: center; }
    .doc-caption { font-size: 10pt; text-align: center; color: #212529; margin: 4px 0; page-break-after: avoid; }

    /* Figures */
    .doc-figure-wrapper { text-align: center; margin: 16px 0; text-indent: 0 !important; page-break-inside: avoid; }
    .doc-figure-img { max-width: 85%; max-height: 380px; object-fit: contain; }
  </style>
</head>
<body>
  <!-- 1. Cover -->
  <div class="cover-page">
    <div style="width: 100%;">
      ${logoHtml}
      ${orgHtml}
      ${categoryHtml}
    </div>
    <div style="width: 100%;">
      ${titleZhHtml}
      ${titleEnHtml}
    </div>
    <div style="width: 100%;">
      ${infoTableHtml}
      ${dateHtml}
    </div>
  </div>

  <!-- 2. TOC -->
  <div class="toc-page">
    <div class="toc-title">目　　錄</div>
    ${tocItemsHtml}
  </div>

  <!-- 3. Chapters -->
  <div class="body-content">
    ${chaptersHtml}
  </div>
</body>
</html>`;
}

/**
 * Converts a project to PDF using available local engine
 */
export async function exportProjectToPdf(project, outputPath) {
  const engine = findPdfEngine();
  if (!engine) {
    throw new Error('本機未找到可用之 PDF 渲染引擎 (需要 Edge, Chrome 或 LibreOffice)');
  }

  const html = generateStandaloneA4Html(project);
  const tempHtmlPath = path.join(path.dirname(outputPath), `.temp_${Date.now()}.html`);
  fs.writeFileSync(tempHtmlPath, html, 'utf8');

  try {
    if (engine.type === 'browser') {
      execFileSync(engine.path, [
        '--headless',
        '--disable-gpu',
        '--no-pdf-header-footer',
        '--run-all-compositor-stages-before-draw',
        `--print-to-pdf=${path.resolve(outputPath)}`,
        `file:///${path.resolve(tempHtmlPath).replace(/\\/g, '/')}`
      ]);
    } else {
      // LibreOffice (if installed)
      execFileSync(engine.path, [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        path.dirname(outputPath),
        tempHtmlPath
      ]);
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error('PDF 檔案產出失敗');
    }

    const stat = fs.statSync(outputPath);
    return {
      ok: true,
      filePath: outputPath,
      fileSize: stat.size,
      engine: engine.type
    };
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      try { fs.unlinkSync(tempHtmlPath); } catch (e) { /* ignore */ }
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
