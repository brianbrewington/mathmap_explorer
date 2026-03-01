export function highlightJS(code) {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(\/\/.*)/gm, '<span class="sh-cm">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="sh-num">$1</span>')
    .replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g, '<span class="sh-str">$1</span>')
    .replace(/\b(const|let|var|for|if|else|return|function|new|while|break|continue|switch|case|default)\b/g, '<span class="sh-kw">$1</span>')
    .replace(/\b(Math)\b/g, '<span class="sh-kw">$1</span>');
}
