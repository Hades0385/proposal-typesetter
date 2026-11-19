/**
 * DOCX Document Builder
 * Generates Word (.docx) strictly conforming to Section 3, 6, and 10
 * Optimized to match the web preview's typesetting, fonts, margins, and page layout
 */

import { SECTIONS_META, getProjectChapters } from './guides.js';
import { parseMarkdownToIR } from './md-parser.js';

// Resolve docx library in both browser and Node
async function getDocx(injectedDocx) {
  if (injectedDocx) return injectedDocx;
  if (typeof window !== 'undefined' && window.docx) {
    return window.docx;
  }
  return await import('docx');
}

/**
 * Formats a date string (YYYY-MM-DD) into ROC or CE display
 */
export function formatSubmitDate(dateStr, style = 'roc') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (style === 'roc') {
    const rocYear = year - 1911;
    return `中華民國 ${rocYear} 年 ${month} 月 ${day} 日`;
  }
  return `${year} 年 ${month} 月 ${day} 日`;
}

/**
 * Builds the complete DOCX Document object
 * @param {Object} project
 * @param {Object} injectedDocx - Optional docx library object
 */
export async function buildDocxDocument(project, injectedDocx = null) {
  const docx = await getDocx(injectedDocx);
  const {
    Document, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
    Footer, PageNumber, NumberFormat, ImageRun, TableOfContents,
    TabStopType, TabStopPosition, LeaderType
  } = docx;

  const cover = project.cover || {};
  const sections = project.sections || {};
  const settings = project.settings || {};
  const images = project.images || {};

  // Exact Font Specification (Section 3.1): Chinese: 標楷體, English/Numbers: Times New Roman
  const fontConfig = {
    ascii: 'Times New Roman',
    hAnsi: 'Times New Roman',
    eastAsia: '標楷體',
    cs: 'Times New Roman'
  };

  // Page Margins (Section 3.2): Top 2.54cm, Bottom 2.54cm, Left 3.17cm, Right 3.17cm
  const pageMargins = {
    top: 1440,    // 2.54 cm = 1 inch = 1440 twips
    bottom: 1440, // 2.54 cm
    left: 1797,   // 3.17 cm = 1.248 inch = 1797 twips
    right: 1797   // 3.17 cm
  };

  function makeRun(text, opts = {}) {
    return new TextRun({
      text,
      font: fontConfig,
      color: opts.color || '000000',
      ...opts
    });
  }

  // -------------------------------------------------------------
  // SECTION 1: COVER PAGE (A4, Centered Layout)
  // -------------------------------------------------------------
  const coverChildren = [];

  // Top spacing
  coverChildren.push(new Paragraph({ spacing: { before: 480, after: 120 } }));

  // Logo (if any)
  if (cover.logoImageId && images[cover.logoImageId]) {
    try {
      const imgData = images[cover.logoImageId].dataBase64;
      const cleanB64 = imgData.replace(/^data:[^;]+;base64,/, '');
      const bytes = base64ToUint8Array(cleanB64);
      const logoDim = getImageDimensions(bytes);
      let logoW = 110;
      let logoH = 110;
      if (logoDim && logoDim.width && logoDim.height) {
        const logoAspect = logoDim.width / logoDim.height;
        if (logoAspect >= 1) {
          logoW = 110;
          logoH = Math.round(110 / logoAspect);
        } else {
          logoH = 110;
          logoW = Math.round(110 * logoAspect);
        }
      }
      coverChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new ImageRun({
            data: bytes,
            transformation: { width: logoW, height: logoH }
          })
        ]
      }));
    } catch (e) {
      console.warn('Failed to embed cover logo:', e);
    }
  }

  // Organization (16 pt bold, centered)
  if (cover.organization) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        makeRun(cover.organization, { size: 32, bold: true })
      ]
    }));
  }

  // Category (20 pt bold, centered)
  const categoryText = cover.category || '大專生專題研究計畫書';
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 720 },
    children: [
      makeRun(categoryText, { size: 40, bold: true })
    ]
  }));

  // Chinese Title (24 pt bold, centered)
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240, line: 360 },
    children: [
      makeRun(cover.titleZh || '計畫中文名稱', { size: 48, bold: true })
    ]
  }));

  // English Title (16 pt italic, Times New Roman, centered)
  if (cover.titleEn) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 840 },
      children: [
        makeRun(cover.titleEn, { size: 32, italics: true })
      ]
    }));
  } else {
    coverChildren.push(new Paragraph({ spacing: { after: 840 } }));
  }

  // Info Table: Members & Advisors (Width 85%, Centered)
  const infoRows = [];

  // Members
  if (Array.isArray(cover.members) && cover.members.length > 0) {
    const memberStr = cover.members.map(m => {
      const parts = [m.name];
      if (m.studentId) parts.push(`(${m.studentId})`);
      if (m.role) parts.push(`- ${m.role}`);
      return parts.join(' ');
    }).join('\n');

    infoRows.push(createInfoRow('執行團隊成員：', memberStr));
  }

  // Advisors
  if (Array.isArray(cover.advisors) && cover.advisors.length > 0) {
    const advStr = cover.advisors.map(a => `${a.name || ''} ${a.title || ''}`.trim()).join('、');
    if (advStr) {
      infoRows.push(createInfoRow('指導老師：', advStr));
    }
  }

  // Period
  if (cover.period) {
    infoRows.push(createInfoRow('執行期間：', cover.period));
  }

  if (infoRows.length > 0) {
    const infoTable = new Table({
      width: { size: 85, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: infoRows
    });
    coverChildren.push(infoTable);
  }

  // Bottom Submit Date (14 pt bold, centered)
  coverChildren.push(new Paragraph({ spacing: { before: 1200, after: 240 } }));
  const formattedDate = formatSubmitDate(cover.submitDate, settings.dateStyle || 'roc');
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      makeRun(formattedDate, { size: 28, bold: true })
    ]
  }));

  function createInfoRow(label, value) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 38, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { line: 360, before: 40, after: 40 },
              children: [makeRun(label, { size: 24, bold: true })]
            })
          ]
        }),
        new TableCell({
          width: { size: 62, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: value.split('\n').map(line =>
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { line: 360, before: 40, after: 40 },
              children: [makeRun(line, { size: 24 })]
            })
          )
        })
      ]
    });
  }

  // -------------------------------------------------------------
  // PRE-PARSE CHAPTERS & BUILD TOC ENTRIES
  // -------------------------------------------------------------
  const chapterEntries = [];
  let figureCounter = 1;
  let tableCounter = 1;
  const projectChapters = getProjectChapters(project);

  for (const ch of projectChapters) {
    const md = (ch.markdown || '').trim();
    if (!ch.required && !md) continue;

    const parseResult = parseMarkdownToIR(md, {
      autoHeadingNumber: settings.autoHeadingNumber !== false,
      figureStartIndex: figureCounter,
      tableStartIndex: tableCounter
    });
    figureCounter = parseResult.figureCounter;
    tableCounter = parseResult.tableCounter;

    const headings = [];
    for (const b of parseResult.blocks) {
      if (b.type === 'heading' && b.level <= (settings.tocLevels || 2)) {
        headings.push({ level: b.level, text: b.text });
      }
    }

    const fullTitle = ch.number ? `${ch.number}、${ch.title}` : ch.title;

    chapterEntries.push({
      meta: ch,
      title: fullTitle,
      blocks: parseResult.blocks,
      headings
    });
  }

  // -------------------------------------------------------------
  // SECTION 2: TABLE OF CONTENTS (TOC)
  // -------------------------------------------------------------
  const tocChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 480 },
      children: [
        makeRun('目　　錄', { size: 32, bold: true }) // 16 pt
      ]
    }),
    new TableOfContents('目　錄', {
      hyperlink: true,
      headingStyleRange: '1-2'
    })
  ];

  // Pre-formatted TOC fallback entries with dot leaders for immediate fidelity
  let simPage = 1;
  for (const ch of chapterEntries) {
    tocChildren.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: LeaderType.DOT }],
      spacing: { line: 360, before: 60, after: 60 },
      children: [
        makeRun(ch.title, { size: 24, bold: true }),
        new TextRun('\t'),
        makeRun(String(simPage), { size: 22 })
      ]
    }));

    for (const h of ch.headings) {
      tocChildren.push(new Paragraph({
        indent: { left: 360 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: LeaderType.DOT }],
        spacing: { line: 360, before: 40, after: 40 },
        children: [
          makeRun(h.text, { size: 24 }),
          new TextRun('\t'),
          makeRun(String(simPage), { size: 22 })
        ]
      }));
    }

    const roughWords = ch.blocks.reduce((acc, b) => acc + (b.text ? b.text.length : 150), 0);
    simPage += Math.max(1, Math.ceil(roughWords / 800));
  }

  // -------------------------------------------------------------
  // SECTION 3: BODY CONTENT
  // -------------------------------------------------------------
  const bodyChildren = [];
  let isFirstChapter = true;

  for (const ch of chapterEntries) {
    const meta = ch.meta;
    const pageBreakBefore = (!isFirstChapter && settings.chapterPageBreak !== false);

    // Chapter Title: 16 pt bold, outlineLevel 1
    bodyChildren.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: pageBreakBefore,
      keepNext: true,
      spacing: { before: 360, after: 240, line: 360 },
      children: [
        makeRun(ch.title, { size: 32, bold: true })
      ]
    }));

    isFirstChapter = false;

    // Convert IR blocks to docx elements
    for (const block of ch.blocks) {
      switch (block.type) {
        case 'heading': {
          const headingLevel = block.level === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
          const headingSize = block.level === 1 ? 28 : 24; // 14 pt or 12 pt
          const spacingBefore = block.level === 1 ? 240 : 180;
          const spacingAfter = block.level === 1 ? 120 : 80;

          bodyChildren.push(new Paragraph({
            heading: headingLevel,
            keepNext: true,
            spacing: { before: spacingBefore, after: spacingAfter, line: 360 },
            children: block.runs.map(r => convertRunToDocx(r, makeRun, { size: headingSize, bold: true }))
          }));
          break;
        }

        case 'paragraph': {
          // Body paragraph: first line indent 2 characters (480 twips), 1.5 line spacing (360), justified, widowControl
          bodyChildren.push(new Paragraph({
            alignment: settings.justify !== false ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
            indent: { firstLine: 480 },
            spacing: { line: 360, before: 0, after: 0 },
            children: block.runs.map(r => convertRunToDocx(r, makeRun, { size: 24 }))
          }));
          break;
        }

        case 'list': {
          for (const item of block.items) {
            const indentLevel = item.level || 0;
            const bulletPrefix = item.marker ? `${item.marker} ` : '• ';
            bodyChildren.push(new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 480 * (indentLevel + 1), hanging: 240 },
              spacing: { line: 360, before: 40, after: 40 },
              children: [
                makeRun(bulletPrefix, { size: 24, bold: item.isOrdered }),
                ...item.runs.map(r => convertRunToDocx(r, makeRun, { size: 24 }))
              ]
            }));
          }
          break;
        }

        case 'blockquote': {
          bodyChildren.push(new Paragraph({
            alignment: AlignmentType.LEFT,
            indent: { left: 720, right: 360 },
            spacing: { line: 360, before: 120, after: 120 },
            borders: {
              left: { style: BorderStyle.SINGLE, size: 24, color: 'ADB5BD' }
            },
            children: block.runs.map(r => convertRunToDocx(r, makeRun, { size: 22, italics: true }))
          }));
          break;
        }

        case 'code_block': {
          const codeLines = block.code.split('\n');
          for (const cLine of codeLines) {
            bodyChildren.push(new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 480 },
              spacing: { line: 240, before: 0, after: 0 },
              children: [
                new TextRun({
                  text: cLine || ' ',
                  font: { name: 'Consolas' },
                  size: 20
                })
              ]
            }));
          }
          break;
        }

        case 'table': {
          if (block.caption) {
            bodyChildren.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              keepNext: true,
              spacing: { before: 240, after: 100 },
              children: [
                makeRun(block.caption, { size: 20, bold: true }) // 10 pt
              ]
            }));
          }

          const docxRows = [];

          // Header Row
          if (block.headers && block.headers.length) {
            docxRows.push(new TableRow({
              tableHeader: true,
              cantSplit: true,
              children: block.headers.map(h => new TableCell({
                shading: { type: ShadingType.SOLID, fill: 'EAECEF' },
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
                children: [
                  new Paragraph({
                    alignment: getDocxAlignment(h.align, AlignmentType),
                    spacing: { before: 60, after: 60 },
                    children: h.runs.map(r => convertRunToDocx(r, makeRun, { size: 22, bold: true }))
                  })
                ]
              }))
            }));
          }

          // Data Rows
          for (const row of block.rows) {
            docxRows.push(new TableRow({
              cantSplit: true,
              children: row.map(cell => new TableCell({
                margins: { top: 80, bottom: 80, left: 140, right: 140 },
                children: [
                  new Paragraph({
                    alignment: getDocxAlignment(cell.align, AlignmentType),
                    spacing: { before: 60, after: 60 },
                    children: cell.runs.map(r => convertRunToDocx(r, makeRun, { size: 22 }))
                  })
                ]
              }))
            }));
          }

          bodyChildren.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: '495057' },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '495057' },
              left: { style: BorderStyle.SINGLE, size: 6, color: '495057' },
              right: { style: BorderStyle.SINGLE, size: 6, color: '495057' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'CED4DA' },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CED4DA' }
            },
            rows: docxRows
          }));
          bodyChildren.push(new Paragraph({ spacing: { after: 180 } }));
          break;
        }

        case 'image': {
          let imgBytes = null;
          let imgSrc = block.src;
          if (imgSrc.startsWith('img:') || images[imgSrc]) {
            const imgId = imgSrc.startsWith('img:') ? imgSrc.slice(4) : imgSrc;
            const imgObj = images[imgId] || images[imgSrc];
            if (imgObj && imgObj.dataBase64) {
              const cleanB64 = imgObj.dataBase64.replace(/^data:[^;]+;base64,/, '');
              imgBytes = base64ToUint8Array(cleanB64);
            }
          } else if (imgSrc.startsWith('data:image/')) {
            const cleanB64 = imgSrc.replace(/^data:[^;]+;base64,/, '');
            imgBytes = base64ToUint8Array(cleanB64);
          }

          if (imgBytes) {
            try {
              const { width: targetW, height: targetH } = calculateImageDimensions(imgBytes, 440, 520);
              bodyChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 100 },
                keepNext: true,
                children: [
                  new ImageRun({
                    data: imgBytes,
                    transformation: { width: targetW, height: targetH }
                  })
                ]
              }));
            } catch (err) {
              console.warn('Failed to embed body image:', err);
            }
          }

          if (block.caption) {
            bodyChildren.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              children: [
                makeRun(block.caption, { size: 20, color: '000000' }) // 10 pt
              ]
            }));
          }
          break;
        }

        case 'pagebreak': {
          bodyChildren.push(new Paragraph({
            pageBreakBefore: true
          }));
          break;
        }

        default:
          break;
      }
    }
  }

  // -------------------------------------------------------------
  // BUILD FULL DOCUMENT OBJECT
  // -------------------------------------------------------------
  const doc = new Document({
    creator: (cover.members || []).map(m => m.name).join(', ') || '提案團隊',
    title: cover.titleZh || '專案計劃書',
    description: cover.category || '大專生專題研究計畫書',
    features: {
      updateFields: true
    },
    styles: {
      default: {
        document: {
          run: {
            font: fontConfig,
            size: 24,
            color: '000000'
          },
          paragraph: {
            spacing: { line: 360, before: 0, after: 0 }
          }
        },
        heading1: {
          run: {
            font: fontConfig,
            size: 32,
            bold: true,
            color: '000000'
          }
        },
        heading2: {
          run: {
            font: fontConfig,
            size: 28,
            bold: true,
            color: '000000'
          }
        },
        heading3: {
          run: {
            font: fontConfig,
            size: 24,
            bold: true,
            color: '000000'
          }
        }
      }
    },
    sections: [
      // 1. Cover Section
      {
        properties: {
          page: {
            margin: pageMargins
          }
        },
        children: coverChildren
      },
      // 2. TOC Section
      {
        properties: {
          page: {
            margin: pageMargins,
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.LOWER_ROMAN
            }
          }
        },
        ...(settings.showPageNumber !== false ? {
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    makeRun('', { children: [PageNumber.CURRENT], size: 20 })
                  ]
                })
              ]
            })
          }
        } : {}),
        children: tocChildren
      },
      // 3. Body Section
      {
        properties: {
          page: {
            margin: pageMargins,
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL
            }
          }
        },
        ...(settings.showPageNumber !== false ? {
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    makeRun('第 ', { size: 20 }),
                    makeRun('', { children: [PageNumber.CURRENT], size: 20 }),
                    makeRun(' 頁', { size: 20 })
                  ]
                })
              ]
            })
          }
        } : {}),
        children: bodyChildren
      }
    ]
  });

  return doc;
}

