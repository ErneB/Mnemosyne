
/* =========================================
   MNEMOSYNE — VOCABULARY MODE

   File: vocabulary.js

   Features:
   - Load words.json
   - Filter by chapter and section
   - Greek First / English First
   - Shuffle vocabulary
   - Tap card to reveal translation
   - Previous / Next navigation
   - Automatic English text resizing
   - Automatic Greek text resizing
   - Responsive font sizing
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
   2. HTML ELEMENT HELPERS
   ========================================= */

function getElement(id) {
    return document.getElementById(id);
}

/*
   Support both flashcard IDs.

   Prefer flashcardText because it contains
   the actual vocabulary text.
*/

function getFlashcard() {
    return (
        getElement("flashcardText") ||
        getElement("flashcard")
    );
}


/* =========================================
   3. LOAD VOCABULARY
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

        flashcard.classList.remove(
            "greekText"
        );

        flashcard.classList.add(
            "englishText"
        );

        flashcard.style.fontSize = "28px";
        flashcard.style.whiteSpace = "normal";
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
   ========================================= */

function selectChapter() {

    populateSections();
    selectSection();

}


/* =========================================
   8. SECTION SELECTION
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

   Fisher-Yates shuffle.
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
        flashcard.style.whiteSpace = "normal";

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

    /*
       Wait until the browser has applied
       the new text and CSS classes.

       Then calculate the best font size.
    */

    requestAnimationFrame(
        fitFlashcardText
    );

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
   14. AUTOMATIC FONT RESIZING

   English:
   - Starts at 64px
   - Allows wrapping
   - Shrinks only if necessary

   Greek:
   - Starts at 72px
   - Stays on one line
   - Shrinks if too wide

   This prevents long definitions
   from escaping the flashcard.

   ========================================= */


/* =========================================
   14. AUTOMATIC FLASHCARD TEXT RESIZING

   English:
   - Short words start at 64px
   - Long definitions wrap automatically
   - Shrinks only when necessary

   Greek:
   - Starts at 72px
   - Stays on one line
   - Shrinks to fit

   ========================================= */

function fitFlashcardText() {

    const text = getFlashcard();
    const box = getElement("flashcardBox");

    if (!text || !box) return;

    const isEnglish =
        text.classList.contains("englishText");

    const maxSize = isEnglish ? 64 : 72;
    const minSize = isEnglish ? 20 : 18;

    /*
       Reset previous measurements.
    */

    text.style.fontSize = `${maxSize}px`;

    text.style.whiteSpace =
        isEnglish ? "normal" : "nowrap";

    text.style.overflowWrap =
        isEnglish ? "anywhere" : "normal";

    text.style.wordBreak = "normal";

    /*
       Reserve 10% on each side
       for the navigation arrows.
    */

    const availableWidth =
        box.clientWidth * 0.78;

    const availableHeight =
        box.clientHeight - 40;

    /*
       Create an invisible text-measuring
       element with a fixed width.
    */

    const measure =
        document.createElement("div");

    const computed =
        window.getComputedStyle(text);

    Object.assign(measure.style, {
        position: "fixed",
        left: "-10000px",
        top: "0",
        visibility: "hidden",
        pointerEvents: "none",

        display: "block",
        boxSizing: "border-box",

        width: `${availableWidth}px`,
        minWidth: "0",
        maxWidth: `${availableWidth}px`,

        height: "auto",
        minHeight: "0",
        maxHeight: "none",

        margin: "0",
        padding: "0",
        border: "0",

        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
        lineHeight: "1.25",
        letterSpacing: computed.letterSpacing,

        textAlign: "center",

        whiteSpace:
            isEnglish ? "normal" : "nowrap",

        overflowWrap:
            isEnglish ? "anywhere" : "normal",

        wordBreak: "normal"
    });

    measure.textContent = text.textContent;

    document.body.appendChild(measure);

    /*
       Start large, then shrink until
       the text fits horizontally
       and vertically.
    */

    let size = maxSize;

    while (size >= minSize) {

        measure.style.fontSize = `${size}px`;

        const tooWide =
            measure.scrollWidth >
            measure.clientWidth + 1;

        const tooTall =
            measure.scrollHeight >
            availableHeight;

        if (!tooWide && !tooTall) {
            break;
        }

        size -= 2;
    }

    /*
       Apply the calculated font size.
    */

    text.style.fontSize =
        `${Math.max(size, minSize)}px`;

    measure.remove();

}



/* =========================================
   15. REVEAL TRANSLATION
   ========================================= */

function flipCard() {

    if (studyCards.length === 0) return;

    showingAnswer = !showingAnswer;

    displayCard();

}


/* =========================================
   16. NEXT FLASHCARD
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
   18. RESIZE WHEN SCREEN CHANGES

   Handles:
   - iPhone rotation
   - Desktop resizing
   - Different screen widths
   ========================================= */

window.addEventListener(
    "resize",
    () => {
        requestAnimationFrame(
            fitFlashcardText
        );
    }
);


/* =========================================
   19. INITIALIZE APPLICATION
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
