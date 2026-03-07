export function highlightJS(code) {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Tokenize into comments, strings, and other segments to avoid
  // regex passes corrupting each other's HTML output.
  const TOKEN_RE = /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/gm;
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = TOKEN_RE.exec(escaped)) !== null) {
    const before = escaped.slice(lastIndex, match.index);
    result += highlightPlain(before);
    if (match[1]) {
      result += `<span class="sh-cm">${match[1]}</span>`;
    } else {
      result += `<span class="sh-str">${match[2]}</span>`;
    }
    lastIndex = TOKEN_RE.lastIndex;
  }
  result += highlightPlain(escaped.slice(lastIndex));
  return result;
}

function highlightPlain(text) {
  return text
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="sh-num">$1</span>')
    .replace(/\b(const|let|var|for|if|else|return|function|new|while|break|continue|switch|case|default)\b/g, '<span class="sh-kw">$1</span>')
    .replace(/\b(Math)\b/g, '<span class="sh-kw">$1</span>');
}
