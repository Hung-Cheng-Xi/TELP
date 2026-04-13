const DEFAULT_WORD_COUNT = 10;
const DEFAULT_RANDOM_MODE = false;
const MIN_WORD_COUNT = 5;

let selectedChapter = null;

function openChapterModal(title, fileName, wordCount) {
    selectedChapter = { title, fileName, wordCount };

    const modal = document.getElementById('chapter-modal');
    const titleLabel = document.getElementById('modal-title');
    const subtitleLabel = document.getElementById('modal-subtitle');
    const rangeInput = document.getElementById('word-count-range');
    const randomToggle = document.getElementById('random-toggle');

    if (!modal || !rangeInput || !randomToggle) return;

    const minCount = getMinimumWordCount(wordCount);
    const initialCount = getInitialWordCount(wordCount);
    titleLabel.innerText = title;
    subtitleLabel.innerText = `本章共有 ${wordCount} 個單字，請選擇這次要練習的數量與出題方式。`;

    rangeInput.min = String(minCount);
    rangeInput.max = String(Math.max(wordCount, 1));
    rangeInput.value = String(initialCount);
    randomToggle.checked = DEFAULT_RANDOM_MODE;

    updateWordCountDisplay(initialCount);
    updateRangeLabels(minCount, wordCount);
    updateRangeProgress(initialCount, minCount, wordCount);
    updatePresetButtons(initialCount, wordCount);
    showSetupPanel();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('modal-open');
}

function closeChapterModal() {
    const modal = document.getElementById('chapter-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('modal-open');
    showSetupPanel();
    selectedChapter = null;
}

function showSetupPanel() {
    const setupPanel = document.getElementById('chapter-modal-panel');
    const modePanel = document.getElementById('mode-modal-panel');

    if (setupPanel) setupPanel.classList.remove('hidden');
    if (modePanel) modePanel.classList.add('hidden');
}

function showModePanel() {
    if (!selectedChapter) return;

    const setupPanel = document.getElementById('chapter-modal-panel');
    const modePanel = document.getElementById('mode-modal-panel');
    const modeChapterTitle = document.getElementById('mode-chapter-title');

    if (modeChapterTitle) modeChapterTitle.innerText = selectedChapter.title;
    if (setupPanel) setupPanel.classList.add('hidden');
    if (modePanel) modePanel.classList.remove('hidden');
}

function updateWordCountDisplay(value) {
    const valueLabel = document.getElementById('word-count-value');
    if (valueLabel) {
        valueLabel.innerText = `${value} 題`;
    }
}

function updateRangeLabels(minWordCount, maxWordCount) {
    const minLabel = document.getElementById('word-count-min-label');
    const maxLabel = document.getElementById('word-count-max-label');

    if (minLabel) minLabel.innerText = `最小: ${minWordCount}`;
    if (maxLabel) maxLabel.innerText = `最大: ${maxWordCount}`;
}

function updateRangeProgress(value, min, max) {
    const rangeInput = document.getElementById('word-count-range');
    if (!rangeInput) return;

    const safeMax = Math.max(max, min);
    const progress = safeMax === min ? 100 : ((value - min) / (safeMax - min)) * 100;
    rangeInput.style.setProperty('--range-progress', `${Math.min(Math.max(progress, 0), 100)}%`);
}

function updatePresetButtons(selectedValue, maxWordCount) {
    const presetButtons = document.querySelectorAll('[data-count-preset]');

    presetButtons.forEach((button) => {
        const presetKey = button.dataset.countPreset;
        const presetValue = presetKey === 'all' ? maxWordCount : Number(presetKey);
        const isDisabled = presetKey !== 'all' && presetValue > maxWordCount;
        const isActive = presetValue === selectedValue;

        button.disabled = isDisabled;
        button.classList.toggle('is-active', isActive && !isDisabled);
        button.classList.toggle('bg-white', !isActive || isDisabled);
        button.classList.toggle('text-slate-600', !isActive && !isDisabled);
        button.classList.toggle('text-slate-300', isDisabled);
        button.classList.toggle('opacity-40', isDisabled);
        button.classList.toggle('cursor-not-allowed', isDisabled);
    });
}

function getMinimumWordCount(wordCount) {
    if (wordCount <= 0) return 1;
    return Math.min(MIN_WORD_COUNT, wordCount);
}

function getInitialWordCount(wordCount) {
    const minCount = getMinimumWordCount(wordCount);
    return Math.max(Math.min(DEFAULT_WORD_COUNT, wordCount), minCount);
}

function buildStudyParams() {
    if (!selectedChapter) return;

    const rangeInput = document.getElementById('word-count-range');
    const randomToggle = document.getElementById('random-toggle');

    return new URLSearchParams({
        chapter: selectedChapter.fileName,
        count: String(Number(rangeInput.value)),
        random: randomToggle.checked ? '1' : '0'
    });
}

function goToVocabularyCard() {
    const params = buildStudyParams();

    if (!params) return;

    window.location.href = `template/vocabulary-card.html?${params.toString()}`;
}

function goToWordMatching() {
    const params = buildStudyParams();

    if (!params) return;

    window.location.href = `template/word-matching.html?${params.toString()}`;
}

function setupChapterModalEvents() {
    const modal = document.getElementById('chapter-modal');
    const modalPanel = document.getElementById('chapter-modal-panel');
    const modePanel = document.getElementById('mode-modal-panel');
    const closeBtn = document.getElementById('modal-close-btn');
    const modeCloseBtn = document.getElementById('mode-close-btn');
    const modeBackBtn = document.getElementById('mode-back-btn');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const flashcardModeBtn = document.getElementById('flashcard-mode-btn');
    const matchingModeBtn = document.getElementById('matching-mode-btn');
    const rangeInput = document.getElementById('word-count-range');
    const presetButtons = document.querySelectorAll('[data-count-preset]');

    if (!modal || !modalPanel || !modePanel || !closeBtn || !modeCloseBtn || !modeBackBtn || !confirmBtn || !flashcardModeBtn || !matchingModeBtn || !rangeInput) return;

    closeBtn.addEventListener('click', closeChapterModal);
    modeCloseBtn.addEventListener('click', closeChapterModal);
    modeBackBtn.addEventListener('click', showSetupPanel);
    confirmBtn.addEventListener('click', showModePanel);
    flashcardModeBtn.addEventListener('click', goToVocabularyCard);
    matchingModeBtn.addEventListener('click', goToWordMatching);

    modal.addEventListener('click', closeChapterModal);
    modalPanel.addEventListener('click', (event) => event.stopPropagation());
    modePanel.addEventListener('click', (event) => event.stopPropagation());

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeChapterModal();
        }
    });

    rangeInput.addEventListener('input', (event) => {
        const value = Number(event.target.value);
        updateWordCountDisplay(value);
        updateRangeProgress(value, Number(rangeInput.min), Number(rangeInput.max));
        updatePresetButtons(value, Number(rangeInput.max));
    });

    presetButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (button.disabled) return;

            const value = button.dataset.countPreset === 'all'
                ? Number(rangeInput.max)
                : Number(button.dataset.countPreset);
            rangeInput.value = String(value);
            updateWordCountDisplay(value);
            updateRangeProgress(value, Number(rangeInput.min), Number(rangeInput.max));
            updatePresetButtons(value, Number(rangeInput.max));
        });
    });
}
