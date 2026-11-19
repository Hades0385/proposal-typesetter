/**
 * Project Validator and Judge Reviewer
 * Implements Section 4.10 (V001 - V010) and Section 7.8
 */

import { SECTIONS_META, EVALUATION_DIMENSIONS } from './guides.js';
import { parseMarkdownToIR } from './md-parser.js';

/**
 * Counts Chinese characters (1 each) and English words (1 each)
 */
export function countWords(rawMarkdown) {
  if (!rawMarkdown || typeof rawMarkdown !== 'string') return 0;

  // Strip code blocks and markdown symbols for fair text count
  const clean = rawMarkdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[#*_~>|\\-]/g, ' ');

  const cjkMatches = clean.match(/[\u4e00-\u9fa5\u3400-\u4dbf\uf900-\ufaff]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  const nonCjk = clean.replace(/[\u4e00-\u9fa5\u3400-\u4dbf\uf900-\ufaff]/g, ' ');
  const wordsMatches = nonCjk.match(/[a-zA-Z0-9_\-]+/g);
  const wordCount = wordsMatches ? wordsMatches.length : 0;

  return cjkCount + wordCount;
}

/**
 * Validates a proposal project against V001 - V010
 * @param {Object} project
 * @param {string|null} targetSection - Optional single section key to check
 * @returns {Array} issues list [{ id, level, section, message, suggestion }]
 */
export function validateProject(project, targetSection = null) {
  const issues = [];
  if (!project) return issues;

  const cover = project.cover || {};
  const sections = project.sections || {};

  // V006: 封面必填欄位缺漏
  if (!targetSection) {
    if (!cover.titleZh || !cover.titleZh.trim()) {
      issues.push({
        id: 'V006',
        level: 'error',
        section: 'cover',
        message: '封面缺少計畫中文名稱（必填）。',
        suggestion: '請在封面設定中填寫計畫中文名稱。'
      });
    }
    const hasMembers = Array.isArray(cover.members) && cover.members.length > 0 && cover.members.some(m => m.name && m.name.trim());
    if (!hasMembers) {
      issues.push({
        id: 'V006',
        level: 'error',
        section: 'cover',
        message: '封面缺少團隊成員（至少需填一位成員）。',
        suggestion: '請在封面「團隊成員」中新增至少一位成員姓名。'
      });
    }
  }

  // Check sections
  const checkList = targetSection
    ? SECTIONS_META.filter(s => s.key === targetSection)
    : SECTIONS_META;

  for (const meta of checkList) {
    const secKey = meta.key;
    const secData = sections[secKey];
    const md = (secData && secData.markdown) ? secData.markdown.trim() : '';
    const wc = countWords(md);

    // V001: 必填章節為空
    if (meta.required && !md) {
      issues.push({
        id: 'V001',
        level: 'error',
        section: secKey,
        message: `第${meta.number}章「${meta.title}」為必填項目，目前為空白。`,
        suggestion: `請參考撰寫指南或點擊「插入範本」填寫${meta.title}。`
      });
      continue;
    }

    if (!md) continue; // Optional section empty is allowed

    // V002: 字數低於建議下限 50%
    if (meta.suggestedMin > 0 && wc < meta.suggestedMin * 0.5) {
      issues.push({
        id: 'V002',
        level: 'warning',
        section: secKey,
        message: `「${meta.title}」目前 ${wc} 字，嚴重低於建議下限（${meta.suggestedMin} 字）的 50%。`,
        suggestion: `評審可能會認為論述過於簡略，建議補充內容至 ${meta.suggestedMin} 字以上。`
      });
    }

    // V003: 字數超過建議上限 150%
    if (meta.suggestedMax > 0 && wc > meta.suggestedMax * 1.5) {
      issues.push({
        id: 'V003',
        level: 'warning',
        section: secKey,
        message: `「${meta.title}」目前 ${wc} 字，超過建議上限（${meta.suggestedMax} 字）的 150%。`,
        suggestion: '評審審閱時間有限，過度冗長容易模糊重點，建議精簡提煉核心段落。'
      });
    }

    // V004: 單段超過 300 字
    const paragraphs = md.split(/\n+/).map(p => p.trim()).filter(p => p && !p.startsWith('#') && !p.startsWith('|') && !p.startsWith('-') && !p.startsWith('```'));
    paragraphs.forEach((p, pIdx) => {
      const pWc = countWords(p);
      if (pWc > 300) {
        issues.push({
          id: 'V004',
          level: 'info',
          section: secKey,
          message: `「${meta.title}」第 ${pIdx + 1} 個段落篇幅達 ${pWc} 字，超過 300 字。`,
          suggestion: '長段落易造成閱讀疲乏，建議按邏輯子題拆分為兩個短段落。'
        });
      }
    });

    // V007: 第三章未包含對照表
    if (secKey === 'competitor') {
      const hasTable = /\|.+?\|[\r\n]+\|[-:\s|]+\|/.test(md);
      if (!hasTable) {
        issues.push({
          id: 'V007',
          level: 'warning',
          section: 'competitor',
          message: '第三章「競品分析與市場探討」未包含功能／方案比較對照表。',
          suggestion: '評審重視與既有方案的直觀對比，請務必加入比較表格（表：...）。'
        });
      }
    }

    // V008: 第六章未包含量化效益（無數字）
    if (secKey === 'schedule') {
      const hasNumbers = /\d+(?:\.\d+)?%|\d+\s*(?:小時|天|月|元|公頃|噸|秒|次|萬|戶)/.test(md) || /\d+/.test(md);
      if (!hasNumbers) {
        issues.push({
          id: 'V008',
          level: 'warning',
          section: 'schedule',
          message: '第六章「專案時程與預期效益」未包含明確量化數據或百分比指標。',
          suggestion: '效益缺乏數字量化容易被視為空泛口號，請列出具體數字指標（例如「節省 30% 工時」）。'
        });
      }
    }

    // V009: 出現未解析的 MD 語法（如不支援的 HTML 標籤）
    const unsupportedHtmlMatch = md.match(/<(div|span|p|b|i|font|table|tr|td|style|script)[^>]*>/i);
    if (unsupportedHtmlMatch) {
      issues.push({
        id: 'V009',
        level: 'warning',
        section: secKey,
        message: `「${meta.title}」內含 HTML 標籤 <${unsupportedHtmlMatch[1]}>，系統不支援自訂 HTML。`,
        suggestion: '請改用標準 Markdown 語法（粗體 **、表格 | 等），以確保 Word 與 PDF 排版正常。'
      });
    }

    // V005: 圖／表有編號但內文未提及
    const figureMatches = [...md.matchAll(/!\[(.*?)\]/g)];
    const tableMatches = [...md.matchAll(/(?:表[：:]\s*|\[表\]\s*)(.+)/g)];

    // Check references to figures / tables
    figureMatches.forEach((f, idx) => {
      const figNum = idx + 1;
      const refRegex = new RegExp(`圖\\s*${figNum}`, 'i');
      if (!refRegex.test(md)) {
        issues.push({
          id: 'V005',
          level: 'info',
          section: secKey,
          message: `「${meta.title}」中的「圖 ${figNum}」在正文中未被直接引述（如「如圖 ${figNum} 所示」）。`,
          suggestion: `建議在段落內加入「如圖 ${figNum} 所示」，評審閱卷時才能立即對照圖文。`
        });
      }
    });

    tableMatches.forEach((t, idx) => {
      const tblNum = idx + 1;
      const refRegex = new RegExp(`表\\s*${tblNum}`, 'i');
      if (!refRegex.test(md)) {
        issues.push({
          id: 'V005',
          level: 'info',
          section: secKey,
          message: `「${meta.title}」中的「表 ${tblNum}」在正文中未被直接引述。`,
          suggestion: `建議在段落內加入「如表 ${tblNum} 所列」，引導評審參考。`
        });
      }
    });
  }

  // V010: 章節之間內容高度重複
  if (!targetSection) {
    const secKeys = ['summary', 'motivation', 'competitor', 'analysis', 'architecture', 'schedule'];
    for (let i = 0; i < secKeys.length; i++) {
      for (let j = i + 1; j < secKeys.length; j++) {
        const k1 = secKeys[i];
        const k2 = secKeys[j];
        const md1 = (sections[k1] && sections[k1].markdown) ? sections[k1].markdown : '';
        const md2 = (sections[k2] && sections[k2].markdown) ? sections[k2].markdown : '';
        if (md1.length > 80 && md2.length > 80) {
          const sim = checkSentenceOverlap(md1, md2);
          if (sim.overlapRatio > 0.35) {
            issues.push({
              id: 'V010',
              level: 'info',
              section: k2,
              message: `「${getSectionTitle(k2)}」與「${getSectionTitle(k1)}」有大量重複句子（重合度約 ${Math.round(sim.overlapRatio * 100)}%）。`,
              suggestion: '審查委員重視章節分工，請避免大篇幅照抄摘要或前言，應深入該章細節。'
            });
          }
        }
      }
    }
  }

  return issues;
}

function getSectionTitle(key) {
  const m = SECTIONS_META.find(s => s.key === key);
  return m ? m.title : key;
}

/**
 * Checks sentence overlap ratio between two texts
 */
function checkSentenceOverlap(textA, textB) {
  const getSentences = t => t.split(/[。！？\n]/).map(s => s.trim()).filter(s => s.length >= 8);
  const sA = getSentences(textA);
  const sB = getSentences(textB);
  if (!sA.length || !sB.length) return { overlapRatio: 0 };

  let duplicateCount = 0;
  for (const sent of sB) {
    if (sA.some(a => a.includes(sent) || sent.includes(a))) {
      duplicateCount++;
    }
  }
  return { overlapRatio: duplicateCount / sB.length };
}

/**
 * Review As Judge: Generates 7 evaluation dimensions analysis and scorecard
 */
export function reviewAsJudge(project) {
  const issues = validateProject(project);
  const sections = project.sections || {};

  const errorCount = issues.filter(i => i.level === 'error').length;
  const warningCount = issues.filter(i => i.level === 'warning').length;

  // Mechanical scoring for 7 dimensions (1 to 5)
  const dimensions = EVALUATION_DIMENSIONS.map(dim => {
    let score = 5;
    const evidenceList = [];
    const fixList = [];

    if (dim.name === '問題明確性') {
      const motWc = countWords((sections.motivation && sections.motivation.markdown) || '');
      if (motWc < 250) {
        score -= 2;
        evidenceList.push(`前言與開發動機字數僅 ${motWc} 字，痛點論述不充分。`);
        fixList.push('補充具體數據或實際案例說明產業痛點。');
      } else {
        evidenceList.push('動機與背景篇幅適中。');
      }
      if (!/統計|依據|調研|訪談|數據|每年|平均/.test(sections.motivation?.markdown || '')) {
        score -= 1;
        evidenceList.push('缺乏數據或調研佐證。');
        fixList.push('加入客觀統計來源或問卷數據佐證。');
      }
    } else if (dim.name === '創新與差異化') {
      const compMd = sections.competitor?.markdown || '';
      if (!compMd) {
        score = 1;
        evidenceList.push('尚未填寫競品分析。');
        fixList.push('請詳述至少 3 個競品並列出對照表。');
      } else if (!/\|.+?\|/.test(compMd)) {
        score -= 2;
        evidenceList.push('未包含競品功能對照表。');
        fixList.push('新增競品功能比較表格，明確標示本系統特色。');
      } else {
        evidenceList.push('具備競品對照表與差異化說明。');
      }
    } else if (dim.name === '技術可行性') {
      const archMd = sections.architecture?.markdown || '';
      if (!archMd) {
        score = 1;
        evidenceList.push('尚未填寫系統架構與技術設計。');
      } else {
        if (/架構|層|模組|API|資料|資料庫/.test(archMd)) {
          evidenceList.push('包含系統分層與技術模組說明。');
        } else {
          score -= 1;
          fixList.push('補充系統架構分層與資料傳輸細節。');
        }
        if (!/風險|因應|安全/.test(archMd)) {
          score -= 1;
          fixList.push('增加技術風險與安全性考量。');
        }
      }
    } else if (dim.name === '效益可衡量性') {
      const schedMd = sections.schedule?.markdown || '';
      if (!schedMd) {
        score = 1;
        evidenceList.push('尚未填寫時程與預期效益。');
      } else if (!/\d+[%％]/.test(schedMd)) {
        score -= 2;
        evidenceList.push('效益缺乏量化百分比指標。');
        fixList.push('將預期效益改寫為指標＋目標值（如「提升 30% 效率」）。');
      } else {
        evidenceList.push('預期效益包含具體百分比量化目標。');
      }
    } else if (dim.name === '時程合理性') {
      const schedMd = sections.schedule?.markdown || '';
      if (!schedMd) {
        score = 1;
      } else if (!/\|.+?\|/.test(schedMd) && !/階段|里程碑|M\d/.test(schedMd)) {
        score -= 2;
        evidenceList.push('缺乏結構化時程表或里程碑。');
        fixList.push('建議使用甘特圖或階段里程碑表格。');
      } else {
        evidenceList.push('具備清楚的階段規劃與交付產出。');
      }
    } else if (dim.name === '完整度與一致性') {
      if (errorCount > 0) score -= Math.min(3, errorCount);
      if (warningCount > 0) score -= Math.min(1, warningCount);
      evidenceList.push(`檢查報告發現 ${errorCount} 個錯誤、${warningCount} 個警告。`);
    } else if (dim.name === '精簡度') {
      const longSecs = issues.filter(i => i.id === 'V004' || i.id === 'V003');
      if (longSecs.length > 0) {
        score -= Math.min(2, longSecs.length);
        evidenceList.push(`有 ${longSecs.length} 處段落過長或章節超出建議上限。`);
        fixList.push('刪除空話形容詞，長段落進行拆分。');
      } else {
        evidenceList.push('段落長度與字數適當，行文緊湊。');
      }
    }

    score = Math.max(1, Math.min(5, score));

    return {
      name: dim.name,
      description: dim.description,
      score: score,
      max: 5,
      evidence: evidenceList.join('；') || '大致符合規範。',
      fix: fixList.join('；') || '維持現有水準。'
    };
  });

  // Cross checks
  const crossChecks = [
    {
      rule: '痛點 → 功能 → 效益連貫性',
      passed: Boolean(
        sections.motivation?.markdown &&
        sections.analysis?.markdown &&
        sections.schedule?.markdown
      ),
      result: (sections.motivation?.markdown && sections.analysis?.markdown && sections.schedule?.markdown)
        ? '第二章痛點、第四章功能與第六章效益章節均已填寫，具備連貫脈絡。'
        : '部分核心章節尚未填寫完整，無法完整對應痛點與功能。'
    }
  ];

  const readyToSubmit = errorCount === 0 && dimensions.every(d => d.score >= 3);
  const topIssues = issues.filter(i => i.level === 'error').map(i => i.message);
  if (!topIssues.length && warningCount > 0) {
    topIssues.push(...issues.filter(i => i.level === 'warning').slice(0, 3).map(i => i.message));
  }

  return {
    overall: {
      readyToSubmit,
      scoreAverage: (dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length).toFixed(1),
      errorCount,
      warningCount,
      topIssues: topIssues.slice(0, 5)
    },
    dimensions,
    crossChecks,
    issues
  };
}
