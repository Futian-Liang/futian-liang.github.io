// =============================================
// 乘法口诀表 · 互动练习 — 主逻辑
// =============================================

// =============================================
// 1. DATA LAYER
// =============================================
const TABLE_SIZE = 9;
let TABLE = [];

function generateTable() {
  TABLE = [];
  for (let i = 0; i < TABLE_SIZE; i++) {
    const row = [];
    for (let j = 0; j < TABLE_SIZE; j++) {
      const a = i + 1, b = j + 1;
      const product = a * b;
      row.push({
        row: i, col: j, a, b, product,
        expr: Math.min(a, b) + '\u00d7' + Math.max(a, b),
        ones: product % 10,
        tens: Math.floor(product / 10),
        inLowerTriangle: i >= j
      });
    }
    TABLE.push(row);
  }
  return TABLE;
}

function getCell(row, col) { return TABLE[row] && TABLE[row][col]; }

function getCol(n) {
  const cells = [];
  for (let i = 0; i < TABLE_SIZE; i++) cells.push(TABLE[i][n - 1]);
  return cells;
}

function filterByOnesDigit(d) {
  const cells = [];
  for (let i = 0; i < TABLE_SIZE; i++)
    for (let j = 0; j < TABLE_SIZE; j++)
      if (TABLE[i][j].ones === d) cells.push(TABLE[i][j]);
  return cells;
}

function filterByTensDigit(t) {
  const cells = [];
  for (let i = 0; i < TABLE_SIZE; i++)
    for (let j = 0; j < TABLE_SIZE; j++)
      if (TABLE[i][j].tens === t) cells.push(TABLE[i][j]);
  return cells;
}

function getOnesDigitSequence(colIdx) {
  return getCol(colIdx + 1).map(c => c.ones);
}

function getTensDigitSequence(colIdx) {
  return getCol(colIdx + 1).map(c => c.tens);
}

function getHeatmapColor(product) {
  const hue = 240 - (product / 81) * 240;
  const sat = 55 + (product / 81) * 25;
  const lit = 80 - (product / 81) * 20;
  return 'hsl(' + hue + ', ' + sat + '%, ' + lit + '%)';
}

function getValueLabel(type, val) {
  if (type === 'T1' || type === 'T4' || type === 'T5') return val;
  if (type === 'T2') return '个位=' + val;
  if (type === 'T3') return '十位=' + val;
  return val;
}

function setTheme(type) {
  var themes = {T1:'#6366F1',T2:'#F59E0B',T3:'#3B82F6',T4:'#F59E0B',T5:'#3B82F6'};
  var rgbs = {T1:'99,102,241',T2:'245,158,11',T3:'59,130,246',T4:'245,158,11',T5:'59,130,246'};
  var root = document.documentElement;
  root.style.setProperty('--theme', themes[type] || '#6366F1');
  root.style.setProperty('--theme-rgb', rgbs[type] || '99,102,241');
}

function getDifficultyMax() {
  if (S.difficulty === 'easy') return 5;
  if (S.difficulty === 'medium') return 7;
  return 9;
}

function setDifficulty(level) {
  S.difficulty = level;
  document.querySelectorAll('.diff-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.diff === level);
  });
  updateDifficultyHighlight();
  if (S.question && S.isAnswering) {
    resetSession();
    showPracticeSelector();
  }
  saveSettings();
}

function updateDifficultyHighlight() {
  var maxVal = getDifficultyMax();
  if (maxVal >= 9) {
    document.querySelectorAll('.cell, .col-header, .row-header').forEach(function(el) {
      el.classList.remove('cell-out-of-range', 'header-out-of-range');
    });
    return;
  }
  document.querySelectorAll('.cell').forEach(function(el) {
    var r = parseInt(el.dataset.row) + 1;
    var c = parseInt(el.dataset.col) + 1;
    if (r > maxVal || c > maxVal) {
      el.classList.add('cell-out-of-range');
    } else {
      el.classList.remove('cell-out-of-range');
    }
  });
  document.querySelectorAll('.col-header, .row-header').forEach(function(el) {
    var v = parseInt(el.textContent);
    if (v > maxVal) {
      el.classList.add('header-out-of-range');
    } else {
      el.classList.remove('header-out-of-range');
    }
  });
}

// =============================================
// 2. STATE
// =============================================
const S = {
  mode: 'practice',          // 'test' | 'practice'
  qType: 'T2',
  question: null,
  selectedCells: new Set(),
  pendingCells: new Set(),
  wrongCount: 0,
  missedCount: 0,
  currentPos: 0,
  questionIndex: 0,
  questions: [],
  stats: { correct: 0, wrong: 0, missed: 0, total: 0 },
  timerSeconds: 0,
  timer: null,
  hintLevel: 0,
  isAnswering: false,
  testConfig: { n: 1, types: ['T1','T2','T3','T4','T5'] },
  isFinished: false,
  lowerTriangleOnly: true,
  difficulty: 'hard',
  streak: 0,
  bestStreak: 0,
  testHistory: [],
  reviewIndex: 0,
  darkMode: 'auto'
};

// =============================================
// 3. VIEW LAYER — Rendering
// =============================================
function renderTable() {
  const container = document.getElementById('table-container');
  container.innerHTML = '';

  // Corner
  const corner = document.createElement('div');
  corner.className = 'corner';
  container.appendChild(corner);

  // Column headers
  for (let j = 0; j < TABLE_SIZE; j++) {
    const h = document.createElement('div');
    h.className = 'col-header';
    h.textContent = j + 1;
    container.appendChild(h);
  }

  // Rows
  for (let i = 0; i < TABLE_SIZE; i++) {
    // Row header
    const rh = document.createElement('div');
    rh.className = 'row-header';
    rh.textContent = i + 1;
    container.appendChild(rh);

    // Cells
    for (let j = 0; j < TABLE_SIZE; j++) {
      const cell = TABLE[i][j];
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.row = i;
      div.dataset.col = j;
      div.style.background = getHeatmapColor(cell.product);

      // Product digits split
      const prod = document.createElement('div');
      prod.className = 'product';

      const tensSpan = document.createElement('span');
      tensSpan.className = 'digit-tens';
      if (cell.tens === 0) {
        tensSpan.textContent = '0';
        tensSpan.classList.add('zero');
      } else {
        tensSpan.textContent = cell.tens;
      }

      const onesSpan = document.createElement('span');
      onesSpan.className = 'digit-ones';
      onesSpan.textContent = cell.ones;

      prod.appendChild(tensSpan);
      prod.appendChild(onesSpan);
      div.appendChild(prod);

      // Expression
      const expr = document.createElement('div');
      expr.className = 'expr';
      expr.textContent = cell.expr;
      div.appendChild(expr);

      // Click handler
      div.addEventListener('click', function() {
        handleCellClick(parseInt(this.dataset.row), parseInt(this.dataset.col));
      });
      // Hover for cross highlight
      div.addEventListener('mouseenter', function() {
        setCrossHighlight(parseInt(this.dataset.row), parseInt(this.dataset.col));
      });
      div.addEventListener('mouseleave', function() {
        clearCrossHighlight();
      });

      container.appendChild(div);
    }
  }
}

function getCellEl(row, col) {
  return document.querySelector('.cell[data-row="' + row + '"][data-col="' + col + '"]');
}

function setCellState(row, col, state) {
  const el = getCellEl(row, col);
  if (!el) return;
  // Remove all state classes
  el.classList.remove('cell-target','cell-selected','cell-pending','cell-correct','cell-wrong',
                       'cell-wrong-click','cell-current','cell-hint');
  if (state) el.classList.add('cell-' + state);
}

