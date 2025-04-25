// Game configuration
const POINTS = {
  easy: 50,
  medium: 100,
  hard: 200,
  insane: 400,
  trap: 400
};

// Game state
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft = 20;
let quizStarted = false;
let difficultyStats = {
  easy: { correct: 0, total: 0 },
  medium: { correct: 0, total: 0 },
  hard: { correct: 0, total: 0 },
  insane: { correct: 0, total: 0 },
  trap: { correct: 0, total: 0 }
};

// DOM elements
const elements = {
  startScreen: document.getElementById('start-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  resultScreen: document.getElementById('result-screen'),
  questionText: document.getElementById('question-text'),
  optionButtons: document.querySelectorAll('.option-btn'),
  currentScore: document.getElementById('current-score'),
  currentQuestion: document.getElementById('current-question'),
  time: document.getElementById('time'),
  finalScore: document.getElementById('final-score'),
  ratingText: document.getElementById('rating-text'),
  roastText: document.getElementById('roast-text'),
  scoreDisplay: document.getElementById('score-display'),
  difficultyDisplay: document.getElementById('current-difficulty'),
  difficultyBreakdown: document.getElementById('difficulty-breakdown'),
  startButton: document.getElementById('start-btn'),
  retryButton: document.getElementById('retry-btn'),
  newQuizButton: document.getElementById('new-quiz-btn'),
  themeMusic: document.getElementById('theme-music'),
  correctSound: document.getElementById('correct-sound'),
  wrongSound: document.getElementById('wrong-sound')
};

// Event listeners
elements.startButton.addEventListener('click',() => { startQuiz(); }, {once:true});
elements.retryButton.addEventListener('click', retryQuiz);
elements.newQuizButton.addEventListener('click', newQuiz);

// Initialize the game
window.addEventListener('load', async () => {
  await loadQuestions();
  loadRecentScores();
});

// Main game functions
async function loadQuestions() {
  try {
    const response = await fetch('questions.txt');
    if (!response.ok) throw new Error('Failed to load questions');
    
    const text = await response.text();
    const lines = text.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//');
    });
    
    questions = lines.map(line => {
      const parts = line.split('|').map(part => part.trim());
      if (parts.length < 7) {
        console.error('Invalid question format:', line);
        return null;
      }
      
      const [difficulty, question, ...optionsAndAnswer] = parts;
      const options = optionsAndAnswer.slice(0, 4);
      const answer = parseInt(optionsAndAnswer[4]) - 1; 
      
      // 10% chance to display wrong difficulty (creating traps)
      const displayedDifficulty = Math.random() > 0.9 
        ? getRandomDisplayDifficulty(difficulty) 
        : difficulty;
      
      return {
        difficulty,
        question,
        options,
        answer,
        displayedDifficulty
      };
    }).filter(question => question !== null);
    
    if (questions.length === 0) {
      throw new Error('No valid questions found');
    }
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Failed to load questions. Using default questions instead.");
    questions = getDefaultQuestions();
  }
}

function getRandomDisplayDifficulty(actualDifficulty) {
  const difficulties = ['easy', 'medium', 'hard', 'insane'];
  let displayed = difficulties[Math.floor(Math.random() * difficulties.length)];
  
  // Ensure don't display the actual difficulty
  while (displayed === actualDifficulty) {
    displayed = difficulties[Math.floor(Math.random() * difficulties.length)];
  }
  
  // Trap
  return displayed === 'easy' && ['hard', 'insane'].includes(actualDifficulty) 
    ? 'trap' 
    : displayed;
}

function getDefaultQuestions() {
  return [
    // Easy
    { difficulty: 'easy', displayedDifficulty: 'easy', question: "What is 2+2?", options: ["3", "4", "5", "6"], answer: 1 },
    { difficulty: 'easy', displayedDifficulty: 'easy', question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], answer: 2 },
    
    // Medium
    { difficulty: 'medium', displayedDifficulty: 'medium', question: "What is 3 × 7 + 5?", options: ["26", "32", "21", "36"], answer: 0 },
    
    // Hard
    { difficulty: 'hard', displayedDifficulty: 'hard', question: "What is the square root of 144?", options: ["11", "12", "13", "14"], answer: 1 },
    
    // Insane
    { difficulty: 'insane', displayedDifficulty: 'insane', question: "What is the 7th prime number?", options: ["13", "17", "19", "23"], answer: 1 }
  ];
}

function startQuiz() {
  currentQuestionIndex = 0;
  score = 0;
  quizStarted = true;
  resetDifficultyStats();
  
  elements.themeMusic.currentTime = 0;
elements.themeMusic.play()
  .catch(e => console.log("Audio play failed:", e));
  // Shuffle questions and take first 15
  questions = shuffleArray(questions).slice(0, 30);
  
  // Update UI
  elements.startScreen.classList.remove('active');
  elements.quizScreen.classList.add('active');
  elements.resultScreen.classList.remove('active');
  elements.currentScore.textContent = score;
  elements.currentQuestion.textContent = currentQuestionIndex + 1;
  
  showQuestion();
}

