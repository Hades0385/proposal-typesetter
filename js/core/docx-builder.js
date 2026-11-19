/**
 * DOCX Document Builder
 * Generates Word (.docx) conforming to Section 3, 6, and 10
 */

import { SECTIONS_META } from './guides.js';
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
    Footer, PageNumber, NumberFormat, ImageRun, TableOfContents
  } = docx;

  const cover = project.cover || {};
  const sections = project.sections || {};
  const settings = project.settings || {};
  const images = project.images || {};

  const fontConfig = {
    ascii: 'Times New Roman',
    hAnsi: 'Times New Roman',
    eastAsia: '標楷體',
    cs: 'Times New Roman'
  };

  const pageMargins = {
    top: 1440,    // 2.54 cm
    bottom: 1440, // 2.54 cm
    left: 1797,   // 3.17 cm
    right: 1797   // 3.17 cm
  };

  // Helper to create TextRun with standard font
  function makeRun(text, opts = {}) {
    return new TextRun({
      text,
      font: fontConfig,
      ...opts
    });
  }

  // -------------------------------------------------------------
  // SECTION 1: COVER PAGE
  // -------------------------------------------------------------
  const coverChildren = [];

  // Top spacing
  coverChildren.push(new Paragraph({ spacing: { before: 720, after: 240 } }));

  // Logo (if any)
  if (cover.logoImageId && images[cover.logoImageId]) {
    try {
      const imgData = images[cover.logoImageId].dataBase64;
      const cleanB64 = imgData.replace(/^data:[^;]+;base64,/, '');
      const bytes = base64ToUint8Array(cleanB64);
      coverChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [
          new ImageRun({
            data: bytes,
            transformation: { width: 120, height: 120 }
          })
        ]
      }));
    } catch (e) {
      console.warn('Failed to embed cover logo:', e);
    }
  }

  // Organization
  if (cover.organization) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        makeRun(cover.organization, { size: 32, bold: true }) // 16 pt
      ]
    }));
  }

  // Category
  const categoryText = cover.category || '專案研究計畫書';
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [
      makeRun(categoryText, { size: 40, bold: true }) // 20 pt
    ]
  }));

  // Chinese Title
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 360 },
    children: [
      makeRun(cover.titleZh || '計畫中文名稱', { size: 48, bold: true }) // 24 pt
    ]
  }));

  // English Title
  if (cover.titleEn) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1440 },
      children: [
        makeRun(cover.titleEn, { size: 32, italics: true }) // 16 pt
      ]
    }));
  } else {
    coverChildren.push(new Paragraph({ spacing: { after: 1440 } }));
  }

  // Members & Advisors Info Table
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
      width: { size: 80, type: WidthType.PERCENTAGE },
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

  // Bottom Submit Date
  coverChildren.push(new Paragraph({ spacing: { before: 1800, after: 240 } }));
  const formattedDate = formatSubmitDate(cover.submitDate, settings.dateStyle || 'roc');
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      makeRun(formattedDate, { size: 28, bold: true }) // 14 pt
    ]
  }));

  function createInfoRow(label, value) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { line: 360, before: 60, after: 60 },
              children: [makeRun(label, { size: 24, bold: true })]
            })
          ]
        }),
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          children: value.split('\n').map(line =>
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { line: 360, before: 60, after: 60 },
              children: [makeRun(line, { size: 24 })]
            })
          )
        })
      ]
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

  // -------------------------------------------------------------
  // SECTION 3: BODY CONTENT
  // -------------------------------------------------------------
  const bodyChildren = [];
  let figureCounter = 1;
  let tableCounter = 1;
  let isFirstChapter = true;

  for (const meta of SECTIONS_META) {
    const secData = sections[meta.key];
    const md = (secData && secData.markdown) ? secData.markdown.trim() : '';

    // If optional chapter is empty (e.g. references), skip per AC-01
    if (!meta.required && !md) {
      continue;
    }

    // Chapter Title: 16 pt bold, outlineLevel 1
    const chapterTitleText = `${meta.number}、${meta.title}`;
    const pageBreakBefore = (!isFirstChapter && settings.chapterPageBreak !== false);

    bodyChildren.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: pageBreakBefore,
      keepNext: true,
      spacing: { before: 360, after: 240 },
      children: [
        makeRun(chapterTitleText, { size: 32, bold: true }) // 16 pt
      ]
    }));

    isFirstChapter = false;

    // Parse Markdown to IR
    const parseResult = parseMarkdownToIR(md, {
      autoHeadingNumber: settings.autoHeadingNumber !== false,
      figureStartIndex: figureCounter,
      tableStartIndex: tableCounter
    });
    figureCounter = parseResult.figureCounter;
    tableCounter = parseResult.tableCounter;

    // Convert IR blocks to docx elements
    for (const block of parseResult.blocks) {
      switch (block.type) {
        case 'heading': {
          const headingLevel = block.level === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
          const headingSize = block.level === 1 ? 28 : 24; // 14 pt or 12 pt
          bodyChildren.push(new Paragraph({
            heading: headingLevel,
            keepNext: true,
            spacing: { before: 240, after: 120 },
            children: block.runs.map(r => convertRunToDocx(r, makeRun, { size: headingSize, bold: true }))
          }));
          break;
        }

        case 'paragraph': {
          // Body paragraph: first line indent 2 characters (480 twips), 1.5 line spacing (360), justified
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
              spacing: { line: 360, before: 60, after: 60 },
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
              spacing: { before: 240, after: 120 },
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
                children: [
                  new Paragraph({
                    alignment: getDocxAlignment(h.align, AlignmentType),
                    spacing: { before: 80, after: 80 },
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
                children: [
                  new Paragraph({
                    alignment: getDocxAlignment(cell.align, AlignmentType),
                    spacing: { before: 80, after: 80 },
                    children: cell.runs.map(r => convertRunToDocx(r, makeRun, { size: 22 }))
                  })
                ]
              }))
            }));
          }

          bodyChildren.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
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
              bodyChildren.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 120 },
                keepNext: true,
                children: [
                  new ImageRun({
                    data: imgBytes,
                    transformation: { width: 450, height: 260 }
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
                makeRun(block.caption, { size: 20 }) // 10 pt
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
    features: {
      updateFields: true
    },
    sections: [
      // 1. Cover
      {
        properties: {
          page: {
            margin: pageMargins
          }
        },
        children: coverChildren
      },
      // 2. TOC
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
        },
        children: tocChildren
      },
      // 3. Body
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
        },
        children: bodyChildren
      }
    ]
  });

  return doc;
}

function convertRunToDocx(r, makeRun, overrides = {}) {
  const props = {
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
      size: (overrides.size || 24) - 2
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
  // Node.js fallback
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}
