# 專案計劃書排版工具（Proposal Typesetter）

符合**大專學生研究計畫**標準格式之線上專案計畫書排版、品質檢驗與匯出工具。支援單頁純前端靜態部署（可直接發布至 GitHub Pages），並內建獨立本地端 **MCP (Model Context Protocol) Server (`mcp-server.js`)**，讓 AI 助理（Claude Desktop、Cursor、Antigravity、Windsurf）能以「審查委員視角」協助撰寫、檢查與匯出計畫書。

---

## 🌟 核心特色

1. **符合大專生計畫書排版規格**：
   - **字體規範**：中文字元自動套用 **標楷體**（`DFKai-SB`），英文、數字與半形符號自動套用 **Times New Roman**。
   - **版面設定**：A4 紙張、標準邊界（上下 2.54 cm、左右 3.17 cm）、本文 1.5 倍行距。
   - **段落規範（R1–R6）**：Enter 換行即新段落、自動**首行縮排 2 字元**、自動去除段首多餘空白與全形空格（U+3000）、標題／清單／表格／引用不縮排。
   - **完整三節結構**：Section 1 封面（無頁碼）、Section 2 目錄（羅馬數字頁碼 `i, ii`）、Section 3 本文（阿拉伯數字頁碼 `1, 2`，置中）。
2. **評審視角與品質檢驗器（Validator & Review As Judge）**：
   - 內建 **V001 至 V010** 機械式規則檢查（必填章節、字數上下限警示、單段超過 300 字拆段提醒、競品對照表有無、量化效益數據檢測）。
   - 提供 **7 大評審構面評分卡**（問題明確性、創新與差異化、技術可行性、效益可衡量性、時程合理性、完整度與一致性、精簡度）與痛點→功能→效益連貫性交叉檢查。
2. **自由修改標題與無限自訂章節**：
   - 預設提供大專生計畫書核心七大章節，使用者亦可**直接在編輯器內修改任一章節標題**。
   - 支援側邊欄一鍵 **「+ 新增章節」**（如經費預算、成果效益等），自動依中文序號（八、九、十…）編號與重整目錄。
   - 支援章節刪除功能，彈性適應不同競賽或學校計畫格式。
3. **靈活排版設定（含頁碼開關）**：
   - 頂部導覽列提供 **「頁碼開關」**，可自由決定預覽、Word 與 PDF 是否包含頁尾頁碼。
   - 緊湊精煉之導覽列高度與大幅挑高之編輯輸入框，書寫體驗更寬闊流暢。
4. **雙格式高保真直接匯出**：
   - **Word (.docx)**：使用 `docx.js` 產生，精確套用大專生樣式、自帶目錄引導線與跨頁重複表頭，版面與預覽一致。
   - **PDF 直接下載**：純前端改採 `html2canvas` (2x 解析度) + `jsPDF` **直接一鍵下載 A4 PDF 檔案**，完全不需要透過瀏覽器列印對話框，徹底解決列印造成跑版或字型替換的問題，保證 100% 呈現預覽畫面！
5. **資料安全與版本歷史**：
   - 純靜態網頁，資料保留於本機瀏覽器 `localStorage`，不需上傳第三方伺服器。
   - 每秒自動儲存，並保留最近 20 個歷史版本快照隨時還原。

---

## 🚀 部署至 GitHub Pages

本專案採純靜態設計，無需後端即可完整運作：

1. 將本專案推送到您的 GitHub 儲存庫：
   ```bash
   git init
   git add .
   git commit -m "feat: 專案計劃書排版工具初版發布"
   git branch -M main
   git remote add origin https://github.com/<您的帳號>/<專案名稱>.git
   git push -u origin main
   ```
2. 進入儲存庫的 **Settings** → **Pages**。
3. 在 **Build and deployment** 下方的 **Source** 選擇 `Deploy from a branch`。
4. Branch 選擇 `main` / Folder 選擇 `/ (root)`，點擊 **Save**。
5. 數分鐘後即可透過 `https://<您的帳號>.github.io/<專案名稱>/` 線上使用！

---

## 💻 本地端快速啟動（靜態網頁）

您可以使用任意靜態網頁伺服器開啟本專案：

```bash
# 使用 Python
python -m http.server 8080

# 或使用 Node.js http-server / serve
npx serve .
```
瀏覽器開啟 `http://localhost:8080` 即可開始編輯。

---

## 🤖 本地端 MCP (Model Context Protocol) 伺服器使用教學

為了讓 AI 能以「審查委員視角」直接協助您撰寫、校閱與匯出計畫書，專案提供了一個獨立的本地 Node.js 腳本：`mcp-server.js`。

### 1. 執行需求
- 需安裝 **Node.js (v18 以上)**。

### 2. 設定 Claude Desktop
編輯 Claude Desktop 的設定檔：
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

加入以下配置（請將路徑替換為您電腦上的 `mcp-server.js` 絕對路徑）：
```json
{
  "mcpServers": {
    "proposal-typesetter": {
      "command": "node",
      "args": ["D:/code/train/web/t261114/mcp-server.js"]
    }
  }
}
```
重啟 Claude Desktop 後，對話框右下角會出現小鎚子圖示，代表 17 項專案計畫書工具已成功載入！