function clearAllStates() {
  document.querySelectorAll('.cell').forEach(function(el) {
    el.classList.remove('cell-target','cell-selected','cell-correct','cell-wrong',
                         'cell-wrong-click','cell-current','cell-pending','cell-missed','cell-hint','cell-cross');
  });
}

function setCrossHighlight(row, col) {
  document.querySelectorAll('.cell').forEach(function(el) {
    const r = parseInt(el.dataset.row);
    const c = parseInt(el.dataset.col);
    if (r === row || c === col) el.classList.add('cell-cross');
  });
}

function clearCrossHighlight() {
  document.querySelectorAll('.cell').forEach(function(el) {
    el.classList.remove('cell-cross');
  });
}

function enableOnesHighlight() {
  document.querySelectorAll('.cell').forEach(function(el) {
    const ones = el.querySelector('.digit-ones');
    const tens = el.querySelector('.digit-tens');
    if (ones) ones.classList.add('hl-ones');
    if (tens) tens.classList.remove('hl-tens');
    if (tens && !tens.classList.contains('zero')) tens.classList.add('dim');
  });
}

function enableTensHighlight() {
  document.querySelectorAll('.cell').forEach(function(el) {
    const ones = el.querySelector('.digit-ones');
    const tens = el.querySelector('.digit-tens');
    if (tens) tens.classList.add('hl-tens');
    if (ones) ones.classList.remove('hl-ones');
  });
}

function disableDigitHighlight() {
  document.querySelectorAll('.cell').forEach(function(el) {
    const ones = el.querySelector('.digit-ones');
    const tens = el.querySelector('.digit-tens');
    if (ones) { ones.classList.remove('hl-ones'); ones.classList.remove('dim'); }
    if (tens) { tens.classList.remove('hl-tens'); tens.classList.remove('dim'); }
  });
}

function toggleTriangleHighlight(show) {
  document.querySelectorAll('.cell').forEach(function(el) {
    const r = parseInt(el.dataset.row);
    const c = parseInt(el.dataset.col);
    if (show && r < c) {
      el.classList.add('cell-upper-triangle');
    } else {
      el.classList.remove('cell-upper-triangle');
    }
  });
}

// =============================================
// 4. QUESTION SYSTEM
// =============================================
function getAllQuestions(type) {
  var qs = [];
  var maxVal = getDifficultyMax();
  if (type === 'T1') {
    for (var x = 1; x <= maxVal; x++) qs.push({ type: 'T1', value: x });
  } else if (type === 'T2') {
    for (var d = 0; d <= 9; d++) qs.push({ type: 'T2', value: d });
  } else if (type === 'T3') {
    for (var t = 0; t <= 8; t++) qs.push({ type: 'T3', value: t });
  } else if (type === 'T4') {
    for (var x4 = 1; x4 <= maxVal; x4++) qs.push({ type: 'T4', value: x4 });
  } else if (type === 'T5') {
    for (var x5 = 1; x5 <= maxVal; x5++) qs.push({ type: 'T5', value: x5 });
  }
  return qs;
}

function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function generateQuestion(type, value) {
  var q = { type: type, value: value };
  if (type === 'T1') {
    var col = getCol(value);
    var row = TABLE[value - 1];
    var seen = {};
    var merged = [];
    for (var ci = 0; ci < col.length; ci++) {
      var c = col[ci], k = c.row + '-' + c.col;
      if (!seen[k]) { seen[k] = true; merged.push(c); }
    }
    for (var ri = 0; ri < row.length; ri++) {
      var r = row[ri], k2 = r.row + '-' + r.col;
      if (!seen[k2]) { seen[k2] = true; merged.push(r); }
    }
    var mergedCells = merged;
    if (S.lowerTriangleOnly) {
      mergedCells = merged.filter(function(c) { return c.row >= c.col; });
    }
    q.answerCount = mergedCells.length;
    q.targetCells = mergedCells;
    var desc = '请找出含因数 ' + value + ' 的所有乘法口诀';
    q.description = desc;
    var hint = '请在表格中找出含因数 ' + value + ' 的所有口诀格子';
    q.hint = hint;
  } else if (type === 'T2') {
    q.targetCells = filterByOnesDigit(value);
    if (S.lowerTriangleOnly) {
      q.targetCells = q.targetCells.filter(function(c) { return c.row >= c.col; });
    }
    var maxVal2 = getDifficultyMax();
    if (maxVal2 < 9) {
      q.targetCells = q.targetCells.filter(function(c) { return c.a <= maxVal2 && c.b <= maxVal2; });
    }
    q.answerCount = q.targetCells.length;
    q.description = '\u8bf7\u627e\u51fa\u6240\u6709\u7ed3\u679c\u4e2a\u4f4d\u6570\u4e3a ' + value + ' \u7684\u4e58\u6cd5\u53e3\u8bc0';
    q.hint = '\u8bf7\u70b9\u51fb\u4e2a\u4f4d\u6570\u4e3a ' + value + ' \u7684\u53e3\u8bc0\u683c\u5b50';
  } else if (type === 'T3') {
    q.targetCells = filterByTensDigit(value);
    if (S.lowerTriangleOnly) {
      q.targetCells = q.targetCells.filter(function(c) { return c.row >= c.col; });
    }
    var maxVal3 = getDifficultyMax();
    if (maxVal3 < 9) {
      q.targetCells = q.targetCells.filter(function(c) { return c.a <= maxVal3 && c.b <= maxVal3; });
    }
    q.answerCount = q.targetCells.length;
    q.description = '\u8bf7\u627e\u51fa\u6240\u6709\u7ed3\u679c\u5341\u4f4d\u6570\u4e3a ' + value + ' \u7684\u4e58\u6cd5\u53e3\u8bc0';
    q.hint = '\u8bf7\u70b9\u51fb\u5341\u4f4d\u6570\u4e3a ' + value + ' \u7684\u53e3\u8bc0\u683c\u5b50';
  } else if (type === 'T4') {
    var fullSeq = getOnesDigitSequence(value - 1);
    var maxVal4 = getDifficultyMax();
    if (S.lowerTriangleOnly) {
      q.sequence = fullSeq.filter(function(d, i) { return i >= value - 1 && i < maxVal4; });
      q.length = q.sequence.length;
    } else {
      q.sequence = fullSeq.filter(function(d, i) { return i < maxVal4; });
      q.length = q.sequence.length;
    }
    q.description = '\u8bf7\u6309\u987a\u5e8f\u8bf4\u51fa ' + value + ' \u7684\u53e3\u8bc0\u8868\u7684\u4e2a\u4f4d\u6570';
    q.hint = '\u8bf7\u5728\u6570\u5b57\u9762\u677f\u4e0a\u6309\u987a\u5e8f\u70b9\u51fb\u6bcf\u4e2a\u4e2a\u4f4d\u6570';
  } else if (type === 'T5') {
    var fullSeq2 = getTensDigitSequence(value - 1);
    var maxVal5 = getDifficultyMax();
    if (S.lowerTriangleOnly) {
      q.sequence = fullSeq2.filter(function(d, i) { return i >= value - 1 && i < maxVal5; });
      q.length = q.sequence.length;
    } else {
      q.sequence = fullSeq2.filter(function(d, i) { return i < maxVal5; });
      q.length = q.sequence.length;
    }
    q.description = '\u8bf7\u6309\u987a\u5e8f\u8bf4\u51fa ' + value + ' \u7684\u53e3\u8bc0\u8868\u7684\u5341\u4f4d\u6570';
    q.hint = '\u8bf7\u5728\u6570\u5b57\u9762\u677f\u4e0a\u6309\u987a\u5e8f\u70b9\u51fb\u6bcf\u4e2a\u5341\u4f4d\u6570\uff08\u5305\u62ec0\uff09';
  }
  return q;
}

