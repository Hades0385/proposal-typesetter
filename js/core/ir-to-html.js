/**
 * IR to HTML Converter
 * Used for live A4 preview and print output
 */

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function runsToHtml(runs) {
  if (!runs || !runs.length) return '';

  return runs.map(run => {
    let content = escapeHtml(run.text);
    if (run.isCode) {
      content = `<code class="doc-inline-code">${content}</code>`;
    }
    if (run.bold) {
      content = `<strong>${content}</strong>`;
    }
    if (run.italic) {
      content = `<em>${content}</em>`;
    }
    if (run.strike) {
      content = `<del>${content}</del>`;
    }
    if (run.sub) {
      content = `<sub>${content}</sub>`;
    }
    if (run.sup) {
      content = `<sup>${content}</sup>`;
    }
    if (run.link) {
      content = `<a href="${escapeHtml(run.link)}" target="_blank" rel="noopener noreferrer" class="doc-link">${content}</a>`;
    }
    return content;
  }).join('');
}

/**
 * Converts IR blocks of a section to HTML string
 * @param {Array} blocks
 * @param {Object} images - Dict of images { [id]: { dataBase64, mime } }
 */
export function irToHtml(blocks, images = {}) {
  if (!blocks || !blocks.length) return '';

  const html = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const levelClass = `doc-heading-${block.level}`;
        const tag = block.level === 1 ? 'h4' : block.level === 2 ? 'h5' : 'h6';
        html.push(`<${tag} class="${levelClass}">${runsToHtml(block.runs)}</${tag}>`);
        break;
      }

      case 'paragraph': {
        html.push(`<p class="doc-body">${runsToHtml(block.runs)}</p>`);
        break;
      }

      case 'list': {
        html.push(renderListHtml(block.items));
        break;
      }

      case 'blockquote': {
        html.push(`<blockquote class="doc-quote">${runsToHtml(block.runs)}</blockquote>`);
        break;
      }

      case 'code_block': {
        html.push(`<pre class="doc-code"><code class="lang-${escapeHtml(block.language)}">${escapeHtml(block.code)}</code></pre>`);
        break;
      }

      case 'table': {
        html.push('<div class="doc-table-wrapper">');
        if (block.caption) {
          html.push(`<div class="doc-caption doc-table-caption">${escapeHtml(block.caption)}</div>`);
        }
        html.push('<table class="doc-table">');
        if (block.headers && block.headers.length) {
          html.push('<thead><tr>');
          for (const h of block.headers) {
            html.push(`<th style="text-align: ${h.align};">${runsToHtml(h.runs)}</th>`);
          }
          html.push('</tr></thead>');
        }
        html.push('<tbody>');
        for (const row of block.rows) {
          html.push('<tr>');
          for (const cell of row) {
            html.push(`<td style="text-align: ${cell.align};">${runsToHtml(cell.runs)}</td>`);
          }
          html.push('</tr>');
        }
        html.push('</tbody></table></div>');
        break;
      }

      case 'image': {
        let imgSrc = block.src;
        if (imgSrc.startsWith('img:') || images[imgSrc]) {
          const imgId = imgSrc.startsWith('img:') ? imgSrc.slice(4) : imgSrc;
          const imgObj = images[imgId] || images[imgSrc];
          if (imgObj && imgObj.dataBase64) {
            const mime = imgObj.mime || 'image/png';
            imgSrc = imgObj.dataBase64.startsWith('data:') ? imgObj.dataBase64 : `data:${mime};base64,${imgObj.dataBase64}`;
          }
        }

        html.push('<div class="doc-figure-wrapper">');
        html.push(`<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(block.captionRaw || '')}" class="doc-figure-img" />`);
        if (block.caption) {
          html.push(`<div class="doc-caption doc-figure-caption">${escapeHtml(block.caption)}</div>`);
        }
        html.push('</div>');
        break;
      }

      case 'hr': {
        html.push('<hr class="doc-hr" />');
        break;
      }

      case 'pagebreak': {
        html.push('<div class="doc-pagebreak-marker"><span class="badge bg-secondary">── 強制分頁符號 ──</span></div>');
        break;
      }

      default:
        break;
    }
  }

  return html.join('\n');
}

function renderListHtml(items) {
  if (!items || !items.length) return '';

  const out = [];
  let currentLevel = 0;
  let listStack = []; // stores 'ol' or 'ul'

  for (const item of items) {
    const isOrdered = item.isOrdered;
    const tag = isOrdered ? 'ol' : 'ul';
    const targetLevel = item.level || 0;

    while (currentLevel < targetLevel) {
      out.push(`<${tag} class="doc-list">`);
      listStack.push(tag);
      currentLevel++;
    }
    while (currentLevel > targetLevel) {
      const closingTag = listStack.pop();
      out.push(`</${closingTag}>`);
      currentLevel--;
    }

    if (listStack.length === 0) {
      out.push(`<${tag} class="doc-list">`);
      listStack.push(tag);
    }

    out.push(`<li>${runsToHtml(item.runs)}</li>`);
  }

  while (listStack.length > 0) {
    const closingTag = listStack.pop();
    out.push(`</${closingTag}>`);
  }

  return out.join('\n');
}
