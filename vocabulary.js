
/* =========================================
   MNEMOSYNE — VOCABULARY MODE

   File: vocabulary.js

   Features:
   - Load vocabulary from words.json
   - Filter by chapter and section
   - Greek First / English First
   - Shuffle vocabulary
   - Tap center to reveal translation
   - Tap left edge for previous card
   - Tap right edge for next card
   - Automatic Greek text resizing
   - Card counter and progress bar

   ========================================= */


/* =========================================
   1. APPLICATION STATE
   ========================================= */

let cards = [];
let studyCards = [];

let currentIndex = 0;
let showingAnswer = false;
let englishFirst = false;


/* =========================================
   2. FIND HTML ELEMENTS

   These helpers prevent errors when
   optional buttons are not present.

   ========================================= */

function getElement(id) {
    return document.getElementById(id);
}


/* Support both old and new flashcard IDs. */

function getFlashcard() {
    return (
        getElement("flashcardText") ||
        getElement("flashcard")
    );
}


/* =========================================
   3. LOAD VOCABULARY

   Expected words.json format:

   [
       {
           "chapter": 1,
           "section": "α",
           "greek": "λόγος",
           "english": "word"
       }
   ]

   ========================================= */

async function loadCards() {

    try {

        const response = await fetch("words.json");

        if (!response.ok) {
            throw new Error(
                "Could not load words.json"
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "Vocabulary must be a JSON array"
            );
        }

        cards = data.filter(card =>
            card &&
            typeof card === "object" &&
            typeof card.greek === "string" &&
            typeof card.english === "string"
        );

        if (cards.length === 0) {
            throw new Error(
                "No valid vocabulary cards found"
            );
        }

        populateChapters();
        selectChapter();

    } catch (error) {

        console.error(
            "Mnemosyne vocabulary error:",
            error
        );

        cards = [];
        studyCards = [];

        showVocabularyError(
            "Error loading vocabulary"
        );

    }

}


/* =========================================
   4. DISPLAY LOADING ERRORS
   ========================================= */

function showVocabularyError(message) {

    const flashcard = getFlashcard();

    if (flashcard) {
        flashcard.textContent = message;
        flashcard.classList.remove("greekText");
        flashcard.classList.add("englishText");
        flashcard.style.fontSize = "28px";
    }

    const counter = getElement("cardCounter");

    if (counter) {
        counter.textContent = "Check words.json";
    }

    const sideLabel = getElement("cardSideLabel");

    if (sideLabel) {
        sideLabel.textContent = "ERROR";
    }

    updateProgress(0);

    updateControls();

}


/* =========================================
   5. POPULATE CHAPTER DROPDOWN
   ========================================= */

function populateChapters() {

    const select = getElement("chapterSelect");

    if (!select) return;

    select.innerHTML = "";

    const allOption =
        document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All Chapters";

    select.appendChild(allOption);

    const chapters = [
        ...new Set(
            cards
                .filter(card =>
                    card.chapter !== undefined &&
                    card.chapter !== null
                )
                .map(card =>
                    String(card.chapter)
                )
        )
    ].sort((a, b) => {

        if (a === "general") return 1;
        if (b === "general") return -1;

        const aNumber = Number(a);
        const bNumber = Number(b);

        if (
            Number.isFinite(aNumber) &&
            Number.isFinite(bNumber)
        ) {
            return aNumber - bNumber;
        }

        return a.localeCompare(b);

    });

    for (const chapter of chapters) {

        const option =
            document.createElement("option");

        option.value = chapter;

        option.textContent =
            chapter === "general"
                ? "General Vocabulary"
                : "Chapter " + chapter;

        select.appendChild(option);

    }

}


/* =========================================
   6. POPULATE SECTION DROPDOWN
   ========================================= */

