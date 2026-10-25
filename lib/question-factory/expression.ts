// Safe arithmetic evaluator (no eval): numbers, + - * / ^, parentheses and unary minus.
// Used to check that the answer an AI claims really follows from the numbers in its own solution.
export function evaluateExpression(source: string): number | null {
  const text = source.replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  if (!text || text.length > 200 || /[^0-9+\-*/^().]/.test(text)) return null;
  let index = 0;

  const peek = () => text[index];
  const number = (): number => {
    const match = /^\d+(\.\d+)?/.exec(text.slice(index));
    if (!match) throw new Error("number expected");
    index += match[0].length;
    return Number(match[0]);
  };
  const primary = (): number => {
    if (peek() === "(") {
      index++;
      const value = sum();
      if (peek() !== ")") throw new Error("missing )");
      index++;
      return value;
    }
    if (peek() === "-") {
      index++;
      return -power();
    }
    if (peek() === "+") {
      index++;
      return power();
    }
    return number();
  };
  const power = (): number => {
    const base = primary();
    if (peek() === "^") {
      index++;
      return Math.pow(base, power());
    }
    return base;
  };
  const product = (): number => {
    let value = power();
    while (peek() === "*" || peek() === "/") {
      const op = text[index++];
      const rhs = power();
      if (op === "/" && rhs === 0) throw new Error("division by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const op = text[index++];
      const rhs = product();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  };

  try {
    const result = sum();
    if (index !== text.length || !Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

// First number appearing in an option such as "4% decrease" or "Rs. 1,250".
export function firstNumber(option: string): number | null {
  if (/^\s*(no (net )?change|nil|zero)\s*$/i.test(option)) return 0;
  const match = /-?\d[\d,]*(\.\d+)?/.exec(option.replace(/,/g, ""));
  return match ? Number(match[0]) : null;
}
