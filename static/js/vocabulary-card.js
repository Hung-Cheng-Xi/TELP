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
let reviewHistory = [];

const DATA_PATH = "../static/data/";

const knownWordIds = new Set();
const unknownWordIds = new Set();

const swipeState = {
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  deltaX: 0,
  deltaY: 0,
  pendingDeltaX: 0,
  animationFrameId: null,
  startTime: 0,
  isDragging: false,
  isScrollableTarget: false,
  hasMoved: false,
  isHorizontalSwipe: false,
  pointerId: null,
  suppressClickUntil: 0,
  clickStartedOnFlipTarget: false,
};

const SWIPE_TRIGGER_RATIO = 0.18;
const SWIPE_TRIGGER_MIN_DISTANCE = 56;
const SWIPE_TRIGGER_MAX_DISTANCE = 90;
const SWIPE_INTENT_DISTANCE = 8;
const SWIPE_VERTICAL_CANCEL_DISTANCE = 14;
const SWIPE_FLICK_MIN_DISTANCE = 42;
const SWIPE_FLICK_MIN_VELOCITY = 0.45;
const SWIPE_ROTATION_FACTOR = 0.06;
const SWIPE_ANIMATION_MS = 220;
const SWIPE_CLICK_SUPPRESS_MS = 320;

