const categoryFiles = {
    "Math": "data/math.json",
    "Geography": "data/geography.json",
    "Computer Science": "data/compsci.json"
};

let currentCategory = null;
let questions = [];
let index = 0;
let score = 0;
let timePerQuestion = 20;
let timerInterval = null;
let timeLeft = 0;
let userAnswers = [];
let isTransitioning = false;
let gameMode = null; // 'sudden-death', 'mix', 'reverse', null for normal
let chaosOptionEnabled = false; // pluggable option: random per-question timer
let fiftyFiftyUsed = false;
let reverseQuestions = []; // Store original questions for reverse mode
const gameOverSound = new Audio('sounds/game_over.mp3');
const peakSound = new Audio('sounds/slotmachine.mp3');
const goodSound = new Audio('sounds/baby-laugh-slow.mp3');


function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function populateCategories(){
    const $sel = $('#categorySelect');
    $sel.empty();
    const categories = Object.keys(categoryFiles);
    if(categories.length === 0){
        $sel.append('<option>No categories found</option>');
        return;
    }
    categories.forEach(c => $sel.append($('<option>').text(c).val(c)));
    currentCategory = categories[0];
}

async function loadCategory(cat, questionAmount){
    currentCategory = cat;
    const filePath = categoryFiles[cat];
    if(!filePath){
        questions = [];
        return;
    }
    try {
        const response = await fetch(filePath);
        const data = await response.json();
        let allQuestions = data.questions ? data.questions : [];
        allQuestions = allQuestions.map(q => ({q: q.q||q.question||'', options: q.options||[], answer: q.answer||q.ans||q.correct||''}));

        // If question amount equals total available, don't shuffle
        if(questionAmount >= allQuestions.length){
            questions = allQuestions;
        } else {
            // Randomly select the specified amount
            const shuffled = shuffleArray(allQuestions);
            questions = shuffled.slice(0, questionAmount);
        }
    } catch(e) {
        console.error('Error loading category:', e);
        questions = [];
    }
}

async function loadMix(questionAmount){
    try {
        let all = [];
        // Load all categories
        for(const cat in categoryFiles){
            const response = await fetch(categoryFiles[cat]);
            const data = await response.json();
            let catQuestions = data.questions ? data.questions : [];
            catQuestions = catQuestions.map(q => ({
                q: q.q||q.question||'',
                options: q.options||[],
                answer: q.answer||q.ans||q.correct||'',
                category: cat // Tag with category name
            }));
            all = all.concat(catQuestions);
        }

        // Shuffle and pick random questions from the pool
        const shuffled = shuffleArray(all);
        questions = shuffled.slice(0, Math.min(questionAmount, shuffled.length));
    } catch(e) {
        console.error('Error loading mix:', e);
        questions = [];
    }
}

function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function prepareReverseQuiz(){
    // Transform questions: answer becomes the "question", question becomes the "answer"
    // Generate fake questions from other items as wrong options
    reverseQuestions = [];

    for(let i = 0; i < questions.length; i++){
        const original = questions[i];

        // The correct answer is now the original question
        const correctAnswer = original.q;

        // Gather other questions as wrong options
        const otherQuestions = questions
            .filter((_, idx) => idx !== i)
            .map(q => q.q);

        // Shuffle and pick 3 random wrong options
        const shuffledWrong = shuffleArray(otherQuestions);
        const wrongOptions = shuffledWrong.slice(0, 3);

        // Combine correct + wrong, shuffle them
        const allOptions = shuffleArray([correctAnswer, ...wrongOptions]);

        // Create reversed question object
        reverseQuestions.push({
            q: `Which question has this answer: "${original.answer}"?`,
            options: allOptions,
            answer: correctAnswer,
            originalAnswer: original.answer // Keep for display
        });
    }

    // Replace questions array with reverse questions
    questions = reverseQuestions;
}