function resetDifficultyStats() {
  difficultyStats = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
    insane: { correct: 0, total: 0 },
    trap: { correct: 0, total: 0 }
  };
}

function showQuestion() {
  if (currentQuestionIndex >= questions.length) {
    endQuiz();
    return;
  }
  
  resetOptionButtons();
  
  const question = questions[currentQuestionIndex];
  elements.questionText.textContent = question.question;
  
  // Update difficulty display
  updateDifficultyDisplay(question.displayedDifficulty);
  
  // Set options
  question.options.forEach((option, index) => {
    elements.optionButtons[index].textContent = option;
    elements.optionButtons[index].onclick = () => selectOption(index);
  });
  
  startTimer();
}

function resetOptionButtons() {
  elements.optionButtons.forEach(btn => {
    btn.style.backgroundColor = '';
    btn.disabled = false;
    btn.onclick = null;
  });
}

function updateDifficultyDisplay(difficulty) {
  elements.difficultyDisplay.textContent = difficulty;
  elements.difficultyDisplay.className = 'difficulty-display';
  elements.difficultyDisplay.classList.add(`difficulty-${difficulty}`);
}

function startTimer() {
  clearInterval(timer);
  timeLeft = 30;
  elements.time.textContent = timeLeft;
  
  timer = setInterval(() => {
    timeLeft--;
    elements.time.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      timeUp();
    }
  }, 1000);
}

function selectOption(selectedIndex) {
  clearInterval(timer);
  
  const question = questions[currentQuestionIndex];
  const isCorrect = selectedIndex === question.answer;
  const actualDiff = getActualDifficulty(question);
  
  // Update statistics
  updateStats(actualDiff, isCorrect);
  
  // Update score if correct
  if (isCorrect) {
    elements.correctSound.currentTime = 0;
    elements.correctSound.play();
    score += POINTS[actualDiff];
    elements.currentScore.textContent = score;
  } else {
    elements.wrongSound.currentTime = 0;
elements.wrongSound.play();
  }
  
  // Highlight answers
  highlightAnswers(selectedIndex, question);
  
  // Move to next question after delay
  setTimeout(nextQuestion, 1500);
}

function getActualDifficulty(question) {
  // Handle trap questions (displayed as easy but actually hard)
  if (question.displayedDifficulty === 'easy' && ['hard', 'insane'].includes(question.difficulty)) {
    return 'trap';
  }
  return question.difficulty;
}

function updateStats(difficulty, isCorrect) {
  difficultyStats[difficulty].total++;
  if (isCorrect) {
    difficultyStats[difficulty].correct++;
  }
}

function highlightAnswers(selectedIndex, question) {
  elements.optionButtons.forEach((btn, index) => {
    btn.disabled = true;
    
    if (index === question.answer) {
      btn.style.backgroundColor = '#4caf50'; // Green for correct answer
    } else if (index === selectedIndex && index !== question.answer) {
      btn.style.backgroundColor = '#f44336'; // Red for wrong selected answer
    }
  });
}

function nextQuestion() {
  currentQuestionIndex++;
  elements.currentQuestion.textContent = currentQuestionIndex + 1;
  showQuestion();
}

function timeUp() {
  // Count as incorrect answer
  const question = questions[currentQuestionIndex];
  const actualDiff = getActualDifficulty(question);
  updateStats(actualDiff, false);
  
  // Highlight correct answer
  highlightAnswers(-1, question);
  
  // Move to next question after delay
  setTimeout(nextQuestion, 1500);
}

function endQuiz() {
  const totalPossible = calculateTotalPossiblePoints();
  const percentage = (score / totalPossible) * 100;
  
  elements.themeMusic.pause();
  
  setRatingAndRoast(percentage);
  showDifficultyBreakdown();
  saveScore(score, percentage);
  
  // Show result screen
  elements.quizScreen.classList.remove('active');
  elements.resultScreen.classList.add('active');
  elements.finalScore.textContent = score;
}

function calculateTotalPossiblePoints() {
  return questions.reduce((sum, q) => {
    const diff = q.difficulty === 'trap' ? 'hard' : q.difficulty;
    return sum + POINTS[diff];
  }, 0);
}