function getQuestionDescription(q) {
  return q.description;
}

// =============================================
// 5. MODE & TYPE SWITCHING
// =============================================
function switchMode(mode) {
  S.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  resetSession();
  document.getElementById('test-config').classList.toggle('hidden', mode !== 'test');
  if (mode === 'practice') {
    showPracticeSelector();
    document.getElementById('btn-start').classList.add('hidden');
    document.getElementById('btn-submit').classList.add('hidden');
    document.getElementById('btn-next').classList.add('hidden');
  } else {
    document.getElementById('practice-selector').classList.add('hidden');
    document.getElementById('btn-start').classList.remove('hidden');
    document.getElementById('btn-next').classList.add('hidden');
  }
  updateQuestionDisplay('\u8bf7\u9009\u62e9\u9898\u578b\u5f00\u59cb', true);
}

function switchQuestionType(type) {
  S.qType = type;
  document.querySelectorAll('.type-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.type === type);
  });
  resetSession();
  setTheme(type);
  // T4/T5 自动关闭仅限下三角区（用户可手动重开）
  if (type === 'T4' || type === 'T5') {
    document.getElementById('chk-lower-triangle').checked = false;
    toggleLowerTriangle(false);
  } else {
    document.getElementById('chk-lower-triangle').checked = true;
    toggleLowerTriangle(true);
  }
  // 答题前预高亮，便于学习记忆
  if (type === 'T2' || type === 'T4') {
    enableOnesHighlight();
  } else if (type === 'T3' || type === 'T5') {
    enableTensHighlight();
  }
  if (S.mode === 'practice') {
    document.getElementById('question-description').textContent = '请点击数字按钮开始答题';
    showPracticeSelector();
  } else {
    // Test mode - update button
    document.getElementById('btn-start').classList.remove('hidden');
    document.getElementById('question-description').textContent =
      '\u5f53\u524d\u9898\u578b: ' + getTypeLabel(type) + ' \u2014 \u70b9\u51fb\u201c\u5f00\u59cb\u6d4b\u8bd5\u201d';
    setHintText('\u8bf7\u8bbe\u5b9a\u9898\u76ee\u6570\u91cf\u540e\u70b9\u51fb\u5f00\u59cb');
  }
}

function getTypeLabel(type) {
  var labels = { T1: '\u53e3\u8bc0\u67e5\u627e', T2: '\u4e2a\u4f4d\u67e5\u627e', T3: '\u5341\u4f4d\u67e5\u627e', T4: '\u4e2a\u4f4d\u5e8f\u5217', T5: '\u5341\u4f4d\u5e8f\u5217' };
  return labels[type] || type;
}

