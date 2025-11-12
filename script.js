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

async function startQuiz(){
    if(!currentCategory){ alert('No category selected'); return; }
    timePerQuestion = Math.max(5, parseInt($('#timeInput').val()||20,10));
    const questionAmount = Math.min(30, Math.max(5, parseInt($('#questionAmountInput').val()||5,10)));
    await loadCategory(currentCategory, questionAmount);
    if(questions.length === 0){ alert('No questions in this category'); return; }
    index = 0; score = 0; userAnswers = Array(questions.length).fill(null);

    $('#score').text(score);
    $('#qTotal').text(questions.length);
    $('#gameArea').removeClass('d-none');
    $('#resultArea').addClass('d-none');
    $('#themeSwitch').prop('disabled', true);
    $('#startBtn').prop('disabled', true);
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

    q.options.forEach(opt => {
        const $btn = $(`<button class="btn ${btnClass} w-100 text-start mb-2 option">${opt}</button>`);
        $btn.on('click', function(){ handleAnswer(opt, $(this)); });
        $('#options').append($btn);
    });
    $('#prevBtn').prop('disabled', index===0);
    $('#nextBtn').prop('disabled', index===questions.length);
    startTimer();
}

function handleAnswer(selected, $btn){
    if(userAnswers[index] !== null) return; // already answered
    userAnswers[index] = selected;
    const correct = questions[index].answer;
    if(selected === correct){ score++; $('#score').text(score); $btn.addClass('correct'); }
    else { $btn.addClass('wrong');
        $('#options .option').each(function(){ if($(this).text()===correct) $(this).addClass('correct'); });
    }
    clearTimer();
}

function startTimer(){
    timeLeft = timePerQuestion;
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

function finishQuiz(){
    clearTimer();
    $('#gameArea').addClass('d-none');
    $('#resultArea').removeClass('d-none');
    $('#finalScore').text(score);
    $('#answeredCount').text(userAnswers.filter(a=>a!==null).length);
    $('#totalCount').text(questions.length);
    $('#startBtn').prop('disabled', false);
    $('#themeSwitch').prop('disabled', false);
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

$(function(){
    // Load saved theme preference
    const savedTheme = localStorage.getItem('quizTheme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    $('#themeSwitch').prop('checked', savedTheme === 'dark');

    $('#prevBtn').on('click', prevQuestion);
    $('#nextBtn').on('click', nextQuestion);
    populateCategories();
});