function populateSections() {

    const chapterSelect =
        getElement("chapterSelect");

    const sectionSelect =
        getElement("sectionSelect");

    if (!sectionSelect) return;

    const chapter = chapterSelect
        ? chapterSelect.value
        : "all";

    sectionSelect.innerHTML = "";

    const allOption =
        document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All Sections";

    sectionSelect.appendChild(allOption);

    const chapterCards = cards.filter(card =>
        chapter === "all" ||
        String(card.chapter) === chapter
    );

    const sections = [
        ...new Set(
            chapterCards
                .filter(card =>
                    card.section !== undefined &&
                    card.section !== null
                )
                .map(card =>
                    String(card.section)
                )
        )
    ].sort();

    for (const section of sections) {

        const option =
            document.createElement("option");

        option.value = section;

        option.textContent =
            "Section " + section;

        sectionSelect.appendChild(option);

    }

}


/* =========================================
   7. CHAPTER SELECTION

   Called when the chapter changes.
   ========================================= */

function selectChapter() {

    populateSections();
    selectSection();

}


/* =========================================
   8. SECTION SELECTION

   Filters the vocabulary and resets
   the current card.

   ========================================= */

function selectSection() {

    const chapterSelect =
        getElement("chapterSelect");

    const sectionSelect =
        getElement("sectionSelect");

    const chapter = chapterSelect
        ? chapterSelect.value
        : "all";

    const section = sectionSelect
        ? sectionSelect.value
        : "all";

    studyCards = cards.filter(card => {

        const chapterMatches =
            chapter === "all" ||
            String(card.chapter) === chapter;

        const sectionMatches =
            section === "all" ||
            String(card.section) === section;

        return (
            chapterMatches &&
            sectionMatches
        );

    });

    currentIndex = 0;
    showingAnswer = false;

    displayCard();

}


/* =========================================
   9. LANGUAGE DIRECTION

   Toggle between:
   - Greek First
   - English First

   ========================================= */

function toggleLanguage() {

    const toggle =
        getElement("languageToggle");

    englishFirst = toggle
        ? toggle.checked
        : false;

    const label =
        getElement("languageLabel");

    if (label) {

        label.textContent = englishFirst
            ? "English First"
            : "Greek First";

    }

    showingAnswer = false;

    displayCard();

}


/* =========================================
   10. SHUFFLE VOCABULARY

   Fisher-Yates shuffle algorithm.
   ========================================= */

function shuffleCards() {

    if (studyCards.length < 2) return;

    for (
        let i = studyCards.length - 1;
        i > 0;
        i--
    ) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [
            studyCards[i],
            studyCards[j]
        ] = [
            studyCards[j],
            studyCards[i]
        ];

    }

    currentIndex = 0;
    showingAnswer = false;

    displayCard();

}


/* =========================================
   11. DISPLAY FLASHCARD

   Updates:
   - Greek / English text
   - Language label
   - Card counter
   - Progress bar
   - Navigation controls

   ========================================= */

function displayCard() {

    const flashcard = getFlashcard();

    if (!flashcard) {
        console.error(
            "Flashcard element not found."
        );
        return;
    }

    const counter =
        getElement("cardCounter");

    const sideLabel =
        getElement("cardSideLabel");

    if (studyCards.length === 0) {

        flashcard.textContent =
            "No vocabulary available";

        flashcard.classList.remove(
            "greekText"
        );

        flashcard.classList.add(
            "englishText"
        );

        flashcard.style.fontSize = "28px";

        if (counter) {
            counter.textContent = "Card 0 of 0";
        }

        if (sideLabel) {
            sideLabel.textContent = "NO CARDS";
        }

        updateProgress(0);
        updateControls();

        return;

    }

    const currentCard =
        studyCards[currentIndex];

    const showEnglish =
        englishFirst !== showingAnswer;

    flashcard.textContent = showEnglish
        ? currentCard.english
        : currentCard.greek;

    flashcard.classList.toggle(
        "englishText",
        showEnglish
    );

    flashcard.classList.toggle(
        "greekText",
        !showEnglish
    );

    if (sideLabel) {

        sideLabel.textContent =
            showEnglish
                ? "ENGLISH"
                : "GREEK";

    }

    if (counter) {

        counter.textContent =
            `Card ${currentIndex + 1} of ${studyCards.length}`;

    }

    const progress =
        ((currentIndex + 1) /
            studyCards.length) * 100;

    updateProgress(progress);

    updateControls();

    fitFlashcardText();

}


