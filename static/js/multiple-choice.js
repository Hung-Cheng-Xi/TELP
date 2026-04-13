const DATA_PATH = "../static/data/";
const DEFAULT_CHAPTER = "第三章-tablet.json";
const OPTION_COUNT = 4;
const ANSWER_DELAY_MS = 800;

let allWords = [];
let questions = [];
let currentIndex = 0;
let selectedAnswerId = null;
let isAnswering = false;
let score = 0;
let quizTime = 0;
let quizTimerInterval = null;
let quizRunId = 0;
let clearPendingOptionHoverReset = null;
let activeChapterFile = DEFAULT_CHAPTER;
let activeSettings = {
  count: null,
  random: false,
};

function getElements() {
  return {
    chapterTitle: document.getElementById("chapter-title"),
    score: document.getElementById("quiz-score"),
    progress: document.getElementById("quiz-progress"),
    timer: document.getElementById("quiz-timer"),
    loading: document.getElementById("loading-state"),
    loadingIcon: document.getElementById("loading-icon"),
    loadingTitle: document.getElementById("loading-title"),
    loadingMessage: document.getElementById("loading-message"),
    quizScreen: document.getElementById("quiz-screen"),
    quizWord: document.getElementById("quiz-word"),
    options: document.getElementById("quiz-options"),
    completeScreen: document.getElementById("quiz-complete-screen"),
    completeStats: document.getElementById("quiz-complete-stats"),
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

  startQuiz();
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
    }))
    .filter((item) => item.word && item.meaning);
}

function toPlainText(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  return (template.content.textContent || "").trim();
}

function applyStudySettings(words, settings) {
  let result = [...words];

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

function createQuestions(selectedWords) {
  return selectedWords.map((targetWord) => {
    const optionPool = selectedWords.length > 1 ? selectedWords : allWords;
    const distractors = shuffleItems(
      optionPool.filter((word) => word.id !== targetWord.id),
    ).slice(0, OPTION_COUNT - 1);

    return {
      word: targetWord,
      options: shuffleItems([targetWord, ...distractors]),
    };
  });
}

function startQuiz() {
  const elements = getElements();
  const selectedWords = applyStudySettings(allWords, activeSettings);

  if (selectedWords.length === 0) {
    showLoadError("這個章節目前沒有可用的單字資料。");
    return;
  }

  quizRunId += 1;
  questions = createQuestions(selectedWords);
  currentIndex = 0;
  selectedAnswerId = null;
  isAnswering = false;
  score = 0;
  quizTime = 0;

  if (elements.chapterTitle) {
    elements.chapterTitle.innerText = `${getChapterTitle(activeChapterFile)} 選擇題`;
  }

  if (elements.completeScreen) {
    elements.completeScreen.classList.add("hidden");
    elements.completeScreen.classList.remove("flex");
  }

  if (elements.loading) {
    elements.loading.classList.add("hidden");
  }

  if (elements.quizScreen) {
    elements.quizScreen.classList.remove("hidden");
    elements.quizScreen.classList.add("flex");
  }

  clearInterval(quizTimerInterval);
  updateStatusDisplay();
  quizTimerInterval = setInterval(timerTick, 1000);
  renderQuestion();
}

function renderQuestion() {
  const elements = getElements();
  const currentQuestion = questions[currentIndex];

  if (!currentQuestion || !elements.quizWord || !elements.options) return;

  selectedAnswerId = null;
  isAnswering = false;
  elements.quizWord.innerText = currentQuestion.word.word;
  applyWordSize(elements.quizWord, currentQuestion.word.word);
  elements.options.innerHTML = "";

  currentQuestion.options.forEach((option, index) => {
    elements.options.appendChild(createOptionElement(option, index));
  });

  suppressLingeringOptionHover(elements.options);
  updateStatusDisplay();
}

function releaseOptionHoverReset() {
  if (!clearPendingOptionHoverReset) return;

  clearPendingOptionHoverReset();
}

function suppressLingeringOptionHover(optionsElement) {
  releaseOptionHoverReset();

  const optionButtons = Array.from(
    optionsElement.querySelectorAll(".quiz-option"),
  );

  if (optionButtons.length === 0) return;

  optionButtons.forEach((button) => {
    button.blur();
    button.style.transform = "none";
    button.style.borderColor = "transparent";
    button.style.boxShadow = "var(--shadow-sm)";
  });

  const clearHoverReset = () => {
    optionButtons.forEach((button) => {
      button.style.removeProperty("transform");
      button.style.removeProperty("border-color");
      button.style.removeProperty("box-shadow");
    });

    document.removeEventListener("pointermove", clearHoverReset);
    document.removeEventListener("pointerdown", clearHoverReset);
    document.removeEventListener("keydown", clearHoverReset);

    clearPendingOptionHoverReset = null;
  };

  clearPendingOptionHoverReset = clearHoverReset;
  document.addEventListener("pointermove", clearHoverReset, { once: true });
  document.addEventListener("pointerdown", clearHoverReset, { once: true });
  document.addEventListener("keydown", clearHoverReset, { once: true });
}

function createOptionElement(option, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quiz-option";
  button.dataset.optionId = option.id;
  button.setAttribute("aria-label", option.meaning);
  button.addEventListener("click", () => handleOptionClick(option));

  const content = document.createElement("span");
  content.className = "option-content";

  const key = document.createElement("span");
  key.className = "option-key";
  key.innerText = String.fromCharCode(65 + index);

  const text = document.createElement("span");
  text.className = "option-text";
  text.innerText = option.meaning;

  const icon = document.createElement("span");
  icon.className = "option-icon";
  icon.setAttribute("aria-hidden", "true");

  content.appendChild(key);
  content.appendChild(text);
  button.appendChild(content);
  button.appendChild(icon);

  return button;
}

function handleOptionClick(option) {
  if (isAnswering || !questions[currentIndex]) return;

  releaseOptionHoverReset();

  const currentQuestion = questions[currentIndex];
  const isCorrect = option.id === currentQuestion.word.id;
  const runId = quizRunId;

  isAnswering = true;
  selectedAnswerId = option.id;

  if (isCorrect) {
    score += 1;
  }

  updateStatusDisplay();
  applyAnswerState(currentQuestion.word.id);

  window.setTimeout(() => {
    if (runId !== quizRunId) return;

    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
      renderQuestion();
      return;
    }

    finishQuiz();
  }, ANSWER_DELAY_MS);
}

