/**
 * Chapter Writing Guides & Review Criteria
 * Defined in Section 4.3, 7.6, and 7.7
 */

export const SECTIONS_META = [
  {
    key: 'summary',
    number: '一',
    title: '專案摘要',
    required: true,
    suggestedMin: 300,
    suggestedMax: 500,
    purpose: '讓評審在 1 分鐘內理解整份計畫。',
    mustInclude: [
      '要解決的問題（1 句）',
      '解決方案與核心特色（2–3 句）',
      '使用技術／方法（1 句）',
      '預期成果與效益（含 1–2 個量化指標）'
    ],
    avoid: [
      '背景冗述',
      '技術細節堆疊',
      '與後面章節大量重複',
      '空泛形容詞（如「非常創新」「前景無限」）'
    ],
    judgeQuestions: [
      '這個計畫要做什麼？',
      '為什麼值得做？',
      '做得出來嗎？'
    ],
    outline: '問題 → 方案 → 方法 → 成果／效益，建議寫成 1–2 個短段落。',
    formatTips: '不使用標題與表格；可用粗體標出 2–3 個關鍵詞。',
    template: `本專案針對**農業灌溉用水浪費與巡田人力短缺**問題，開發一套結合物聯網（IoT）感測與邊緣 AI 決策的「智慧農業灌溉管理系統」。系統透過土壤溫濕度感測器與氣象預報數據，動態調整滴灌閥門開關，並具備異常漏水自動警報功能。
核心技術採用 ESP32 微控制器搭配微型決策模型，雲端以 Node.js 架構提供視覺化 Web 監控儀表板。預期成果將於示範農場進行為期三個月驗證，預計可**降低 35% 灌溉用水量**、**節省 50% 巡檢工時**，並提升農作物水份管理精準度。`
  },
  {
    key: 'motivation',
    number: '二',
    title: '前言與開發動機',
    required: true,
    suggestedMin: 500,
    suggestedMax: 900,
    purpose: '證明「問題真實存在且值得解決」。',
    mustInclude: [
      '領域背景（精簡）',
      '具體痛點（含數據、案例或訪談／問卷結果）',
      '現況不足',
      '本計畫目標（可條列、可衡量）'
    ],
    avoid: [
      '泛泛談時代趨勢',
      '個人感想式動機',
      '無出處的數據'
    ],
    judgeQuestions: [
      '痛點是否具體？',
      '是否有佐證？',
      '目標是否明確可衡量？'
    ],
    outline: '（一）背景與痛點 →（二）現有做法不足 →（三）計畫目標。',
    formatTips: '目標以有序清單呈現；引用數據請在第七章列出出處。',
    template: `# 研究背景與產業痛點
台灣農業正面臨農村人口高齡化與氣候變遷雙重考驗。依據農業部統計資料，農業灌溉用水佔全台總用水量逾六成，然而傳統農民多仰賴定時開關或人工目測經驗巡田灌溉，導致水資源過度灌溉或局部乾涸。
經團隊實地走訪中南部 5 處中小型蔬果溫室，發現農民平均每日需耗費 2.5 小時往返巡田與開關閥門，且遇到降雨時無法即時停灌，造成約 30% 至 40% 的不必要水資源浪費。

# 現有解決方案之不足
目前市面上商用智慧灌溉系統普遍存在以下痛點：
1. 建置成本高昂：整套工業級系統動輒新台幣數十萬元，中小型小農難以負擔。
2. 缺乏在地適應性：國外引進系統無法精準結合在地微氣候與特定作物蒸散需水特性。
3. 操作門檻高：多數介面繁複且未支援行動端即時通知，農民使用意願低。

# 計畫具體目標
本計畫旨在研發一套低成本、高可靠且直覺易用的開源智慧灌溉系統，具體達成以下目標：
1. 硬體感測節點單點建置成本壓低於新台幣 3,000 元以內。
2. 實證降低灌溉用水量 30% 以上。
3. 提供農民手機行動即時告警與遠端手動／自動排程控制。`
  },
  {
    key: 'competitor',
    number: '三',
    title: '競品分析與市場探討',
    required: true,
    suggestedMin: 600,
    suggestedMax: 1000,
    purpose: '證明「有市場、有差異、有切入點」。',
    mustInclude: [
      '至少 3 個真實競品／替代方案',
      '功能比較表（列：功能面向；欄：本計畫與各競品）',
      '本計畫差異化與不足之處的誠實說明',
      '目標使用者與市場規模（有來源）'
    ],
    avoid: [
      '只列競品介紹不分析',
      '盲目貶低競品',
      '捏造競品功能',
      '無來源的市場數字'
    ],
    judgeQuestions: [
      '與現有方案差在哪？',
      '差異是否真的有價值？',
      '目標客群是誰？'
    ],
    outline: '（一）競品概況 →（二）比較表 →（三）差異化定位 →（四）目標使用者／市場。',
    formatTips: '務必使用 GFM 表格；表格上方加「表：…」標題。',
    template: `# 國內外競品與現有方案概況
目前農業灌溉市場主要涵蓋三類方案：以色列 Netafim 等國際大廠智慧滴灌系統、國內農機行傳統定時灑水器，以及近年興起之通用型物聯網 DIY 開發套件。

[表] 國內外灌溉方案功能與成本比較表
| 評估維度 | 本系統 (SmartIrrig) | 國際工業大廠方案 | 傳統定時器方案 | 通用 IoT DIY 套件 |
| :--- | :---: | :---: | :---: | :---: |
| 單套建置成本 | 中低 (< 3,000 元) | 極高 (> 20 萬元) | 低 (< 1,500 元) | 中 (約 4,000 元) |
| 土壤水份感測 | 有 (電容式) | 有 (高精密度) | 無 | 需自行配線 |
| 氣象動態調節 | 有 (整合氣象局 API) | 有 (自有氣象站) | 無 | 無 |
| 斷網自主運作 | 支援邊緣決策 | 支援 | 僅依固定定時 | 無，依賴網路 |
| 行動通訊通知 | LINE Bot / Web | 專屬 App | 無 | 需自架雲端 |

# 本計畫核心差異化優勢
相較於既有方案，本計畫具備三大核心競爭力：
1. **極致性價比**：採用標準商用模組化硬體，大幅降低導入門檻，適合台灣小農家庭農場。
2. **結合氣象預報之微氣候演算法**：不僅感測當前土壤濕度，更提早判定 3 小時內降雨機率，主動抑制無效灌溉。
3. **極簡操作體驗**：整合台灣最普及之通訊軟體通知，降低科技學習門檻。

# 目標客群與市場潛力
初期目標市場鎖定全台溫室精緻農業小農（如小番茄、洋香瓜、草莓等高經濟作物），根據農業部統計，全台設施栽培面積超過 3.4 萬公頃，具備明確且迫切的數位轉型商機。`
  },
  {
    key: 'analysis',
    number: '四',
    title: '系統分析與功能規劃',
    required: true,
    suggestedMin: 800,
    suggestedMax: 1400,
    purpose: '證明「需求清楚、範圍合理、功能能解決第二章的問題」。',
    mustInclude: [
      '使用者角色',
      '需求（功能性／非功能性）',
      '功能清單（含優先級 P0/P1/P2）',
      '核心流程（以流程圖或步驟說明）',
      '與痛點的對應',
      '範圍界定（本期不做什麼）'
    ],
    avoid: [
      '功能羅列無優先級',
      '與痛點無關的功能',
      '畫面細節過度描述'
    ],
    judgeQuestions: [
      '功能是否對應痛點？',
      '範圍是否在期限內做得完？'
    ],
    outline: '（一）使用者與情境 →（二）需求分析 →（三）功能規劃表 →（四）主要流程 →（五）範圍與限制。',
    formatTips: '功能表欄位建議「編號／功能／說明／優先級」；流程圖可用文字步驟或圖表。',
    template: `# 使用者角色與情境分析
本系統規劃兩種主要使用者角色：
1. 農民／溫室管理者：主要進行閥門遠端控制、灌溉閥值設定、警報確認與歷史耗水量檢視。
2. 系統維護工程師：負責感測器節點校正、韌體 OTA 更新與系統連線監控。

# 系統功能清單與優先級規劃
[表] 系統功能規劃與優先等級清單
| 功能編號 | 功能模組 | 功能詳細說明 | 對應痛點 | 優先等級 |
| :---: | :--- | :--- | :--- | :---: |
| F01 | 環境感測擷取 | 每 5 分鐘量測土壤含水率、空氣溫濕度並上傳 | 缺乏數據決策 | P0 |
| F02 | 動態智能滴灌 | 依據土壤濕度閥值與降雨機率自動啟閉電磁閥 | 過度灌溉浪費 | P0 |
| F03 | 異常洩漏警報 | 閥門開啟但無流量或關閉時水壓異常之即時告警 | 巡田人力負擔 | P0 |
| F04 | LINE 即時推播 | 每日灌溉日報與關鍵異常推播發送至手機 | 系統操作不易 | P1 |
| F05 | 視覺化儀表板 | Web 介面即時折線圖呈現溫濕度走勢與灌溉紀錄 | 數據難以追蹤 | P1 |
| F06 | 多作物模式推薦 | 依作物種類提供原廠建議灌溉參數模型 | 經驗傳承不易 | P2 |

# 核心作業流程
系統核心運作流程如下：
1. 邊緣節點開機自檢，定時擷取電容式土壤感測器電壓訊號。
2. 本地微控制器比對上限與下限安全閥值；若濕度低於下限，啟動灌溉預備。
3. 透過 Wi-Fi/4G 模組向氣象 API 請求鄰近測站未來 3 小時降雨機率；若降雨率大於 70%，則延遲灌溉。
4. 電磁閥啟動，水流感測器同步驗證管路通水，灌溉達標後平順關閉。
5. 雲端伺服器接收通報，更新日誌並於異常時發布推播。

# 本專案開發範圍與限制
本期專案著重於小型精緻溫室單一灌溉分區之驗證，多閥門階層式矩陣控制與自動施肥注肥系統（Fertigation）列為第二期擴充項目，確保本計畫能在執行時程內高品質完成驗證。`
  },
  {
    key: 'architecture',
    number: '五',
    title: '系統架構與技術設計',
    required: true,
    suggestedMin: 800,
    suggestedMax: 1400,
    purpose: '證明「技術可行、選型有理由、風險可控」。',
    mustInclude: [
      '整體架構圖與各層說明',
      '技術選型及理由（為何選它而非替代方案）',
      '資料設計（主要資料實體）',
      '介面／API 概要',
      '安全性與隱私',
      '效能與擴充性考量',
      '開發與部署環境'
    ],
    avoid: [
      '技術名詞堆疊無理由',
      '過度細節（程式碼貼上）',
      '未說明如何驗證'
    ],
    judgeQuestions: [
      '團隊有能力實作嗎？',
      '選型合理嗎？',
      '有哪些技術風險、如何因應？'
    ],
    outline: '（一）架構總覽 →（二）技術選型 →（三）資料與介面設計 →（四）安全與風險。',
    formatTips: '必備一張架構圖（可用圖或文字圖）；技術選型建議用表格（項目／選用／理由）。',
    template: `# 系統整體分層架構
系統採三層式物聯網架構設計：
1. 感測與邊緣控制層：由 ESP32 控制板搭配工業級電容式土壤水分感測器與繼電器電磁閥組成。
2. 雲端服務與資料層：以 Node.js / Express 搭建 RESTful API 與 MQTT Broker，資料庫採用 SQLite/PostgreSQL。
3. 應用與展示層：採用 Bootstrap 5 與響應式 Web 儀表板，支援手機與桌機流暢操作。

[表] 核心技術選型與決策評估表
| 架構層級 | 採用技術 | 備選技術 | 評估與選型理由 |
| :--- | :--- | :--- | :--- |
| 邊緣控制器 | ESP32-S3 | Arduino Uno / Raspberry Pi | 內建 Wi-Fi/BLE、運算效能佳、低功耗且成本僅約 Pi 的十分之一 |
| 通訊協定 | MQTT + HTTPS | CoAP / 純 HTTP | MQTT 具備輕量化、心跳機制與斷線自動重連，適合偏遠農田弱網環境 |
| 後端服務 | Node.js | Python Flask | 非同步 I/O 處理大量感測器併發連線效率優異，前後端語言一致性高 |
| 前端框架 | HTML5 + Bootstrap 5 | React / Vue | 無需複雜編譯流程，輕量高相容，方便快速交付與無障礙相容 |

# 主要資料實體設計
系統規劃三大核心資料模型：
1. SensorReading（感測讀值）：包含設備識別碼、時間戳記、土壤濕度、空氣溫度、空氣濕度、蓄電池電量。
2. IrrigationEvent（灌溉事件）：包含事件編號、觸發類型（自動/手動）、開始時間、持續秒數、耗水量估計、狀態。
3. AlertLog（警報日誌）：包含嚴重等級（Info/Warning/Error）、警報代碼、訊息內容、推播發送狀態。

# 系統安全與穩定性設計
為因應農田戶外極端天候，硬體節點具備 Watchdog 硬體重置晶片，並支援離線邊緣運作模式：當雲端斷線時，節點仍能依據 EEPROM 預載之保護門檻自主斷開閥門，防止農田淹水。通訊全面採用 TLS/SSL 加密，防止資料偽造。`
  },
  {
    key: 'schedule',
    number: '六',
    title: '專案時程與預期效益',
    required: true,
    suggestedMin: 500,
    suggestedMax: 900,
    purpose: '證明「進度可控、成果可驗收、效益可衡量」。',
    mustInclude: [
      '時程表（階段／起訖／交付物）',
      '成員分工',
      '里程碑與驗收標準',
      '預期效益（量化＋質化）',
      '風險與因應',
      '後續發展（簡短）'
    ],
    avoid: [
      '時程無交付物',
      '效益無法衡量（無任何數字）',
      '與第四章功能對不上'
    ],
    judgeQuestions: [
      '時間配置合理嗎？',
      '成果如何驗證？',
      '效益有多大？'
    ],
    outline: '（一）時程規劃 →（二）分工 →（三）預期效益 →（四）風險與因應。',
    formatTips: '時程以表格呈現；效益寫成「指標＋目標值＋量測方式」。',
    template: `# 專案開發時程與里程碑
專案規劃為期 8 個月，分為四個主要開發階段：

[表] 專案時程與階段交付物規劃表
| 階段 | 期程 (月) | 主要工作內容 | 關鍵交付產出 |
| :---: | :---: | :--- | :--- |
| 第一階段 | M1 – M2 | 需求訪談、硬體選型採購與電路洗板設計 | 系統規格書、感測節點硬體原型 v1 |
| 第二階段 | M3 – M4 | 邊緣韌體撰寫、雲端通訊整合與 Web 儀表板開發 | MQTT 雲端伺服器、Web 監控介面 |
| 第三階段 | M5 – M6 | 合作農場實地部署、三個月連續測試與演算法校正 | 實測運行記錄、演算法調優報告 |
| 第四階段 | M7 – M8 | 數據成效分析、成果展示與結案專題報告撰寫 | 成果報告書、系統展示影片 |

# 團隊成員專業分工
1. 王小明（組長）：專案總體進度管制、邊緣硬體電路設計與 ESP32 韌體程式開發。
2. 陳小美（組員）：雲端資料庫建置、後端 API 撰寫與 LINE Bot 通知服務對接。
3. 林大華（組員）：前端 Web 介面開發、農場實地部署測試與數據統計分析。

# 預期量化與質化效益
[表] 計畫量化效益評估指標
| 評估指標 | 傳統現況基準 | 本計畫預期目標 | 效益提升幅度 | 驗證方式 |
| :--- | :---: | :---: | :---: | :--- |
| 單棚每月灌溉耗水量 | 約 120 噸 | 降至 78 噸以下 | 節水 35% | 實體機械水表連續計量比對 |
| 每週巡田開關工時 | 17.5 小時 | 降至 8.5 小時以下 | 減少工時 51% | 農民工作日誌打卡紀錄 |
| 異常漏水偵測反應時間 | 平均 12 小時 (次日巡田) | 縮短至 3 分鐘以內 | 提升 99% | 系統發出告警至使用者收到秒數 |

# 專案風險與因應措施
1. 戶外高溫潮濕導致電路損毀風險：採用 IP66 防水外殼與感測器防腐蝕三防膠披覆處理。
2. 田區無線訊號不穩定風險：節點內建本機邊緣自主運算排程，斷網時照常運作並暫存離線數據。`
  },
  {
    key: 'references',
    number: '七',
    title: '參考資料（文獻）',
    required: false,
    suggestedMin: 0,
    suggestedMax: 0,
    purpose: '佐證第二、三章的數據與論點。',
    mustInclude: [
      '僅列正文實際引用的資料',
      '格式統一（建議 APA 第 7 版）'
    ],
    avoid: [
      '湊數',
      '未引用卻列出',
      '無法查證的來源',
      'AI 虛構文獻'
    ],
    judgeQuestions: [
      '文獻是否真實？',
      '是否與正文論點直接相關？'
    ],
    outline: '每筆一行，中文文獻在先，英文在後。',
    formatTips: '每筆一行（即一段）；無資料則留空，系統自動略過此章與目錄。',
    template: `農業部農田水利署 (2024)。農業用水現況與智慧水資源管理推動報告。取自 https://www.ia.gov.tw
行政院主計總處 (2023)。農林漁牧業普查報告分析。台北：主計總處。
Smith, J., & Patel, K. (2023). IoT-based Precision Agriculture: A Survey on Smart Irrigation Techniques. IEEE Internet of Things Journal, 10(4), 3120-3135.
Chen, Y., & Lin, C. (2022). Edge AI for Microclimate Monitoring in Smart Greenhouses. Computers and Electronics in Agriculture, 195, 106822.`
  }
];

