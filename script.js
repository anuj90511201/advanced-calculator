(() => {
  'use strict';

  const expressionDisplay = document.querySelector('#expression-display');
  const resultDisplay = document.querySelector('#result-display');
  const messageDisplay = document.querySelector('#display-message');
  const historyList = document.querySelector('#history-list');
  const memoryIndicator = document.querySelector('#memory-indicator');
  const state = { expression: '', result: 0, ans: 0, memory: null, angle: 'DEG', history: [] };
  const functions = new Set(['sin', 'cos', 'tan', 'sqrt', 'log', 'ln']);

  function format(value) {
    if (!Number.isFinite(value)) throw new Error('Result is outside the supported range.');
    if (Object.is(value, -0)) value = 0;
    return Number(value.toPrecision(12)).toString();
  }

  function tokenize(source) {
    const tokens = [];
    let i = 0;
    while (i < source.length) {
      const ch = source[i];
      if (/\s/.test(ch)) { i++; continue; }
      const rest = source.slice(i);
      const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
      if (number) { tokens.push({ type: 'number', value: Number(number[0]) }); i += number[0].length; continue; }
      const word = rest.match(/^[a-zA-Z]+/);
      if (word) { tokens.push({ type: 'word', value: word[0].toLowerCase() }); i += word[0].length; continue; }
      if (ch === 'π') { tokens.push({ type: 'word', value: 'pi' }); i++; continue; }
      const mapped = ({ '×': '*', '÷': '/', '−': '-' })[ch] || ch;
      if ('+-*/^()%!'.includes(mapped)) { tokens.push({ type: 'symbol', value: mapped }); i++; continue; }
      throw new Error(`Unexpected character “${ch}”.`);
    }

    const expanded = [];
    const isFunction = token => token?.type === 'word' && functions.has(token.value);
    const endsValue = token => token && (token.type === 'number' || (token.type === 'word' && !isFunction(token)) || (token.type === 'symbol' && [')', '!', '%'].includes(token.value)));
    const startsValue = token => token && (token.type === 'number' || token.type === 'word' || (token.type === 'symbol' && token.value === '('));
    for (let j = 0; j < tokens.length; j++) {
      const current = tokens[j], previous = tokens[j - 1];
      if (j && endsValue(previous) && startsValue(current) && !(isFunction(previous) && current.value === '(')) expanded.push({ type: 'symbol', value: '*' });
      expanded.push(current);
    }
    return expanded;
  }

  function evaluate(source) {
    const tokens = tokenize(source);
    if (!tokens.length) throw new Error('Enter an expression first.');
    let position = 0;
    const peek = () => tokens[position];
    const take = () => tokens[position++];
    const expect = symbol => {
      const token = take();
      if (!token || token.value !== symbol) throw new Error(`Expected “${symbol}”.`);
    };

    function expression(minBinding = 0) {
      const token = take();
      if (!token) throw new Error('Expression is incomplete.');
      let left;
      if (token.type === 'number') left = token.value;
      else if (token.type === 'word') {
        if (token.value === 'pi') left = Math.PI;
        else if (token.value === 'e') left = Math.E;
        else if (token.value === 'ans') left = state.ans;
        else if (functions.has(token.value)) {
          expect('(');
          const argument = expression(0);
          expect(')');
          left = applyFunction(token.value, argument);
        } else throw new Error(`Unknown name “${token.value}”.`);
      } else if (token.value === '(') {
        left = expression(0);
        expect(')');
      } else if (token.value === '+' || token.value === '-') {
        const value = expression(25);
        left = token.value === '-' ? -value : value;
      } else throw new Error(`Unexpected “${token.value}”.`);

      while (peek()) {
        const next = peek();
        if (next.type === 'symbol' && (next.value === '!' || next.value === '%')) {
          if (40 < minBinding) break;
          take();
          left = next.value === '!' ? factorial(left) : left / 100;
          continue;
        }
        if (next.type !== 'symbol' || !['+', '-', '*', '/', '^'].includes(next.value)) break;
        const binding = next.value === '+' || next.value === '-' ? 10 : next.value === '*' || next.value === '/' ? 20 : 30;
        if (binding < minBinding) break;
        take();
        const right = expression(next.value === '^' ? binding : binding + 1);
        if (next.value === '+') left += right;
        else if (next.value === '-') left -= right;
        else if (next.value === '*') left *= right;
        else if (next.value === '/') {
          if (right === 0) throw new Error('Cannot divide by zero.');
          left /= right;
        } else left = Math.pow(left, right);
        if (!Number.isFinite(left)) throw new Error('Result is outside the supported range.');
      }
      return left;
    }

    const value = expression();
    if (position < tokens.length) throw new Error(`Unexpected “${tokens[position].value}”.`);
    if (!Number.isFinite(value)) throw new Error('Result is outside the supported range.');
    return value;
  }

  function factorial(value) {
    if (value < 0 || !Number.isInteger(value)) throw new Error('Factorial needs a whole number from 0 to 170.');
    if (value > 170) throw new Error('Factorial is limited to 170.');
    let result = 1;
    for (let n = 2; n <= value; n++) result *= n;
    return result;
  }

  function applyFunction(name, value) {
    if (name === 'sqrt') {
      if (value < 0) throw new Error('Square root needs a non-negative number.');
      return Math.sqrt(value);
    }
    if (name === 'log' || name === 'ln') {
      if (value <= 0) throw new Error(`${name} needs a positive number.`);
      return name === 'log' ? Math.log10(value) : Math.log(value);
    }
    const angle = state.angle === 'DEG' ? value * Math.PI / 180 : value;
    if (name === 'sin') return Math.sin(angle);
    if (name === 'cos') return Math.cos(angle);
    if (name === 'tan') {
      if (Math.abs(Math.cos(angle)) < 1e-12) throw new Error('Tangent is undefined at this angle.');
      return Math.tan(angle);
    }
  }

  function renderDisplay() {
    expressionDisplay.textContent = state.expression || 'Ready when you are';
    resultDisplay.textContent = format(state.result);
  }

  function showError(error) {
    messageDisplay.textContent = error.message;
    resultDisplay.textContent = '—';
  }

  function clearMessage() { messageDisplay.textContent = ''; }

  function setExpression(expression) {
    state.expression = expression;
    clearMessage();
    renderDisplay();
  }

  function calculate() {
    if (!state.expression.trim()) return;
    try {
      const value = evaluate(state.expression);
      state.result = value;
      state.ans = value;
      clearMessage();
      renderDisplay();
      state.history.unshift({ expression: state.expression, result: format(value), time: new Date() });
      state.history = state.history.slice(0, 50);
      renderHistory();
    } catch (error) { showError(error); }
  }

  function insert(value) {
    if (value === 'Ans') value = 'Ans';
    setExpression(state.expression + value);
  }

  function renderHistory() {
    historyList.replaceChildren();
    if (!state.history.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-history';
      empty.innerHTML = '<span class="history-orbit">↻</span><strong>No calculations yet</strong><span>Your results will appear here.</span>';
      historyList.append(empty);
      return;
    }
    for (const item of state.history) {
      const row = document.createElement('button');
      row.type = 'button'; row.className = 'history-item';
      row.innerHTML = `<div class="history-expression"></div><div class="history-result"></div><div class="history-time"></div>`;
      row.querySelector('.history-expression').textContent = item.expression;
      row.querySelector('.history-result').textContent = `= ${item.result}`;
      row.querySelector('.history-time').textContent = item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      row.addEventListener('click', () => { setExpression(item.expression); });
      historyList.append(row);
    }
  }

  function memoryAction(action) {
    if (action === 'memory-clear') state.memory = null;
    if (action === 'memory-store') state.memory = state.result;
    if (action === 'memory-add') state.memory = (state.memory ?? 0) + state.result;
    if (action === 'memory-subtract') state.memory = (state.memory ?? 0) - state.result;
    if (action === 'memory-recall') {
      if (state.memory !== null) insert(format(state.memory));
    }
    memoryIndicator.classList.toggle('filled', state.memory !== null);
    memoryIndicator.title = state.memory === null ? 'Memory is empty' : `Memory: ${format(state.memory)}`;
  }

  document.querySelector('.keypad').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.insert !== undefined) insert(button.dataset.insert);
    else if (button.dataset.action === 'clear') { state.result = 0; setExpression(''); renderDisplay(); }
    else if (button.dataset.action === 'backspace') setExpression(state.expression.slice(0, -1));
    else if (button.dataset.action === 'calculate') calculate();
  });
  document.querySelector('.memory-row').addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (action) memoryAction(action);
  });
  document.querySelectorAll('.angle-option').forEach(button => button.addEventListener('click', () => {
    state.angle = button.dataset.angle;
    document.querySelectorAll('.angle-option').forEach(option => {
      const active = option === button;
      option.classList.toggle('active', active);
      option.setAttribute('aria-pressed', String(active));
    });
  }));
  document.querySelector('#clear-history').addEventListener('click', () => { state.history = []; renderHistory(); });
  document.querySelector('#theme-toggle').addEventListener('click', event => {
    const dark = document.body.classList.toggle('dark');
    event.currentTarget.textContent = dark ? '☀' : '☾';
    event.currentTarget.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); calculate(); }
    else if (event.key === 'Escape') { state.result = 0; setExpression(''); renderDisplay(); }
    else if (event.key === 'Backspace') { event.preventDefault(); setExpression(state.expression.slice(0, -1)); }
    else if (/^[0-9.+*/^()%!]$/.test(event.key)) insert(event.key);
    else if (event.key === '-') insert('−');
    else if (event.key.toLowerCase() === 'p') insert('π');
    else if (event.key.toLowerCase() === 'e') insert('e');
  });

  renderDisplay();
})();