function convertRunToDocx(r, makeRun, overrides = {}) {
  const props = {
    color: '000000',
    ...overrides,
    bold: overrides.bold || r.bold,
    italics: overrides.italics || r.italic,
    strike: overrides.strike || r.strike,
    subScript: overrides.subScript || r.sub,
    superScript: overrides.superScript || r.sup
  };

  if (r.isCode) {
    return new TextRun({
      text: r.text,
      font: { name: 'Consolas' },
      size: (overrides.size || 24) - 2,
      color: '000000'
    });
  }

  return makeRun(r.text, props);
}

function getDocxAlignment(alignStr, AlignmentType) {
  if (alignStr === 'center') return AlignmentType.CENTER;
  if (alignStr === 'right') return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}

function base64ToUint8Array(base64) {
  if (typeof atob === 'function') {
    const raw = atob(base64);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
  }
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

/**
 * Extracts image dimensions (width & height) from Uint8Array bytes
 * Supports PNG, JPEG, GIF, and WEBP formats without external dependencies
 */
export function getImageDimensions(bytes) {
  if (!bytes || bytes.length < 8) return null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    if (bytes.length >= 24) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);
      if (width > 0 && height > 0) return { width, height };
    }
  }

  // 2. GIF: 'GIF87a' or 'GIF89a'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes.length >= 10) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint16(6, true);
    const height = view.getUint16(8, true);
    if (width > 0 && height > 0) return { width, height };
  }

  // 3. JPEG: FF D8
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    let offset = 2;
    const len = bytes.length;
    while (offset < len) {
      if (bytes[offset] !== 0xFF) { offset++; continue; }
      while (bytes[offset] === 0xFF && offset < len) offset++;
      if (offset >= len) break;
      const marker = bytes[offset];
      offset++;
      if (marker === 0xD9 || marker === 0xDA) break; // EOI or SOS
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        if (offset + 7 < len) {
          const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
          const height = view.getUint16(offset + 3, false);
          const width = view.getUint16(offset + 5, false);
          if (width > 0 && height > 0) return { width, height };
        }
        break;
      } else {
        if (offset + 2 > len) break;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const segLen = view.getUint16(offset, false);
        offset += segLen;
      }
    }
  }

  // 4. WEBP: RIFF....WEBP
  if (bytes.length >= 30 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    // Lossy VP8
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
      const width = ((bytes[27] << 8) | bytes[26]) & 0x3fff;
      const height = ((bytes[29] << 8) | bytes[28]) & 0x3fff;
      if (width > 0 && height > 0) return { width, height };
    }
    // Lossless VP8L
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x4C) {
      if (bytes.length >= 25 && bytes[20] === 0x2F) {
        const b1 = bytes[21], b2 = bytes[22], b3 = bytes[23], b4 = bytes[24];
        const width = 1 + (((b2 & 0x3F) << 8) | b1);
        const height = 1 + ((((b4 & 0xF) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6)));
        if (width > 0 && height > 0) return { width, height };
      }
    }
  }

  return null;
}

/**
 * Calculates proportionally scaled dimensions maintaining original aspect ratio
 */
export function calculateImageDimensions(bytes, maxWidth = 440, maxHeight = 520) {
  const dim = getImageDimensions(bytes);
  if (!dim || !dim.width || !dim.height) {
    return { width: 440, height: 260 };
  }
  const aspect = dim.width / dim.height;
  let targetWidth = dim.width;
  let targetHeight = dim.height;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    targetWidth = maxWidth;
    targetHeight = Math.round(targetWidth / aspect);
    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = Math.round(targetHeight * aspect);
    }
  }
  return { width: Math.max(1, targetWidth), height: Math.max(1, targetHeight) };
}