/* =========================================
   12. UPDATE PROGRESS BAR
   ========================================= */

function updateProgress(progress) {

    const progressFill =
        getElement("progressFill");

    const progressTrack =
        getElement("progressTrack");

    if (progressFill) {

        progressFill.style.width =
            `${progress}%`;

    }

    if (progressTrack) {

        progressTrack.setAttribute(
            "aria-valuenow",
            String(Math.round(progress))
        );

    }

}


/* =========================================
   13. UPDATE BUTTON STATES

   Works with either:
   - Old navigation buttons
   - New flashcard arrows

   Missing controls are ignored.

   ========================================= */

function updateControls() {

    const hasCards =
        studyCards.length > 0;

    const controlIDs = [
        "previousButton",
        "nextButton",
        "revealButton",
        "translateButton"
    ];

    for (const id of controlIDs) {

        const button = getElement(id);

        if (button) {
            button.disabled = !hasCards;
        }

    }

    const arrows =
        document.querySelectorAll(
            "#flashcardBox .cardEdge"
        );

    arrows.forEach(arrow => {

        if ("disabled" in arrow) {
            arrow.disabled = !hasCards;
        }

        arrow.setAttribute(
            "aria-disabled",
            String(!hasCards)
        );

    });

}


/* =========================================
   14. AUTOMATIC TEXT RESIZING

   Greek vocabulary:
   - Starts at 72px
   - Shrinks if the word is too wide

   English translations:
   - Uses 42px
   - Allows normal wrapping

   ========================================= */


/* =========================================
   AUTOMATIC FLASHCARD TEXT RESIZING
   ========================================= */

function fitFlashcardText() {

    const flashcard = getFlashcard();

    if (!flashcard) return;

    const isGreek =
        flashcard.classList.contains("greekText");

    const maxFontSize = isGreek ? 72 : 42;
    const minFontSize = 12;

    let fontSize = maxFontSize;

    flashcard.style.fontSize = `${fontSize}px`;

    if (!isGreek) return;

    // Keep Greek words on a single line.
    flashcard.style.whiteSpace = "nowrap";

    // Shrink until the word fits.
    while (
        flashcard.scrollWidth >
            flashcard.clientWidth + 1 &&
        fontSize > minFontSize
    ) {

        fontSize -= 2;

        flashcard.style.fontSize =
            `${fontSize}px`;

    }

}

/* =========================================
   15. REVEAL TRANSLATION

   Called by:
   - Center of flashcard
   - Reveal button

   ========================================= */

function flipCard() {

    if (studyCards.length === 0) return;

    showingAnswer = !showingAnswer;

    displayCard();

}


/* =========================================
   16. NEXT FLASHCARD

   Called by the right arrow.

   Wraps back to the first card
   after reaching the last card.

   ========================================= */

function nextCard() {

    if (studyCards.length === 0) return;

    currentIndex =
        (currentIndex + 1) %
        studyCards.length;

    showingAnswer = false;

    displayCard();

}


/* =========================================
   17. PREVIOUS FLASHCARD

   Called by the left arrow.

   Wraps to the last card when
   navigating backward from the first.

   ========================================= */

function previousCard() {

    if (studyCards.length === 0) return;

    currentIndex =
        (
            currentIndex -
            1 +
            studyCards.length
        ) % studyCards.length;

    showingAnswer = false;

    displayCard();

}


/* =========================================
   18. RESPONSIVE TEXT RESIZING

   Recalculate the font size when
   the browser window changes size.

   ========================================= */

window.addEventListener(
    "resize",
    fitFlashcardText
);


/* =========================================
   19. INITIALIZE APPLICATION

   Wait for HTML to finish loading
   before accessing page elements.

   ========================================= */

function initializeVocabulary() {

    const toggle =
        getElement("languageToggle");

    englishFirst = toggle
        ? toggle.checked
        : false;

    const label =
        getElement("languageLabel");

    if (label) {

        label.textContent = englishFirst
            ? "English First"
            : "Greek First";

    }

    loadCards();

}


/* =========================================
   20. START APPLICATION
   ========================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeVocabulary
    );

} else {

    initializeVocabulary();

}
