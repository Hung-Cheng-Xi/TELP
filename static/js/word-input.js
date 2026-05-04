const DATA_PATH = "../static/data/";
const DEFAULT_CHAPTER = "第三章-tablet.json";
const AUTO_ADVANCE_DELAY_MS = 850;

let allWords = [];
let words = [];
let currentIndex = 0;
let score = 0;
let revealedCount = 0;
let inputTime = 0;
let inputTimerInterval = null;
let inputRunId = 0;
let activeChapterFile = DEFAULT_CHAPTER;
let activeSettings = {
  count: null,
  random: false,
};
let currentUnits = [];
let currentInputIndexes = [];
let hasRevealedCurrentWord = false;
let isCurrentWordComplete = false;
let advanceTimer = null;

function getElements() {
  return {
    chapterTitle: document.getElementById("chapter-title"),
    score: document.getElementById("input-score"),
    progress: document.getElementById("input-progress"),
    timer: document.getElementById("input-timer"),
    loading: document.getElementById("loading-state"),
    loadingIcon: document.getElementById("loading-icon"),
    loadingTitle: document.getElementById("loading-title"),
    loadingMessage: document.getElementById("loading-message"),
    inputScreen: document.getElementById("input-screen"),
    pos: document.getElementById("word-pos"),
    meaning: document.getElementById("word-meaning"),
    answerGrid: document.getElementById("answer-grid"),
    feedback: document.getElementById("answer-feedback"),
    answerPreview: document.getElementById("answer-preview"),
    revealButton: document.getElementById("reveal-answer-button"),
    nextButton: document.getElementById("next-word-button"),
    completeScreen: document.getElementById("input-complete-screen"),
    completeStats: document.getElementById("input-complete-stats"),
  };
}

async function loadChapter(filename) {
  const response = await fetch(`${DATA_PATH}${filename}`);

  if (!response.ok) {
    throw new Error(`無法載入 ${filename}`);
  }

  const data = await response.json();
  allWords = normalizeWordData(data);

  if (allWords.length === 0) {
    throw new Error("這個章節目前沒有可用的單字資料。");
  }

  startInputPractice();
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
      id: String(item.id || `${item.word}-${item.meaning}-${index}`),
      word: toPlainText(item.word),
      meaning: toPlainText(item.meaning),
      pos: toPlainText(item.pos || ""),
    }))
    .filter((item) => item.word && item.meaning);
}

function toPlainText(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  return (template.content.textContent || "").trim();
}

function applyStudySettings(sourceWords, settings) {
  let result = [...sourceWords];

  if (settings.random) {
    result = shuffleItems(result);
  }

  if (Number.isInteger(settings.count) && settings.count > 0) {
    result = result.slice(0, settings.count);
  }

  return result;
}

function shuffleItems(items) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
}

function startInputPractice() {
  const elements = getElements();
  words = applyStudySettings(allWords, activeSettings);

  if (words.length === 0) {
    showLoadError("這個章節目前沒有可用的單字資料。");
    return;
  }

  inputRunId += 1;
  currentIndex = 0;
  score = 0;
  revealedCount = 0;
  inputTime = 0;
  clearAdvanceTimer();
  clearInterval(inputTimerInterval);

  if (elements.chapterTitle) {
    elements.chapterTitle.innerText = `${getChapterTitle(activeChapterFile)} 輸入練習`;
  }

  if (elements.completeScreen) {
    elements.completeScreen.classList.add("hidden");
    elements.completeScreen.classList.remove("flex");
  }

  if (elements.loading) {
    elements.loading.classList.add("hidden");
  }

  if (elements.inputScreen) {
    elements.inputScreen.classList.remove("hidden");
    elements.inputScreen.classList.add("flex");
  }

  inputTimerInterval = setInterval(timerTick, 1000);
  renderCurrentWord();
}

function renderCurrentWord() {
  const elements = getElements();
  const currentWord = words[currentIndex];

  if (!currentWord || !elements.answerGrid) return;

  clearAdvanceTimer();
  hasRevealedCurrentWord = false;
  isCurrentWordComplete = false;
  currentUnits = createAnswerUnits(currentWord.word);
  currentInputIndexes = currentUnits
    .map((unit, index) => (unit.editable ? index : null))
    .filter((index) => index !== null);

  if (elements.pos) {
    elements.pos.innerText = currentWord.pos || "word";
  }

  if (elements.meaning) {
    elements.meaning.innerText = currentWord.meaning;
  }

  if (elements.feedback) {
    elements.feedback.innerText = " ";
    elements.feedback.className = "mt-5 min-h-[1.5rem] text-center text-sm font-bold text-slate-400";
  }

  if (elements.answerPreview) {
    elements.answerPreview.innerText = "";
    elements.answerPreview.classList.add("hidden");
  }

  if (elements.revealButton) {
    elements.revealButton.disabled = false;
    elements.revealButton.classList.remove("opacity-50", "cursor-not-allowed");
  }

  if (elements.nextButton) {
    elements.nextButton.disabled = true;
  }

  elements.answerGrid.innerHTML = "";
  currentUnits.forEach((unit, index) => {
    elements.answerGrid.appendChild(createAnswerUnitElement(unit, index));
  });

  updateStatusDisplay();
  focusFirstInput();
}

