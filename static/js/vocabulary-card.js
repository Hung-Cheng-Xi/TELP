// --- 狀態管理 ---
let isFlipped = false;
let currentWordIndex = 0;
let wordData = [];
let originalWordData = [];
let roundReviewedCount = 0;
let activeSettings = {
  count: null,
  random: false,
};

const knownWordIds = new Set();
const unknownWordIds = new Set();

const swipeState = {
  startX: 0,
  startY: 0,
  isDragging: false,
  isScrollableTarget: false,
  pointerId: null,
};

const SWIPE_TRIGGER_DISTANCE = 110;
const SWIPE_ROTATION_FACTOR = 0.06;
const SWIPE_ANIMATION_MS = 280;

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

async function loadChapter(filename) {
  const title = filename.replace(".json", "");
  document.getElementById("chapter-title").innerHTML =
    `<a href="./index.html" class="inline-flex items-center cursor-pointer hover:opacity-80 transition">
        <i class="fa-solid fa-layer-group text-indigo-500 mr-2"></i>
        <span>${title}</span>
    </a>
    `;

  try {
    const response = await fetch(`static/data/${filename}`);
    if (!response.ok) {
      throw new Error(`無法載入 ${filename}，將使用預設資料。`);
    }

    wordData = await response.json();
  } catch (error) {
    console.warn(error);
    wordData = fallbackWordData;
  }

  wordData = normalizeWordData(wordData);
  wordData = applyStudySettings(wordData, activeSettings);
  resetStudySession(wordData);
}

function normalizeWordData(data) {
  const sourceData = Array.isArray(data)
    ? data
    : data && Array.isArray(data.words)
      ? data.words
      : fallbackWordData;

  return sourceData.map((item, index) => ({
    ...item,
    id:
      item.id ||
      `${item.word || "word"}-${item.meaning || "meaning"}-${index}`,
  }));
}

function applyStudySettings(words, settings) {
  let result = [...words];

  if (settings.random) {
    result = shuffleWords(result);
  }

  if (Number.isInteger(settings.count) && settings.count > 0) {
    result = result.slice(0, settings.count);
  }

  return result.length > 0 ? result : normalizeWordData(fallbackWordData);
}

function shuffleWords(words) {
  const shuffled = [...words];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
}

function resetStudySession(words) {
  originalWordData = [...words];
  wordData = [...words];
  currentWordIndex = 0;
  roundReviewedCount = 0;
  knownWordIds.clear();
  unknownWordIds.clear();
  closeSummaryModal();

  if (wordData.length > 0) {
    loadWordData(currentWordIndex);
  }

  updateProgressChips();
}

function startReviewUnknownWords() {
  const nextRoundWords = originalWordData.filter((word) =>
    unknownWordIds.has(word.id),
  );

  if (nextRoundWords.length === 0) {
    updateSummaryModal();
    openSummaryModal();
    return;
  }

  wordData = nextRoundWords;
  currentWordIndex = 0;
  roundReviewedCount = 0;
  closeSummaryModal();
  loadWordData(currentWordIndex);
  updateProgressChips();
}

function flipCard() {
  if (!wordData || wordData.length === 0) return;
  const card = document.getElementById("flashcard");
  isFlipped = !isFlipped;
  card.classList.toggle("rotate-y-180", isFlipped);
}

function resetFlipState() {
  isFlipped = false;
  document.getElementById("flashcard").classList.remove("rotate-y-180");
}

function getWordSizeClass(word = "") {
  const normalizedWord = String(word).replace(/\s+/g, "");

  if (normalizedWord.length >= 15) return "word-size-xlong";
  if (normalizedWord.length >= 10) return "word-size-long";
  return "word-size-default";
}

function applyWordSize(elementId, word) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.classList.remove("word-size-default", "word-size-long", "word-size-xlong");
  element.classList.add(getWordSizeClass(word));
}

function loadWordData(index) {
  if (!wordData || wordData.length === 0) return;
  const data = wordData[index];

  document.getElementById("word-counter").innerText = `${index + 1} / ${wordData.length}`;
  document.getElementById("front-word").innerText = data.word || "";
  document.getElementById("back-word").innerText = data.word || "";
  applyWordSize("front-word", data.word || "");
  applyWordSize("back-word", data.word || "");
  document.getElementById("pos").innerText = data.pos || "";
  document.getElementById("meaning").innerText = data.meaning || "";
  document.getElementById("homophone").innerHTML = data.homophone || "";
  document.getElementById("roots").innerHTML = data.roots || "";
  document.getElementById("ex1-en").innerHTML = data.ex1En || "";
  document.getElementById("ex1-zh").innerHTML = data.ex1Zh || "";
  document.getElementById("ex2-en").innerHTML = data.ex2En || "";
  document.getElementById("ex2-zh").innerHTML = data.ex2Zh || "";
  resetFlipState();
}