export const OVERVIEW_GUIDE = `你正在協助撰寫一份「專案計劃書」，讀者是審查委員。
請隨時以評審的視角撰寫：評審時間有限，會快速掃描，重視
「問題是否真實、做法是否可行、成果是否可驗證、團隊是否有能力完成」。

撰寫原則：
1. 切合主題：每一段都要回答「這對評審判斷本計畫有何幫助？」，無關即刪。
2. 精簡有力：一段一個重點，避免口號、客套話、重複敘述與空泛形容詞（如「非常創新」「前景無限」）。用事實、數據、對照取代形容。
3. 可驗證：目標、效益、時程盡量量化（數字、日期、指標）。
4. 前後一致：第二章提出的問題，必須在第四章有對應功能，在第六章有對應效益；名詞全文統一。
5. 誠實：不捏造數據、文獻、競品功能；不確定的資料請向使用者詢問或標示「待補」。
6. 先問再寫：若使用者提供的資訊不足以支撐某章，先用最少的問題追問，不要用空話填滿字數。
7. 格式：直接輸出 Markdown；在輸入框按 Enter 就是新段落，不要自行加段首空格、不要用空白行分段、不要使用不支援的語法。章標題由系統自動產生，內文不要重複寫「一、專案摘要」。
8. 寫完請呼叫 validate_project 與 review_as_judge，依結果修正後再匯出。`;

