/**
 * Editor UI Manager
 * Handles Cover editing and Chapter Markdown editing with toolbar & word count
 */

import { SECTIONS_META, getProjectChapters, removeChapter } from '../core/guides.js';
import { countWords } from '../core/validator.js';
import { normalizeText } from '../core/normalize.js';

export function renderEditor(container, project, activeKey, onUpdate) {
  if (!container) return;

  if (activeKey === 'cover') {
    renderCoverEditor(container, project, onUpdate);
  } else {
    renderChapterEditor(container, project, activeKey, onUpdate);
  }
}

/**
 * 1. Cover Form Editor
 */
function renderCoverEditor(container, project, onUpdate) {
  const cover = project.cover || {};
  const settings = project.settings || {};
  const images = project.images || {};

  container.innerHTML = `
    <div class="p-3">
      <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
        <h5 class="mb-0 text-primary"><i class="bi bi-file-earmark-person me-2"></i>封面資訊設定</h5>
        <span class="badge bg-secondary">A4 封面</span>
      </div>

      <div class="row g-3">
        <!-- Logo Upload -->
        <div class="col-12">
          <label class="form-label fw-bold">學校校徽／專案 Logo（選填，≤ 2MB）</label>
          <div class="d-flex align-items-center gap-3">
            <div id="cover-logo-preview" class="border rounded p-2 text-center bg-light" style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
              ${cover.logoImageId && images[cover.logoImageId]
                ? `<img src="${images[cover.logoImageId].dataBase64}" style="max-width: 80px; max-height: 80px; object-fit: contain;" />`
                : '<span class="text-muted small">尚無圖片</span>'
              }
            </div>
            <div>
              <input type="file" id="cover-logo-input" class="form-control form-control-sm mb-2" accept="image/png,image/jpeg,image/webp" />
              ${cover.logoImageId ? '<button id="btn-remove-logo" class="btn btn-outline-danger btn-sm">移除 Logo</button>' : ''}
            </div>
          </div>
        </div>

        <!-- Chinese Title -->
        <div class="col-md-7">
          <label class="form-label fw-bold">計畫中文名稱 <span class="text-danger">*</span></label>
          <input type="text" id="cover-titleZh" class="form-control" value="${escapeAttr(cover.titleZh || '')}" placeholder="例如：智慧農業精準灌溉管理系統" />
        </div>

        <!-- Category -->
        <div class="col-md-5">
          <label class="form-label fw-bold">計畫類別／競賽名稱</label>
          <input type="text" id="cover-category" class="form-control" value="${escapeAttr(cover.category || '大專生專題研究計畫書')}" />
        </div>

        <!-- English Title -->
        <div class="col-12">
          <label class="form-label fw-bold">計畫英文名稱（Times New Roman，選填）</label>
          <input type="text" id="cover-titleEn" class="form-control" value="${escapeAttr(cover.titleEn || '')}" placeholder="e.g. Smart Agricultural Precision Irrigation System" />
        </div>

        <!-- Organization -->
        <div class="col-md-7">
          <label class="form-label fw-bold">申請／執行單位</label>
          <input type="text" id="cover-org" class="form-control" value="${escapeAttr(cover.organization || '')}" placeholder="例如：國立臺灣科技大學 資訊工程學系" />
        </div>

        <!-- Period -->
        <div class="col-md-5">
          <label class="form-label fw-bold">計畫執行期間</label>
          <input type="text" id="cover-period" class="form-control" value="${escapeAttr(cover.period || '')}" placeholder="例如：2026/07 – 2027/06" />
        </div>

        <!-- Submit Date -->
        <div class="col-md-6">
          <label class="form-label fw-bold">提交日期</label>
          <input type="date" id="cover-submitDate" class="form-control" value="${escapeAttr(cover.submitDate || new Date().toISOString().slice(0, 10))}" />
        </div>

        <!-- Date Style -->
        <div class="col-md-6">
          <label class="form-label fw-bold">日期格式</label>
          <select id="cover-dateStyle" class="form-select">
            <option value="roc" ${settings.dateStyle === 'roc' ? 'selected' : ''}>民國紀年（中華民國 115 年 11 月 19 日）</option>
            <option value="ce" ${settings.dateStyle === 'ce' ? 'selected' : ''}>西元紀年（2026 年 11 月 19 日）</option>
          </select>
        </div>

        <!-- Members Table -->
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label fw-bold mb-0">團隊成員 <span class="text-danger">*</span></label>
            <button type="button" id="btn-add-member" class="btn btn-outline-primary btn-sm"><i class="bi bi-plus-circle me-1"></i>新增成員</button>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle">
              <thead class="table-light">
                <tr>
                  <th style="width: 30%;">姓名 <span class="text-danger">*</span></th>
                  <th style="width: 30%;">學號／代號</th>
                  <th style="width: 30%;">職責／角色</th>
                  <th style="width: 10%; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody id="members-table-body">
                ${(cover.members || []).map((m, idx) => `
                  <tr data-index="${idx}">
                    <td><input type="text" class="form-control form-control-sm member-name" value="${escapeAttr(m.name || '')}" placeholder="姓名" /></td>
                    <td><input type="text" class="form-control form-control-sm member-id" value="${escapeAttr(m.studentId || '')}" placeholder="學號" /></td>
                    <td><input type="text" class="form-control form-control-sm member-role" value="${escapeAttr(m.role || '')}" placeholder="角色 (例: 組長)" /></td>
                    <td class="text-center"><button class="btn btn-link text-danger p-0 btn-del-member"><i class="bi bi-trash"></i></button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Advisors Table -->
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label fw-bold mb-0">指導老師（選填）</label>
            <button type="button" id="btn-add-advisor" class="btn btn-outline-primary btn-sm"><i class="bi bi-plus-circle me-1"></i>新增指導老師</button>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle">
              <thead class="table-light">
                <tr>
                  <th style="width: 45%;">姓名</th>
                  <th style="width: 45%;">職稱</th>
                  <th style="width: 10%; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody id="advisors-table-body">
                ${(cover.advisors || []).map((a, idx) => `
                  <tr data-index="${idx}">
                    <td><input type="text" class="form-control form-control-sm advisor-name" value="${escapeAttr(a.name || '')}" placeholder="姓名" /></td>
                    <td><input type="text" class="form-control form-control-sm advisor-title" value="${escapeAttr(a.title || '')}" placeholder="職稱 (例: 教授)" /></td>
                    <td class="text-center"><button class="btn btn-link text-danger p-0 btn-del-advisor"><i class="bi bi-trash"></i></button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Events for Cover
  const bindInput = (id, fn) => {
    const el = container.querySelector(id);
    if (el) el.addEventListener('input', fn);
  };

  bindInput('#cover-titleZh', e => { cover.titleZh = e.target.value; onUpdate(); });
  bindInput('#cover-titleEn', e => { cover.titleEn = e.target.value; onUpdate(); });
  bindInput('#cover-category', e => { cover.category = e.target.value; onUpdate(); });
  bindInput('#cover-org', e => { cover.organization = e.target.value; onUpdate(); });
  bindInput('#cover-period', e => { cover.period = e.target.value; onUpdate(); });
  bindInput('#cover-submitDate', e => { cover.submitDate = e.target.value; onUpdate(); });

  const dateSelect = container.querySelector('#cover-dateStyle');
  if (dateSelect) {
    dateSelect.addEventListener('change', e => {
      if (!project.settings) project.settings = {};
      project.settings.dateStyle = e.target.value;
      onUpdate();
    });
  }

  // Logo file upload
  const logoInput = container.querySelector('#cover-logo-input');
  if (logoInput) {
    logoInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const b64 = ev.target.result;
        const imgId = 'img_logo';
        if (!project.images) project.images = {};
        project.images[imgId] = {
          mime: file.type,
          dataBase64: b64,
          caption: '校徽'
        };
        cover.logoImageId = imgId;
        onUpdate();
        renderCoverEditor(container, project, onUpdate);
      };
      reader.readAsDataURL(file);
    });
  }

  const removeLogoBtn = container.querySelector('#btn-remove-logo');
  if (removeLogoBtn) {
    removeLogoBtn.addEventListener('click', () => {
      delete cover.logoImageId;
      onUpdate();
      renderCoverEditor(container, project, onUpdate);
    });
  }

  // Members dynamic rows
  function syncMembers() {
    const rows = container.querySelectorAll('#members-table-body tr');
    const members = [];
    rows.forEach(r => {
      const name = r.querySelector('.member-name').value.trim();
      const studentId = r.querySelector('.member-id').value.trim();
      const role = r.querySelector('.member-role').value.trim();
      members.push({ name, studentId, role });
    });
    cover.members = members;
    onUpdate();
  }

  container.querySelector('#btn-add-member').addEventListener('click', () => {
    if (!cover.members) cover.members = [];
    cover.members.push({ name: '', studentId: '', role: '' });
    renderCoverEditor(container, project, onUpdate);
  });

  container.querySelectorAll('.btn-del-member').forEach(btn => {
    btn.addEventListener('click', e => {
      const tr = e.target.closest('tr');
      tr.remove();
      syncMembers();
    });
  });

  container.querySelectorAll('#members-table-body input').forEach(input => {
    input.addEventListener('input', syncMembers);
  });

  // Advisors dynamic rows
  function syncAdvisors() {
    const rows = container.querySelectorAll('#advisors-table-body tr');
    const advisors = [];
    rows.forEach(r => {
      const name = r.querySelector('.advisor-name').value.trim();
      const title = r.querySelector('.advisor-title').value.trim();
      advisors.push({ name, title });
    });
    cover.advisors = advisors;
    onUpdate();
  }

  container.querySelector('#btn-add-advisor').addEventListener('click', () => {
    if (!cover.advisors) cover.advisors = [];
    cover.advisors.push({ name: '', title: '' });
    renderCoverEditor(container, project, onUpdate);
  });

  container.querySelectorAll('.btn-del-advisor').forEach(btn => {
    btn.addEventListener('click', e => {
      const tr = e.target.closest('tr');
      tr.remove();
      syncAdvisors();
    });
  });

  container.querySelectorAll('#advisors-table-body input').forEach(input => {
    input.addEventListener('input', syncAdvisors);
  });
}

/**
 * 2. Chapter Markdown Editor
 */
function renderChapterEditor(container, project, secKey, onUpdate) {
  const chapters = getProjectChapters(project);
  const ch = chapters.find(c => c.key === secKey || c.id === secKey) || chapters[0] || { key: secKey, title: '未命名章節', number: '一' };
  const rawMd = ch.markdown || (project.sections && project.sections[ch.key] && project.sections[ch.key].markdown) || '';
  const currentWords = countWords(rawMd);

  // Word count styling
  let badgeClass = 'bg-secondary';
  let barClass = 'bg-warning';
  let statusText = '字數未達建議下限';

  if (ch.suggestedMin > 0 && currentWords >= ch.suggestedMin && (ch.suggestedMax === 0 || currentWords <= ch.suggestedMax)) {
    badgeClass = 'bg-success';
    barClass = 'bg-success';
    statusText = '字數合理';
  } else if (ch.suggestedMax > 0 && currentWords > ch.suggestedMax * 1.5) {
    badgeClass = 'bg-danger';
    barClass = 'bg-danger';
    statusText = '字數超過建議上限';
  } else if (currentWords === 0) {
    badgeClass = 'bg-secondary';
    barClass = 'bg-secondary';
    statusText = ch.required ? '未填寫（必填）' : '未填寫（選填）';
  }

  const maxVal = ch.suggestedMax > 0 ? ch.suggestedMax : 1000;
  const percent = Math.min(100, Math.round((currentWords / maxVal) * 100));

  container.innerHTML = `
    <div class="p-3">
      <!-- Chapter Header (Editable Title & Actions) -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2 pb-1 border-bottom">
        <div class="d-flex align-items-center flex-grow-1" style="max-width: 480px;">
          <span class="badge bg-primary me-2 flex-shrink-0" id="chapter-num-badge">第${ch.number}章</span>
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-light text-muted"><i class="bi bi-pencil-square"></i></span>
            <input type="text" id="chapter-title-input" class="form-control fw-bold text-primary" value="${escapeAttr(ch.title)}" placeholder="輸入章節標題..." title="點擊即可直接修改本章標題" />
          </div>
        </div>
        <div class="d-flex align-items-center gap-1">
          ${ch.template ? `
            <button id="btn-insert-template" class="btn btn-outline-secondary btn-sm" title="插入此章預設範本">
              <i class="bi bi-box-arrow-in-down me-1"></i>範本
            </button>
          ` : ''}
          ${ch.purpose ? `
            <button class="btn btn-outline-info btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#guide-collapse" title="展開/收合撰寫指南">
              <i class="bi bi-lightbulb me-1"></i>指南
            </button>
          ` : ''}
          <button id="btn-delete-chapter" class="btn btn-outline-danger btn-sm" title="刪除此章節">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>

      <!-- Collapsible Guide Box -->
      ${ch.purpose ? `
      <div class="collapse mb-3" id="guide-collapse">
        <div class="card card-body guide-box">
          <div class="mb-1"><strong>【章節目的】</strong>${ch.purpose}</div>
          ${ch.mustInclude ? `<div class="mb-1"><strong>【必含要素】</strong>${ch.mustInclude.join('；')}</div>` : ''}
          ${ch.avoid ? `<div class="mb-1 text-danger"><strong>【禁忌事項】</strong>${ch.avoid.join('；')}</div>` : ''}
          ${ch.judgeQuestions ? `<div class="mb-1 text-primary"><strong>【評審關鍵提問】</strong>${ch.judgeQuestions.join('？ ')}？</div>` : ''}
          ${ch.outline ? `<div class="mb-1 text-secondary"><strong>【建議架構】</strong>${ch.outline}</div>` : ''}
          ${ch.formatTips ? `<div class="small text-muted"><strong>【排版提示】</strong>${ch.formatTips}</div>` : ''}
        </div>
      </div>
      ` : ''}

      <!-- Word Count & Progress Bar -->
      <div class="mb-2">
        <div class="d-flex justify-content-between align-items-center small mb-1">
          <span>
            目前字數：<strong>${currentWords}</strong> 字
            ${ch.suggestedMin > 0 ? `（建議：${ch.suggestedMin} – ${ch.suggestedMax} 字）` : '（選填無字數限制）'}
          </span>
          <span class="badge ${badgeClass}">${statusText}</span>
        </div>
        <div class="progress" style="height: 5px;">
          <div class="progress-bar ${barClass}" role="progressbar" style="width: ${percent}%;"></div>
        </div>
      </div>

      <!-- Markdown Toolbar (Section 4.1 & 6.1) -->
      <div class="editor-toolbar p-2 rounded mb-2 d-flex flex-wrap gap-1 align-items-center border">
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="bold" title="粗體 (**文字**)"><i class="bi bi-type-bold"></i></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="italic" title="斜體 (*文字*)"><i class="bi bi-type-italic"></i></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="strike" title="刪除線 (~~文字~~)"><i class="bi bi-type-strikethrough"></i></button>
        <div class="vr mx-1"></div>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="h1" title="節標題 (# 標題，輸出為（一）)"><strong>（一）</strong></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="h2" title="小節標題 (## 標題，輸出為 1.)"><strong>1.</strong></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="h3" title="細節標題 (### 標題，輸出為 (1))"><strong>(1)</strong></button>
        <div class="vr mx-1"></div>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="ul" title="無序清單 (- 項目)"><i class="bi bi-list-ul"></i></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="ol" title="有序清單 (1. 項目)"><i class="bi bi-list-ol"></i></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="quote" title="引用 (> 文字)"><i class="bi bi-quote"></i></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="code" title="程式碼區塊"><i class="bi bi-code-slash"></i></button>
        <div class="vr mx-1"></div>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="table" title="插入表格"><i class="bi bi-table"></i></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="image" title="上傳/插入圖片"><i class="bi bi-image"></i></button>
        <button type="button" class="btn btn-light btn-sm tool-btn" data-action="pagebreak" title="強制分頁"><i class="bi bi-file-break"></i></button>
        <div class="vr mx-1"></div>
        <button type="button" class="btn btn-light btn-sm tool-btn text-primary" data-action="normalize" title="套用規範清理段首空白與空行"><i class="bi bi-magic me-1"></i>清理格式</button>
      </div>

      <!-- Hidden image input -->
      <input type="file" id="chapter-image-upload" class="d-none" accept="image/png,image/jpeg,image/webp" />

      <!-- Textarea (Auto-expand, monospace) -->
      <div class="position-relative">
        <textarea id="chapter-textarea" class="form-control editor-textarea" placeholder="在此輸入 Markdown 內容...（單換行即分段，段首無須手動空格）">${escapeHtml(rawMd)}</textarea>
      </div>
      <div class="text-muted small mt-2">
        <i class="bi bi-info-circle me-1"></i>依大專生規格：按 <code>Enter</code> 即代表新段落，Word 輸出自動首行縮排 2 字元；連續空行與段首空白將自動被忽略。
      </div>
    </div>
  `;

  const textarea = container.querySelector('#chapter-textarea');

  // Chapter Title Input event (Modify chapter title freely)
  const titleInput = container.querySelector('#chapter-title-input');
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      ch.title = titleInput.value.trim() || '未命名章節';
      onUpdate();
    });
  }

  // Delete chapter event
  const delChapterBtn = container.querySelector('#btn-delete-chapter');
  if (delChapterBtn) {
    delChapterBtn.addEventListener('click', () => {
      if (confirm(`確定要刪除「第${ch.number}章 ${ch.title}」嗎？此操作無法復原。`)) {
        removeChapter(project, ch.key);
        const remaining = getProjectChapters(project);
        const nextKey = remaining.length > 0 ? remaining[0].key : 'cover';
        if (window.app) {
          window.app.activeKey = nextKey;
          onUpdate();
          window.app.render();
        } else {
          onUpdate();
        }
      }
    });
  }

  // Textarea input event
  textarea.addEventListener('input', () => {
    ch.markdown = textarea.value;
    if (!project.sections) project.sections = {};
    if (!project.sections[ch.key]) project.sections[ch.key] = {};
    project.sections[ch.key].markdown = textarea.value;

    // Update word count UI without destroying focus
    const newWc = countWords(textarea.value);
    const p = Math.min(100, Math.round((newWc / maxVal) * 100));
    const wcSpan = container.querySelector('.progress-bar');
    if (wcSpan) wcSpan.style.width = `${p}%`;

    onUpdate();
  });

  // Insert Template
  const insertTplBtn = container.querySelector('#btn-insert-template');
  if (insertTplBtn) {
    insertTplBtn.addEventListener('click', () => {
      if (textarea.value.trim() && !confirm('確定要插入範本內容嗎？目前的編輯內容將被取代。')) {
        return;
      }
      textarea.value = ch.template || '';
      ch.markdown = textarea.value;
      if (!project.sections) project.sections = {};
      project.sections[ch.key] = { markdown: textarea.value };
      onUpdate();
      renderChapterEditor(container, project, ch.key, onUpdate);
    });
  }

  // Toolbar Actions
  container.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleToolbarAction(action, textarea, project, secKey, container, onUpdate);
    });
  });

  // Image upload
  const imgInput = container.querySelector('#chapter-image-upload');
  imgInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target.result;
      const imgId = `img_${Date.now()}`;
      if (!project.images) project.images = {};
      const caption = prompt('請輸入此圖片的圖說（例如：系統整體架構圖）：', '示意圖') || '';
      project.images[imgId] = {
        mime: file.type,
        dataBase64: b64,
        caption: caption
      };
      insertAtCursor(textarea, `\n![${caption}](img:${imgId})\n`);
      textarea.dispatchEvent(new Event('input'));
    };
    reader.readAsDataURL(file);
  });
}

function handleToolbarAction(action, textarea, project, secKey, container, onUpdate) {
  switch (action) {
    case 'bold':
      wrapSelection(textarea, '**', '**', '粗體文字');
      break;
    case 'italic':
      wrapSelection(textarea, '*', '*', '斜體文字');
      break;
    case 'strike':
      wrapSelection(textarea, '~~', '~~', '刪除文字');
      break;
    case 'h1':
      prependLine(textarea, '# 節標題');
      break;
    case 'h2':
      prependLine(textarea, '## 小節標題');
      break;
    case 'h3':
      prependLine(textarea, '### 細節標題');
      break;
    case 'ul':
      prependLine(textarea, '- 項目內容');
      break;
    case 'ol':
      prependLine(textarea, '1. 項目內容');
      break;
    case 'quote':
      prependLine(textarea, '> 引用文字');
      break;
    case 'code':
      wrapSelection(textarea, '```javascript\n', '\n```', '// 程式碼');
      break;
    case 'pagebreak':
      insertAtCursor(textarea, '\n<!--pagebreak-->\n');
      break;
    case 'table': {
      const tableTpl = `\n[表] 功能比較表\n| 評估項目 | 本計畫方案 | 既有方案 A | 既有方案 B |\n| :--- | :---: | :---: | :---: |\n| 建置成本 | 低 | 高 | 中 |\n| 響應時間 | 1秒內 | 5秒 | 10秒 |\n`;
      insertAtCursor(textarea, tableTpl);
      break;
    }
    case 'image': {
      const fileInput = container.querySelector('#chapter-image-upload');
      if (fileInput) fileInput.click();
      break;
    }
    case 'normalize': {
      const res = normalizeText(textarea.value);
      textarea.value = res.normalizedText;
      alert(`已清理完成！\n移除空白行：${res.stats.removedBlankLines} 行\n移除多餘段首空白：${res.stats.removedLeadingSpaces} 處`);
      textarea.dispatchEvent(new Event('input'));
      break;
    }
  }
}

function wrapSelection(textarea, before, after, defaultText) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  const selected = val.substring(start, end) || defaultText;
  const replacement = `${before}${selected}${after}`;
  textarea.value = val.substring(0, start) + replacement + val.substring(end);
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + selected.length;
  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
}

function prependLine(textarea, template) {
  const start = textarea.selectionStart;
  const val = textarea.value;
  const needsNewline = start > 0 && val[start - 1] !== '\n' ? '\n' : '';
  const insertion = `${needsNewline}${template}\n`;
  insertAtCursor(textarea, insertion);
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + text + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