function setRatingAndRoast(percentage) {
  let rating, roast;
  
  // Roast options 
  const roastOptions90To95 = [
    "You know, I thought cheating would be more obvious, but you're making it subtle. Too subtle... almost impressive.",
    "Well, congratulations on your score, but I’m gonna need you to explain how you're managing to cheat so efficiently.",
    "You're either a genius, or your calculator is doing the work. Either way, I'm not impressed.",
    "Hmm, a 93? I think you’re playing the system. Nice job, but we’re onto you.",
    "Did you just cheat, or were you born this good at pretending? Can’t tell anymore."
  ];
  
  const roastOptions96To98 = [
    "96%? Are you *sure* you’re not secretly an AI? Not even humans are this perfect, right?",
    "You’re way too perfect. Do you have a secret cheat code, or are you just really good at manipulating the system?",
    "Nice score, but I can’t shake the feeling that you’re playing with fire. Too good to be true, buddy.",
    "You’re like a robot pretending to be human, and frankly, it’s getting creepy.",
    "I’m convinced you’ve cracked the system. If it weren’t for that nagging feeling that you’re definitely cheating, I’d applaud."
  ];
  
  const roastOptions99 = [
    "99%? Are you even trying to pretend you didn’t cheat? Well, you got a 99%. So... good job, I guess?",
    "You’re only *one* point away from perfection, but I’m betting you cheated just to make sure you didn’t fail.",
    "A 99%? Almost perfect. But you know what? I don’t believe you. You’re still a fraud in my eyes.",
    "99%? Ha, you suck. But it’s almost like you *tried* to cheat and still couldn’t make it perfect. Pathetic.",
    "You got a 99%? Well, congratulations, I guess you can cheat *almost* perfectly. Too bad you couldn’t make it flawless."
  ];
  
  const roastOptions100 = [
    "100%? Of course. You’re either a robot, Google AI, or just so good at cheating that you deserve an award for it.",
    "Perfect score, huh? Well, congratulations, Google’s AI team would like to know your secret.",
    "100%? Wait, let me guess, you cheated your way to the top. Oh, and you’re also ChatGPT, aren’t you?",
    "You know what? Forget it. 100%. You either broke the system, or you *are* the system. Either way, you’ve lost all credibility.",
    "A 100%? Sure, because no one gets that perfect without a little help from *someone*... or something."
  ];
  
  const roastOptions50To75 = [
    "Hmm, it’s like you tried. Not hard enough, but you *tried*. That’s gotta count for something, right?",
    "You’re a solid average... just like every other person in the world. Congratulations on being basic.",
    "You didn’t fail. You didn’t succeed. You just... exist. Nice job being completely forgettable.",
    "You’re in the middle, which is the perfect spot for mediocrity. Don’t worry, at least you didn’t embarrass yourself.",
    "I mean, you could’ve done worse. But honestly, we’re just glad you didn’t outright fail."
  ];
  
  const roastOptionsBelow50 = [
    "Did you even try? I’m convinced you just clicked random answers to get it over with.",
    "Your score is so low, it’s like your brain took a vacation. Did it rain while you were gone?",
    "A goldfish has better decision-making skills than this. Did you forget how to think?",
    "I think you’re eligible for a brain scan. Please seek medical attention immediately.",
    "This score screams ‘congestive impairment.’ Have you been drinking brain juice or just letting it rot?",
    "You know, when brains were raining, you must’ve been under a cloud of *nothing*."
  ];
  
  // Randomly select a roast based on percentage range
  if (percentage >= 90) {
    rating = "GENIUS OR CHEATER?";
    roast = roastOptions90To95[Math.floor(Math.random() * roastOptions90To95.length)];
  } else if (percentage >= 96) {
    rating = "CHEATER OR LEGEND?";
    roast = roastOptions96To98[Math.floor(Math.random() * roastOptions96To98.length)];
  } else if (percentage >= 99) {
    rating = "ALMOST PERFECT... BUT YOU STILL SUCK";
    roast = roastOptions99[Math.floor(Math.random() * roastOptions99.length)];
  } else if (percentage === 100) {
    rating = "CONGRATULATIONS, YOU'RE A MACHINE";
    roast = roastOptions100[Math.floor(Math.random() * roastOptions100.length)];
  } else if (percentage >= 50) {
    rating = "AVERAGE THINKER";
    roast = roastOptions50To75[Math.floor(Math.random() * roastOptions50To75.length)];
  } else {
    rating = "BRAIN DAMAGE";
    roast = roastOptionsBelow50[Math.floor(Math.random() * roastOptionsBelow50.length)];
  }
  
  // Set the rating and roast text content
  elements.ratingText.textContent = rating;
  elements.roastText.textContent = roast;
}

function showDifficultyBreakdown() {
  let html = '<h3>Difficulty Breakdown:</h3>';
  
  for (const [diff, stats] of Object.entries(difficultyStats)) {
    if (stats.total > 0) {
      const percentage = Math.round((stats.correct / stats.total) * 100);
      html += `<p>${diff.toUpperCase()}: ${stats.correct}/${stats.total} (${percentage}%)</p>`;
    }
  }
  
  elements.difficultyBreakdown.innerHTML = html;
}

function saveScore(score, percentage) {
  const scoreEntry = document.createElement('p');
  scoreEntry.textContent = `Score: ${score} (${Math.round(percentage)}%) - ${new Date().toLocaleString()}`;
  elements.scoreDisplay.prepend(scoreEntry);
  
  // Keep only the last 5 scores
  const allScores = elements.scoreDisplay.querySelectorAll('p');
  if (allScores.length > 5) {
    elements.scoreDisplay.removeChild(allScores[allScores.length - 1]);
  }
}

function loadRecentScores() {
  elements.scoreDisplay.innerHTML = "<p>Your scores will appear here after completion</p>";
}

function retryQuiz() {
  startQuiz();
}

function newQuiz() {
  elements.startScreen.classList.add('active');
  elements.resultScreen.classList.remove('active');
  loadRecentScores();
}

// Utility functions
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