async function startQuiz(){
    timePerQuestion = Math.max(5, parseInt($('#timeInput').val()||20,10));
    const questionAmount = Math.min(30, Math.max(5, parseInt($('#questionAmountInput').val()||5,10)));

    // Load questions based on mode
    if(gameMode === 'mix' || gameMode === 'reverse'){
        await loadMix(questionAmount);
    } else {
        if(!currentCategory){ alert('No category selected'); return; }
        await loadCategory(currentCategory, questionAmount);
    }

    if(questions.length === 0){ alert('No questions available'); return; }

    // If reverse mode, transform questions
    if(gameMode === 'reverse'){
        prepareReverseQuiz();
    }

    index = 0;
    score = 0;
    userAnswers = Array(questions.length).fill(null);
    fiftyFiftyUsed = false;

    $('#score').text(score);
    $('#qTotal').text(questions.length);
    $('#gameArea').removeClass('d-none');
    $('#resultArea').addClass('d-none');
    $('#themeSwitch').prop('disabled', true);
    $('#startBtn').prop('disabled', true);

    // Always show 50/50 lifeline button during quiz
    $('#fiftyFiftyUseBtn').removeClass('d-none').prop('disabled', false).text('🎯 Use 50/50');

    renderQuestion();
}

function renderQuestion(){
    clearTimer();
    isTransitioning = false;
    const q = questions[index];
    $('#qIndex').text(index+1);
    $('#questionText').text(q.q);
    $('#options').empty();

    // Check current theme
    const isDarkTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const btnClass = isDarkTheme ? 'btn-outline-light' : 'btn-outline-dark';

    // Shuffle answer options so they don't appear in the same order as JSON
    const shuffledOptions = shuffleArray(q.options);

    shuffledOptions.forEach(opt => {
        const $btn = $(`<button class="btn ${btnClass} w-100 text-start mb-2 option">${opt}</button>`);
        $btn.on('click', function(){ handleAnswer(opt, $(this)); });
        $('#options').append($btn);
    });
    $('#prevBtn').prop('disabled', index===0);
    $('#nextBtn').prop('disabled', index===questions.length);

    // Update 50/50 button state
    if(fiftyFiftyUsed || userAnswers[index] !== null){
        $('#fiftyFiftyUseBtn').prop('disabled', true);
    } else {
        $('#fiftyFiftyUseBtn').prop('disabled', false);
    }

    startTimer();
}

function handleAnswer(selected, $btn){
    if(userAnswers[index] !== null) return; // already answered
    userAnswers[index] = selected;
    const correct = questions[index].answer;
    if(selected === correct){
        score++;
        $('#score').text(score);
        $btn.addClass('correct');
    } else {
        $btn.addClass('wrong');
        $('#options .option').each(function(){ if($(this).text()===correct) $(this).addClass('correct'); });

        // Sudden Death: Game Over on wrong answer
        if(gameMode === 'sudden-death'){
            clearTimer();
            triggerGameOver();
            return;
        }
    }
    clearTimer();
}

function startTimer(){
    // If chaos option is enabled, pick a random per-question time between 5 and the selected max
    const effectiveTime = chaosOptionEnabled ? randomInt(5, timePerQuestion) : timePerQuestion;
    timeLeft = effectiveTime;
    $('#timer').text(timeLeft+'s');
    timerInterval = setInterval(() => {
        timeLeft--; $('#timer').text(timeLeft+'s');
        if(timeLeft <= 0){
            clearTimer();
            isTransitioning = true;
            if(userAnswers[index] === null){ userAnswers[index] = null; /* explicit */ }
            $('#options .option').each(function(){ if($(this).text()===questions[index].answer) $(this).addClass('correct'); });
            setTimeout(() => { if(index < questions.length-1) { index++; renderQuestion(); } else { finishQuiz(); } }, 800);
        }
    }, 1000);
}