// =============================================
// 6. PRACTICE MODE SELECTOR
// =============================================
function showPracticeSelector() {
  var sel = document.getElementById('practice-selector');
  var btnContainer = document.getElementById('value-buttons');
  btnContainer.innerHTML = '';
  sel.classList.remove('hidden');

  var type = S.qType;
  var maxVal = getDifficultyMax();
  var values = [];
  if (type === 'T1' || type === 'T4' || type === 'T5') {
    for (var i = 1; i <= maxVal; i++) values.push(i);
  } else if (type === 'T2') {
    for (var i = 0; i <= 9; i++) values.push(i);
  } else if (type === 'T3') {
    for (var i = 0; i <= 8; i++) values.push(i);
  }

  values.forEach(function(v) {
    var btn = document.createElement('button');
    btn.className = 'value-btn';
    btn.textContent = v;
    btn.onclick = function() {
      document.querySelectorAll('.value-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      startPracticeQuestion(v);
    };
    btnContainer.appendChild(btn);
  });
    
  document.getElementById('question-description').textContent = '\u8bf7\u9009\u62e9\u4e00\u4e2a\u6570\u503c\u5f00\u59cb\u7ec3\u4e60';
  setHintText('\u8bf7\u70b9\u51fb\u4e0a\u65b9\u7684\u6570\u503c\u6309\u94ae\u5f00\u59cb');
}

function startPracticeQuestion(value) {
  S.question = generateQuestion(S.qType, value);
  S.selectedCells = new Set();
  S.pendingCells = new Set();
  S.wrongCount = 0;
  S.currentPos = 0;
  S.hintLevel = 0;
  S.isAnswering = true;
  S.isFinished = false;
  document.getElementById('btn-submit').classList.add('hidden');
  startTimer();
  applyQuestionToTable(S.question);
}

// =============================================
// 7. TEST MODE
// =============================================
function startTest() {
  if (S.mode !== 'test') return;

  // Generate question list
  var countEl = document.getElementById('question-count');
  var maxQ = countEl ? parseInt(countEl.value) : 1;
  var allQs = getAllQuestions(S.qType);
  shuffleArray(allQs);
  S.questions = allQs.slice(0, Math.min(maxQ, allQs.length));
  S.questionIndex = 0;
  S.stats = { correct: 0, wrong: 0, missed: 0, total: 0 };
  S.pendingCells = new Set();

  document.getElementById('btn-start').classList.add('hidden');
  document.getElementById('btn-submit').classList.add('hidden');
  document.getElementById('btn-next').textContent = '\u27a1 \u4e0b\u4e00\u9898';
  document.getElementById('btn-next').classList.remove('hidden');

  loadTestQuestion();
}

function loadTestQuestion() {
  if (S.questionIndex >= S.questions.length) {
    finishTest();
    return;
  }
  var qData = S.questions[S.questionIndex];
  S.question = generateQuestion(qData.type, qData.value);
  S.selectedCells = new Set();
  S.wrongCount = 0;
  S.currentPos = 0;
  S.hintLevel = 0;
  S.isAnswering = true;
  S.isFinished = false;
  S.pendingCells = new Set();
  if (S.questionIndex === 0) startTimer();
  applyQuestionToTable(S.question);
  updateProgressDisplay();
  document.getElementById('btn-submit').classList.remove('hidden');
}

// =============================================
// 8. APPLY QUESTION TO TABLE
// =============================================
function applyQuestionToTable(q) {
  clearAllStates();
  disableDigitHighlight();
  document.getElementById('table-container').classList.remove('cell-text-hidden', 'cell-text-shown');
  document.getElementById('pad-section').classList.add('hidden');
  if (S.isAnswering) {
    document.getElementById('table-container').classList.add('cell-text-hidden');
    document.getElementById('table-container').classList.remove('cell-text-shown');
  } else {
    document.getElementById('table-container').classList.remove('cell-text-hidden', 'cell-text-shown');
  }

  // 设置主题色
  setTheme(q.type);

  // 更新题目显示 - 高亮关键词
  var desc = q.description;
  if (q.type === 'T2') {
    desc = '找出<span class="hl-theme">个位</span>数为 ' + q.value + ' 的全部口诀';
  } else if (q.type === 'T3') {
    desc = '找出<span class="hl-theme">十位</span>数为 ' + q.value + ' 的全部口诀';
  } else if (q.type === 'T1') {
    desc = '请找出含因数<span class="hl-theme"> ' + q.value + ' </span>的全部口诀';
  } else if (q.type === 'T4') {
    desc = '按顺序输入 <span class="hl-theme">' + q.value + '</span> 的<span class="hl-theme">个位数</span>';
  } else if (q.type === 'T5') {
    desc = '按顺序输入 <span class="hl-theme">' + q.value + '</span> 的<span class="hl-theme">十位数</span>';
  }
  document.getElementById('question-description').innerHTML = desc;

  var isTest = S.mode === 'test';

  if (q.type === 'T1') {
    if (isTest) {
      setHintText('请点击正确的口诀格子，选完点击"提交"');
    } else {
      // 预标记目标格子，与 T2/T3 保持一致
      q.targetCells.forEach(function(c) {
        setCellState(c.row, c.col, 'target');
      });
      setHintText(q.hint);
    }
    updateProgressDisplay();
  } else if (q.type === 'T2') {
    enableOnesHighlight();
    setHintText(isTest ? '请点击个位数为 ' + q.value + '的口诀格子，选完点击"提交"' : q.hint);
    updateProgressDisplay();
  } else if (q.type === 'T3') {
    enableTensHighlight();
    setHintText(isTest ? '请点击十位数为 ' + q.value + '的口诀格子，选完点击"提交"' : q.hint);
    updateProgressDisplay();
  } else if (q.type === 'T4') {
    enableOnesHighlight();
    initPadSequence();
    if (!isTest) {
      var colIdx = q.value - 1;
      for (var i = 0; i < q.length; i++) {
        var r = S.lowerTriangleOnly ? (i + colIdx) : i;
        setCellState(r, colIdx, 'target');
      }
      setCellState(S.lowerTriangleOnly ? colIdx : 0, colIdx, 'current');
    }
    showNumberPad();
    setHintText(isTest ? '请在数字面板上按顺序点击个位数' : q.hint);
    updateProgressDisplay();
  } else if (q.type === 'T5') {
    enableTensHighlight();
    initPadSequence();
    if (!isTest) {
      var colIdx2 = q.value - 1;
      for (var i2 = 0; i2 < q.length; i2++) {
        var r2 = S.lowerTriangleOnly ? (i2 + colIdx2) : i2;
        setCellState(r2, colIdx2, 'target');
      }
      setCellState(S.lowerTriangleOnly ? colIdx2 : 0, q.value - 1, 'current');
    }
    showNumberPad();
    setHintText(isTest ? '请在数字面板上按顺序点击十位数' : q.hint);
    updateProgressDisplay();
  }
}
function showNumberPad() {
  var pad = document.getElementById('pad-section');
  pad.classList.remove('hidden');
  document.getElementById('pad-total').textContent = S.question ? S.question.length : 9;
  document.getElementById('pad-pos').textContent = '1';
}

function initPadSequence() {
  var q = S.question;
  if (!q || (q.type !== 'T4' && q.type !== 'T5')) return;
  S.pendingCells = new Set();
  S.selectedCells = new Set();
  S.currentPos = 0;
  // 渲染序列槽（按实际长度）
  var seqDiv = document.getElementById('pad-sequence');
  if (!seqDiv) return;
  seqDiv.innerHTML = '';
  for (var i = 0; i < q.length; i++) {
    var slot = document.createElement('div');
    slot.className = 'pad-seq-slot';
    if (i === 0) slot.classList.add('current');
    slot.dataset.pos = i;
    slot.textContent = '-';
    seqDiv.appendChild(slot);
  }
  document.getElementById('pad-total').textContent = q.length;
  document.getElementById('pad-pos').textContent = '1';
}

function submitTest() {
  if (!S.question || S.isFinished || S.mode !== 'test') return;
  var q = S.question;
  // T4/T5: 检查是否全部填完
  if (q.type === 'T4' || q.type === 'T5') {
    if (S.currentPos < q.length) {
      setHintText('还有 ' + (q.length - S.currentPos) + ' 位未填写，请先完成所有位置');
      return;
    }
  }
  // 显示确认弹窗
  var pendingCount = S.pendingCells.size;
  var desc = '已选 ' + pendingCount + ' 个格子';
  if (q.type === 'T4' || q.type === 'T5') {
    desc = '已输入 ' + S.currentPos + '/' + (q.length || 9) + ' 位';
  }
  document.getElementById('confirm-body').textContent = desc + '，确定后将无法修改。';
  document.getElementById('confirm-overlay').classList.remove('hidden');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.add('hidden');
}

function doSubmitTest() {
  document.getElementById('confirm-overlay').classList.add('hidden');
  if (!S.question || S.isFinished || S.mode !== 'test') return;
  S.isAnswering = false;
  var q = S.question;
  var correct = 0, wrong = 0, missed = 0;

  if (q.type === 'T1' || q.type === 'T2' || q.type === 'T3') {
    // 三色评判
    q.targetCells.forEach(function(c) {
      var key = c.row + '-' + c.col;
      if (S.pendingCells.has(key)) {
        // 正确选中
        setCellState(c.row, c.col, 'correct');
        correct++;
      } else {
        // 漏选
        setCellState(c.row, c.col, 'missed');
        missed++;
      }
    });
    // 检查错误选中（选了非目标格）
    S.pendingCells.forEach(function(key) {
      var parts = key.split('-');
      var r = parseInt(parts[0]), co = parseInt(parts[1]);
      var isTarget = q.targetCells.some(function(c) { return c.row === r && c.col === co; });
      if (!isTarget) {
        setCellState(r, co, 'wrong');
        wrong++;
      }
    });
  } else if (q.type === 'T4' || q.type === 'T5') {
    // T4/T5: 逐位评判
    S.pendingCells.forEach(function(key) {
      var parts = key.split('-');
      var pos = parseInt(parts[0]), val = parseInt(parts[1]);
      var expected = q.sequence[pos];
      var actualRow = S.lowerTriangleOnly ? (pos + q.value - 1) : pos;
      if (val === expected) {
        setCellState(actualRow, q.value - 1, 'correct');
        correct++;
      } else {
        setCellState(actualRow, q.value - 1, 'wrong');
        wrong++;
      }
    });
    // 漏选
    for (var i = 0; i < q.length; i++) {
      var k = i + '-' + q.sequence[i];
      var actualRow = S.lowerTriangleOnly ? (i + q.value - 1) : i;
      if (!S.pendingCells.has(k)) {
        setCellState(actualRow, q.value - 1, 'missed');
        missed++;
      }
    }
    hideNumberPad();
  }

  S.stats.correct += correct;
  S.stats.wrong += wrong;
  S.stats.missed += missed;
  S.stats.total++;
  // 记录本题详情到测试历史
  S.testHistory.push({
    type: q.type,
    value: q.value,
    description: q.description,
    correct: correct,
    wrong: wrong,
    missed: missed,
    totalTargets: q.type === 'T4' || q.type === 'T5' ? q.length : q.answerCount
  });
  // 连击: 完全正确则+1，否则归零
  if (wrong === 0 && missed === 0) {
    S.streak++;
    if (S.streak > S.bestStreak) S.bestStreak = S.streak;
    if (S.streak === 5 || S.streak === 10 || S.streak === 20) showStreakMilestone(S.streak);
  } else {
    S.streak = 0;
  }
  updateStreakDisplay();
  saveSettings();
  S.isFinished = true;

  updateStatsDisplay();
  setHintText('正确 ' + correct + ' | 错误 ' + wrong + ' | 漏选 ' + missed);

  document.getElementById('table-container').classList.remove('cell-text-hidden', 'cell-text-shown');
  document.getElementById('btn-submit').classList.add('hidden');
}

function hideNumberPad() {
  document.getElementById('pad-section').classList.add('hidden');
}

// =============================================
// 9. CELL CLICK HANDLER (T1/T2/T3)
// =============================================
function handleCellClick(row, col) {
  if (!S.isAnswering || S.isFinished) return;
  var q = S.question;
  if (!q) return;

  if (q.type === 'T4' || q.type === 'T5') return;

  // 测试模式：只标记 pending，不判断
  if (S.mode === 'test') {
    var key = row + '-' + col;
    if (S.pendingCells.has(key)) {
      S.pendingCells['delete'](key);
      setCellState(row, col, '');
    } else {
      S.pendingCells.add(key);
      setCellState(row, col, 'pending');
    }
    return;
  }

  // 练习模式：即时反馈（原逻辑）
  var key = row + '-' + col;
  var isTarget = q.targetCells.some(function(c) { return c.row === row && c.col === col; });

  if (q.type === 'T1') {
    if (!isTarget) {
      setCellState(row, col, 'wrong-click');
      var el = getCellEl(row, col);
      if (el) {
        setTimeout(function() { el.classList.remove('cell-wrong-click'); }, 300);
      }
      return;
    }
    if (S.selectedCells.has(key)) {
      S.selectedCells['delete'](key);
      setCellState(row, col, 'target');
    } else {
      S.selectedCells.add(key);
      setCellState(row, col, 'selected');
    }
    updateProgressDisplay();
    if (S.selectedCells.size === q.answerCount) {
      validateT1();
    }
  } else if (q.type === 'T2' || q.type === 'T3') {
    if (isTarget) {
      if (S.selectedCells.has(key)) {
        S.selectedCells['delete'](key);
        setCellState(row, col, 'target');
      } else {
        S.selectedCells.add(key);
        setCellState(row, col, 'selected');
      }
      updateProgressDisplay();
      if (S.selectedCells.size === q.answerCount) {
        validateClickSelection();
      }
    } else {
      S.wrongCount++;
      S.stats.wrong++;
      setCellState(row, col, 'wrong-click');
      var el2 = getCellEl(row, col);
      if (el2) {
        setTimeout(function() { el2.classList.remove('cell-wrong-click'); }, 400);
      }
      updateStatsDisplay();
    }
  }
}
function validateT1() {
  S.isAnswering = false;
  var allCorrect = true;
  var missedCells = [];
  S.question.targetCells.forEach(function(c) {
    var key = c.row + '-' + c.col;
    if (!S.selectedCells.has(key)) {
      allCorrect = false;
      missedCells.push(c);
    }
  });

  if (allCorrect && S.selectedCells.size === S.question.answerCount) {
    S.stats.correct++;
    S.question.targetCells.forEach(function(c) { setCellState(c.row, c.col, 'correct'); });
    setHintText('\u2713 \u5168\u90e8\u6b63\u786e\uff01');
    markStreak(true);
    finishQuestion(true);
  } else {
    S.stats.wrong++;
    // 显示正确和漏选的格子
    S.question.targetCells.forEach(function(c) {
      var key = c.row + '-' + c.col;
      if (S.selectedCells.has(key)) {
        setCellState(c.row, c.col, 'correct');
      } else {
        setCellState(c.row, c.col, 'missed');
      }
    });
    // 检查错误选中
    S.selectedCells.forEach(function(key) {
      var parts = key.split('-');
      var r = parseInt(parts[0]), co = parseInt(parts[1]);
      var isTarget = S.question.targetCells.some(function(c) { return c.row === r && c.col === co; });
      if (!isTarget) {
        setCellState(r, co, 'wrong');
      }
    });
    setHintText('\u6709 ' + missedCells.length + ' 个口诀漏选了');
    markStreak(false);
    finishQuestion(false);
  }
}

function validateClickSelection() {
  S.isAnswering = false;
  // In T2/T3, check that all selected are actually targets
  // (they should be since we only add target cells)
  S.stats.correct++;
  S.question.targetCells.forEach(function(c) { setCellState(c.row, c.col, 'correct'); });
  setHintText('\u2713 \u5168\u90e8\u6b63\u786e\uff01');
  updateStatsDisplay();
  markStreak(true);
  finishQuestion(true);
}

// =============================================
// 10. DIGIT INPUT HANDLER (T4/T5)
// =============================================

function handleDigitInput(digit) {
  if (!S.isAnswering || S.isFinished) return;
  var q = S.question;
  if (!q || (q.type !== "T4" && q.type !== "T5")) return;
  var pos = S.currentPos;
  if (pos >= q.length) return;
  var expected = q.sequence[pos];
  var col = q.value - 1;
  var row = S.lowerTriangleOnly ? (pos + col) : pos;

  // 测试模式：只记录不判断
  if (S.mode === "test") {
    var key = pos + "-" + digit;
    S.pendingCells.add(key);
    setCellState(row, col, "pending");
    updatePadSlot(pos, digit);
    S.currentPos++;
    var nextRow = S.currentPos;
    if (nextRow < q.length) setCellState(S.lowerTriangleOnly ? (nextRow + col) : nextRow, col, "current");
    document.getElementById("pad-pos").textContent = Math.min(S.currentPos + 1, q.length);
    if (S.currentPos >= q.length) {
      setHintText("所有数字已填完，请点击提交");
    } else {
      setHintText("");
    }
    updateProgressDisplay();
    return;
  }

  // 练习模式：原逻辑（即时反馈）
  setCellState(row, col, "");
  if (digit === expected) {
    setCellState(row, col, "correct");
    S.currentPos++;
    S.stats.correct++;
    updatePadSlot(pos, digit);
    if (S.currentPos >= q.length) {
      S.isAnswering = false;
      markStreak(true);
      setHintText("\u2713 \u5168\u90e8\u6b63\u786e\uff01");
      hideNumberPad();
      updateStatsDisplay();
      finishQuestion(true);
    } else {
      var nr = S.currentPos;
      setCellState(S.lowerTriangleOnly ? (nr + col) : nr, col, "current");
      document.getElementById("pad-pos").textContent = S.currentPos + 1;
      markStreak(true);
      setHintText("\u6b63\u786e\uff01\u8bf7\u8f93\u5165\u4e0b\u4e00\u4e2a\u6570\u5b57");
    }
  } else {
        S.wrongCount++;
    S.stats.wrong++;
    setCellState(row, col, "wrong");
    setHintText("第 " + (pos + 1) + " 位有误，重新输入");
    setTimeout(function() {
      // 仅清除错误标记，不前进，不填充slot，让用户重试
      setCellState(row, col, "");
    }, 400);
  updateStatsDisplay();
}

}

function handlePadPrev() {
  if (!S.isAnswering || S.isFinished) return;
  var q = S.question;
  if (!q || (q.type !== 'T4' && q.type !== 'T5')) return;
  if (S.currentPos <= 0) return;

  var col = q.value - 1;
  var prevPos = S.currentPos - 1;
  var row = S.lowerTriangleOnly ? (prevPos + col) : prevPos;

  // 测试模式：从 pendingCells 中移除该位的记录
  if (S.mode === 'test') {
    var keysToRemove = [];
    S.pendingCells.forEach(function(key) {
      var parts = key.split('-');
      if (parseInt(parts[0]) === prevPos) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(function(k) { S.pendingCells['delete'](k); });
  }

  // 清除单元格状态和序列槽
  setCellState(row, col, '');
  var slots = document.querySelectorAll('.pad-seq-slot');
  if (slots && slots[prevPos]) {
    slots[prevPos].textContent = '-';
    slots[prevPos].classList.remove('filled');
  }

  S.currentPos = prevPos;
  setCellState(row, col, 'current');
  document.getElementById('pad-pos').textContent = S.currentPos + 1;
  setHintText('已回到第 ' + (prevPos + 1) + ' 位');
}

function handlePadNext() {
  if (!S.isAnswering || S.isFinished) return;
  var q = S.question;
  if (!q || (q.type !== 'T4' && q.type !== 'T5')) return;
  if (S.currentPos >= q.length) return;

  // 仅当当前位已填写时允许前进
  var slots = document.querySelectorAll('.pad-seq-slot');
  if (!slots || !slots[S.currentPos]) return;
  if (slots[S.currentPos].textContent === '-' || slots[S.currentPos].textContent === '') {
    setHintText('请先填写当前位');
    return;
  }

  var col = q.value - 1;
  var oldRow = S.lowerTriangleOnly ? (S.currentPos + col) : S.currentPos;
  setCellState(oldRow, col, '');

  S.currentPos++;
  if (S.currentPos < q.length) {
    var nextRow = S.lowerTriangleOnly ? (S.currentPos + col) : S.currentPos;
    setCellState(nextRow, col, 'current');
  }
  document.getElementById('pad-pos').textContent = Math.min(S.currentPos + 1, q.length);
  setHintText('');
}

function updatePadSlot(pos, value) {
  var slots = document.querySelectorAll(".pad-seq-slot");
  if (slots && slots[pos]) {
    slots[pos].textContent = value;
    slots[pos].classList.add("filled");
    slots[pos].classList.remove("current");
    if (pos + 1 < slots.length) {
      slots[pos + 1].classList.add("current");
    }
  }
}
function finishQuestion(success) {
  S.isFinished = true;
  S.stats.total++;
  updateStatsDisplay();
  updateProgressDisplay();

  if (S.mode === 'test') {
    document.getElementById('btn-submit').classList.add('hidden');
    setHintText('');
  } else {
    setTimeout(function() {
      showResultCard(success);
    }, 500);
  }
}
function finishTest() {
  stopTimer();
  S.isAnswering = false;
  document.getElementById('btn-next').classList.add('hidden');
  document.getElementById('btn-start').classList.remove('hidden');
  document.getElementById('btn-start').textContent = '\ud83d\ude80 \u518d\u6d4b\u4e00\u6b21';

  var rate = S.stats.total > 0 ? Math.round(S.stats.correct / S.stats.total * 100) : 0;
  // 隐藏默认继续按钮，显示回顾按钮
  document.getElementById('btn-result-continue').textContent = '继续';
  document.getElementById('btn-result-continue').onclick = closeResult;
  showResultCardCustom(
    S.stats.correct === S.stats.total ? '\ud83c\udf89' : '\ud83d\udcaa',
    '\u6d4b\u8bd5\u5b8c\u6210\uff01',
    '\u603b\u9898: ' + S.stats.total + ' | \u6b63\u786e: ' + S.stats.correct +
    ' | \u9519\u8bef: ' + S.stats.wrong + ' | \u6b63\u786e\u7387: ' + rate + '%<br>' +
    '\u7528\u65f6: ' + formatTime(S.timerSeconds)
  );
  // 移除旧的查看详情按钮（防止重复添加）
  var existingBtn = document.getElementById('btn-review-detail');
  if (existingBtn) existingBtn.remove();
  // 添加"查看详情"按钮
  var resultBody = document.getElementById('result-body');
  var reviewBtn = document.createElement('button');
  reviewBtn.id = 'btn-review-detail';
  reviewBtn.className = 'action-btn';
  reviewBtn.style.cssText = 'margin-top:12px;';
  reviewBtn.textContent = '\ud83d\udcdd \u67e5\u770b\u8be6\u60c5';
  reviewBtn.onclick = function() {
    closeResult();
    showTestReview();
  };
  resultBody.appendChild(reviewBtn);
}

// =============================================
// 13. HINT & SHOW ANSWER
// =============================================
function useHint() {
  if (!S.question || S.isFinished) return;
  var tc = document.getElementById('table-container');
  if (S.mode === 'test') {
    tc.classList.toggle('cell-text-shown');
    if (tc.classList.contains('cell-text-shown')) {
      setHintText('\u63d0\u793a\u4e2d\uff1a\u5df2\u663e\u793a\u4e58\u6cd5\u53e3\u8bc0');
    } else {
      setHintText('\u63d0\u793a\u5df2\u5173\u95ed');
    }
    return;
  }
  S.hintLevel++;
  var q = S.question;
  tc.classList.add('cell-text-shown');

  if (S.hintLevel === 1) {
    // L1: Show progress
    if (q.type === 'T1' || q.type === 'T2' || q.type === 'T3') {
      var selected = S.selectedCells.size;
      var total = q.answerCount;
      setHintText('\u5df2\u9009\u4e2d ' + selected + '/' + total + ' \u4e2a\uff0c\u8fd8\u5dee ' + (total - selected) + ' \u4e2a');
    } else {
      setHintText('\u5f53\u524d\u7b2c ' + (S.currentPos + 1) + '/9 \u4f4d');
    }
  } else if (S.hintLevel >= 2) {
    // L2: Show hint markers on remaining cells
    if (q.type === 'T1' || q.type === 'T2' || q.type === 'T3') {
      q.targetCells.forEach(function(c) {
        var key = c.row + '-' + c.col;
        if (!S.selectedCells.has(key)) {
          setCellState(c.row, c.col, 'hint');
        }
      });
    }
    setHintText('\u6a59\u8272\u865a\u7ebf\u4e3a\u5c1a\u672a\u9009\u4e2d\u7684\u76ee\u6807\uff0c\u8bf7\u518d\u70b9\u51fb\u201c\u67e5\u770b\u7b54\u6848\u201d\u76f4\u63a5\u663e\u793a');
  }
}

function showAnswer() {
  if (S.mode === 'test') { setHintText('测试模式不可查看答案'); return; }
  if (!S.question || S.isFinished) return;
  var q = S.question;
  S.isAnswering = false;

  if (q.type === 'T1' || q.type === 'T2' || q.type === 'T3') {
    q.targetCells.forEach(function(c) { setCellState(c.row, c.col, 'correct'); });
    setHintText('\u7eff\u8272\u4e3a\u6240\u6709\u6b63\u786e\u7b54\u6848');
  } else {
    // T4/T5 - mark all remaining
    for (var i = S.currentPos; i < q.length; i++) {
      setCellState(i, q.value - 1, 'correct');
    }
    hideNumberPad();
    setHintText('\u7eff\u8272\u4e3a\u6240\u6709\u6b63\u786e\u7b54\u6848');
  }
  S.isFinished = true;

  document.getElementById('table-container').classList.remove('cell-text-hidden', 'cell-text-shown');
  document.getElementById('btn-submit').classList.add('hidden');
}

// =============================================
// 14. NEXT QUESTION
// =============================================
function nextQuestion() {
  if (S.mode === 'test' && S.questionIndex < S.questions.length - 1) {
    S.questionIndex++;
    loadTestQuestion();
    } else if (S.mode === 'practice') {
    // 保存当前数值，resetSession 会清空 S.question
    var prevValue = S.question ? S.question.value : null;
    resetSession();
    showPracticeSelector();
    // 保持当前题型的高亮效果（T2/T3 个位/十位高亮）
    // T4/T5 也标记目标列
    if ((S.qType === 'T4' || S.qType === 'T5') && prevValue !== null) {
      for (var i = 0; i < 9; i++) {
        setCellState(i, prevValue - 1, 'target');
      }
    }
    if (S.qType === 'T2' || S.qType === 'T4') {
      enableOnesHighlight();
    } else if (S.qType === 'T3' || S.qType === 'T5') {
      enableTensHighlight();
    }
    document.getElementById('question-description').textContent = '请选择数字开始练习';
    setHintText('请点击上方的数值按钮开始');
  } else {
    resetSession();
    showPracticeSelector();
  }
  updateStatsDisplay();
}

// =============================================
// 15. RESET
// =============================================
function resetSession() {
  S.question = null;
  S.selectedCells = new Set();
  S.wrongCount = 0;
  S.currentPos = 0;
  S.hintLevel = 0;
  S.isAnswering = false;
  S.isFinished = false;
  S.questions = [];
  S.questionIndex = 0;
  S.stats = { correct: 0, wrong: 0, missed: 0, total: 0 };
  S.pendingCells = new Set();
  stopTimer();
  S.timerSeconds = 0;
  clearAllStates();
  disableDigitHighlight();
  document.getElementById('table-container').classList.remove('cell-text-hidden', 'cell-text-shown');
  hideNumberPad();
  updateStatsDisplay();
  updateProgressDisplay();
  document.getElementById('timer-display').textContent = '\u23f1 00:00';
}

// =============================================
// 16. DISPLAY UPDATES
// =============================================
function updateQuestionDisplay(text, clear) {
  document.getElementById('question-description').textContent = text || '';
  if (clear) {
    setHintText('');
    document.getElementById('progress-text').textContent = '\u7b2c 0/0 \u9898';
  }
}

function setHintText(text) {
  document.getElementById('hint-text').textContent = text || '';
}

function updateProgressDisplay() {
  var q = S.question;
  if (!q) {
    document.getElementById('progress-text').textContent = '\u7b2c 0/0 \u9898';
    return;
  }

  var progress = '';
  if (S.mode === 'test') {
    progress = '\u7b2c ' + (S.questionIndex + 1) + '/' + S.questions.length + ' \u9898';
  }

  if (q.type === 'T1' || q.type === 'T2' || q.type === 'T3') {
    progress += (progress ? ' | ' : '') + '\u5df2\u9009 ' + S.selectedCells.size + '/' + q.answerCount;
  } else {
    progress += (progress ? ' | ' : '') + '\u5df2\u8f93\u5165 ' + S.currentPos + '/' + q.length;
  }
  document.getElementById('progress-text').textContent = progress || '';
}

function updateStatsDisplay() {
  document.getElementById('stat-total').textContent = S.stats.total;
  document.getElementById('stat-correct').textContent = S.stats.correct;
  document.getElementById('stat-wrong').textContent = S.stats.wrong;
  document.getElementById('stat-missed').textContent = S.stats.missed;
  // 练习模式隐藏漏选统计（练习模式即时反馈无漏选概念）
  var missedEl = document.getElementById('stat-item-missed');
  if (missedEl) {
    missedEl.style.display = (S.mode === 'test') ? '' : 'none';
  }
  var rate = S.stats.total > 0 ? Math.round(S.stats.correct / S.stats.total * 100) : 0;
  document.getElementById('stat-rate').textContent = rate + '%';
}
function updateStreakDisplay() {
  var el = document.getElementById('stat-streak');
  var bestEl = document.getElementById('stat-best-streak');
  if (el) el.textContent = S.streak;
  if (bestEl) bestEl.textContent = S.bestStreak;
  // 连击高亮动画
  if (el) {
    el.classList.remove('streak-fire');
    if (S.streak >= 20) el.classList.add('streak-fire');
  }
}

function markStreak(success) {
  if (success) {
    S.streak++;
    if (S.streak > S.bestStreak) {
      S.bestStreak = S.streak;
    }
    if (S.streak === 5 || S.streak === 10 || S.streak === 20) {
      showStreakMilestone(S.streak);
    }
  } else {
    S.streak = 0;
  }
  updateStreakDisplay();
  saveSettings();
}

function showStreakMilestone(n) {
  var toast = document.getElementById('streak-toast');
  if (!toast) return;
  toast.textContent = '\ud83d\udd25 \u8fde\u51fb x' + n + '\uff01';
  toast.classList.remove('hidden');
  toast.classList.add('streak-pop');
  setTimeout(function() {
    toast.classList.add('hidden');
    toast.classList.remove('streak-pop');
  }, 1500);
}


// =============================================
// 17. TIMER
// =============================================
function startTimer() {
  stopTimer();
  S.timerSeconds = 0;
  S.timer = setInterval(function() {
    S.timerSeconds++;
    document.getElementById('timer-display').textContent = '\u23f1 ' + formatTime(S.timerSeconds);
  }, 1000);
}

function stopTimer() {
  if (S.timer) {
    clearInterval(S.timer);
    S.timer = null;
  }
}

function formatTime(secs) {
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// =============================================
// 18. RESULT CARD
// =============================================
function showResultCard(success) {
  stopTimer();
  var icon = success ? '\u2713' : '\u2717';
  var title = success ? '\u5b8c\u6210\uff01' : '\u5df2\u5b8c\u6210';
  var body = '\u7528\u65f6: ' + formatTime(S.timerSeconds) + '<br>';
  if (S.question) {
    if (S.question.type === 'T1' || S.question.type === 'T2' || S.question.type === 'T3') {
      body += '\u6b63\u786e\u9009\u4e2d: ' + S.selectedCells.size + '/' + S.question.answerCount + '<br>';
    } else {
      body += '\u6b63\u786e: ' + S.stats.correct + ' | \u9519\u8bef: ' + S.wrongCount;
    }
  }
  showResultCardCustom(icon, title, body);
}

function showResultCardCustom(icon, title, body) {
  document.getElementById('result-icon').textContent = icon;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-body').innerHTML = body;
  document.getElementById('result-overlay').classList.remove('hidden');
}

function closeResult() {
  document.getElementById('result-overlay').classList.add('hidden');
  if (S.mode === 'practice') {
    document.getElementById('question-description').textContent = '准备下一题…';
    nextQuestion();
  }
}


// =============================================
// 20. RESPONSIVE TABLE SIZING
// =============================================
function updateTableSize() {
  var w = window.innerWidth;
  var vh = window.innerHeight;
  
  if (w >= 900) {
    // Desktop: reset to defaults
    document.documentElement.style.setProperty('--cell-size', '64px');
    document.documentElement.style.setProperty('--header-size', '52px');
    return;
  }
  
  // Mobile/Tablet: calculate header size proportional to viewport
  var headerH, cellH;
  
  if (w < 380) {
    headerH = Math.max(15, Math.min(26, Math.floor(vh / 28)));
    cellH = Math.max(16, Math.min(30, Math.floor(vh / 24)));
  } else if (w < 600) {
    headerH = Math.max(18, Math.min(32, Math.floor(vh / 24)));
    cellH = Math.max(20, Math.min(36, Math.floor(vh / 20)));
  } else {
    headerH = Math.max(20, Math.min(38, Math.floor(vh / 22)));
    cellH = Math.max(24, Math.min(42, Math.floor(vh / 18)));
  }
  
  // Landscape override: more aggressive compression
  if (vh <= 500 && vh < w) {
    // Landscape phone
    var lh = Math.floor((vh - 40) / 14);
    headerH = Math.max(12, Math.min(20, lh));
    cellH = Math.max(12, Math.min(22, lh + 2));
  }
  
  document.documentElement.style.setProperty('--cell-size', cellH + 'px');
  document.documentElement.style.setProperty('--header-size', headerH + 'px');
}

// Debounced resize handler
var resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    updateTableSize();
    // 移动端/桌面端切换时更新折叠按钮可见性
    var toggle = document.getElementById('sidebar-toggle');
    if (toggle) {
      toggle.style.display = window.innerWidth < 900 ? 'none' : '';
    }
    // 切换到单列布局时自动展开侧边栏
    if (window.innerWidth < 900) {
      document.getElementById('app').classList.remove('sidebar-collapsed');
    }
  }, 100);
});