function updateProgressChips() {
  const totalWords = originalWordData.length;
  const completedCount = knownWordIds.size;
  const unknownCount = unknownWordIds.size;
  const remainingCount = Math.max(totalWords - completedCount - unknownCount, 0);

  document.getElementById("known-count-chip").innerText = `已經會 ${completedCount}`;
  document.getElementById("unknown-count-chip").innerText = `還不會 ${unknownCount}`;
  document.getElementById("remaining-count-chip").innerText = `剩餘 ${remainingCount}`;
}

function markCurrentWord(result) {
  if (!wordData || wordData.length === 0) return;

  const currentWord = wordData[currentWordIndex];
  if (!currentWord) return;

  if (result === "known") {
    knownWordIds.add(currentWord.id);
    unknownWordIds.delete(currentWord.id);
  } else {
    unknownWordIds.add(currentWord.id);
    knownWordIds.delete(currentWord.id);
  }

  roundReviewedCount += 1;
  updateProgressChips();

  if (currentWordIndex >= wordData.length - 1) {
    updateSummaryModal();
    openSummaryModal();
    return;
  }

  currentWordIndex += 1;
  loadWordData(currentWordIndex);
}

function animateSwipeAndMark(result) {
  const cardShell = document.getElementById("card-shell");
  if (!cardShell || cardShell.classList.contains("is-animating")) return;

  const exitClass =
    result === "known" ? "is-exiting-right" : "is-exiting-left";
  const directionClass = result === "known" ? "swipe-right" : "swipe-left";

  cardShell.classList.add("is-animating", directionClass, exitClass);

  window.setTimeout(() => {
    cardShell.classList.remove(
      "is-animating",
      "swipe-left",
      "swipe-right",
      "is-exiting-left",
      "is-exiting-right",
    );
    clearCardTransform();
    markCurrentWord(result);
  }, SWIPE_ANIMATION_MS);
}

function clearCardTransform() {
  const cardShell = document.getElementById("card-shell");
  if (!cardShell) return;

  cardShell.style.transform = "";
}

function updateDragVisual(deltaX) {
  const cardShell = document.getElementById("card-shell");
  if (!cardShell) return;

  const limitedDelta = Math.max(Math.min(deltaX, 180), -180);
  const rotation = limitedDelta * SWIPE_ROTATION_FACTOR;
  cardShell.style.transform = `translateX(${limitedDelta}px) rotate(${rotation}deg)`;
  cardShell.classList.toggle("swipe-right", limitedDelta > 28);
  cardShell.classList.toggle("swipe-left", limitedDelta < -28);
}

function handleSwipeStart(event) {
  const cardShell = document.getElementById("card-shell");
  if (!cardShell || cardShell.classList.contains("is-animating")) return;

  swipeState.isScrollableTarget = Boolean(
    event.target.closest(".custom-scrollbar"),
  );
  swipeState.isDragging = !swipeState.isScrollableTarget;
  swipeState.startX = event.clientX;
  swipeState.startY = event.clientY;
  swipeState.pointerId = event.pointerId;
}

function handleSwipeMove(event) {
  if (!swipeState.isDragging || swipeState.isScrollableTarget) return;

  const deltaX = event.clientX - swipeState.startX;
  const deltaY = event.clientY - swipeState.startY;

  if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
    handleSwipeEnd();
    return;
  }

  updateDragVisual(deltaX);
}

function handleSwipeEnd(event) {
  if (event && swipeState.pointerId !== null && event.pointerId !== swipeState.pointerId) {
    return;
  }

  if (!swipeState.isDragging || swipeState.isScrollableTarget) {
    swipeState.isDragging = false;
    swipeState.isScrollableTarget = false;
    swipeState.pointerId = null;
    return;
  }

  const deltaX = event ? event.clientX - swipeState.startX : 0;
  swipeState.isDragging = false;
  swipeState.isScrollableTarget = false;
  swipeState.pointerId = null;

  if (deltaX >= SWIPE_TRIGGER_DISTANCE) {
    animateSwipeAndMark("known");
    return;
  }

  if (deltaX <= -SWIPE_TRIGGER_DISTANCE) {
    animateSwipeAndMark("unknown");
    return;
  }

  document.getElementById("card-shell").classList.remove("swipe-left", "swipe-right");
  clearCardTransform();
}

