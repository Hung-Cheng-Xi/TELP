// --- 狀態管理 ---
let isFlipped = false;
let currentWordIndex = 0;
let wordData = []; // 動態載入的單字陣列
let activeSettings = {
  count: null,
  random: false,
};

// --- 預設測試資料 (避免沒有後端/本地檔案時畫面空白) ---
const fallbackWordData = [
  {
    word: "Tablet",
    pos: "n.",
    meaning: "藥片，平板",
    homophone:
      "<span class='font-bold'>他不能</span> 👉 他生病了不能出門，需要吃<b>藥片(tablet)</b>。",
    roots:
      "源自古法語 <strong>tablete</strong> (小桌子/小石板) 👉 衍伸為片狀物 (藥片/平板電腦)。",
    ex1En:
      "He took a <span class='text-indigo-600 font-bold'>tablet</span> for his headache.",
    ex1Zh: "他吃了一顆藥片來治頭痛。(a small, solid piece of medicine)",
    ex2En:
      "Many students use a <span class='text-indigo-600 font-bold'>tablet</span> for online learning.",
    ex2Zh: "許多學生使用平板電腦進行線上學習。",
  },
];

// --- 功能函數 ---

// 🌟 新增：讀取 JSON 檔案內容並更新標題 🌟
async function loadChapter(filename) {
  // 從檔名萃取標題 (移除 .json，例如「第一章-科技詞彙」)
  const title = filename.replace(".json", "");
  document.getElementById("chapter-title").innerHTML =
    `<a href="./index.html" class="inline-flex items-center cursor-pointer hover:opacity-80 transition">
        <i class="fa-solid fa-layer-group text-indigo-500 mr-2"></i>
        <span>${title}</span>
    </a>
    `;

  try {
    // 實際串接：透過 Fetch API 讀取 local /static/data 資料夾中的檔案
    const response = await fetch(`static/data/${filename}`);
    if (!response.ok) {
      throw new Error(`無法載入 ${filename}，將使用預設資料。`);
    }

    wordData = await response.json();
  } catch (error) {
    console.warn(error);
    // 為了讓這套系統就算在沒有伺服器環境下也能預覽測試，提供 Fallback 資料
    wordData = fallbackWordData;
  }

  wordData = normalizeWordData(wordData);
  wordData = applyStudySettings(wordData, activeSettings);

  // 資料讀取完成後，初始化單字卡到第一個字
  currentWordIndex = 0;
  if (wordData && wordData.length > 0) {
    loadWordData(currentWordIndex);
  }
}

function normalizeWordData(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.words)) return data.words;
  return fallbackWordData;
}

function applyStudySettings(words, settings) {
  let result = [...words];

  if (settings.random) {
    result = shuffleWords(result);
  }

  if (Number.isInteger(settings.count) && settings.count > 0) {
    result = result.slice(0, settings.count);
  }

  return result.length > 0 ? result : fallbackWordData;
}

function shuffleWords(words) {
  const shuffled = [...words];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
}

// 1. 翻轉卡片
function flipCard() {
  if (!wordData || wordData.length === 0) return;
  const card = document.getElementById("flashcard");
  isFlipped = !isFlipped;
  if (isFlipped) {
    card.classList.add("rotate-y-180");
  } else {
    card.classList.remove("rotate-y-180");
  }
}

// 2. 切換單字
function changeWord(direction) {
  if (!wordData || wordData.length === 0) return;

  // 計算新索引
  currentWordIndex += direction;
  if (currentWordIndex < 0) currentWordIndex = wordData.length - 1;
  if (currentWordIndex >= wordData.length) currentWordIndex = 0;
  loadWordData(currentWordIndex);
}

// 3. 載入單字資料到 UI
function loadWordData(index) {
  if (!wordData || wordData.length === 0) return;
  const data = wordData[index];

  // 🌟 更新計數器 (目前單字號碼 / 總數量) 🌟
  document.getElementById("word-counter").innerText =
    `${index + 1} / ${wordData.length}`;

  // 更新內容
  document.getElementById("front-word").innerText = data.word || "";
  document.getElementById("back-word").innerText = data.word || "";
  document.getElementById("pos").innerText = data.pos || "";
  document.getElementById("meaning").innerText = data.meaning || "";
  document.getElementById("homophone").innerHTML = data.homophone || "";
  document.getElementById("roots").innerHTML = data.roots || "";
  document.getElementById("ex1-en").innerHTML = data.ex1En || "";
  document.getElementById("ex1-zh").innerHTML = data.ex1Zh || "";
  document.getElementById("ex2-en").innerHTML = data.ex2En || "";
  document.getElementById("ex2-zh").innerHTML = data.ex2Zh || "";
}

// 語音朗讀功能 (Web Speech API)
function speakText(elementId, event) {
  if (event) event.stopPropagation();
  const textElement = document.getElementById(elementId);
  if (!textElement) return;

  const textToSpeak = textElement.innerText || textElement.textContent;

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const bestVoice =
      voices.find(
        (voice) =>
          voice.lang.includes("en") &&
          (voice.name.includes("Google") ||
            voice.name.includes("Natural") ||
            voice.name.includes("Premium") ||
            voice.name.includes("Samantha") ||
            voice.name.includes("Alex")),
      ) || voices.find((voice) => voice.lang === "en-US");

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("此瀏覽器不支援 Web Speech API 語音朗讀功能。");
  }
}

// 在現有單字卡頁面的 window.onload 中：
window.onload = () => {
  // 取得網址列的參數，例如 ?chapter=第一章-科技詞彙.json
  const urlParams = new URLSearchParams(window.location.search);
  const chapterFile = urlParams.get("chapter");
  const countParam = Number.parseInt(urlParams.get("count") || "", 10);
  const randomParam = urlParams.get("random");

  activeSettings = {
    count: Number.isNaN(countParam) ? null : countParam,
    random: randomParam === "1" || randomParam === "true",
  };

  if (chapterFile) {
    // 如果網址有指定章節，就載入該章節
    loadChapter(chapterFile);
  } else {
    // 如果沒有指定，就載入預設章節
    loadChapter("第三章-tablet.json");
  }
};

// 阻止背面內容區塊的點擊事件冒泡，以免點擊內容時誤觸翻轉
document
  .querySelector(".custom-scrollbar")
  .addEventListener("click", function (e) {
    e.stopPropagation();
  });
