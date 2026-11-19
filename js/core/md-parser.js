/**
 * Core Markdown Parser
 * Section 6.1 & 6.2: Line-by-line parsing into Intermediate Representation (IR)
 */

import { normalizeLine } from './normalize.js';

// Numbering helpers
const CHINESE_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

export function getChineseNumber(n) {
  if (n <= 20) return CHINESE_NUMS[n - 1] || `${n}`;
  return `${n}`;
}

/**
 * Splits text into inline runs (bold, italic, code, sub/sup, link, text)
 */
export function parseInline(text) {
  if (!text) return [];

  const tokens = [];
  // Tokenize regex patterns
  // 1: Code `...`
  // 2: Bold-Italic ***...***
  // 3: Bold **...**
  // 4: Italic *...*
  // 5: Strikethrough ~~...~~
  // 6: Subscript ~...~
  // 7: Superscript ^...^
  // 8: Link [...](...)
  const regex = /(`([^`]+)`)|(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(~~([^~]+)~~)|(~([^~]+)~)|(\^([^^]+)\^)|(\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const rawText = text.slice(lastIndex, match.index);
      tokens.push(...segmentTextRuns(rawText, {}));
    }

    if (match[1]) {
      // Inline code
      tokens.push({
        text: match[2],
        isCode: true,
        font: 'Consolas'
      });
    } else if (match[3]) {
      // Bold Italic
      tokens.push(...segmentTextRuns(match[4], { bold: true, italic: true }));
    } else if (match[5]) {
      // Bold
      tokens.push(...segmentTextRuns(match[6], { bold: true }));
    } else if (match[7]) {
      // Italic
      tokens.push(...segmentTextRuns(match[8], { italic: true }));
    } else if (match[9]) {
      // Strikethrough
      tokens.push(...segmentTextRuns(match[10], { strike: true }));
    } else if (match[11]) {
      // Subscript
      tokens.push(...segmentTextRuns(match[12], { sub: true }));
    } else if (match[13]) {
      // Superscript
      tokens.push(...segmentTextRuns(match[14], { sup: true }));
    } else if (match[15]) {
      // Link
      tokens.push({
        text: match[16],
        link: match[17],
        ...segmentTextProps(match[16])
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const rawText = text.slice(lastIndex);
    tokens.push(...segmentTextRuns(rawText, {}));
  }

  return tokens;
}

/**
 * Segment text into CJK (EastAsia) runs and Latin/Number (Times New Roman) runs
 */
function segmentTextProps(text) {
  return { isCJK: isMostlyCJK(text) };
}

function isMostlyCJK(char) {
  return /[\u4e00-\u9fa5\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff01-\uff60\uffe0-\uffe6]/.test(char);
}

export function segmentTextRuns(text, baseProps = {}) {
  if (!text) return [];

  const runs = [];
  let currentText = '';
  let currentIsCJK = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isCJK = isMostlyCJK(char);

    if (currentIsCJK === null) {
      currentIsCJK = isCJK;
      currentText = char;
    } else if (currentIsCJK === isCJK) {
      currentText += char;
    } else {
      runs.push({
        text: currentText,
        isCJK: currentIsCJK,
        ...baseProps
      });
      currentIsCJK = isCJK;
      currentText = char;
    }
  }

  if (currentText.length > 0) {
    runs.push({
      text: currentText,
      isCJK: currentIsCJK,
      ...baseProps
    });
  }

  return runs;
}

/**
 * Parses raw chapter markdown into IR blocks
 * @param {string} rawMarkdown
 * @param {object} options { autoHeadingNumber: true, figureStartIndex: 1, tableStartIndex: 1 }
 */
export function parseMarkdownToIR(rawMarkdown, options = {}) {
  const {
    autoHeadingNumber = true,
    figureStartIndex = 1,
    tableStartIndex = 1
  } = options;

  let figureCounter = figureStartIndex;
  let tableCounter = tableStartIndex;

  const blocks = [];
  if (!rawMarkdown || typeof rawMarkdown !== 'string') return { blocks, figureCounter, tableCounter };

  const unified = rawMarkdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = unified.split('\n');

  let inCode = false;
  let codeLang = '';
  let codeBuffer = [];

  // Track heading numbering
  let h1Count = 0;
  let h2Count = 0;
  let h3Count = 0;

  let pendingTableCaption = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Fence
    if (trimmed.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = trimmed.replace(/^```/, '').trim();
        codeBuffer = [];
      } else {
        inCode = false;
        blocks.push({
          type: 'code_block',
          language: codeLang,
          code: codeBuffer.join('\n')
        });
        codeBuffer = [];
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(rawLine);
      continue;
    }

    // 2. Empty Line (Ignore per R2)
    if (trimmed === '') {
      continue;
    }

    // 3. Force Pagebreak
    if (trimmed === '<!--pagebreak-->') {
      blocks.push({ type: 'pagebreak' });
      continue;
    }

    // 4. Horizontal Rule
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      continue;
    }

    // 5. Image: ![caption](src)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const captionText = imgMatch[1].trim();
      const src = imgMatch[2].trim();
      const figNum = figureCounter++;
      const fullCaption = captionText ? `圖 ${figNum}　${captionText}` : `圖 ${figNum}`;

      blocks.push({
        type: 'image',
        number: figNum,
        caption: fullCaption,
        captionRaw: captionText,
        src: src
      });
      continue;
    }

    // Check for Table Caption: "表：標題" or "[表] 標題"
    const tableCaptionMatch = trimmed.match(/^(?:表[：:]\s*|\[表\]\s*)(.+)$/);
    if (tableCaptionMatch && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      pendingTableCaption = tableCaptionMatch[1].trim();
      continue;
    }

    // 6. GFM Table Row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
        tableRows.push(lines[j].trim());
        j++;
      }
      i = j - 1; // Advance outer loop

      // Parse table
      const parsedTable = parseTableBlock(tableRows, pendingTableCaption, tableCounter);
      if (parsedTable) {
        if (parsedTable.caption) tableCounter++;
        blocks.push(parsedTable);
      }
      pendingTableCaption = null;
      continue;
    }

    // 7. Headings: #, ##, ###
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let title = normalizeLine(headingMatch[2]);

      let prefix = '';
      if (level === 1) {
        h1Count++;
        h2Count = 0;
        h3Count = 0;
        if (autoHeadingNumber && !/^（[一二三四五六七八九十]+）/.test(title)) {
          prefix = `（${getChineseNumber(h1Count)}）`;
        }
      } else if (level === 2) {
        h2Count++;
        h3Count = 0;
        if (autoHeadingNumber && !/^\d+\./.test(title)) {
          prefix = `${h2Count}. `;
        }
      } else if (level === 3) {
        h3Count++;
        if (autoHeadingNumber && !/^\(\d+\)/.test(title)) {
          prefix = `(${h3Count}) `;
        }
      }

      const displayTitle = prefix ? `${prefix}${title}` : title;
      blocks.push({
        type: 'heading',
        level: level, // 1: 節 (14pt), 2: 小節 (12pt), 3: 細節 (12pt)
        outlineLevel: level + 1, // Heading 1 is outline 2 in Word, Heading 2 is outline 3
        text: displayTitle,
        rawTitle: title,
        prefix: prefix,
        runs: parseInline(displayTitle)
      });
      continue;
    }

    // 8. Blockquote: > text
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('>')) {
        quoteLines.push(lines[j].trim().replace(/^>\s*/, ''));
        j++;
      }
      i = j - 1;
      const combinedText = quoteLines.map(normalizeLine).join('\n');
      blocks.push({
        type: 'blockquote',
        text: combinedText,
        runs: parseInline(combinedText)
      });
      continue;
    }

    // 9. Lists (ordered or unordered)
    const listMatch = rawLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const listItems = [];
      let j = i;
      while (j < lines.length) {
        const itemMatch = lines[j].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!itemMatch) break;
        const indentSpaces = itemMatch[1].length;
        const marker = itemMatch[2];
        const isOrdered = /^\d+\./.test(marker);
        const itemText = normalizeLine(itemMatch[3]);
        const level = Math.min(3, Math.floor(indentSpaces / 2));

        listItems.push({
          level,
          marker,
          isOrdered,
          text: itemText,
          runs: parseInline(itemText)
        });
        j++;
      }
      i = j - 1;
      blocks.push({
        type: 'list',
        items: listItems
      });
      continue;
    }

    // 10. Normal Paragraph (Single line = single paragraph per R1, R3, R4)
    const cleanedLine = normalizeLine(rawLine);
    if (cleanedLine.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: cleanedLine,
        runs: parseInline(cleanedLine)
      });
    }
  }

  return {
    blocks,
    figureCounter,
    tableCounter
  };
}

