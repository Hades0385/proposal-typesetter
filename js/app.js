/**
 * Proposal Typesetter - Main Application
 * Coordinates State, LocalStorage, Snapshot History, UI, and File Exports
 */

import { createDefaultProject } from './core/sample-data.js';
import { SECTIONS_META } from './core/guides.js';
import { countWords, validateProject } from './core/validator.js';
import { buildDocxDocument } from './core/docx-builder.js';
import { renderEditor } from './ui/editor.js';
import { renderLivePreview } from './ui/preview.js';
import { renderJudgeView } from './ui/judge-view.js';
import { renderMcpGuide } from './ui/mcp-guide-modal.js';

const STORAGE_KEY = 'proposal_project_current';
const SNAPSHOTS_KEY = 'proposal_project_snapshots';

class ProposalApp {
  constructor() {
    this.project = this.loadProjectFromStorage();
    this.activeKey = 'cover'; // 'cover' or section key (summary, motivation, etc.)
    this.activeRightTab = 'preview'; // 'preview' | 'judge' | 'mcp'
    this.zoom = 0.9;
    this.saveTimeout = null;
    this.isDirty = false;

    this.initElements();
    this.bindGlobalEvents();
    this.render();
  }

  loadProjectFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load project from storage:', e);
    }
    return createDefaultProject();
  }

  saveProjectToStorage() {
    try {
      if (!this.project.meta) this.project.meta = {};
      this.project.meta.updatedAt = new Date().toISOString();
      this.project.meta.version = (this.project.meta.version || 0) + 1;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.project));

      // Create snapshot (keep max 20)
      this.addSnapshot(this.project);

      this.isDirty = false;
      this.updateSaveStatusUI();
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  addSnapshot(project) {
    try {
      let snaps = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || '[]');
      snaps.unshift({
        version: project.meta?.version || 1,
        timestamp: new Date().toISOString(),
        title: project.cover?.titleZh || '未命名計畫',
        data: project
      });
      if (snaps.length > 20) snaps = snaps.slice(0, 20);
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));
    } catch (e) {
      // ignore
    }
  }

  triggerAutoSave() {
    this.isDirty = true;
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-warning"><i class="bi bi-clock me-1"></i>儲存中...</span>';
    }

    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveProjectToStorage();
    }, 1000);
  }

  updateSaveStatusUI() {
    const statusEl = document.getElementById('save-status');
    if (!statusEl) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    statusEl.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>已儲存 ${timeStr}</span>`;
  }

  initElements() {
    this.elNavList = document.getElementById('nav-chapter-list');
    this.elEditorContainer = document.getElementById('editor-column');
    this.elPreviewContainer = document.getElementById('preview-sheet-container');
    this.elJudgeContainer = document.getElementById('judge-panel-container');
    this.elMcpContainer = document.getElementById('mcp-panel-container');
    this.elProjectTitleNav = document.getElementById('nav-project-title');
    this.elQualityBadge = document.getElementById('nav-quality-badge');
  }

  bindGlobalEvents() {
    // Right tab switcher
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
      tab.addEventListener('shown.bs.tab', e => {
        const target = e.target.getAttribute('data-bs-target');
        if (target === '#tab-preview') {
          this.activeRightTab = 'preview';
          this.renderPreview();
        } else if (target === '#tab-judge') {
          this.activeRightTab = 'judge';
          this.renderJudge();
        } else if (target === '#tab-mcp') {
          this.activeRightTab = 'mcp';
          this.renderMcp();
        }
      });
    });

    // Zoom controls
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.zoom = Math.min(1.5, this.zoom + 0.1);
      this.renderPreview();
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.zoom = Math.max(0.5, this.zoom - 0.1);
      this.renderPreview();
    });
    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
      this.zoom = 0.9;
      this.renderPreview();
    });

    // Export DOCX
    document.getElementById('btn-export-docx')?.addEventListener('click', () => this.exportDocx());

    // Export PDF (window.print)
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
      window.print();
    });

    // Export JSON
    document.getElementById('btn-export-json')?.addEventListener('click', () => this.exportJson());

    // Import JSON
    const fileImport = document.getElementById('file-import-json');
    if (fileImport) {
      fileImport.addEventListener('change', e => this.importJson(e));
    }

    // Sample Project
    document.getElementById('btn-load-sample')?.addEventListener('click', () => {
      if (confirm('確定要載入預設範例「智慧農業精準灌溉管理系統」嗎？目前的編輯內容將被取代。')) {
        this.project = createDefaultProject();
        this.activeKey = 'cover';
        this.saveProjectToStorage();
        this.render();
      }
    });

    // New / Clear Project
    document.getElementById('btn-new-project')?.addEventListener('click', () => {
      if (confirm('確定要開新專案計畫書嗎？')) {
        this.project = {
          id: `proj_${Date.now()}`,
          meta: { createdAt: new Date().toISOString(), version: 1 },
          cover: { titleZh: '', members: [{ name: '', studentId: '', role: '' }], advisors: [] },
          sections: {},
          images: {},
          settings: { lineSpacing: 1.5, firstLineIndentChars: 2, justify: true, chapterPageBreak: true, tocLevels: 2, dateStyle: 'roc', autoHeadingNumber: true }
        };
        for (const s of SECTIONS_META) {
          this.project.sections[s.key] = { markdown: '' };
        }
        this.activeKey = 'cover';
        this.saveProjectToStorage();
        this.render();
      }
    });

    // Version History Modal
    document.getElementById('btn-snapshots')?.addEventListener('click', () => this.showSnapshotsModal());

    // Theme toggle
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      const htmlEl = document.documentElement;
      const current = htmlEl.getAttribute('data-bs-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      htmlEl.setAttribute('data-bs-theme', next);
    });

    // Shortcut: Ctrl+S save
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveProjectToStorage();
        alert('專案已手動儲存！');
      }
    });
  }

  render() {
    this.renderSidebarNav();
    this.renderEditor();
    this.renderActiveRightPanel();
    this.updateSaveStatusUI();
  }

  renderSidebarNav() {
    if (!this.elNavList) return;

    const cover = this.project.cover || {};
    const sections = this.project.sections || {};
    const issues = validateProject(this.project);
    const errorCount = issues.filter(i => i.level === 'error').length;
    const warningCount = issues.filter(i => i.level === 'warning').length;

    // Update Quality Pill in Navbar
    if (this.elQualityBadge) {
      if (errorCount > 0) {
        this.elQualityBadge.className = 'badge bg-danger';
        this.elQualityBadge.innerHTML = `<i class="bi bi-x-circle me-1"></i>${errorCount} 錯誤`;
      } else if (warningCount > 0) {
        this.elQualityBadge.className = 'badge bg-warning text-dark';
        this.elQualityBadge.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${warningCount} 警告`;
      } else {
        this.elQualityBadge.className = 'badge bg-success';
        this.elQualityBadge.innerHTML = '<i class="bi bi-check-circle me-1"></i>規範通過';
      }
    }

    if (this.elProjectTitleNav) {
      this.elProjectTitleNav.textContent = cover.titleZh || '未命名專案計畫書';
    }

    // Cover info status
    const hasTitle = Boolean(cover.titleZh && cover.titleZh.trim());
    const hasMembers = Boolean(cover.members && cover.members.length && cover.members[0].name);
    const coverStatusBadge = (hasTitle && hasMembers)
      ? '<span class="badge bg-success">已完成</span>'
      : '<span class="badge bg-warning text-dark">必填缺漏</span>';

    let html = `
      <div class="list-group list-group-flush small">
        <a class="list-group-item list-group-item-action nav-chapter-item py-2 px-3 d-flex justify-content-between align-items-center ${this.activeKey === 'cover' ? 'active' : ''}" data-key="cover">
          <div><i class="bi bi-card-heading me-2"></i><strong>封面資訊設定</strong></div>
          ${coverStatusBadge}
        </a>
    `;

    // 7 Chapters
    for (const meta of SECTIONS_META) {
      const secData = sections[meta.key];
      const md = (secData && secData.markdown) ? secData.markdown.trim() : '';
      const wc = countWords(md);

      let badgeHtml = '';
      if (!md) {
        badgeHtml = meta.required
          ? '<span class="badge bg-secondary">未填</span>'
          : '<span class="badge bg-light text-muted border">選填</span>';
      } else if (meta.suggestedMin > 0 && wc < meta.suggestedMin) {
        badgeHtml = `<span class="badge bg-warning text-dark">${wc}字 (不足)</span>`;
      } else if (meta.suggestedMax > 0 && wc > meta.suggestedMax) {
        badgeHtml = `<span class="badge bg-danger">${wc}字 (超過)</span>`;
      } else {
        badgeHtml = `<span class="badge bg-success">${wc}字</span>`;
      }

      html += `
        <a class="list-group-item list-group-item-action nav-chapter-item py-2 px-3 d-flex justify-content-between align-items-center ${this.activeKey === meta.key ? 'active' : ''}" data-key="${meta.key}">
          <div class="text-truncate me-1">
            <span class="text-muted me-1">第${meta.number}章</span>
            <span>${meta.title}</span>
          </div>
          ${badgeHtml}
        </a>
      `;
    }

    html += '</div>';
    this.elNavList.innerHTML = html;

    // Bind nav item clicks
    this.elNavList.querySelectorAll('.nav-chapter-item').forEach(item => {
      item.addEventListener('click', () => {
        this.activeKey = item.dataset.key;
        this.renderSidebarNav();
        this.renderEditor();
      });
    });
  }

  renderEditor() {
    renderEditor(this.elEditorContainer, this.project, this.activeKey, () => {
      this.triggerAutoSave();
      this.renderSidebarNav();
      if (this.activeRightTab === 'preview') {
        this.renderPreview();
      } else if (this.activeRightTab === 'judge') {
        this.renderJudge();
      }
    });
  }

  renderActiveRightPanel() {
    if (this.activeRightTab === 'preview') {
      this.renderPreview();
    } else if (this.activeRightTab === 'judge') {
      this.renderJudge();
    } else if (this.activeRightTab === 'mcp') {
      this.renderMcp();
    }
  }

  renderPreview() {
    if (!this.elPreviewContainer) return;
    renderLivePreview(this.project, this.elPreviewContainer, this.zoom);
  }

  renderJudge() {
    if (!this.elJudgeContainer) return;
    renderJudgeView(this.elJudgeContainer, this.project, targetSection => {
      this.activeKey = targetSection;
      this.renderSidebarNav();
      this.renderEditor();
    });
  }

  renderMcp() {
    if (!this.elMcpContainer) return;
    renderMcpGuide(this.elMcpContainer);
  }

  async exportDocx() {
    const issues = validateProject(this.project);
    const errors = issues.filter(i => i.level === 'error');

    if (errors.length > 0) {
      const msg = `計畫書尚有 ${errors.length} 個必填缺漏錯誤：\n${errors.map(e => '• ' + e.message).join('\n')}\n\n是否仍要強制匯出 Word？`;
      if (!confirm(msg)) {
        return;
      }
    }

    try {
      const docxLib = window.docx;
      if (!docxLib) {
        alert('docx 函式庫正在載入中，請稍候重試！');
        return;
      }

      const doc = await buildDocxDocument(this.project, docxLib);
      const blob = await docxLib.Packer.toBlob(doc);

      const title = this.project.cover?.titleZh ? this.project.cover.titleZh.replace(/[\\/:*?"<>|]/g, '') : '專案計劃書';
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `${title}_${dateStr}.docx`;

      // Trigger download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Word 匯出失敗:', err);
      alert('匯出 Word 失敗: ' + err.message);
    }
  }

  exportJson() {
    const title = this.project.cover?.titleZh ? this.project.cover.titleZh.replace(/[\\/:*?"<>|]/g, '') : 'proposal';
    const jsonStr = JSON.stringify(this.project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title}_專案檔.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  importJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!imported.cover || !imported.sections) {
          throw new Error('JSON 格式不符專案計劃書規格');
        }
        this.project = imported;
        this.saveProjectToStorage();
        this.render();
        alert('專案檔已成功匯入！');
      } catch (err) {
        alert('匯入失敗：' + err.message);
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  showSnapshotsModal() {
    const snaps = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || '[]');
    let modalEl = document.getElementById('snapshotModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'modal fade';
      modalEl.id = 'snapshotModal';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-clock-history me-2"></i>專案版本快照歷史（最近 20 個版本）</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-0">
            ${snaps.length === 0 ? `
              <div class="p-4 text-center text-muted">目前尚無版本歷史快照。</div>
            ` : `
              <div class="list-group list-group-flush">
                ${snaps.map((s, idx) => `
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div class="fw-bold">版本 v${s.version} - ${s.title}</div>
                      <div class="small text-muted">${new Date(s.timestamp).toLocaleString()}</div>
                    </div>
                    <button class="btn btn-outline-primary btn-sm btn-restore-snap" data-index="${idx}">
                      還原此版本
                    </button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">關閉</button>
          </div>
        </div>
      </div>
    `;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    modalEl.querySelectorAll('.btn-restore-snap').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(btn.dataset.index, 10);
        if (confirm(`確定要還原至版本 v${snaps[idx].version} 嗎？目前的編輯將被覆蓋。`)) {
          this.project = snaps[idx].data;
          this.saveProjectToStorage();
          this.render();
          bsModal.hide();
        }
      });
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ProposalApp();
});