function createAnswerUnits(answer) {
  return Array.from(answer).map((char) => ({
    char,
    editable: isEditableCharacter(char),
  }));
}

function isEditableCharacter(char) {
  return /^[a-z0-9]$/i.test(char);
}

function createAnswerUnitElement(unit, index) {
  if (!unit.editable) {
    const separator = document.createElement("span");
    separator.className = unit.char.trim()
      ? "word-separator static-character"
      : "word-separator";
    separator.dataset.answerIndex = String(index);
    separator.innerText = unit.char.trim() ? unit.char : "";
    separator.setAttribute("aria-hidden", "true");
    return separator;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "latin";
  input.maxLength = 1;
  input.autocomplete = "off";
  input.autocapitalize = "none";
  input.spellcheck = false;
  input.className = "spelling-cell";
  input.dataset.answerIndex = String(index);
  input.setAttribute("aria-label", `第 ${getInputPosition(index)} 個字母`);
  input.setAttribute("autocapitalize", "none");
  input.addEventListener("input", handleCellInput);
  input.addEventListener("keydown", handleCellKeydown);
  input.addEventListener("paste", handleCellPaste);
  input.addEventListener("focus", (event) => event.target.select());
  return input;
}

function getInputPosition(answerIndex) {
  return currentInputIndexes.indexOf(answerIndex) + 1;
}

function handleCellInput(event) {
  if (isCurrentWordComplete) return;

  const input = event.target;
  const rawValue = input.value || "";

  clearAdvanceTimer();

  if (rawValue.length > 1) {
    fillFromText(rawValue, Number(input.dataset.answerIndex));
  } else {
    input.value = rawValue.slice(-1);
    updateCellState(input);

    if (input.value && !input.classList.contains("is-error")) {
      focusNextInput(Number(input.dataset.answerIndex));
    }
  }

  checkAnswerCompletion();
}

function handleCellPaste(event) {
  if (isCurrentWordComplete) return;

  const pastedText = event.clipboardData ? event.clipboardData.getData("text") : "";
  if (!pastedText) return;

  event.preventDefault();
  clearAdvanceTimer();
  fillFromText(pastedText, Number(event.target.dataset.answerIndex));
  checkAnswerCompletion();
}

function handleCellKeydown(event) {
  const input = event.target;
  const answerIndex = Number(input.dataset.answerIndex);

  if (event.key === "Backspace" && input.value === "") {
    event.preventDefault();
    focusPreviousInput(answerIndex, true);
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    focusPreviousInput(answerIndex);
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    focusNextInput(answerIndex);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    handleNextButtonClick();
  }
}

function fillFromText(text, startAnswerIndex) {
  const editableIndexes = currentInputIndexes.filter((index) => index >= startAnswerIndex);
  const characters = Array.from(text).filter((char) => isEditableCharacter(char));

  if (characters.length === 0) return;

  editableIndexes.forEach((answerIndex, offset) => {
    const cell = getCellByAnswerIndex(answerIndex);
    if (!cell || offset >= characters.length) return;

    cell.value = characters[offset];
    updateCellState(cell);
  });

  const nextIndex = editableIndexes[Math.min(characters.length, editableIndexes.length - 1)];
  focusNextInput(nextIndex);
}

function updateCellState(input) {
  const answerIndex = Number(input.dataset.answerIndex);
  const expectedChar = currentUnits[answerIndex] ? currentUnits[answerIndex].char : "";
  const isEmpty = input.value === "";
  const isCorrect = normalizeAnswerChar(input.value) === normalizeAnswerChar(expectedChar);

  input.classList.remove("is-correct", "is-error", "is-revealed");

  if (isEmpty) return;

  input.classList.toggle("is-correct", isCorrect);
  input.classList.toggle("is-error", !isCorrect);
}

function normalizeAnswerChar(char) {
  return String(char || "").toLocaleLowerCase("en-US");
}

function checkAnswerCompletion() {
  const cells = getAnswerInputs();
  const allFilled = cells.every((cell) => cell.value !== "");
  const allCorrect = allFilled && cells.every((cell) => !cell.classList.contains("is-error"));
  const elements = getElements();

  if (elements.feedback) {
    if (allCorrect) {
      elements.feedback.innerText = hasRevealedCurrentWord ? "已填入答案" : "拼寫正確";
      elements.feedback.className = "mt-5 min-h-[1.5rem] text-center text-sm font-bold text-green-600";
    } else if (cells.some((cell) => cell.classList.contains("is-error"))) {
      elements.feedback.innerText = "有欄位拼錯了";
      elements.feedback.className = "mt-5 min-h-[1.5rem] text-center text-sm font-bold text-red-500";
    } else {
      elements.feedback.innerText = " ";
      elements.feedback.className = "mt-5 min-h-[1.5rem] text-center text-sm font-bold text-slate-400";
    }
  }

  if (elements.nextButton) {
    elements.nextButton.disabled = !allCorrect;
  }

  if (allCorrect) {
    if (!isCurrentWordComplete && !hasRevealedCurrentWord) {
      score = Math.max(score, getCompletedTypedCount() + 1);
    }

    isCurrentWordComplete = true;
    setAnswerInputsDisabled(true);
    if (elements.revealButton) {
      elements.revealButton.disabled = true;
      elements.revealButton.classList.add("opacity-50", "cursor-not-allowed");
    }
    updateStatusDisplay();
    scheduleAdvance(AUTO_ADVANCE_DELAY_MS);
  }
}

function getCompletedTypedCount() {
  return currentIndex - revealedCount;
}

function revealAnswer() {
  const currentWord = words[currentIndex];
  const elements = getElements();

  if (!currentWord || hasRevealedCurrentWord || isCurrentWordComplete) return;

  clearAdvanceTimer();
  hasRevealedCurrentWord = true;
  isCurrentWordComplete = true;
  revealedCount += 1;

  currentUnits.forEach((unit, index) => {
    if (!unit.editable) return;

    const cell = getCellByAnswerIndex(index);
    if (!cell) return;

    cell.value = unit.char;
    cell.classList.remove("is-correct", "is-error");
    cell.classList.add("is-revealed");
  });

  if (elements.answerPreview) {
    elements.answerPreview.innerText = currentWord.word;
    elements.answerPreview.classList.remove("hidden");
  }

  if (elements.revealButton) {
    elements.revealButton.disabled = true;
    elements.revealButton.classList.add("opacity-50", "cursor-not-allowed");
  }

  if (elements.nextButton) {
    elements.nextButton.disabled = false;
  }

  setAnswerInputsDisabled(true);

  if (elements.feedback) {
    elements.feedback.innerText = "已公布答案";
    elements.feedback.className = "mt-5 min-h-[1.5rem] text-center text-sm font-bold text-slate-600";
  }

  updateStatusDisplay();
}

function scheduleAdvance(delay) {
  const runId = inputRunId;

  clearAdvanceTimer();
  advanceTimer = window.setTimeout(() => {
    if (runId !== inputRunId) return;
    goToNextWord();
  }, delay);
}

function clearAdvanceTimer() {
  if (!advanceTimer) return;

  window.clearTimeout(advanceTimer);
  advanceTimer = null;
}

function goToNextWord() {
  clearAdvanceTimer();

  if (currentIndex >= words.length - 1) {
    finishInputPractice();
    return;
  }

  currentIndex += 1;
  renderCurrentWord();
}

function handleNextButtonClick() {
  const elements = getElements();
  if (elements.nextButton && elements.nextButton.disabled) return;

  goToNextWord();
}

function finishInputPractice() {
  const elements = getElements();
  clearAdvanceTimer();
  clearInterval(inputTimerInterval);
  currentIndex = Math.max(words.length - 1, 0);
  updateStatusDisplay(true);

  if (elements.completeStats) {
    elements.completeStats.innerText =
      `耗時 ${formatTime(inputTime)}，正確 ${score} / ${words.length} 題，公布 ${revealedCount} 題`;
  }

  if (elements.completeScreen) {
    elements.completeScreen.classList.remove("hidden");
    elements.completeScreen.classList.add("flex");
  }
}

function getAnswerInputs() {
  const elements = getElements();
  if (!elements.answerGrid) return [];

  return Array.from(elements.answerGrid.querySelectorAll(".spelling-cell"));
}

function setAnswerInputsDisabled(disabled) {
  getAnswerInputs().forEach((input) => {
    input.disabled = disabled;
  });
}

function getCellByAnswerIndex(answerIndex) {
  const elements = getElements();
  if (!elements.answerGrid) return null;

  return elements.answerGrid.querySelector(`[data-answer-index="${answerIndex}"].spelling-cell`);
}

function focusFirstInput() {
  window.setTimeout(() => {
    const firstInput = getAnswerInputs()[0];
    if (firstInput) firstInput.focus();
  }, 60);
}

function focusNextInput(answerIndex) {
  const currentInputPosition = currentInputIndexes.indexOf(answerIndex);
  const nextAnswerIndex = currentInputIndexes[currentInputPosition + 1];
  const nextInput = getCellByAnswerIndex(nextAnswerIndex);

  if (nextInput) {
    nextInput.focus();
    nextInput.select();
  }
}

function focusPreviousInput(answerIndex, shouldClear = false) {
  const currentInputPosition = currentInputIndexes.indexOf(answerIndex);
  const previousAnswerIndex = currentInputIndexes[currentInputPosition - 1];
  const previousInput = getCellByAnswerIndex(previousAnswerIndex);

  if (!previousInput) return;

  previousInput.focus();

  if (shouldClear) {
    previousInput.value = "";
    previousInput.classList.remove("is-correct", "is-error", "is-revealed");
  }

  previousInput.select();
}

function timerTick() {
  inputTime += 1;
  updateStatusDisplay();
}

function updateStatusDisplay(isComplete = false) {
  const elements = getElements();
  const total = words.length;
  const progress = total === 0 ? 0 : isComplete ? total : currentIndex + 1;

  if (elements.progress) {
    elements.progress.innerText = `${Math.min(progress, total)} / ${total}`;
  }

  if (elements.score) {
    elements.score.innerText = `${score} / ${total}`;
  }

  if (elements.timer) {
    elements.timer.innerText = formatTime(inputTime);
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function getChapterTitle(filename) {
  return decodeURIComponent(filename || DEFAULT_CHAPTER).replace(/\.json$/i, "");
}

function showLoadError(message) {
  const elements = getElements();
  clearAdvanceTimer();
  clearInterval(inputTimerInterval);

  if (elements.inputScreen) {
    elements.inputScreen.classList.add("hidden");
    elements.inputScreen.classList.remove("flex");
  }

  if (elements.completeScreen) {
    elements.completeScreen.classList.add("hidden");
    elements.completeScreen.classList.remove("flex");
  }

  if (elements.loading) {
    elements.loading.classList.remove("hidden");
  }

  if (elements.loadingIcon) {
    elements.loadingIcon.className = "fa-solid fa-triangle-exclamation text-xl";
  }

  if (elements.loadingTitle) {
    elements.loadingTitle.innerText = "無法開始輸入練習";
  }

  if (elements.loadingMessage) {
    elements.loadingMessage.innerText = message;
  }
}

function goHome() {
  clearAdvanceTimer();
  clearInterval(inputTimerInterval);
  window.location.href = "../index.html";
}

function isTypingTarget(target) {
  if (!target) return false;

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

function setupEvents() {
  const exitButton = document.getElementById("exit-button");
  const revealButton = document.getElementById("reveal-answer-button");
  const nextButton = document.getElementById("next-word-button");
  const completeHomeButton = document.getElementById("complete-home-button");
  const completeRestartButton = document.getElementById("complete-restart-button");

  if (exitButton) exitButton.addEventListener("click", goHome);
  if (revealButton) revealButton.addEventListener("click", revealAnswer);
  if (nextButton) nextButton.addEventListener("click", handleNextButtonClick);
  if (completeHomeButton) completeHomeButton.addEventListener("click", goHome);
  if (completeRestartButton) completeRestartButton.addEventListener("click", startInputPractice);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      goHome();
      return;
    }

    if (isTypingTarget(event.target)) return;

    if (event.key.toLowerCase() === "r") {
      startInputPractice();
    }
  });
}

function readSettingsFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const countParam = Number.parseInt(urlParams.get("count") || "", 10);

  activeChapterFile = urlParams.get("chapter") || DEFAULT_CHAPTER;
  activeSettings = {
    count: Number.isNaN(countParam) ? null : countParam,
    random: urlParams.get("random") === "1" || urlParams.get("random") === "true",
  };
}

document.addEventListener("DOMContentLoaded", () => {
  readSettingsFromUrl();
  setupEvents();
  loadChapter(activeChapterFile).catch((error) => {
    console.error(error);
    showLoadError(error.message || "請確認 static/data 中有可用的章節 JSON。");
  });
});