/**
 * Parses markdown table rows
 */
function parseTableBlock(rows, caption, tableCounter) {
  if (rows.length < 2) return null;

  // Header row
  const headerCells = splitTableRow(rows[0]);
  if (!headerCells.length) return null;

  // Alignment delimiter row
  let dataStartIndex = 1;
  const alignments = [];
  if (rows.length > 1 && /^[|:\-\s]+$/.test(rows[1])) {
    const alignCells = splitTableRow(rows[1]);
    for (const cell of alignCells) {
      const trimmed = cell.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
        alignments.push('center');
      } else if (trimmed.endsWith(':')) {
        alignments.push('right');
      } else {
        alignments.push('left');
      }
    }
    dataStartIndex = 2;
  }

  const dataRows = [];
  for (let r = dataStartIndex; r < rows.length; r++) {
    const cells = splitTableRow(rows[r]);
    dataRows.push(cells.map((c, colIdx) => ({
      text: normalizeLine(c),
      align: alignments[colIdx] || 'left',
      runs: parseInline(normalizeLine(c))
    })));
  }

  const parsedHeaders = headerCells.map((h, colIdx) => ({
    text: normalizeLine(h),
    align: alignments[colIdx] || 'center',
    runs: parseInline(normalizeLine(h))
  }));

  let fullCaption = null;
  if (caption) {
    fullCaption = `表 ${tableCounter}　${caption}`;
  }

  return {
    type: 'table',
    caption: fullCaption,
    captionRaw: caption,
    number: caption ? tableCounter : null,
    headers: parsedHeaders,
    alignments: alignments,
    rows: dataRows
  };
}

function splitTableRow(rowStr) {
  const content = rowStr.trim().replace(/^\|/, '').replace(/\|$/, '');
  return content.split('|').map(s => s.trim());
}
