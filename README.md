# Orbit Calculator

A responsive scientific calculator built with plain HTML, CSS, and JavaScript.

## Run it

Open `index.html` in a modern browser. No build step or dependencies are required.

## Features

- Arithmetic, parentheses, percentages, powers, square roots, factorials, and constants (`π`, `e`, `Ans`)
- `sin`, `cos`, `tan`, `log` (base 10), and `ln`, with degree/radian angle selection
- Memory controls, clickable calculation history, keyboard entry, and light/dark themes
- Safe expression parsing without `eval()` or dynamic code execution
- Clear validation messages for malformed expressions, division by zero, and invalid function domains

The expression parser supports normal precedence, right-associative powers, unary signs, and implicit multiplication such as `2π` or `3(4+1)`. Percent converts a value to its fraction (for example, `50%` is `0.5`).
