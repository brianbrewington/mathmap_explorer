import { getAll } from '../explorations/registry.js';
import { fetchOllamaTags, getOllamaUrl } from '../ollama.js';

const CHAT_MODELS = ['llama3.1:8b', 'llama3.2:3b', 'llama3.1', 'llama3.2', 'llama3', 'mistral', 'gemma2', 'qwen2.5'];

let chatContainer = null;
let onNavigate = null;
let chatModel = null;
let messages = [];
let isStreaming = false;

function buildSystemPrompt() {
  const explorations = getAll();
  const catalog = explorations.map(E =>
    `- [${E.id}] ${E.title} (${E.category}): ${E.description || ''}. Tags: ${(E.tags || []).join(', ')}`
  ).join('\n');

  return `You are a helpful guide for the IFS Explorer, a web application for exploring iterated function systems, fractals, strange attractors, and related mathematics.

Available explorations:
${catalog}

When recommending an exploration, use its exact id in square brackets like [mandelbrot] so the user can click to navigate. Keep responses concise and focused on helping the user find interesting things to explore. You can explain the mathematics briefly when relevant.`;
}

async function detectChatModel() {
  const data = await fetchOllamaTags();
  if (!data) return null;
  const available = (data.models || []).map(m => m.name);
  for (const preferred of CHAT_MODELS) {
    const match = available.find(m => m === preferred || m.startsWith(preferred + ':'));
    if (match) return match;
  }
  return available.length > 0 ? available[0] : null;
}

export async function initChatPanel(container, navigateCallback) {
  onNavigate = navigateCallback;
  chatModel = await detectChatModel();

  if (!chatModel) return false;

  chatContainer = container;
  container.innerHTML = `
    <div class="chat-panel collapsed" id="chat-panel-inner">
      <button class="chat-toggle" id="chat-toggle" title="Ask about explorations">?</button>
      <div class="chat-body">
        <div class="chat-messages" id="chat-messages">
          <div class="chat-msg assistant">What would you like to explore? I can help you find interesting fractals, attractors, and mathematical phenomena.</div>
        </div>
        <div class="chat-input-wrap">
          <input type="text" class="chat-input" id="chat-input" placeholder="Ask about explorations\u2026" />
        </div>
      </div>
    </div>
  `;

  const toggle = container.querySelector('#chat-toggle');
  const inner = container.querySelector('#chat-panel-inner');
  const input = container.querySelector('#chat-input');

  toggle.addEventListener('click', () => {
    inner.classList.toggle('collapsed');
    if (!inner.classList.contains('collapsed')) input.focus();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      const text = input.value.trim();
      if (text) { input.value = ''; sendMessage(text); }
    }
  });

  messages = [{ role: 'system', content: buildSystemPrompt() }];

  return true;
}

async function sendMessage(text) {
  const messagesEl = chatContainer.querySelector('#chat-messages');

  // User message
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg user';
  userDiv.textContent = text;
  messagesEl.appendChild(userDiv);

  messages.push({ role: 'user', content: text });

  // Assistant message (streaming)
  const assistantDiv = document.createElement('div');
  assistantDiv.className = 'chat-msg assistant';
  assistantDiv.textContent = '';
  messagesEl.appendChild(assistantDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  isStreaming = true;
  let fullResponse = '';

  try {
    const resp = await fetch(`${getOllamaUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: chatModel, messages, stream: true })
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            fullResponse += data.message.content;
            assistantDiv.innerHTML = formatResponse(fullResponse);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
        } catch { /* partial JSON line */ }
      }
    }

    messages.push({ role: 'assistant', content: fullResponse });
  } catch {
    assistantDiv.textContent = 'Connection to Ollama lost. Is it still running?';
  }

  isStreaming = false;
  bindNavigationLinks(assistantDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatResponse(text) {
  return text.replace(/\[([a-z0-9-]+)\]/g, (match, id) => {
    const explorations = getAll();
    const E = explorations.find(e => e.id === id);
    if (E) return `<button class="chat-nav-link" data-id="${id}">${E.title}</button>`;
    return match;
  });
}

function bindNavigationLinks(el) {
  el.querySelectorAll('.chat-nav-link').forEach(btn => {
    btn.addEventListener('click', () => onNavigate?.(btn.dataset.id));
  });
}