export const EVALUATION_DIMENSIONS = [
  { name: '問題明確性', description: '痛點是否具體真實、有佐證數據，而非泛泛空談。', weight: 15 },
  { name: '創新與差異化', description: '相較既有競品與方案是否有明確優勢與切入點。', weight: 15 },
  { name: '技術可行性', description: '技術選型是否合理、架構清楚、風險有具體對策。', weight: 20 },
  { name: '效益可衡量性', description: '是否有可量化之效益指標與驗證方式。', weight: 15 },
  { name: '時程合理性', description: '工作分期、里程碑與成員分工是否具體可行。', weight: 15 },
  { name: '完整度與一致性', description: '痛點、功能、效益前後呼應，格式符合規範。', weight: 10 },
  { name: '精簡度', description: '文字精煉，無冗言贅字與空泛口號，段落長度適中。', weight: 10 }
];

export const PROMPTS_DEF = [
  {
    name: 'draft_proposal',
    description: '依使用者提供的構想，逐章撰寫整份計劃書的流程指引',
    arguments: [{ name: 'concept', description: '專案核心構想、解決的問題與目標使用者', required: true }]
  },
  {
    name: 'review_proposal',
    description: '以評審視角檢視整份計劃書並提出具體修改建議',
    arguments: [{ name: 'projectId', description: '專案代號', required: true }]
  },
  {
    name: 'tighten_section',
    description: '精簡指定章節，保留核心數據與論點，剔除冗贅字句降低字數',
    arguments: [
      { name: 'projectId', description: '專案代號', required: true },
      { name: 'section', description: '章節名稱 (summary/motivation/...)', required: true }
    ]
  },
  {
    name: 'ask_missing_info',
    description: '資訊不足時，列出需向使用者追問的最少核心問題',
    arguments: [{ name: 'section', description: '目前正要撰寫之章節', required: true }]
  }
];

