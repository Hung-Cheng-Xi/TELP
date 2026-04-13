const DATA_PATH = "./static/data/";
const DEFAULT_CHAPTER = "第三章-tablet.json";
const MAX_PAIRS_PER_ROUND = 6;
const CARD_HIDE_DELAY_MS = 360;
const ROUND_CHANGE_DELAY_MS = 260;

let allWords = [];
let gameCards = [];
let roundsData = [];
let currentRound = 0;
let firstSelected = null;
let matchedPairs = 0;
let roundMatchedPairs = 0;
let totalPairs = 0;
let gameTime = 0;
let gameTimerInterval = null;
let isTransitioningRound = false;
let gameRunId = 0;
let activeChapterFile = DEFAULT_CHAPTER;
let activeSettings = {
  count: null,
  random: false,
};

function getElements() {
  return {
    chapterTitle: document.getElementById("chapter-title"),
    roundLabel: document.getElementById("round-label"),
    progress: document.getElementById("game-progress"),
    timer: document.getElementById("game-timer"),
    loading: document.getElementById("loading-state"),
    grid: document.getElementById("game-grid"),
    completeScreen: document.getElementById("game-complete-screen"),
    completeStats: document.getElementById("game-complete-stats"),
  };
}

async function loadChapter(filename) {
  const response = await fetch(`${DATA_PATH}${filename}`);

  if (!response.ok) {
    throw new Error(`無法載入 ${filename}`);
  }

  const data = await response.json();
  allWords = normalizeWordData(data);
  startGame();
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
      id: item.id || `${item.word}-${item.meaning}-${index}`,
      word: String(item.word).trim(),
      meaning: String(item.meaning).trim(),
    }));
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

function startGame() {
  const elements = getElements();
  const selectedWords = applyStudySettings(allWords, activeSettings);
  gameRunId += 1;

  roundsData = [];
  for (let i = 0; i < selectedWords.length; i += MAX_PAIRS_PER_ROUND) {
    roundsData.push(selectedWords.slice(i, i + MAX_PAIRS_PER_ROUND));
  }

  currentRound = 0;
  firstSelected = null;
  matchedPairs = 0;
  roundMatchedPairs = 0;
  totalPairs = selectedWords.length;
  gameTime = 0;

  if (elements.chapterTitle) {
    elements.chapterTitle.innerText = `${getChapterTitle(activeChapterFile)} 配對練習`;
  }

  if (elements.completeScreen) {
    elements.completeScreen.classList.add("hidden");
    elements.completeScreen.classList.remove("flex");
  }

  if (elements.loading) {
    elements.loading.classList.add("hidden");
  }

  if (elements.grid) {
    elements.grid.classList.remove("hidden");
  }

  updateProgressDisplay();
  updateTimerDisplay();
  clearInterval(gameTimerInterval);
  gameTimerInterval = setInterval(timerTick, 1000);

  startRound();
}

