/**
 * MCP Local Server Guide Component
 * Explains how to use the local Node.js mcp-server.js with AI tools (Claude Desktop, Cursor, Antigravity)
 */

export function renderMcpGuide(container) {
  if (!container) return;

  const samplePath = typeof window !== 'undefined' && window.location.pathname
    ? window.location.pathname.replace(/\/index\.html$/, '') + '/mcp-server.js'
    : 'D:/code/train/web/t261114/mcp-server.js';

  const claudeConfigJson = JSON.stringify({
    mcpServers: {
      "proposal-typesetter": {
        command: "node",
        args: [samplePath]
      }
    }
  }, null, 2);

  container.innerHTML = `
    <div class="p-4" style="max-width: 900px; margin: 0 auto;">
      <!-- Title Header -->
      <div class="text-center mb-4">
        <span class="badge bg-primary-subtle text-primary mb-2 px-3 py-1 fs-6">AI 深度協作模式</span>
        <h3 class="fw-bold">本地 MCP (Model Context Protocol) 伺服器使用說明</h3>
        <p class="text-muted">
          本系統為純靜態網頁（可直接部署至 GitHub Pages）。若要讓 AI 助理（Claude Desktop、Cursor、Windsurf 等）以<strong>「審查委員視角」</strong>自動為您撰寫、校閱計畫書，請搭配專案內建的本地端腳本 <code>mcp-server.js</code>。
        </p>
      </div>

      <!-- Quick Steps -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card h-100 border-primary-subtle shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center mb-2">
                <span class="badge bg-primary rounded-circle me-2" style="width: 26px; height: 26px; line-height: 18px;">1</span>
                <strong class="text-primary">取得本地腳本</strong>
              </div>
              <p class="small text-muted mb-0">專案根目錄已內建 <code>mcp-server.js</code>，若部署至線上亦可點擊下方按鈕直接下載。</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100 border-primary-subtle shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center mb-2">
                <span class="badge bg-primary rounded-circle me-2" style="width: 26px; height: 26px; line-height: 18px;">2</span>
                <strong class="text-primary">設定 AI 客戶端</strong>
              </div>
              <p class="small text-muted mb-0">將指令加入 Claude Desktop、Cursor 或 Antigravity 設定檔，AI 即可自動啟用 17 項排版工具。</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100 border-primary-subtle shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center mb-2">
                <span class="badge bg-primary rounded-circle me-2" style="width: 26px; height: 26px; line-height: 18px;">3</span>
                <strong class="text-primary">雙向同步檢視</strong>
              </div>
              <p class="small text-muted mb-0">AI 撰寫後將存於 <code>data/projects/</code>，在網頁點擊「匯入 JSON」即可即時在 A4 預覽並輸出 Word/PDF！</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuration Accordion -->
      <div class="card mb-4 shadow-sm border-0">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <span class="fw-bold"><i class="bi bi-gear-fill me-2"></i>AI 客戶端設定方法</span>
          <button id="btn-copy-config" class="btn btn-outline-light btn-sm">
            <i class="bi bi-clipboard me-1"></i>複製 Claude 設定 JSON
          </button>
        </div>
        <div class="card-body bg-light">
          <!-- Nav Tabs for Clients -->
          <ul class="nav nav-pills mb-3" id="mcp-client-tabs" role="tablist">
            <li class="nav-item">
              <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-claude">Claude Desktop</button>
            </li>
            <li class="nav-item">
              <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-cursor">Cursor IDE</button>
            </li>
            <li class="nav-item">
              <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-cli">命令列手動測試</button>
            </li>
          </ul>

          <div class="tab-content">
            <!-- Claude Desktop -->
            <div class="tab-pane fade show active" id="tab-claude">
              <p class="small mb-2">
                編輯 Claude Desktop 設定檔：
                <br>• Windows: <code>%APPDATA%\\Claude\\claude_desktop_config.json</code>
                <br>• macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
              </p>
              <pre class="bg-dark text-light p-3 rounded small mb-2"><code id="code-claude-config">${claudeConfigJson}</code></pre>
              <div class="text-muted small">
                <i class="bi bi-info-circle me-1"></i>請將 <code>args</code> 內的絕對路徑調整為您本機電腦 <code>mcp-server.js</code> 的實際位置。
              </div>
            </div>

            <!-- Cursor -->
            <div class="tab-pane fade" id="tab-cursor">
              <ol class="small mb-2 ps-3">
                <li>開啟 Cursor，進入 <strong>Settings</strong> → <strong>Features</strong> → <strong>MCP Servers</strong>。</li>
                <li>點擊 <strong>+ Add New MCP Server</strong>。</li>
                <li><strong>Name</strong> 輸入：<code>proposal-typesetter</code></li>
                <li><strong>Type</strong> 選擇：<code>command</code></li>
                <li><strong>Command</strong> 輸入：<code>node D:/code/train/web/t261114/mcp-server.js</code>（替換為實際檔案路徑）。</li>
              </ol>
            </div>

            <!-- Terminal -->
            <div class="tab-pane fade" id="tab-cli">
              <p class="small mb-2">於專案資料夾終端機執行：</p>
              <pre class="bg-dark text-light p-3 rounded small"><code>node mcp-server.js</code></pre>
              <p class="small text-muted mb-0">伺服器將於 stdio 上待命 JSON-RPC 2.0 呼叫，並將資料保存在 <code>data/projects/</code> 目錄。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Prompts & Workflow -->
      <div class="card mb-4 shadow-sm border-0">
        <div class="card-header bg-primary text-white fw-bold">
          <i class="bi bi-chat-quote-fill me-2"></i>如何向 AI 下達指令（推薦範例 Prompt）
        </div>
        <div class="card-body">
          <div class="mb-3">
            <h6 class="fw-bold text-dark">情境一：從構想逐章撰寫專案計畫書</h6>
            <div class="bg-light p-3 rounded border font-monospace small">
              「請使用 proposal-typesetter 工具。我有個『智慧農業精準灌溉系統』的構想，請先讀取 <code>proposal://guide/overview</code>，了解評審視角與各章撰寫總則；並依序為我建立新專案，填寫第一章專案摘要與第二章前言與開發動機。」
            </div>
          </div>
          <div class="mb-3">
            <h6 class="fw-bold text-dark">情境二：請 AI 扮演審查委員進行檢閱</h6>
            <div class="bg-light p-3 rounded border font-monospace small">
              「請呼叫 <code>review_as_judge</code> 檢驗目前的計畫書，依據七大評分構面（問題明確性、創新與差異化、技術可行性、效益可衡量性、時程合理性、完整度與精簡度），指出目前有哪些嚴重缺漏與建議改善項目。」
            </div>
          </div>
          <div>
            <h6 class="fw-bold text-dark">情境三：精簡過度冗長的章節</h6>
            <div class="bg-light p-3 rounded border font-monospace small">
              「請呼叫 <code>get_section</code> 讀取 <code>analysis</code> 章節，剔除空泛形容詞，將各功能對應至痛點，並確保字數落在 800 至 1400 字的建議區間內。」
            </div>
          </div>
        </div>
      </div>

      <!-- Tools Reference Table -->
      <div class="card shadow-sm border-0">
        <div class="card-header bg-secondary text-white fw-bold">
          <i class="bi bi-tools me-2"></i>內建 MCP 工具清單 (17 項)
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-striped mb-0 small">
              <thead class="table-light">
                <tr>
                  <th style="width: 25%;">工具名稱</th>
                  <th style="width: 50%;">功能說明</th>
                  <th style="width: 25%;">主要參數</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>get_writing_guide</code></td><td>取得各章撰寫指南、必含要素、禁忌與字數規範</td><td><code>section?</code></td></tr>
                <tr><td><code>create_project</code></td><td>建立新專案計畫書</td><td><code>titleZh, cover?</code></td></tr>
                <tr><td><code>get_project</code></td><td>讀取完整專案 JSON 資料</td><td><code>projectId</code></td></tr>
                <tr><td><code>set_section</code></td><td>覆寫章節（自動套用 R1-R6 單換行分段與段首空格清除）</td><td><code>projectId, section, markdown</code></td></tr>
                <tr><td><code>append_section</code></td><td>追加章節內容</td><td><code>projectId, section, markdown</code></td></tr>
                <tr><td><code>patch_section</code></td><td>局部搜尋並替換文字</td><td><code>projectId, section, find, replace</code></td></tr>
                <tr><td><code>validate_project</code></td><td>執行 V001–V010 規則檢查器</td><td><code>projectId, section?</code></td></tr>
                <tr><td><code>review_as_judge</code></td><td>評審視角 7 維度評分與交叉檢查</td><td><code>projectId</code></td></tr>
                <tr><td><code>get_stats</code></td><td>字數、段落數與圖表數統計</td><td><code>projectId</code></td></tr>
                <tr><td><code>export_docx</code></td><td>產出標準大專生排版 Word 檔</td><td><code>projectId, force?</code></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind copy button
  const copyBtn = container.querySelector('#btn-copy-config');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(claudeConfigJson).then(() => {
        copyBtn.innerHTML = '<i class="bi bi-check2 me-1"></i>已複製到剪貼簿！';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i>複製 Claude 設定 JSON';
        }, 2000);
      });
    });
  }
}