function updateSummaryModal() {
  const totalWords = originalWordData.length;
  const reviewedCount = roundReviewedCount;
  const unknownCount = unknownWordIds.size;
  const knownCount = knownWordIds.size;
  const hasUnknownWords = unknownCount > 0;

  document.getElementById("summary-reviewed-count").innerText = String(reviewedCount);
  document.getElementById("summary-unknown-count").innerText = String(unknownCount);
  document.getElementById("summary-known-count").innerText = String(knownCount);
  document.getElementById("summary-message").innerText = hasUnknownWords
    ? "這一輪已經分完類，接下來可以集中複習還不熟的單字。"
    : "太好了，這一輪的單字你都已經掌握完成。";
  document.getElementById("summary-progress-detail").innerText =
    `本次共選了 ${totalWords} 個單字，目前已完成 ${knownCount} 個，還有 ${unknownCount} 個需要再加強。`;

  const continueBtn = document.getElementById("continue-unknown-btn");
  continueBtn.disabled = !hasUnknownWords;
  continueBtn.classList.toggle("opacity-50", !hasUnknownWords);
  continueBtn.classList.toggle("cursor-not-allowed", !hasUnknownWords);
}

function openSummaryModal() {
  const modal = document.getElementById("review-summary-modal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("result-modal-open");
}

function closeSummaryModal() {
  const modal = document.getElementById("review-summary-modal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("result-modal-open");
}

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

function setupSwipeEvents() {
  const cardShell = document.getElementById("card-shell");
  if (!cardShell) return;

  cardShell.addEventListener("pointerdown", handleSwipeStart);
  cardShell.addEventListener("pointermove", handleSwipeMove);
  cardShell.addEventListener("pointerup", handleSwipeEnd);
  cardShell.addEventListener("pointercancel", handleSwipeEnd);
  cardShell.addEventListener("pointerleave", handleSwipeEnd);
}

function setupModalEvents() {
  const modal = document.getElementById("review-summary-modal");
  const panel = document.getElementById("review-summary-panel");
  const continueBtn = document.getElementById("continue-unknown-btn");
  const restartBtn = document.getElementById("restart-review-btn");
  const backHomeBtn = document.getElementById("back-home-btn");

  if (!modal || !panel || !continueBtn || !restartBtn || !backHomeBtn) return;

  modal.addEventListener("click", closeSummaryModal);
  panel.addEventListener("click", (event) => event.stopPropagation());
  continueBtn.addEventListener("click", startReviewUnknownWords);
  restartBtn.addEventListener("click", () => resetStudySession(originalWordData));
  backHomeBtn.addEventListener("click", () => {
    window.location.href = "./index.html";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeSummaryModal();
    }
  });
}

function isTypingTarget(target) {
  if (!target) return false;

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    tagName === "BUTTON"
  );
}

function setupKeyboardEvents() {
  document.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target)) return;

    const isSummaryModalOpen = !document
      .getElementById("review-summary-modal")
      .classList.contains("hidden");

    if (event.code === "Space" || event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (isSummaryModalOpen) return;
      event.preventDefault();
      flipCard();
      return;
    }

    if (event.key === "ArrowLeft") {
      if (isSummaryModalOpen) return;
      event.preventDefault();
      animateSwipeAndMark("unknown");
      return;
    }

    if (event.key === "ArrowRight") {
      if (isSummaryModalOpen) return;
      event.preventDefault();
      animateSwipeAndMark("known");
    }
  });
}

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const chapterFile = urlParams.get("chapter");
  const countParam = Number.parseInt(urlParams.get("count") || "", 10);
  const randomParam = urlParams.get("random");

  activeSettings = {
    count: Number.isNaN(countParam) ? null : countParam,
    random: randomParam === "1" || randomParam === "true",
  };

  setupSwipeEvents();
  setupModalEvents();
  setupKeyboardEvents();

  if (chapterFile) {
    loadChapter(chapterFile);
  } else {
    loadChapter("第三章-tablet.json");
  }
};

const scrollContainer = document.querySelector(".custom-scrollbar");
if (scrollContainer) {
  scrollContainer.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
