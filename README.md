# 單字學習艙

單字學習艙是一個以純前端實作的英文單字複習工具。專案以靜態網頁形式運作，不需要後端或建置流程；首頁會讀取 `static/data/list.json` 中定義的章節清單，再依照使用者選擇載入對應的 JSON 題庫。

目前專案聚焦在「快速開始一輪複習」：選擇章節、設定題數與是否隨機出題後，可以進入翻卡式單字卡，或改用中英文配對遊戲檢查熟悉度。整體介面支援桌機與手機瀏覽，也具備 PWA 安裝與離線快取能力。

## 主要功能

- 章節式題庫：透過 `static/data/list.json` 管理章節檔案，首頁自動列出可練習的 JSON 題庫。
- 複習設定：每次開始前可選擇題數，支援 10 題、20 題、全部，以及自訂範圍與隨機模式。
- 單字卡複習：提供翻卡式單字、詞性、中文意思、記憶筆記、字根拆解與情境例句。
- 熟悉度分類：在單字卡模式中可左右滑動或使用鍵盤方向鍵，把單字標記為「會」或「不會」。
- 集中複習弱項：完成一輪後會顯示摘要，並可只針對「不會」的單字再複習。
- 英文語音朗讀：使用瀏覽器 Web Speech API 播放單字與例句發音。
- 單詞配對配：以連連看方式練習中英文對應，每回合最多 6 組單字，完成後自動進入下一回合。
- PWA 支援：包含 `manifest.webmanifest`、`service-worker.js` 與離線頁面，可在支援的瀏覽器安裝並快取本地資源。

目前內建 5 個章節範例題庫，共 379 個單字：

| 章節檔案 | 單字數 |
| --- | ---: |
| `第一章-covid-19.json` | 101 |
| `第二章-特斯拉.json` | 71 |
| `第三章-tablet.json` | 65 |
| `第四章-touchscreen.json` | 70 |
| `第五章-Unmanned Aerial Vehicle.json` | 72 |

## 使用方式

這是靜態網站，但因為頁面會使用 `fetch()` 載入 JSON 題庫，請透過本機伺服器開啟，不要直接用檔案路徑開啟 HTML。

```bash
python3 -m http.server 5173
```

啟動後開啟：

```text
http://localhost:5173/
```

也可以使用 VS Code 的 Live Server 或任何靜態檔案伺服器。

## 專案結構

```text
.
├── manifest.webmanifest       # PWA manifest
├── service-worker.js          # 快取策略與離線支援
├── index.html                 # 首頁：章節選擇、題數設定、模式選擇
├── template
│   ├── vocabulary-card.html   # 單字卡複習頁
│   ├── word-matching.html     # 中英文配對遊戲頁
│   └── offline.html           # PWA 離線提示頁
└── static
    ├── data
    │   ├── list.json          # 題庫章節清單
    │   └── *.json             # 單字題庫
    ├── icons                  # PWA 圖示
    └── js
        ├── chapter-modal.js   # 首頁設定與模式選擇流程
        ├── index.js           # 章節資料載入與首頁卡片渲染
        ├── pwa.js             # Service worker 註冊
        ├── vocabulary-card.js # 單字卡流程、滑動分類、語音朗讀
        └── word-matching.js   # 配對遊戲流程
```

## 題庫格式

新增章節時，先在 `static/data/` 放入 JSON 檔，再把檔名加入 `static/data/list.json`。每個單字項目建議包含以下欄位：

```json
{
  "word": "pandemic",
  "pos": "n./adj.",
  "meaning": "流行病；流行的",
  "homophone": "<span class='font-bold'>怕你帶沒克</span>：一場<b>流行病(pandemic)</b>來了，大家都怕你帶來病毒。",
  "roots": "<strong>pan-</strong>（全部）+ <strong>dem</strong>（人民）：影響很多地區與人群的流行病。",
  "ex1En": "The <span class='text-indigo-600 font-bold'>pandemic</span> caused anxiety and confusion.",
  "ex1Zh": "這場流行病造成了焦慮與混亂。",
  "ex2En": "In some areas, the virus became <span class='text-indigo-600 font-bold'>pandemic</span> very quickly.",
  "ex2Zh": "在某些地區，這種病毒很快就變得流行。"
}
```

`homophone`、`roots`、`ex1En` 等欄位目前會以 HTML 方式渲染，方便標示重點字，但也代表題庫內容應只放可信資料。

## PWA 與離線快取

Service worker 會預先快取首頁、練習頁、核心 JavaScript、圖示與目前列在 `APP_SHELL` 中的題庫檔案。若新增或更名章節，請同步更新：

- `static/data/list.json`
- `service-worker.js` 的 `APP_SHELL`
- 必要時調整 `APP_VERSION` 讓使用者取得新版快取

Service worker 需要在 `localhost` 或 HTTPS 環境下運作。第一次載入時使用到的 CDN 資源，例如 Tailwind CSS、Font Awesome 與 Google Fonts，仍需要網路連線或瀏覽器既有快取。

## 技術使用

- HTML5
- Tailwind CSS CDN
- Vanilla JavaScript
- Font Awesome CDN
- Google Fonts
- Web Speech API
- Service Worker / Web App Manifest

## 開發狀態

目前版本採用 JSON 題庫驅動的單字複習 PWA。主要入口是 `index.html`，核心練習模式是 `template/vocabulary-card.html` 與 `template/word-matching.html`。
