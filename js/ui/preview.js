/**
 * Preview Renderer
 * Simulates A4 pagination (Section 4.5 & 4.7)
 */

import { SECTIONS_META, getProjectChapters } from '../core/guides.js';
import { parseMarkdownToIR } from '../core/md-parser.js';
import { irToHtml } from '../core/ir-to-html.js';
import { formatSubmitDate } from '../core/docx-builder.js';

export function renderLivePreview(project, container, zoom = 1.0) {
  if (!container) return;

  const cover = project.cover || {};
  const sections = project.sections || {};
  const settings = project.settings || {};
  const images = project.images || {};

  container.innerHTML = '';

  // -------------------------------------------------------------
  // 1. PAGE 1: COVER PAGE
  // -------------------------------------------------------------
  const coverPage = document.createElement('div');
  coverPage.className = 'a4-page cover-page';
  if (zoom !== 1.0) coverPage.style.transform = `scale(${zoom})`;

  // Top Section: Logo + Organization
  let logoHtml = '';
  if (cover.logoImageId && images[cover.logoImageId]) {
    const imgObj = images[cover.logoImageId];
    const src = imgObj.dataBase64.startsWith('data:') ? imgObj.dataBase64 : `data:${imgObj.mime || 'image/png'};base64,${imgObj.dataBase64}`;
    logoHtml = `<img src="${src}" class="cover-logo-img" alt="Logo" />`;
  }

  const orgHtml = cover.organization ? `<div class="cover-org">${escapeHtml(cover.organization)}</div>` : '';
  const categoryHtml = `<div class="cover-category">${escapeHtml(cover.category || '專案研究計畫書')}</div>`;

  // Center Section: Title ZH & EN
  const titleZhHtml = `<div class="cover-title-zh">${escapeHtml(cover.titleZh || '（請輸入計畫中文名稱）')}</div>`;
  const titleEnHtml = cover.titleEn ? `<div class="cover-title-en">${escapeHtml(cover.titleEn)}</div>` : '';

  // Middle-Bottom Section: Members & Advisors
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

  // Bottom Section: Submit Date
  const dateFormatted = formatSubmitDate(cover.submitDate, settings.dateStyle || 'roc');
  const dateHtml = `<div class="cover-date">${escapeHtml(dateFormatted)}</div>`;

  coverPage.innerHTML = `
    <div class="cover-top-box w-100">
      ${logoHtml}
      ${orgHtml}
      ${categoryHtml}
    </div>
    <div class="cover-mid-box w-100">
      ${titleZhHtml}
      ${titleEnHtml}
    </div>
    <div class="cover-bot-box w-100">
      ${infoTableHtml}
      ${dateHtml}
    </div>
  `;

  container.appendChild(coverPage);

  // -------------------------------------------------------------
  // 2. PARSE BODY CHAPTERS & BUILD TOC ENTRIES
  // -------------------------------------------------------------
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

    // Collect headings for TOC
    const headings = [];
    for (const b of parseRes.blocks) {
      if (b.type === 'heading' && b.level <= (settings.tocLevels || 2)) {
        headings.push({
          level: b.level,
          text: b.text
        });
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

  // -------------------------------------------------------------
  // 3. PAGE 2: TABLE OF CONTENTS (TOC)
  // -------------------------------------------------------------
  const tocPage = document.createElement('div');
  tocPage.className = 'a4-page';
  if (zoom !== 1.0) tocPage.style.transform = `scale(${zoom})`;

  let tocItemsHtml = '';
  // Estimate page assignment for TOC simulation
  let simulatedPage = 1;

  for (const ch of chapterEntries) {
    tocItemsHtml += `
      <div class="toc-item level-1">
        <span class="toc-item-title">${escapeHtml(ch.title)}</span>
        <span class="toc-item-leader"></span>
        <span class="toc-item-page">${simulatedPage}</span>
      </div>
    `;

    for (const h of ch.headings) {
      tocItemsHtml += `
        <div class="toc-item level-2">
          <span class="toc-item-title">${escapeHtml(h.text)}</span>
          <span class="toc-item-leader"></span>
          <span class="toc-item-page">${simulatedPage}</span>
        </div>
      `;
    }

    // Rough page estimation: every ~700 characters/words advances page
    const roughWords = ch.blocks.reduce((acc, b) => acc + (b.text ? b.text.length : 150), 0);
    simulatedPage += Math.max(1, Math.ceil(roughWords / 800));
  }

  const showPageNumber = settings.showPageNumber !== false;

  tocPage.innerHTML = `
    <div class="a4-body">
      <div class="toc-title">目　　錄</div>
      <div class="toc-container">
        ${tocItemsHtml || '<div class="text-muted text-center py-4">章節內容為空時目錄暫無項目</div>'}
      </div>
    </div>
    <div class="a4-footer" style="${showPageNumber ? '' : 'display:none;'}">i</div>
  `;
  container.appendChild(tocPage);

  // -------------------------------------------------------------
  // 4. BODY PAGES (PAGINATION SIMULATION)
  // -------------------------------------------------------------
  let currentPageIndex = 1;
  let currentPage = createEmptyA4Page(currentPageIndex, zoom, showPageNumber);
  let currentBody = currentPage.querySelector('.a4-body');
  container.appendChild(currentPage);

  for (let cIdx = 0; cIdx < chapterEntries.length; cIdx++) {
    const ch = chapterEntries[cIdx];

    // Chapter page break setting: if enabled and not the first chapter, start new page
    if (cIdx > 0 && settings.chapterPageBreak !== false) {
      currentPageIndex++;
      currentPage = createEmptyA4Page(currentPageIndex, zoom, showPageNumber);
      currentBody = currentPage.querySelector('.a4-body');
      container.appendChild(currentPage);
    }

    // Chapter Title
    const chTitleEl = document.createElement('h3');
    chTitleEl.className = 'doc-chapter-title';
    chTitleEl.textContent = ch.title;
    currentBody.appendChild(chTitleEl);

    // Section Content Blocks
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = ch.htmlContent;

    while (tempDiv.firstElementChild) {
      const child = tempDiv.firstElementChild;

      // Check forced pagebreak
      if (child.classList.contains('doc-pagebreak-marker')) {
        currentPageIndex++;
        currentPage = createEmptyA4Page(currentPageIndex, zoom, showPageNumber);
        currentBody = currentPage.querySelector('.a4-body');
        container.appendChild(currentPage);
        child.remove();
        continue;
      }

      // Check approximate height overflow (A4 usable content height is ~950px @ 96dpi)
      currentBody.appendChild(child);
      if (currentBody.scrollHeight > 920) {
        // Move overflowing element to next page
        currentBody.removeChild(child);
        currentPageIndex++;
        currentPage = createEmptyA4Page(currentPageIndex, zoom, showPageNumber);
        currentBody = currentPage.querySelector('.a4-body');
        container.appendChild(currentPage);
        currentBody.appendChild(child);
      }
    }
  }
}

function createEmptyA4Page(pageNumber, zoom = 1.0, showPageNumber = true) {
  const page = document.createElement('div');
  page.className = 'a4-page';
  if (zoom !== 1.0) page.style.transform = `scale(${zoom})`;

  page.innerHTML = `
    <div class="a4-body"></div>
    <div class="a4-footer" style="${showPageNumber ? '' : 'display:none;'}">第 ${pageNumber} 頁</div>
  `;
  return page;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