async function loadChapter(filename) {
  try {
    const response = await fetch(`${DATA_PATH}${filename}`);
    if (!response.ok) {
      throw new Error(`無法載入 ${filename}`);
    }

    wordData = await response.json();
  } catch (error) {
    console.warn(error);
    wordData = [];
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
      : [];

  return sourceData
    .filter((item) => item && item.word && item.meaning)
    .map((item, index) => ({
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

  return result;
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
  reviewHistory = [];
  knownWordIds.clear();
  unknownWordIds.clear();
  closeSummaryModal();
  resetFlipState();

  if (wordData.length > 0) {
    loadWordData(currentWordIndex);
  } else {
    showEmptyStudyState();
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
  reviewHistory = [];
  closeSummaryModal();
  resetFlipState();
  loadWordData(currentWordIndex);
  updateProgressChips();
}

function flipCard() {
  if (!wordData || wordData.length === 0) return;
  const card = document.getElementById("flashcard");
  isFlipped = !isFlipped;
  card.classList.toggle("rotate-y-180", isFlipped);
}

function hasActiveTextSelection() {
  const selection = window.getSelection && window.getSelection();

  return Boolean(
    selection && !selection.isCollapsed && selection.toString().trim(),
  );
}

function handleFlipCardClick(event) {
  if (
    event &&
    isSelectableCardTextTarget(event.target, "mouse") &&
    hasActiveTextSelection()
  ) {
    event.stopPropagation();
    return;
  }

  flipCard();
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

  const wordCounter = document.getElementById("word-counter");
  const frontWord = document.getElementById("front-word");
  const backWord = document.getElementById("back-word");
  const pos = document.getElementById("pos");
  const meaning = document.getElementById("meaning");
  const homophone = document.getElementById("homophone");
  const roots = document.getElementById("roots");
  const ex1En = document.getElementById("ex1-en");
  const ex1Zh = document.getElementById("ex1-zh");
  const ex2En = document.getElementById("ex2-en");
  const ex2Zh = document.getElementById("ex2-zh");

  if (wordCounter) wordCounter.innerText = `${index + 1} / ${wordData.length}`;
  if (frontWord) frontWord.innerText = data.word || "";
  if (backWord) backWord.innerText = data.word || "";
  applyWordSize("front-word", data.word || "");
  applyWordSize("back-word", data.word || "");
  if (pos) pos.innerText = data.pos || "";
  if (meaning) meaning.innerText = data.meaning || "";
  if (homophone) homophone.innerHTML = data.homophone || "";
  if (roots) roots.innerHTML = data.roots || "";
  if (ex1En) ex1En.innerHTML = data.ex1En || "";
  if (ex1Zh) ex1Zh.innerHTML = data.ex1Zh || "";
  if (ex2En) ex2En.innerHTML = data.ex2En || "";
  if (ex2Zh) ex2Zh.innerHTML = data.ex2Zh || "";
}

function showEmptyStudyState() {
  const wordCounter = document.getElementById("word-counter");
  const frontWord = document.getElementById("front-word");
  const backWord = document.getElementById("back-word");
  const pos = document.getElementById("pos");
  const meaning = document.getElementById("meaning");
  const homophone = document.getElementById("homophone");
  const roots = document.getElementById("roots");
  const ex1En = document.getElementById("ex1-en");
  const ex1Zh = document.getElementById("ex1-zh");
  const ex2En = document.getElementById("ex2-en");
  const ex2Zh = document.getElementById("ex2-zh");

  if (wordCounter) wordCounter.innerText = "0 / 0";
  if (frontWord) frontWord.innerText = "沒有可用的單字資料";
  if (backWord) backWord.innerText = "沒有可用的單字資料";
  applyWordSize("front-word", "沒有可用的單字資料");
  applyWordSize("back-word", "沒有可用的單字資料");
  if (pos) pos.innerText = "...";
  if (meaning) meaning.innerText = "請確認 static/data 中的章節 JSON 是否存在且包含 word 與 meaning。";
  if (homophone) homophone.innerText = "此頁只會讀取 static/data 的章節檔。";
  if (roots) roots.innerText = "請回到首頁選擇其他章節，或補上對應資料檔。";
  if (ex1En) ex1En.innerText = "";
  if (ex1Zh) ex1Zh.innerText = "";
  if (ex2En) ex2En.innerText = "";
  if (ex2Zh) ex2Zh.innerText = "";
}

function updateProgressChips() {
  const completedCount = knownWordIds.size;
  const unknownCount = unknownWordIds.size;

  const knownChip = document.getElementById("known-count-chip");
  const unknownChip = document.getElementById("unknown-count-chip");
  const previousButton = document.getElementById("previous-word-button");

  if (knownChip) knownChip.innerText = `會 ${completedCount}`;
  if (unknownChip) unknownChip.innerText = `不會 ${unknownCount}`;
  if (previousButton) previousButton.disabled = reviewHistory.length === 0;
}

function goToExitDestination() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "../index.html";
}

function restorePreviousWord() {
  if (reviewHistory.length === 0) return;

  const modal = document.getElementById("review-summary-modal");
  if (modal && !modal.classList.contains("hidden")) {
    closeSummaryModal();
  }

  const previousEntry = reviewHistory.pop();
  if (!previousEntry) return;

  if (previousEntry.result === "known") {
    knownWordIds.delete(previousEntry.wordId);
  } else {
    unknownWordIds.delete(previousEntry.wordId);
  }

  roundReviewedCount = Math.max(roundReviewedCount - 1, 0);
  currentWordIndex = previousEntry.index;
  loadWordData(currentWordIndex);
  updateProgressChips();
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

  reviewHistory.push({
    index: currentWordIndex,
    wordId: currentWord.id,
    result,
  });
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

  cancelDragFrame();
  cardShell.classList.remove("is-dragging", "is-resetting");
  cardShell.style.transform = "";
  cardShell.classList.add("is-animating", directionClass, exitClass);

  window.setTimeout(() => {
    markCurrentWord(result);
    cardShell.classList.add("is-resetting");
    cardShell.classList.remove(
      "is-animating",
      "swipe-left",
      "swipe-right",
      "is-exiting-left",
      "is-exiting-right",
    );
    clearCardTransform();
    window.requestAnimationFrame(() => {
      cardShell.classList.remove("is-resetting");
    });
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
  cardShell.style.transform = `translate3d(${limitedDelta}px, 0, 0) rotate(${rotation}deg)`;
  cardShell.classList.toggle("swipe-right", limitedDelta > 28);
  cardShell.classList.toggle("swipe-left", limitedDelta < -28);
}

function queueDragVisual(deltaX) {
  swipeState.pendingDeltaX = deltaX;

  if (swipeState.animationFrameId !== null) return;

  if (!window.requestAnimationFrame) {
    updateDragVisual(swipeState.pendingDeltaX);
    return;
  }

  swipeState.animationFrameId = window.requestAnimationFrame(() => {
    swipeState.animationFrameId = null;
    updateDragVisual(swipeState.pendingDeltaX);
  });
}

function cancelDragFrame() {
  if (swipeState.animationFrameId !== null && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(swipeState.animationFrameId);
  }

  swipeState.animationFrameId = null;
}

function getSwipeTriggerDistance() {
  const cardShell = document.getElementById("card-shell");
  const cardWidth = cardShell
    ? cardShell.getBoundingClientRect().width
    : window.innerWidth;

  return Math.max(
    SWIPE_TRIGGER_MIN_DISTANCE,
    Math.min(cardWidth * SWIPE_TRIGGER_RATIO, SWIPE_TRIGGER_MAX_DISTANCE),
  );
}

function isInteractiveSwipeTarget(target) {
  if (!target || !target.closest) return false;

  return Boolean(
    target.closest(
      "button, a, input, textarea, select, [contenteditable='true']",
    ),
  );
}

function isFlipClickTarget(target) {
  return Boolean(target && target.closest && target.closest("[data-flip-card]"));
}

function isSelectableCardTextTarget(target, pointerType) {
  if (pointerType !== "mouse" || !target || !target.closest) return false;

  const selectableTextTarget = target.closest(
    ".card-front .word-display, .card-back h2, .card-back h3, .card-back p",
  );

  return Boolean(selectableTextTarget);
}

function releaseSwipePointer(cardShell, pointerId) {
  if (
    !cardShell ||
    pointerId === null ||
    !cardShell.hasPointerCapture ||
    !cardShell.hasPointerCapture(pointerId)
  ) {
    return;
  }

  try {
    cardShell.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture can already be gone after cancel/blur; ordinary pointer events still work.
  }
}

function resetSwipeState() {
  swipeState.deltaX = 0;
  swipeState.deltaY = 0;
  swipeState.pendingDeltaX = 0;
  swipeState.isDragging = false;
  swipeState.isScrollableTarget = false;
  swipeState.hasMoved = false;
  swipeState.isHorizontalSwipe = false;
  swipeState.pointerId = null;
}

function resetCardAfterDrag(cardShell) {
  if (!cardShell) return;

  cancelDragFrame();
  cardShell.classList.remove("is-dragging", "swipe-left", "swipe-right");
  clearCardTransform();
}

function suppressSwipeClick() {
  swipeState.suppressClickUntil = performance.now() + SWIPE_CLICK_SUPPRESS_MS;
}

function updateSwipePosition(event) {
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
    return false;
  }

  swipeState.currentX = event.clientX;
  swipeState.currentY = event.clientY;
  swipeState.deltaX = swipeState.currentX - swipeState.startX;
  swipeState.deltaY = swipeState.currentY - swipeState.startY;

  return true;
}

function isReliableSwipeEndPoint(event) {
  if (!event) return false;

  return !(
    event.pointerType === "touch" &&
    event.clientX === 0 &&
    event.clientY === 0
  );
}

function handleSwipeStart(event) {
  const cardShell = document.getElementById("card-shell");
  swipeState.clickStartedOnFlipTarget = false;

  if (!cardShell || cardShell.classList.contains("is-animating")) return;
  if (swipeState.isDragging || event.isPrimary === false) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (isInteractiveSwipeTarget(event.target)) return;
  if (isSelectableCardTextTarget(event.target, event.pointerType)) return;

  swipeState.clickStartedOnFlipTarget = isFlipClickTarget(event.target);
  swipeState.isScrollableTarget = Boolean(
    event.target.closest && event.target.closest(".custom-scrollbar"),
  );
  swipeState.isDragging = !swipeState.isScrollableTarget;
  swipeState.startX = event.clientX;
  swipeState.startY = event.clientY;
  swipeState.currentX = event.clientX;
  swipeState.currentY = event.clientY;
  swipeState.deltaX = 0;
  swipeState.deltaY = 0;
  swipeState.pendingDeltaX = 0;
  cancelDragFrame();
  swipeState.startTime = performance.now();
  swipeState.hasMoved = false;
  swipeState.isHorizontalSwipe = false;
  swipeState.pointerId = event.pointerId;

  if (!swipeState.isDragging) return;

  cardShell.classList.remove("swipe-left", "swipe-right");
  cardShell.classList.add("is-dragging");

  if (cardShell.setPointerCapture) {
    try {
      cardShell.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers can reject capture during cancellation; continue with normal events.
    }
  }
}

function handleSwipeMove(event) {
  if (!swipeState.isDragging || swipeState.isScrollableTarget) return;
  if (event.isPrimary === false) return;
  if (event.pointerId !== swipeState.pointerId) return;

  if (!updateSwipePosition(event)) return;

  const deltaX = swipeState.deltaX;
  const deltaY = swipeState.deltaY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  if (!swipeState.isHorizontalSwipe) {
    const isBelowIntentDistance =
      absDeltaX < SWIPE_INTENT_DISTANCE && absDeltaY < SWIPE_INTENT_DISTANCE;

    if (isBelowIntentDistance) return;

    if (
      absDeltaY > absDeltaX * 1.15 &&
      absDeltaY > SWIPE_VERTICAL_CANCEL_DISTANCE
    ) {
      const cardShell = document.getElementById("card-shell");
      const pointerId = swipeState.pointerId;
      suppressSwipeClick();
      releaseSwipePointer(cardShell, pointerId);
      resetCardAfterDrag(cardShell);
      resetSwipeState();
      return;
    }

    if (absDeltaX <= absDeltaY || absDeltaX < SWIPE_INTENT_DISTANCE) return;

    swipeState.isHorizontalSwipe = true;
  }

  if (event.cancelable) {
    event.preventDefault();
  }
  event.stopPropagation();
  swipeState.hasMoved = true;
  queueDragVisual(deltaX);
}

function shouldCommitSwipe(deltaX, deltaY, durationMs) {
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);
  const isHorizontalSwipe = absDeltaX > absDeltaY * 1.05;

  if (!isHorizontalSwipe) return false;

  if (absDeltaX >= getSwipeTriggerDistance()) return true;

  const velocity = absDeltaX / Math.max(durationMs, 1);
  return (
    absDeltaX >= SWIPE_FLICK_MIN_DISTANCE &&
    velocity >= SWIPE_FLICK_MIN_VELOCITY
  );
}

function handleSwipeClick(event) {
  if (performance.now() > swipeState.suppressClickUntil) {
    const cardShell = document.getElementById("card-shell");
    const flashcard = document.getElementById("flashcard");
    const clickTargetWasCaptured =
      event.target === cardShell || event.target === flashcard;

    if (clickTargetWasCaptured && swipeState.clickStartedOnFlipTarget) {
      swipeState.clickStartedOnFlipTarget = false;
      event.preventDefault();
      flipCard();
    }

    swipeState.clickStartedOnFlipTarget = false;
    return;
  }

  swipeState.clickStartedOnFlipTarget = false;
  event.preventDefault();
  event.stopPropagation();
}

function handleSwipeEnd(event) {
  if (event && event.isPrimary === false) return;

  const cardShell = document.getElementById("card-shell");
  if (!cardShell || cardShell.classList.contains("is-animating")) return;

  if (
    event &&
    swipeState.pointerId !== null &&
    event.pointerId !== swipeState.pointerId
  ) {
    return;
  }

  const pointerId = swipeState.pointerId;

  if (!swipeState.isDragging || swipeState.isScrollableTarget) {
    releaseSwipePointer(cardShell, pointerId);
    resetCardAfterDrag(cardShell);
    resetSwipeState();
    return;
  }

  if (event && !swipeState.hasMoved && isReliableSwipeEndPoint(event)) {
    updateSwipePosition(event);
  }

  const deltaX = swipeState.deltaX;
  const deltaY = swipeState.deltaY;
  const durationMs = performance.now() - swipeState.startTime;
  const movedEnoughToCancelClick =
    swipeState.hasMoved ||
    Math.abs(deltaX) > SWIPE_INTENT_DISTANCE ||
    Math.abs(deltaY) > SWIPE_INTENT_DISTANCE;

  if (movedEnoughToCancelClick) {
    suppressSwipeClick();
  }

  releaseSwipePointer(cardShell, pointerId);

  if (shouldCommitSwipe(deltaX, deltaY, durationMs)) {
    cancelDragFrame();
    updateDragVisual(deltaX);
    resetSwipeState();
    animateSwipeAndMark(deltaX > 0 ? "known" : "unknown");
    return;
  }

  resetSwipeState();
  resetCardAfterDrag(cardShell);
}

function handleSwipeCancel(event) {
  if (event && event.isPrimary === false) return;

  const cardShell = document.getElementById("card-shell");

  if (
    event &&
    swipeState.pointerId !== null &&
    event.pointerId !== swipeState.pointerId
  ) {
    return;
  }

  if (swipeState.hasMoved || swipeState.isHorizontalSwipe) {
    suppressSwipeClick();
  }

  releaseSwipePointer(cardShell, swipeState.pointerId);
  resetSwipeState();

  if (!cardShell || cardShell.classList.contains("is-animating")) return;

  resetCardAfterDrag(cardShell);
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
    utterance.rate = 0.70;
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
  cardShell.addEventListener("pointercancel", handleSwipeCancel);
  cardShell.addEventListener("click", handleSwipeClick, true);
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
    window.location.href = "../index.html";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeSummaryModal();
    }
  });
}

function setupNavigationEvents() {
  const exitButton = document.getElementById("exit-button");
  const previousButton = document.getElementById("previous-word-button");

  if (exitButton) {
    exitButton.addEventListener("click", goToExitDestination);
  }

  if (previousButton) {
    previousButton.addEventListener("click", restorePreviousWord);
  }
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
  setupNavigationEvents();
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
