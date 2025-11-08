const defaultBank = {
        "categories": {
            "Math": [
                { "q": "5 * 5 = ?", "options": ["10","15","20","25"], "answer": "25" },
                { "q": "Square root of 81?", "options": ["9","8","7","6"], "answer": "9" },
                { "q": "What is 14 % 5 ?", "options": ["3","4","1","2"], "answer": "4" }
            ],
            "Geography": [
                { "q": "Which continent is Brazil in?", "options": ["Asia","Europe","South America","Africa"], "answer": "South America" },
                { "q": "Mount Everest is in?", "options": ["Nepal","USA","Switzerland","China"], "answer": "Nepal" },
                { "q": "Which is the biggest ocean?", "options": ["Arctic","Pacific","Atlantic","Indian"], "answer": "Pacific" }
            ],
            "Computer Science": [
                { "q": "Time complexity of binary search?", "options": ["O(1)","O(N)","O(log N)","O(N log N)"], "answer": "O(log N)" },
                { "q": "Which is NOT an OOP principle?", "options": ["Encapsulation","Inheritance","Polymorphism","Composition"], "answer": "Composition" },
                { "q": "Which protocol is used for secure HTTP?", "options": ["SSH","SSL/TLS","FTP","SMTP"], "answer": "SSL/TLS" }
            ]
        }
    };

let bank = JSON.parse(JSON.stringify(defaultBank));
let currentCategory = null;
let questions = [];
let index = 0;
let score = 0;
let timePerQuestion = 20;
let timerInterval = null;
let timeLeft = 0;
let userAnswers = [];

function populateCategories(){
    const $sel = $('#categorySelect');
    $sel.empty();
    const categories = Object.keys(bank.categories || {});
    if(categories.length === 0){
        $sel.append('<option>No categories found</option>');
        return;
    }
    categories.forEach(c => $sel.append($('<option>').text(c).val(c)));
    currentCategory = categories[0];
}

function loadCategory(cat){
    currentCategory = cat;
    questions = (bank.categories && bank.categories[cat]) ? JSON.parse(JSON.stringify(bank.categories[cat])) : [];
    questions = questions.map(q => ({q: q.q||q.question||'', options: q.options||[], answer: q.answer||q.ans||q.correct||''}));
}

function startQuiz(){
    if(!currentCategory){ alert('No category selected'); return; }
    timePerQuestion = Math.max(5, parseInt($('#timeInput').val()||20,10));
    loadCategory(currentCategory);
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