function clearTimer(){
    if(timerInterval){
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function nextQuestion(){
    if(index < questions.length-1){ index++; renderQuestion(); }
    else finishQuiz();
}

function prevQuestion(){
    if(index > 0){
        index--;
        renderQuestion();
    }
}

function use50_50(){
    if(fiftyFiftyUsed || userAnswers[index] !== null) return;

    const q = questions[index];
    const correctAnswer = q.answer;
    const wrongOptions = q.options.filter(opt => opt !== correctAnswer);

    // Randomly pick 2 wrong options to remove
    const shuffled = shuffleArray(wrongOptions);
    const toRemove = shuffled.slice(0, Math.min(2, wrongOptions.length));

    // Remove the wrong options from the UI
    $('#options .option').each(function(){
        const optText = $(this).text();
        if(toRemove.includes(optText)){
            $(this).fadeOut(300, function(){
                $(this).remove();
            });
        }
    });

    fiftyFiftyUsed = true;
    $('#fiftyFiftyUseBtn').prop('disabled', true).text('🎯 Used!');
}

function triggerGameOver(){
    // Play game over sound
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(e => console.log('Audio play failed:', e));

    // Add shake effect to game area
    $('#gameArea').addClass('game-over-shake');

    // Wait for animation then show results
    setTimeout(() => {
        $('#gameArea').removeClass('game-over-shake');
        finishQuiz();
    }, 1000);
}

function finishQuiz(){
    clearTimer();
    $('#gameArea').addClass('d-none');
    $('#resultArea').removeClass('d-none');
    $('#finalScore').text(score);
    $('#answeredCount').text(userAnswers.filter(a=>a!==null).length);
    $('#totalCount').text(questions.length);

    // Calculate rank
    const percentage = (score / questions.length) * 100;
    let rankText = '';
    let rankImage = '';

    if(percentage >= 90){
        rankText = 'PEAK';
        rankImage = 'images/peak.png';
        peakSound.currentTime = 0;
        peakSound.play().catch(e => console.log('Audio play failed:', e));
    } else if(percentage >= 50){
        rankText = 'Good';
        rankImage = 'images/good.png';
        goodSound.currentTime = 0;
        goodSound.play().catch(e => console.log('Audio play failed:', e));
    } else {
        rankText = 'Did you even try?';
        rankImage = 'images/uhm.png';
        // Reset and play game over sound
        try {
            gameOverSound.pause();
            gameOverSound.currentTime = 0;
            gameOverSound.play().catch(e => console.error('Game over sound play failed:', e));
        } catch(e) {
            console.error('Game over sound error:', e);
        }
    }

    $('#rankText').text(rankText);
    $('#rankImage').attr('src', rankImage);

    $('#startBtn').prop('disabled', false);
    $('#themeSwitch').prop('disabled', false);
    gameMode = null; // Reset game mode
    $('[data-mode]').removeClass('mode-active');
    refreshModeDescription();
}

function refreshModeDescription(){
    const parts = [];
    if(gameMode === 'sudden-death') parts.push('<strong>Sudden Death</strong> (one wrong answer ends the game)');
    if(gameMode === 'mix') parts.push('<strong>Mix Mode</strong> (questions from all categories)');
    if(gameMode === 'reverse') parts.push('<strong>Reverse Quiz</strong> (see answer, pick question)');
    if(chaosOptionEnabled) parts.push('<strong>Chaos Timer</strong> (random 5–'+timePerQuestion+'s)');
    $('#modeDescription').html(parts.length ? parts.join(' + ') : 'Select a game mode or play normally');
}

$('#themeSwitch').on('change', function(){
    const theme = this.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem('quizTheme', theme);
});

$('#startBtn').on('click', function(){
    currentCategory = $('#categorySelect').val();
    startQuiz();
});

$('#restartBtn').on('click', function(){
    $('#resultArea').addClass('d-none');
    $('#gameArea').addClass('d-none');
    $('#startBtn').focus();
});

$(document).on('keydown', function(e){
    // Prevent space/enter from triggering buttons when in game area
    if(!$('#gameArea').hasClass('d-none')){
        if(e.keyCode === 32 || e.keyCode === 13){
            // Only allow if question is answered and not transitioning
            if(userAnswers[index] !== null && timerInterval === null && !isTransitioning){
                e.preventDefault();
                nextQuestion();
            } else {
                // Prevent default button behavior
                e.preventDefault();
            }
        }
    }
});

// Game mode button handlers
$('[data-mode]').on('click', function(){
    const mode = $(this).data('mode');

    if(gameMode === mode){
        // Deselect if clicking the same mode
        gameMode = null;
        $(this).removeClass('mode-active');
    } else {
        // Select new mode
        gameMode = mode;
        $('[data-mode]').removeClass('mode-active');
        $(this).addClass('mode-active');
    }
    refreshModeDescription();
});

$('[data-option="chaos"]').on('click', function(){
    chaosOptionEnabled = !chaosOptionEnabled;
    $(this).toggleClass('mode-active', chaosOptionEnabled);
    refreshModeDescription();
});

$(function(){
    // Load saved theme preference
    const savedTheme = localStorage.getItem('quizTheme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    $('#themeSwitch').prop('checked', savedTheme === 'dark');

    $('#prevBtn').on('click', prevQuestion);
    $('#nextBtn').on('click', nextQuestion);
    $('#fiftyFiftyUseBtn').on('click', use50_50);
    populateCategories();
    refreshModeDescription();
});