// =============================================
// 19. INITIALIZATION
// =============================================

// =============================================
// 21. TEST REVIEW
// =============================================
function showTestReview() {
  if (S.testHistory.length === 0) { setHintText('没有可回顾的测试记录'); return; }
  S.reviewIndex = 0;
  document.getElementById('review-overlay').classList.remove('hidden');
  renderReviewQuestion();
}

function closeTestReview() {
  document.getElementById('review-overlay').classList.add('hidden');
  resetSession();
  S.testHistory = [];
  if (S.mode === 'test') {
    document.getElementById('btn-start').classList.remove('hidden');
    document.getElementById('btn-start').textContent = '\ud83d\ude80 \u518d\u6d4b\u4e00\u6b21';
    document.getElementById('btn-next').classList.add('hidden');
  } else {
    showPracticeSelector();
    document.getElementById('question-description').textContent = '请选择数字开始练习';
    setHintText('请点击上方的数值按钮开始');
  }
}

function reviewPrev() {
  if (S.reviewIndex > 0) {
    S.reviewIndex--;
    renderReviewQuestion();
  }
}

function reviewNext() {
  if (S.reviewIndex < S.testHistory.length - 1) {
    S.reviewIndex++;
    renderReviewQuestion();
  }
}

function renderReviewQuestion() {
  var h = S.testHistory[S.reviewIndex];
  var typeLabel = getTypeLabel(h.type);
  var total = h.totalTargets;
  var accuracy = total > 0 ? Math.round(h.correct / total * 100) : 0;
  document.getElementById('review-type').textContent = typeLabel + ' #' + h.value;
  document.getElementById('review-desc').textContent = h.description;
  document.getElementById('review-stats').innerHTML =
    '\u6b63\u786e: <span class=\"text-green\">' + h.correct + '</span> | ' +
    '\u9519\u8bef: <span class=\"text-red\">' + h.wrong + '</span> | ' +
    '\u6f0f\u9009: <span class=\"text-orange\">' + h.missed + '</span> | ' +
    '\u51c6\u786e\u7387: ' + accuracy + '%';
  document.getElementById('review-progress').textContent = (S.reviewIndex + 1) + '/' + S.testHistory.length;
  // 按钮状态
  document.getElementById('btn-review-prev').disabled = S.reviewIndex <= 0;
  document.getElementById('btn-review-next').disabled = S.reviewIndex >= S.testHistory.length - 1;
}