### 3. 設定 Cursor IDE
1. 開啟 Cursor，進入 **Settings** → **Features** → **MCP Servers**。
2. 點擊 **+ Add New MCP Server**。
3. **Name**: `proposal-typesetter`
4. **Type**: `command`
5. **Command**: `node D:/code/train/web/t261114/mcp-server.js`（替換為實際路徑）。

### 4. 推薦 AI Prompt 範例

- **情境一：從構想逐章撰寫**
  > 「請使用 proposal-typesetter 工具。我有個『智慧農業精準灌溉系統』的構想，請先讀取 `proposal://guide/overview` 了解評審視角，並依序為我建立新專案，填寫第一章摘要與第二章動機。」

- **情境二：請 AI 扮演審查委員進行檢驗**
  > 「請呼叫 `review_as_judge` 檢閱計畫書，依據七大評分維度（問題明確性、創新與差異化、技術可行性、效益可衡量性、時程合理性、完整度與精簡度），指出目前有哪些嚴重缺漏與建議改善項目。」

- **情境三：精簡過度冗長的章節**
  > 「請呼叫 `get_section` 讀取 `analysis` 章節，剔除空泛形容詞，將各功能對應至痛點，並將字數控制在 800 至 1400 字的建議區間內。」

### 5. 與網頁端雙向同步
- AI 透過 MCP 寫入的專案將自動儲存在本地 `data/projects/{projectId}.json`。
- 在網頁端點擊頂部 **「匯入」** 選擇該 JSON 檔案，即可即時查看精美的 A4 分頁預覽並一鍵匯出 Word 與 PDF。
- 亦可在網頁端點擊 **「備份」** 匯出 JSON，交由 AI 客戶端繼續微調。

---

## 📂 檔案目錄架構

```
t261114/
├─ index.html                  # 靜態網頁入口 (支援 GitHub Pages)
├─ css/
│  └─ style.css                # A4 預覽、標楷體/Times 排版、列印樣式
├─ js/
│  ├─ app.js                   # 狀態管理、自動儲存、版本快照、匯出
│  ├─ core/
│  │  ├─ normalize.js          # R1–R6 輸入規範處理
│  │  ├─ md-parser.js          # 逐行 Markdown 解析 -> IR
│  │  ├─ ir-to-html.js         # IR -> HTML 預覽轉換
│  │  ├─ docx-builder.js       # Word (.docx) 生成器
│  │  ├─ validator.js          # V001–V010 規則檢查與評審視角分析
│  │  ├─ guides.js             # 七大章節撰寫指南與評分構面
│  │  └─ sample-data.js        # 預設計劃書範例（智慧農業灌溉系統）
│  └─ ui/
│     ├─ editor.js             # 封面與章節 Markdown 編輯器
│     ├─ preview.js            # A4 分頁模擬預覽
│     ├─ judge-view.js         # 評審視角與 Validator 報告面板
│     └─ mcp-guide-modal.js    # MCP 本地端使用教學
├─ vendor/
│  └─ docx.umd.js              # docx.js 離線瀏覽器函式庫
├─ data/projects/              # 本地 MCP 專案資料儲存目錄
├─ mcp-server.js               # 本地獨立執行的 Node.js MCP Server (stdio JSON-RPC)
├─ package.json
└─ README.md
```

---

## 📋 驗收規範對照

| 規格編號 | 驗收項目 | 實作狀況 |
|---|---|---|
| AC-01 | 七章節與封面資訊輸入，第七章為空則略過 | ✔ 完全支援，第七章留空時自動自輸出檔與目錄中排除 |
| AC-02 | Enter 即新段、忽略空行、自動首行縮排 2 字元 | ✔ 遵循 R1–R6 規範，`text-indent: 2em;` 與 `w:firstLineChars="200"` |
| AC-03 | 中文標楷體、英文數字 Times New Roman | ✔ CSS 與 Word `rFonts` 逐字正確設定 |
| AC-04 | Markdown 子集轉換（標題、表格、粗斜體、程式碼、圖片、強制分頁等） | ✔ 完整支援 IR 解析與渲染 |
| AC-05 | 封面、目錄、頁碼完整性 | ✔ 封面無頁碼、目錄羅馬頁碼 `i`、本文阿拉伯頁碼 `1` |
| AC-06 | 一鍵匯出 Word 與 PDF | ✔ 支援純前端與本地 MCP 伺服器匯出 `.docx` 與向量 A4 `.pdf`，版面與預覽一致 |
| AC-07 | MCP 工具完整提供 | ✔ `mcp-server.js` 內建 18 項 Tools、Resources 與 Prompts（含 `export_pdf`） |
| AC-08 | `get_writing_guide` 指南 | ✔ 回傳七章目的、必含要素、禁忌、建議字數與評審提問 |
| AC-09 | 即時更新與版本快照 | ✔ 支援每秒自動儲存與最近 20 個版本快照還原 |
| AC-10 | 評審視角審查（Validator、review_as_judge） | ✔ 具備 7 大構面評分卡、V001–V010 檢查報告與交叉檢查 |
| AC-11 | 預覽與輸出一致性 | ✔ 前端預覽與 docx-builder 共用相同 IR 解析核心 |
| AC-12 | 檔案相容性 | ✔ 產出之 `.docx` 於 Microsoft Word、WPS、LibreOffice 均可正常開啟 |