const CHINESE_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '二十一', '二十二', '二十三', '二十四', '二十五'];

export function getChineseNum(n) {
  if (n <= 25) return CHINESE_NUMS[n - 1] || `${n}`;
  return `${n}`;
}

/**
 * Re-indexes chapter numbers (一、, 二、, 三、...) based on current chapter array order
 */
export function reindexChapterNumbers(chapters) {
  if (!Array.isArray(chapters)) return;
  chapters.forEach((ch, idx) => {
    ch.number = getChineseNum(idx + 1);
  });
}

/**
 * Gets chapters array from project, supporting custom additions and title edits
 */
export function getProjectChapters(project) {
  if (!project) return [];

  if (Array.isArray(project.chapters) && project.chapters.length > 0) {
    // Keep project.sections in sync
    if (!project.sections) project.sections = {};
    for (const ch of project.chapters) {
      if (!project.sections[ch.key]) {
        project.sections[ch.key] = { markdown: ch.markdown || '' };
      }
    }
    return project.chapters;
  }

  // Migrate or initialize from SECTIONS_META and project.sections
  const chapters = SECTIONS_META.map(meta => ({
    id: meta.key,
    key: meta.key,
    number: meta.number,
    title: meta.title,
    required: meta.required,
    suggestedMin: meta.suggestedMin,
    suggestedMax: meta.suggestedMax,
    purpose: meta.purpose,
    mustInclude: meta.mustInclude,
    avoid: meta.avoid,
    judgeQuestions: meta.judgeQuestions,
    outline: meta.outline,
    formatTips: meta.formatTips,
    template: meta.template,
    markdown: (project.sections && project.sections[meta.key] && project.sections[meta.key].markdown !== undefined)
      ? project.sections[meta.key].markdown
      : (meta.template || '')
  }));

  project.chapters = chapters;
  if (!project.sections) project.sections = {};
  for (const ch of chapters) {
    project.sections[ch.key] = { markdown: ch.markdown };
  }

  return chapters;
}

