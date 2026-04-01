
/**
 * 由於瀏覽器安全性限制，前端無法直接「掃描資料夾」。
 * 建議在 ./static/data/ 內放置一個 list.json 記錄檔案列表，
 * 或者如果您有後端 API，請將此網址改為 API 端點。
 */
let chapterFiles = [];
const DATA_PATH = './static/data/';
const LIST_CONFIG = DATA_PATH + 'list.json'; 

// 樣式池
const iconPool = [
    { icon: "fa-laptop-code", color: "indigo" },
    { icon: "fa-briefcase", color: "blue" },
    { icon: "fa-tablet-screen-button", color: "purple" },
    { icon: "fa-plane-departure", color: "teal" },
    { icon: "fa-heart-pulse", color: "rose" },
    { icon: "fa-pen-nib", color: "amber" }
];

async function initApp() {
    try {
        // 1. 嘗試讀取檔案清單索引
        const listResponse = await fetch(LIST_CONFIG);
        if (!listResponse.ok) throw new Error('無法取得檔案清單');
        
        const listData = await listResponse.json();
        // 假設 list.json 內容為 ["file1.json", "file2.json"]
        chapterFiles = Array.isArray(listData) ? listData : listData.files;
        
        if (!chapterFiles || chapterFiles.length === 0) {
            showEmptyState();
        } else {
            await loadChapterData();
        }
    } catch (error) {
        console.warn('自動掃描失敗，請檢查 ./static/data/list.json 是否存在。');
        showEmptyState();
    }
}

async function loadChapterData() {
    const grid = document.getElementById('chapter-grid');
    const countLabel = document.getElementById('chapter-count');
    grid.innerHTML = ''; 

    let loadedCount = 0;

    for (let i = 0; i < chapterFiles.length; i++) {
        const fileName = chapterFiles[i];
        const config = iconPool[i % iconPool.length];
        const displayTitle = fileName.replace(/\.json$/i, '');
        const filePath = `${DATA_PATH}${fileName}`;
        
        try {
            const response = await fetch(filePath);
            if (!response.ok) continue;
            
            const data = await response.json();
            const wordCount = Array.isArray(data) ? data.length : (data.words ? data.words.length : 0);
            
            createChapterCard(displayTitle, fileName, wordCount, config, i);
            loadedCount++;
        } catch (error) {
            console.error(`無法讀取單字數據: ${fileName}`, error);
        }
    }

    if (loadedCount === 0) {
        showEmptyState();
        countLabel.innerText = `無章節資料`;
    } else {
        countLabel.innerText = `共 ${loadedCount} 個章節`;
    }
}

function createChapterCard(title, fileName, wordCount, config, index) {
    const grid = document.getElementById('chapter-grid');
    const card = document.createElement('div');
    card.style.animationDelay = `${index * 100}ms`;
    card.className = "chapter-card animate-fadeIn group bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full";
    
    card.onclick = () => {
        openChapterModal(title, fileName, wordCount);
    };

    const iconBg = `bg-${config.color}-50`;
    const iconText = `text-${config.color}-600`;

    card.innerHTML = `
        <div class="mb-8">
            <div class="chapter-icon w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center ${iconText} text-2xl shadow-inner mb-6">
                <i class="fa-solid ${config.icon}"></i>
            </div>
            <h3 class="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                ${title}
            </h3>
            <div class="flex items-center text-slate-400 font-medium">
                <span class="bg-slate-100 px-3 py-1 rounded-full text-xs mr-2">
                    <i class="fa-solid fa-layer-group mr-1"></i> JSON 庫
                </span>
                <span class="text-sm">
                    <i class="fa-solid fa-list-check mr-1"></i> ${wordCount} 個單字
                </span>
            </div>
        </div>
        <div class="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between text-indigo-600 font-bold">
            <span>進入學習</span>
            <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <i class="fa-solid fa-chevron-right text-xs"></i>
            </div>
        </div>
    `;
    grid.appendChild(card);
}

function showEmptyState() {
    const grid = document.getElementById('chapter-grid');
    const countLabel = document.getElementById('chapter-count');
    grid.className = "block w-full"; 
    grid.innerHTML = `
        <div class="bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center animate-fadeIn shadow-inner">
            <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 text-5xl mb-6">
                <i class="fa-solid fa-folder-open"></i>
            </div>
            <h3 class="text-2xl font-bold text-slate-800 mb-2">目前尚未有章節</h3>
            <p class="text-slate-400 max-w-md">
                請確認在 <code class="bg-slate-100 px-1 rounded text-indigo-500">static/data/list.json</code> 中定義了檔案列表。
            </p>
        </div>
    `;
    if (countLabel) countLabel.innerText = `無章節資料`;
}

// 初始化
window.onload = () => {
    setupChapterModalEvents();
    initApp();
};
