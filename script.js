const categoryFiles = {
    "Math": "data/math.json",
    "Geography": "data/geography.json",
    "Computer Science": "data/compsci.json"
};

let bank = { categories: {} };
let currentCategory = null;
let questions = [];
let index = 0;
let score = 0;
let timePerQuestion = 20;
let timerInterval = null;
let timeLeft = 0;
let userAnswers = [];

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

async function loadCategory(cat){
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

        // Randomly select 5 questions
        const shuffled = shuffleArray(allQuestions);
        questions = shuffled.slice(0, 5);
    } catch(e) {
        console.error('Error loading category:', e);
        questions = [];
    }
}

async function startQuiz(){
    if(!currentCategory){ alert('No category selected'); return; }
    timePerQuestion = Math.max(5, parseInt($('#timeInput').val()||20,10));
    await loadCategory(currentCategory);
    if(questions.length === 0){ alert('No questions in this category'); return; }
    index = 0; score = 0; userAnswers = Array(questions.length).fill(null);

    $('#score').text(score);
    $('#qTotal').text(questions.length);
    $('#gameArea').removeClass('d-none');
    $('#resultArea').addClass('d-none');
    renderQuestion();
}

function renderQuestion(){
    clearTimer();
    const q = questions[index];
    $('#qIndex').text(index+1);
    $('#questionText').text(q.q);
    $('#options').empty();
    q.options.forEach(opt => {
        const $btn = $(`<button class="btn btn-outline-dark w-100 text-start mb-2 option">${opt}</button>`);
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
}

$('#themeSwitch').on('change', function(){
    if(this.checked){
        $('body').removeClass('bg-light text-dark').addClass('bg-dark text-light');
        $('.card').removeClass('bg-light').addClass('bg-secondary text-light');
    } else {
        $('body').removeClass('bg-dark text-light').addClass('bg-light text-dark');
        $('.card').removeClass('bg-secondary text-light').addClass('bg-light text-dark');
    }
});

$('#startBtn').on('click', function(){ currentCategory = $('#categorySelect').val(); startQuiz(); });
$('#nextBtn').on('click', nextQuestion);
$('#prevBtn').on('click', prevQuestion);
$('#restartBtn').on('click', function(){ $('#resultArea').addClass('d-none'); $('#gameArea').addClass('d-none'); $('#startBtn').focus(); });

$(function(){ populateCategories(); });