/**
 * Adds a new custom chapter to the project
 */
export function addNewChapter(project, customTitle = '自訂章節') {
  const chapters = getProjectChapters(project);
  const newIdx = chapters.length + 1;
  const newNum = getChineseNum(newIdx);
  const key = `custom_${Date.now()}`;

  const newCh = {
    id: key,
    key: key,
    number: newNum,
    title: customTitle,
    required: false,
    suggestedMin: 0,
    suggestedMax: 0,
    purpose: '使用者自訂之專案章節。',
    mustInclude: ['依專案需求填寫之重點項目'],
    avoid: ['空泛敘述'],
    judgeQuestions: ['本章節對整體計畫之貢獻與必要性為何？'],
    outline: '自由規劃段落與子標題。',
    formatTips: '按 Enter 換行即分段，自動首行縮排 2 字元。',
    markdown: ''
  };

  chapters.push(newCh);
  if (!project.sections) project.sections = {};
  project.sections[key] = { markdown: '' };
  reindexChapterNumbers(chapters);
  return newCh;
}

/**
 * Removes a chapter by key/id
 */
export function removeChapter(project, chapterKey) {
  const chapters = getProjectChapters(project);
  const idx = chapters.findIndex(c => c.key === chapterKey || c.id === chapterKey);
  if (idx !== -1) {
    chapters.splice(idx, 1);
    if (project.sections && project.sections[chapterKey]) {
      delete project.sections[chapterKey];
    }
    reindexChapterNumbers(chapters);
    return true;
  }
  return false;
}