// =============================================
// 22. DARK MODE
// =============================================
function toggleDarkMode() {
  if (S.darkMode === 'dark') {
    S.darkMode = 'light';
  } else if (S.darkMode === 'light') {
    S.darkMode = 'auto';
  } else {
    S.darkMode = 'dark';
  }
  applyDarkMode();
  saveSettings();
}

function applyDarkMode() {
  var isDark;
  if (S.darkMode === 'dark') {
    isDark = true;
  } else if (S.darkMode === 'light') {
    isDark = false;
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  var btn = document.getElementById('btn-dark-mode');
  if (btn) {
    if (S.darkMode === 'dark') btn.textContent = '\u2600\ufe0f \u6d45\u8272';
    else if (S.darkMode === 'light') btn.textContent = '\ud83c\udf19 \u6df1\u8272';
    else btn.textContent = '\ud83c\udf19 \u81ea\u52a8';
  }
}


// =============================================
// 24. SIDEBAR TOGGLE
// =============================================
function toggleSidebar() {
  var app = document.getElementById('app');
  var collapsed = !app.classList.contains('sidebar-collapsed');
  if (collapsed) {
    app.classList.add('sidebar-collapsed');
  } else {
    app.classList.remove('sidebar-collapsed');
  }
  // 折叠后重新计算表格尺寸
  setTimeout(updateTableSize, 350);
  saveSettings();
}

// =============================================
// 23. LOCALSTORAGE PERSISTENCE
// =============================================
function saveSettings() {
  try {
    var settings = {
      difficulty: S.difficulty,
      bestStreak: S.bestStreak,
      darkMode: S.darkMode,
      lowerTriangleOnly: S.lowerTriangleOnly,
      qType: S.qType
    };
    settings.sidebarCollapsed = document.getElementById('app').classList.contains('sidebar-collapsed');
    localStorage.setItem('9x9-settings', JSON.stringify(settings));
  } catch(e) {}
}

function loadSettings() {
  try {
    var raw = localStorage.getItem('9x9-settings');
    if (!raw) return;
    var settings = JSON.parse(raw);
    if (settings.difficulty) S.difficulty = settings.difficulty;
    if (settings.bestStreak !== undefined) S.bestStreak = settings.bestStreak;
    if (settings.darkMode) S.darkMode = settings.darkMode;
    if (settings.lowerTriangleOnly !== undefined) S.lowerTriangleOnly = settings.lowerTriangleOnly;
    if (settings.qType) S.qType = settings.qType;
    if (settings.sidebarCollapsed) {
      document.getElementById('app').classList.add('sidebar-collapsed');
    }
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', function() {
  generateTable();
  renderTable();
  loadSettings();
  applyDarkMode();
  updateDifficultyHighlight();
  updateStreakDisplay();
  switchMode('practice');
  switchQuestionType(S.qType || 'T2');
  updateStatsDisplay();

  // 恢复下三角开关状态
  document.getElementById('chk-lower-triangle').checked = S.lowerTriangleOnly;
  toggleTriangleHighlight(S.lowerTriangleOnly);

  // 恢复难度按钮状态
  document.querySelectorAll('.diff-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.diff === S.difficulty);
  });

  // 绑定数字面板按钮
  bindPadButtons();
  toggleTriangleHighlight(S.lowerTriangleOnly);
  updateTableSize();
  // 移动端隐藏折叠按钮（单列布局不需要）
  if (window.innerWidth < 900) {
    document.getElementById('sidebar-toggle').style.display = 'none';
  }
});


// =============================================
// 16.5 LOWER TRIANGLE TOGGLE
// =============================================
function toggleLowerTriangle(enabled) {
  S.lowerTriangleOnly = enabled;
  toggleTriangleHighlight(enabled);
  // 如果正在答题，重新生成题目
  if (S.question && S.isAnswering) {
    // 简单处理：复位到答题开始前状态
    resetSession();
    showPracticeSelector();
    if (S.qType === 'T2' || S.qType === 'T4') {
      enableOnesHighlight();
    } else if (S.qType === 'T3' || S.qType === 'T5') {
      enableTensHighlight();
    }
    document.getElementById('question-description').textContent = '开关已切换，请重新选择数值';
    setHintText('请点击上方的数值按钮开始');
  }
}

function bindPadButtons() {
  document.querySelectorAll('.pad-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      handleDigitInput(parseInt(this.dataset.digit));
    });
  });
  document.getElementById('btn-pad-prev').addEventListener('click', handlePadPrev);
  document.getElementById('btn-pad-next').addEventListener('click', handlePadNext);
}