function startRound() {
  const elements = getElements();
  const currentVocab = roundsData[currentRound] || [];

  isTransitioningRound = false;
  firstSelected = null;
  roundMatchedPairs = 0;
  gameCards = [];

  if (!elements.grid) return;

  elements.grid.innerHTML = "";

  currentVocab.forEach((item) => {
    gameCards.push({ id: item.id, text: item.word, type: "en" });
    gameCards.push({ id: item.id, text: item.meaning, type: "zh" });
  });

  gameCards = shuffleItems(gameCards);

  gameCards.forEach((card) => {
    elements.grid.appendChild(createCardElement(card));
  });

  updateRoundDisplay();

  elements.grid.animate(
    [
      { opacity: 0, transform: "scale(0.98)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: 280, easing: "ease-out" },
  );
}

function createCardElement(card) {
  const cardEl = document.createElement("button");
  cardEl.type = "button";
  cardEl.className = "match-card flex items-center justify-center px-3 py-3 text-center text-sm font-bold sm:px-4 sm:text-base";
  cardEl.dataset.id = card.id;
  cardEl.dataset.type = card.type;
  cardEl.setAttribute("aria-label", card.text);
  cardEl.appendChild(createCardText(card.text));
  cardEl.addEventListener("click", () => handleCardClick(cardEl, card));
  return cardEl;
}

function createCardText(text) {
  const textEl = document.createElement("span");
  textEl.className = "match-card-text";
  textEl.innerText = text;
  return textEl;
}

function setMatchedCardContent(cardEl, text) {
  cardEl.innerHTML = "";

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-check mr-1 opacity-50";
  icon.setAttribute("aria-hidden", "true");

  cardEl.appendChild(icon);
  cardEl.appendChild(createCardText(text));
}

function handleCardClick(el, cardData) {
  if (
    isTransitioningRound ||
    el.classList.contains("is-matched") ||
    el.classList.contains("is-error")
  ) {
    return;
  }

  if (el.classList.contains("is-selected")) {
    el.classList.remove("is-selected");
    firstSelected = null;
    return;
  }

  el.classList.add("is-selected");

  if (!firstSelected) {
    firstSelected = { el, cardData };
    return;
  }

  const card1 = firstSelected;
  const card2 = { el, cardData };
  firstSelected = null;
  checkMatch(card1, card2);
}

function checkMatch(card1, card2) {
  const isMatch =
    card1.cardData.id === card2.cardData.id &&
    card1.cardData.type !== card2.cardData.type;

  if (isMatch) {
    markCardsAsMatched(card1, card2);
    return;
  }

  markCardsAsError(card1.el, card2.el);
}

function markCardsAsMatched(card1, card2) {
  const runId = gameRunId;

  card1.el.classList.remove("is-selected");
  card2.el.classList.remove("is-selected");
  card1.el.classList.add("is-matched");
  card2.el.classList.add("is-matched");
  setMatchedCardContent(card1.el, card1.cardData.text);
  setMatchedCardContent(card2.el, card2.cardData.text);

  matchedPairs += 1;
  roundMatchedPairs += 1;
  updateProgressDisplay();

  window.setTimeout(() => {
    if (runId !== gameRunId) return;

    card1.el.classList.add("is-hiding");
    card2.el.classList.add("is-hiding");

    window.setTimeout(() => {
      if (runId !== gameRunId) return;
      checkRoundComplete();
    }, ROUND_CHANGE_DELAY_MS);
  }, CARD_HIDE_DELAY_MS);
}

function markCardsAsError(card1El, card2El) {
  card1El.classList.remove("is-selected");
  card2El.classList.remove("is-selected");
  card1El.classList.add("is-error");
  card2El.classList.add("is-error");

  window.setTimeout(() => {
    card1El.classList.remove("is-error");
    card2El.classList.remove("is-error");
  }, 420);
}

function checkRoundComplete() {
  const currentVocab = roundsData[currentRound] || [];

  if (roundMatchedPairs !== currentVocab.length || isTransitioningRound) {
    return;
  }

  isTransitioningRound = true;
  const runId = gameRunId;

  window.setTimeout(() => {
    if (runId !== gameRunId) return;

    if (currentRound < roundsData.length - 1) {
      currentRound += 1;
      startRound();
      return;
    }

    checkGameComplete();
  }, ROUND_CHANGE_DELAY_MS);
}

function checkGameComplete() {
  if (matchedPairs !== totalPairs) return;

  const elements = getElements();
  clearInterval(gameTimerInterval);

  if (elements.completeStats) {
    elements.completeStats.innerText = `耗時 ${formatTime(gameTime)}，完成 ${totalPairs} 組單字`;
  }

  if (elements.completeScreen) {
    elements.completeScreen.classList.remove("hidden");
    elements.completeScreen.classList.add("flex");
  }
}

function updateProgressDisplay() {
  const elements = getElements();
  if (elements.progress) {
    elements.progress.innerText = `${matchedPairs} / ${totalPairs}`;
  }
}

function updateRoundDisplay() {
  const elements = getElements();
  const totalRounds = Math.max(roundsData.length, 1);

  if (elements.roundLabel) {
    elements.roundLabel.innerText = `${Math.min(currentRound + 1, totalRounds)} / ${totalRounds}`;
  }
}

function timerTick() {
  gameTime += 1;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const elements = getElements();
  if (elements.timer) {
    elements.timer.innerText = formatTime(gameTime);
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

function goHome() {
  clearInterval(gameTimerInterval);
  window.location.href = "./index.html";
}

function setupEvents() {
  const exitButton = document.getElementById("exit-button");
  const completeHomeButton = document.getElementById("complete-home-button");
  const completeRestartButton = document.getElementById("complete-restart-button");

  if (exitButton) exitButton.addEventListener("click", goHome);
  if (completeHomeButton) completeHomeButton.addEventListener("click", goHome);
  if (completeRestartButton) completeRestartButton.addEventListener("click", startGame);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      goHome();
      return;
    }

    if (event.key.toLowerCase() === "r") {
      startGame();
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
  loadChapter(activeChapterFile);
});
