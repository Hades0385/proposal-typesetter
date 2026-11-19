/**
 * Review As Judge & Validator View
 * Section 4.10 & Section 7.8
 */

import { reviewAsJudge, validateProject } from '../core/validator.js';
import { SECTIONS_META } from '../core/guides.js';

export function renderJudgeView(container, project, onNavigateSection) {
  if (!container) return;

  const review = reviewAsJudge(project);
  const { overall, dimensions, crossChecks, issues } = review;

  const errorIssues = issues.filter(i => i.level === 'error');
  const warningIssues = issues.filter(i => i.level === 'warning');
  const infoIssues = issues.filter(i => i.level === 'info');

  container.innerHTML = `
    <div class="p-3">
      <!-- Overall Score Summary Banner -->
      <div class="card mb-4 border-0 shadow-sm ${overall.readyToSubmit ? 'bg-success-subtle text-success-emphasis' : 'bg-warning-subtle text-warning-emphasis'}">
        <div class="card-body p-4">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <span class="badge ${overall.readyToSubmit ? 'bg-success' : 'bg-warning text-dark'} mb-2">
                ${overall.readyToSubmit ? '✓ 評審審查判定：建議通過（可送件）' : '⚠ 評審審查判定：尚待修訂'}
              </span>
              <h4 class="mb-1 fw-bold">評審綜合評分：${overall.scoreAverage} / 5.0</h4>
              <p class="mb-0 small">
                共有 <strong>${errorIssues.length}</strong> 個嚴重錯誤、<strong>${warningIssues.length}</strong> 個格式警告、<strong>${infoIssues.length}</strong> 項優化建議。
              </p>
            </div>
            <div class="text-end">
              <button id="btn-recheck-judge" class="btn btn-outline-dark btn-sm">
                <i class="bi bi-arrow-repeat me-1"></i>重新評審檢查
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cross Checks Callout -->
      <div class="card mb-4 border-0 bg-light">
        <div class="card-body">
          <h6 class="fw-bold mb-2"><i class="bi bi-link-45deg me-1"></i>脈絡連貫性交叉檢查 (Cross-Checks)</h6>
          ${crossChecks.map(c => `
            <div class="d-flex align-items-start gap-2 small">
              <span class="badge ${c.passed ? 'bg-success' : 'bg-secondary'}">${c.rule}</span>
              <span>${c.result}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 7 Evaluation Dimensions -->
      <h6 class="fw-bold mb-3"><i class="bi bi-star-fill text-warning me-2"></i>七大評審維度評析 (Evaluation Dimensions)</h6>
      <div class="row g-3 mb-4">
        ${dimensions.map(dim => {
          const scoreClass = `score-${dim.score}`;
          const percent = (dim.score / 5) * 100;
          return `
            <div class="col-md-6 col-12">
              <div class="card h-100 shadow-sm dimension-card ${scoreClass}">
                <div class="card-body p-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong class="text-dark">${dim.name}</strong>
                    <span class="badge ${dim.score >= 4 ? 'bg-success' : dim.score >= 3 ? 'bg-warning text-dark' : 'bg-danger'}">
                      ${dim.score} / 5 分
                    </span>
                  </div>
                  <div class="progress mb-2" style="height: 4px;">
                    <div class="progress-bar ${dim.score >= 4 ? 'bg-success' : dim.score >= 3 ? 'bg-warning' : 'bg-danger'}" style="width: ${percent}%;"></div>
                  </div>
                  <div class="small text-muted mb-2">${dim.description}</div>
                  <div class="small border-top pt-2">
                    <div><strong>審查見解：</strong>${dim.evidence}</div>
                    <div class="text-primary mt-1"><strong>建議改善：</strong>${dim.fix}</div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Validator Findings (V001 - V010) -->
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="fw-bold mb-0"><i class="bi bi-shield-check me-2"></i>規範檢查器細項報告 (Validator V001–V010)</h6>
        <span class="small text-muted">共 ${issues.length} 項</span>
      </div>

      <div class="issue-list mb-3">
        ${issues.length === 0 ? `
          <div class="alert alert-success py-3 text-center">
            <i class="bi bi-check-circle-fill me-2"></i>太棒了！專案計畫書完全通過全部格式與內容規範檢查。
          </div>
        ` : ''}

        ${issues.map(iss => {
          const secTitle = getSectionTitle(iss.section);
          return `
            <div class="issue-item ${iss.level} d-flex justify-content-between align-items-start gap-3">
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="badge ${iss.level === 'error' ? 'bg-danger' : iss.level === 'warning' ? 'bg-warning text-dark' : 'bg-info text-dark'}">
                    ${iss.id} [${iss.level.toUpperCase()}]
                  </span>
                  <strong class="text-dark">${secTitle}</strong>
                </div>
                <div class="small text-dark mb-1">${iss.message}</div>
                <div class="small text-muted">💡 <strong>建議：</strong>${iss.suggestion}</div>
              </div>
              <button class="btn btn-outline-secondary btn-sm btn-jump-section flex-shrink-0" data-section="${iss.section}">
                前往修改 <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Jump to section click
  container.querySelectorAll('.btn-jump-section').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSec = btn.dataset.section;
      if (onNavigateSection) onNavigateSection(targetSec);
    });
  });

  // Recheck click
  const recheckBtn = container.querySelector('#btn-recheck-judge');
  if (recheckBtn) {
    recheckBtn.addEventListener('click', () => {
      renderJudgeView(container, project, onNavigateSection);
    });
  }
}

function getSectionTitle(key) {
  if (key === 'cover') return '封面資訊';
  const m = SECTIONS_META.find(s => s.key === key);
  return m ? `第${m.number}章 ${m.title}` : key;
}
