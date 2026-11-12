
/* =========================================
   MNEMOSYNE — PASSAGE MODE
========================================= */


/* =========================================
   1. APPLICATION STATE
========================================= */

let passages = [];

let currentPassage = null;

let currentSentenceIndex = 0;

let showingTranslation = false;


/* =========================================
   2. LOAD PASSAGES
========================================= */

async function loadPassages() {

    try {

        const response = await fetch(
            "passages.json"
        );

        if (!response.ok) {
            throw new Error(
                "Could not load passages.json"
            );
        }

        const data = await response.json();

        if (
            !Array.isArray(data.passages) ||
            data.passages.length === 0
        ) {
            throw new Error(
                "No passages found in JSON."
            );
        }

        passages = data.passages;

        populateChapterSelect();

        const firstChapter =
            document.getElementById(
                "chapterSelect"
            ).value;

        populateSectionSelect(firstChapter);

        const firstSection =
            document.getElementById(
                "sectionSelect"
            ).value;

        selectPassage(
            firstChapter,
            firstSection
        );

    } catch (error) {

        console.error(error);

        currentPassage = null;

        document.getElementById(
            "flashcardText"
        ).textContent =
            "Error loading passage.";

        document.getElementById(
            "sentenceCounter"
        ).textContent =
            "Unable to load passages";

        document.getElementById(
            "languageLabel"
        ).textContent = "";

        document.getElementById(
            "fullPassage"
        ).textContent = "";

        updateNavigationButtons();

    }

}


/* =========================================
   3. POPULATE CHAPTER SELECTOR
========================================= */

function populateChapterSelect() {

    const chapterSelect =
        document.getElementById(
            "chapterSelect"
        );

    chapterSelect.innerHTML = "";

    const chapters = [
        ...new Set(
            passages.map(
                passage => String(passage.chapter)
            )
        )
    ].sort((a, b) => Number(a) - Number(b));

    chapters.forEach(chapter => {

        const option =
            document.createElement("option");

        option.value = chapter;

        option.textContent =
            `Chapter ${chapter}`;

        chapterSelect.appendChild(option);

    });

}


/* =========================================
   4. POPULATE SECTION SELECTOR
========================================= */

function populateSectionSelect(chapter) {

    const sectionSelect =
        document.getElementById(
            "sectionSelect"
        );

    sectionSelect.innerHTML = "";

    const sections = passages
        .filter(
            passage =>
                String(passage.chapter) ===
                String(chapter)
        )
        .map(
            passage => String(passage.section)
        );

    [...new Set(sections)].forEach(section => {

        const option =
            document.createElement("option");

        option.value = section;

        option.textContent =
            `Section ${section}`;

        sectionSelect.appendChild(option);

    });

}


/* =========================================
   5. CHANGE CHAPTER
========================================= */

function changeChapter() {

    const chapter =
        document.getElementById(
            "chapterSelect"
        ).value;

    populateSectionSelect(chapter);

    const section =
        document.getElementById(
            "sectionSelect"
        ).value;

    selectPassage(chapter, section);

}


/* =========================================
   6. CHANGE SECTION
========================================= */

function changeSection() {

    const chapter =
        document.getElementById(
            "chapterSelect"
        ).value;

    const section =
        document.getElementById(
            "sectionSelect"
        ).value;

    selectPassage(chapter, section);

}


/* =========================================
   7. SELECT PASSAGE
========================================= */

function selectPassage(chapter, section) {

    currentPassage = passages.find(
        passage =>
            String(passage.chapter) ===
            String(chapter) &&
            String(passage.section) ===
            String(section)
    );

    if (
        !currentPassage ||
        !Array.isArray(currentPassage.sentences) ||
        currentPassage.sentences.length === 0
    ) {

        currentPassage = null;

        document.getElementById(
            "flashcardText"
        ).textContent =
            "No sentences available.";

        document.getElementById(
            "sentenceCounter"
        ).textContent = "No sentences";

        document.getElementById(
            "languageLabel"
        ).textContent = "";

        document.getElementById(
            "fullPassage"
        ).textContent = "";

        updateNavigationButtons();

        return;

    }

    currentSentenceIndex = 0;
    showingTranslation = false;

    displayFullPassage();
    displaySentence();

}


/* =========================================
   8. DISPLAY CURRENT SENTENCE
========================================= */

function displaySentence() {

    if (!currentPassage) return;

    const sentence =
        currentPassage.sentences[
            currentSentenceIndex
        ];

    const flashcardText =
        document.getElementById(
            "flashcardText"
        );

    flashcardText.textContent =
        showingTranslation
            ? sentence.english
            : sentence.greek;

    document.getElementById(
        "sentenceCounter"
    ).textContent =
        `Sentence ${currentSentenceIndex + 1} of ${currentPassage.sentences.length}`;

    document.getElementById(
        "languageLabel"
    ).textContent =
        showingTranslation
            ? "ENGLISH"
            : "GREEK";

    highlightSentence();
    updateNavigationButtons();

}


/* =========================================
   9. TRANSLATE SENTENCE
========================================= */

function translateSentence() {

    if (!currentPassage) return;

    showingTranslation = !showingTranslation;

    displaySentence();

}


/* =========================================
   10. NEXT SENTENCE
========================================= */

function nextSentence() {

    if (!currentPassage) return;

    if (
        currentSentenceIndex <
        currentPassage.sentences.length - 1
    ) {

        currentSentenceIndex++;
        showingTranslation = false;

        displaySentence();

    }

}


/* =========================================
   11. PREVIOUS SENTENCE
========================================= */

function previousSentence() {

    if (!currentPassage) return;

    if (currentSentenceIndex > 0) {

        currentSentenceIndex--;
        showingTranslation = false;

        displaySentence();

    }

}


/* =========================================
   12. UPDATE EDGE NAVIGATION
========================================= */

function updateNavigationButtons() {

    const previousButton =
        document.getElementById(
            "previousSentenceButton"
        );

    const nextButton =
        document.getElementById(
            "nextSentenceButton"
        );

    if (!currentPassage) {

        previousButton.disabled = true;
        nextButton.disabled = true;

        return;

    }

    previousButton.disabled =
        currentSentenceIndex === 0;

    nextButton.disabled =
        currentSentenceIndex ===
        currentPassage.sentences.length - 1;

}


/* =========================================
   13. KEYBOARD TRANSLATION
========================================= */

function handleSentenceKeydown(event) {

    if (
        event.key === "Enter" ||
        event.key === " "
    ) {

        event.preventDefault();

        translateSentence();

    }

}


/* =========================================
   14. BUILD FULL PASSAGE
========================================= */

function displayFullPassage() {

    if (!currentPassage) return;

    const passageContainer =
        document.getElementById(
            "fullPassage"
        );

    passageContainer.innerHTML = "";

    currentPassage.sentences.forEach(
        (sentence, index) => {

            const span =
                document.createElement("span");

            span.className =
                "passageSentence";

            span.id =
                `sentence-${index}`;

            span.textContent =
                sentence.greek;

            passageContainer.appendChild(span);

            passageContainer.appendChild(
                document.createTextNode(" ")
            );

        }
    );

    highlightSentence();

}


/* =========================================
   15. HIGHLIGHT CURRENT SENTENCE
========================================= */

function highlightSentence() {

    const allSentences =
        document.querySelectorAll(
            ".passageSentence"
        );

    allSentences.forEach(
        (sentence, index) => {

            sentence.classList.toggle(
                "activeSentence",
                index === currentSentenceIndex
            );

        }
    );

}


/* =========================================
   16. START APPLICATION
========================================= */

loadPassages();