function applyAnswerState(correctAnswerId) {
  const elements = getElements();
  if (!elements.options) return;

  const optionButtons = elements.options.querySelectorAll(".quiz-option");

  optionButtons.forEach((button) => {
    const optionId = button.dataset.optionId;
    const icon = button.querySelector(".option-icon");
    const isCorrect = optionId === correctAnswerId;
    const isSelected = optionId === selectedAnswerId;

    button.disabled = true;
    button.classList.toggle("is-correct", isCorrect);
    button.classList.toggle("is-wrong", isSelected && !isCorrect);
    button.classList.toggle("is-muted", !isSelected && !isCorrect);

    if (!icon) return;

    icon.classList.remove("is-correct", "is-wrong");
    icon.innerHTML = "";

    if (isCorrect) {
      icon.classList.add("is-correct");
      icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else if (isSelected) {
      icon.classList.add("is-wrong");
      icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    }
  });
}

function finishQuiz() {
  const elements = getElements();
  clearInterval(quizTimerInterval);
  isAnswering = false;
  currentIndex = Math.max(questions.length - 1, 0);
  updateStatusDisplay(true);

  if (elements.completeStats) {
    elements.completeStats.innerText =
      `耗時 ${formatTime(quizTime)}，答對 ${score} / ${questions.length} 題`;
  }

  if (elements.completeScreen) {
    elements.completeScreen.classList.remove("hidden");
    elements.completeScreen.classList.add("flex");
  }
}

function timerTick() {
  quizTime += 1;
  updateStatusDisplay();
}

function updateStatusDisplay(isComplete = false) {
  const elements = getElements();
  const total = questions.length;
  const progress = total === 0 ? 0 : isComplete ? total : currentIndex + 1;

  if (elements.progress) {
    elements.progress.innerText = `${Math.min(progress, total)} / ${total}`;
  }

  if (elements.score) {
    elements.score.innerText = `${score} / ${total}`;
  }

  if (elements.timer) {
    elements.timer.innerText = formatTime(quizTime);
  }
}

function applyWordSize(element, word) {
  element.classList.remove(
    "quiz-word-size-default",
    "quiz-word-size-long",
    "quiz-word-size-xlong",
  );
  element.classList.add(getWordSizeClass(word));
}

function getWordSizeClass(word = "") {
  const normalizedWord = String(word).replace(/\s+/g, "");

  if (normalizedWord.length >= 15) return "quiz-word-size-xlong";
  if (normalizedWord.length >= 10) return "quiz-word-size-long";
  return "quiz-word-size-default";
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
  clearInterval(quizTimerInterval);

  if (elements.quizScreen) {
    elements.quizScreen.classList.add("hidden");
    elements.quizScreen.classList.remove("flex");
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
    elements.loadingTitle.innerText = "無法開始選擇題";
  }

  if (elements.loadingMessage) {
    elements.loadingMessage.innerText = message;
  }
}

function speakCurrentWord() {
  const elements = getElements();
  if (!elements.quizWord) return;

  speakText(elements.quizWord.innerText || elements.quizWord.textContent);
}

function speakText(text) {
  if (!text || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.7;
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
}

function goHome() {
  clearInterval(quizTimerInterval);
  window.location.href = "../index.html";
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

function setupEvents() {
  const exitButton = document.getElementById("exit-button");
  const speakButton = document.getElementById("speak-word-button");
  const completeHomeButton = document.getElementById("complete-home-button");
  const completeRestartButton = document.getElementById("complete-restart-button");

  if (exitButton) exitButton.addEventListener("click", goHome);
  if (speakButton) speakButton.addEventListener("click", speakCurrentWord);
  if (completeHomeButton) completeHomeButton.addEventListener("click", goHome);
  if (completeRestartButton) completeRestartButton.addEventListener("click", startQuiz);

  document.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target)) return;

    if (event.key === "Escape") {
      goHome();
      return;
    }

    if (event.key.toLowerCase() === "r") {
      startQuiz();
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      speakCurrentWord();
      return;
    }

    if (isAnswering || !questions[currentIndex]) return;

    const optionIndex = getKeyboardOptionIndex(event.key);
    if (optionIndex === -1) return;

    const option = questions[currentIndex].options[optionIndex];
    if (option) {
      event.preventDefault();
      handleOptionClick(option);
    }
  });
}

function getKeyboardOptionIndex(key) {
  const normalizedKey = key.toLowerCase();
  const letterIndex = ["a", "b", "c", "d"].indexOf(normalizedKey);
  if (letterIndex !== -1) return letterIndex;

  const numberIndex = Number.parseInt(normalizedKey, 10) - 1;
  return Number.isInteger(numberIndex) && numberIndex >= 0 && numberIndex < OPTION_COUNT
    ? numberIndex
    : -1;
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
