
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
    { icon: "fa-laptop-code", iconWrapClass: "bg-slate-100 text-slate-700" },
    { icon: "fa-briefcase", iconWrapClass: "bg-slate-100 text-slate-700" },
    { icon: "fa-tablet-screen-button", iconWrapClass: "bg-slate-100 text-slate-700" },
    { icon: "fa-plane-departure", iconWrapClass: "bg-slate-100 text-slate-700" },
    { icon: "fa-heart-pulse", iconWrapClass: "bg-slate-100 text-slate-700" },
    { icon: "fa-pen-nib", iconWrapClass: "bg-slate-100 text-slate-700" }
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
    card.className = "chapter-card chapter-card-surface animate-fadeIn group p-6 sm:p-7 rounded-[1.75rem] sm:rounded-[2rem] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full";
    
    card.onclick = () => {
        openChapterModal(title, fileName, wordCount);
    };

    card.innerHTML = `
        <div class="mb-8">
            <div class="chapter-icon hidden sm:flex w-14 h-14 sm:w-16 sm:h-16 rounded-[1.35rem] ${config.iconWrapClass} items-center justify-center text-xl sm:text-2xl shadow-[0_16px_36px_rgba(15,23,42,0.08)] mb-5">
                <i class="fa-solid ${config.icon}"></i>
            </div>
            <div class="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">
                Chapter ${index + 1}
            </div>
            <h3 class="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                ${title}
            </h3>
            <p class="text-slate-500 leading-6">
                從這個章節開始，用更專注的卡片式流程完成單字複習。
            </p>
            <div class="flex flex-wrap items-center gap-2 text-slate-400 font-medium mt-5">
                <span class="bg-slate-100 px-3 py-1 rounded-full text-xs">
                    <i class="fa-solid fa-layer-group mr-1"></i> JSON 庫
                </span>
                <span class="text-sm rounded-full border border-slate-200 bg-white/80 px-3 py-1">
                    <i class="fa-solid fa-list-check mr-1"></i> ${wordCount} 個單字
                </span>
            </div>
        </div>
        <div class="mt-auto pt-5 border-t border-slate-200/80 flex items-center justify-between text-slate-900 font-bold">
            <span>進入學習</span>
            <div class="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center transition-all">
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
        <div class="chapter-card-surface rounded-[2rem] border-dashed p-12 sm:p-16 flex flex-col items-center justify-center text-center animate-fadeIn">
            <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 text-4xl mb-6">
                <i class="fa-solid fa-folder-open"></i>
            </div>
            <h3 class="text-2xl font-bold tracking-tight text-slate-900 mb-2">目前尚未有章節</h3>
            <p class="text-slate-500 max-w-md leading-7">
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
