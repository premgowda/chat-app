<template>
  <!-- Campus Selection Overlay -->
  <div v-if="showForm" class="contact-form-overlay">
    <div class="contact-form-container">
      <div class="contact-form-header">
        <div class="contact-form-title">Welcome!</div>
        <div class="contact-form-subtitle">Please select your campus to begin chatting</div>
      </div>
      <form @submit.prevent="submitForm">
        <div class="contact-form-group">
          <label class="contact-form-label required">Campus</label>
          <select v-model="selectedCampus" class="contact-form-input contact-form-select">
            <option value="" disabled>Select your campus</option>
            <option v-for="c in campusList" :key="c" :value="c">{{ c }}</option>
          </select>
          <div v-if="errors.campus" class="contact-form-error active">Please select your campus</div>
        </div>
        <button type="submit" class="contact-form-submit">Start Chatting</button>
      </form>
    </div>
  </div>

  <!-- Chat Window -->
  <div v-else class="chat-page">
    <div class="chat-window">
      <div class="chat-header">
        <div class="chat-header-content">
          <img :src="aiAvatarUrl" alt="AI Avatar" class="chat-avatar-header" />
          <span class="chat-title">Chat with Sophie</span>
          <span class="chat-campus-badge">{{ selectedCampus }}</span>
        </div>
        <div class="header-actions">
          <button class="btn-new-chat" @click="newChat" title="Start new conversation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>New Chat</span>
          </button>
          <button v-if="messages.length > 1" class="btn-download" @click="downloadTranscript" title="Download transcript as PDF">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div class="chat-messages" ref="messagesEl">
        <div v-for="msg in messages" :key="msg.id" :class="['chat-message', msg.sender]">
          <img
            :src="msg.sender === 'ai' ? aiAvatarUrl : userAvatarUrl"
            :alt="msg.sender === 'ai' ? 'AI' : 'You'"
            class="chat-message-avatar"
          />
          <div class="chat-message-content">
            <div class="chat-message-header">
              <span class="chat-message-name">{{ msg.sender === 'ai' ? 'Sophie' : 'You' }}</span>
              <span class="chat-message-time">{{ msg.time }}</span>
            </div>
            <div class="chat-message-text" v-html="msg.html"></div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="loading" class="chat-message ai">
          <img :src="aiAvatarUrl" alt="AI" class="chat-message-avatar" />
          <div class="chat-message-content">
            <div class="chat-message-header">
              <span class="chat-message-name">Sophie</span>
            </div>
            <div class="chat-message-text">
              <div class="chat-typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-bar">
        <div class="chat-input-wrapper">
          <textarea
            ref="inputEl"
            v-model="inputText"
            class="chat-input"
            rows="1"
            placeholder="Type your message..."
            @keypress.enter.exact.prevent="send"
            @input="autoResize"
          ></textarea>
          <button class="chat-send-inline" @click="send">
            <svg viewBox="0 0 16 13" xmlns="http://www.w3.org/2000/svg"><path d="M1.375 12.7918C1.16667 12.8751 0.96875 12.8577 0.78125 12.7397C0.59375 12.6216 0.5 12.4515 0.5 12.2293V8.54177C0.5 8.38899 0.545139 8.25704 0.635417 8.14593C0.725694 8.03482 0.840278 7.96538 0.979167 7.9376L6.79167 6.5001L0.979167 5.02093C0.840278 4.99315 0.725694 4.92371 0.635417 4.8126C0.545139 4.70149 0.5 4.56954 0.5 4.41677V0.770932C0.5 0.54871 0.59375 0.378571 0.78125 0.260515C0.96875 0.14246 1.16667 0.125099 1.375 0.208432L14.9583 5.91677C15.2083 6.02788 15.3333 6.22232 15.3333 6.5001C15.3333 6.77788 15.2083 6.97232 14.9583 7.08343L1.375 12.7918Z"/></svg>
          </button>
        </div>
      </div>

      <div class="chat-footer">
        <div class="footer-disclaimer"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch } from 'vue';
import { API_BASE } from '../config.js';

const aiAvatarUrl = 'https://res.cloudinary.com/dj7vfd5hv/image/upload/e_enhance/Sophie_udkp0r.png';
const userAvatarUrl = 'https://res.cloudinary.com/dj7vfd5hv/image/upload/e_enhance/Asbury_Logo_nmvisg.jpg';

const campusList = ['Bethany Village', 'Spring Hills'];

const showForm = ref(true);
const selectedCampus = ref('');
const errors = ref({});

const messages = ref([]);
const inputText = ref('');
const loading = ref(false);
const messagesEl = ref(null);
const inputEl = ref(null);

let sessionId = '';
let visitorId = '';
let msgId = 0;

const WELCOME_MSG = "Hello, I'm Sophie, your HR Assistant. I'm here to help you with policies, requests, and employee support. How can I assist you today?";

// ========== PERSISTENCE ==========

function saveChat() {
  localStorage.setItem('tw_messages', JSON.stringify(messages.value));
  localStorage.setItem('tw_session_id', sessionId);
  localStorage.setItem('tw_msg_id', String(msgId));
}

function getOrCreateVisitorId() {
  let id = localStorage.getItem('tw_visitor_id');
  if (!id) {
    id = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('tw_visitor_id', id);
  }
  return id;
}

// ========== INIT ==========

onMounted(() => {
  visitorId = getOrCreateVisitorId();

  const savedCampus = localStorage.getItem('tw_campus');
  const savedMessages = localStorage.getItem('tw_messages');
  const savedSession = localStorage.getItem('tw_session_id');
  const savedMsgId = localStorage.getItem('tw_msg_id');

  if (savedCampus) {
    selectedCampus.value = savedCampus;
    sessionId = savedSession || `sess_${Date.now()}`;
    showForm.value = false;

    if (savedMessages) {
      try {
        messages.value = JSON.parse(savedMessages);
        msgId = parseInt(savedMsgId || '0');
      } catch {
        messages.value = [];
      }
    }

    // If no saved messages, show welcome
    if (messages.value.length === 0) {
      addAIMessage(WELCOME_MSG);
    }

    nextTick(() => scrollBottom());
  }
});

// ========== FORM ==========

function submitForm() {
  errors.value = {};
  if (!selectedCampus.value) { errors.value.campus = true; return; }

  sessionId = `sess_${Date.now()}`;
  localStorage.setItem('tw_campus', selectedCampus.value);
  localStorage.setItem('tw_session_id', sessionId);

  // Register visitor
  fetch(`${API_BASE}/api/chat/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId, campus: selectedCampus.value }),
  }).catch(() => {});

  showForm.value = false;
  addAIMessage(WELCOME_MSG);
}

// ========== NEW CHAT ==========

function newChat() {
  messages.value = [];
  msgId = 0;
  sessionId = `sess_${Date.now()}`;
  localStorage.setItem('tw_session_id', sessionId);
  localStorage.removeItem('tw_messages');
  localStorage.removeItem('tw_msg_id');
  addAIMessage(WELCOME_MSG);
}

// ========== HELPERS ==========

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMessage(text) {
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/^\s+|\s+$/g, '');

  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/^### (.+)$/gm, '<h3 style="margin:4px 0 2px;font-size:14px;font-weight:bold">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 style="margin:6px 0 3px;font-size:15px;font-weight:bold">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 style="margin:6px 0 3px;font-size:16px;font-weight:bold">$1</h1>');

  text = text.replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin:0;padding:1px 0;line-height:1.35"><span style="margin-right:5px;font-weight:600">$1.</span>$2</div>');
  text = text.replace(/^[•\-*+]\s(.+)$/gm, '<div style="margin:0;padding:1px 0 1px 14px;line-height:1.35">• $1</div>');

  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  text = text.replace(/\n\s*\n/g, '<br>');
  text = text.replace(/\n/g, '<br>');
  text = text.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');
  text = text.replace(/<\/div>\s*(<br\s*\/?>)+\s*<div style="/g, '</div><div style="');
  return text;
}

function addAIMessage(text) {
  messages.value.push({
    id: ++msgId,
    sender: 'ai',
    html: formatMessage(text),
    time: getCurrentTime(),
  });
  saveChat();
  scrollBottom();
}

async function scrollBottom() {
  await nextTick();
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
}

function autoResize() {
  if (!inputEl.value) return;
  inputEl.value.style.height = 'auto';
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 150) + 'px';
}

// ========== SEND ==========

async function send() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  messages.value.push({ id: ++msgId, sender: 'user', html: text, time: getCurrentTime() });
  inputText.value = '';
  if (inputEl.value) inputEl.value.style.height = 'auto';
  loading.value = true;
  saveChat();
  await scrollBottom();

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sessionId,
        visitorId,
        formCampus: selectedCampus.value,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    loading.value = false;

    messages.value.push({
      id: ++msgId,
      sender: 'ai',
      html: formatMessage(data.message || 'No response received'),
      time: getCurrentTime(),
    });
  } catch (err) {
    loading.value = false;
    messages.value.push({
      id: ++msgId,
      sender: 'ai',
      html: err.message.includes('403')
        ? 'Access denied. Please check your configuration.'
        : 'Sorry, there was an error processing your request.',
      time: getCurrentTime(),
    });
  }

  saveChat();
  await scrollBottom();
}

// ========== PDF DOWNLOAD ==========

function downloadTranscript() {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let rows = '';
  for (const msg of messages.value) {
    const name = msg.sender === 'ai' ? 'Sophie' : 'You';
    const bgColor = msg.sender === 'ai' ? '#f8fafb' : '#eef4fa';
    const nameColor = msg.sender === 'ai' ? '#00939C' : '#013366';
    const cleanText = msg.html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n');
    const textHtml = cleanText.replace(/\n/g, '<br>');
    rows += `<tr>
      <td style="padding:10px 14px;background:${bgColor};border-bottom:1px solid #e8ecf0;vertical-align:top;width:80px;">
        <strong style="color:${nameColor};font-size:12px;">${name}</strong><br>
        <span style="color:#999;font-size:10px;">${msg.time}</span>
      </td>
      <td style="padding:10px 14px;background:${bgColor};border-bottom:1px solid #e8ecf0;font-size:13px;line-height:1.45;color:#313131;">${textHtml}</td>
    </tr>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Chat Transcript - ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
  body { font-family: 'Poppins', sans-serif; margin: 0; padding: 30px; color: #313131; }
  .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #00939C; }
  .header h1 { font-size: 20px; color: #013366; margin: 0 0 4px; }
  .header p { font-size: 12px; color: #888; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>Chat Transcript</h1>
  <p>Campus: ${selectedCampus.value} &bull; ${date} at ${time}</p>
</div>
<table>${rows}</table>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}
</script>

<style scoped>
/* ============================== FORM ============================== */
.contact-form-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  z-index: 10000; display: flex; align-items: center; justify-content: center;
}
.contact-form-container {
  background: #fff; border-radius: 16px; padding: 32px;
  max-width: 400px; width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: slideUp 0.3s ease-out;
  font-family: 'Poppins', sans-serif;
}
@keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
.contact-form-header { text-align: center; margin-bottom: 24px; }
.contact-form-title { font-size: 24px; font-weight: bold; color: #1F2937; margin-bottom: 8px; }
.contact-form-subtitle { font-size: 14px; color: #6B7280; }
.contact-form-group { margin-bottom: 16px; }
.contact-form-label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
.contact-form-label.required::after { content: " *"; color: #EF4444; }
.contact-form-input {
  width: 100%; padding: 10px 14px; font-size: 14px;
  border: 1px solid #D1D5DB; border-radius: 8px; outline: none;
  transition: border-color 0.2s; font-family: 'Poppins', sans-serif;
  box-sizing: border-box;
}
.contact-form-input:focus { border-color: #00939C; box-shadow: 0 0 0 3px rgba(0,147,156,0.12); }
.contact-form-select {
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
  background-color: #fff; padding-right: 36px; cursor: pointer; color: #374151;
}
.contact-form-submit {
  width: 100%; padding: 12px; background: #00939C; color: #fff;
  border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
  cursor: pointer; font-family: 'Poppins', sans-serif; margin-top: 4px;
}
.contact-form-submit:hover { opacity: 0.9; }
.contact-form-error { color: #EF4444; font-size: 12px; margin-top: 4px; }

/* ============================== CHAT ============================== */
.chat-page {
  display: flex; justify-content: center; align-items: center;
  min-height: 100vh; padding: 20px;
  background: rgba(236,242,248,0.85);
}
.chat-window {
  width: 90vw; max-width: 800px; height: 90vh; max-height: 750px;
  background: #fff; border-radius: 20px; display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.12);
  animation: fadeIn 0.3s ease forwards;
}
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 1px solid rgba(0,147,156,0.2);
  background: linear-gradient(135deg, rgba(1,51,102,0.06) 0%, rgba(0,147,156,0.08) 100%);
  flex-shrink: 0; gap: 10px;
}
.chat-header-content { display: flex; align-items: center; gap: 10px; min-width: 0; }
.chat-avatar-header { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.chat-title { font-size: 14px; font-weight: 600; color: #013366; white-space: nowrap; }
.chat-campus-badge {
  font-size: 11px; font-weight: 500; padding: 2px 10px; border-radius: 12px;
  background: rgba(0,147,156,0.1); color: #00939C; white-space: nowrap;
}

.header-actions { display: flex; gap: 6px; flex-shrink: 0; }
.btn-new-chat, .btn-download {
  display: flex; align-items: center; gap: 4px;
  background: #fff; border: 1px solid rgba(0,147,156,0.3);
  border-radius: 8px; padding: 5px 10px;
  font-size: 11px; font-weight: 600; color: #00939C;
  cursor: pointer; transition: all 0.15s; font-family: 'Poppins', sans-serif;
}
.btn-new-chat:hover, .btn-download:hover { background: rgba(0,147,156,0.06); border-color: #00939C; }
.btn-new-chat svg, .btn-download svg { flex-shrink: 0; }

.chat-messages {
  flex: 1; overflow-y: auto; padding: 10px; min-height: 0;
  display: flex; flex-direction: column;
  scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent;
  -webkit-overflow-scrolling: touch;
}
.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }

.chat-message { display: flex; align-items: flex-start; margin-bottom: 12px; max-width: 100%; }
.chat-message.ai { gap: 10px; }
.chat-message.user {
  justify-content: flex-end; flex-direction: row-reverse; gap: 8px;
  max-width: 70%; margin-left: auto;
  animation: fadeInUp 0.3s ease forwards;
}
@keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

.chat-message-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; object-fit: cover; margin-top: 2px; }
.chat-message-content { min-width: 0; overflow-wrap: break-word; }
.chat-message.ai .chat-message-content { background: transparent; color: #313131; padding: 0; width: 100%; }
.chat-message.user .chat-message-content {
  background: #013366; color: #fff; border-radius: 18px; padding: 10px 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08); display: inline-block;
}

.chat-message-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 8px; }
.chat-message.user .chat-message-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); }
.chat-message.ai .chat-message-name { font-size: 11px; font-weight: 500; color: #888; }
.chat-message.user .chat-message-time { font-size: 10px; color: rgba(255,255,255,0.8); margin-left: auto; }
.chat-message.ai .chat-message-time { font-size: 9px; color: #aaa; display: none; }

.chat-message-text { font-size: 13px; line-height: 1.4; word-wrap: break-word; }
.chat-message.ai .chat-message-text { font-size: 13px; line-height: 1.45; color: #313131; }
.chat-message-text :deep(a) { color: #00939C; text-decoration: underline; }
.chat-message-text :deep(br) { display: block; margin-bottom: 1px; content: ""; }
.chat-message-text :deep(h1), .chat-message-text :deep(h2), .chat-message-text :deep(h3) { line-height: 1.3; }

/* Typing */
.chat-typing-indicator { display: inline-flex; align-items: center; padding: 7px 0; }
.chat-typing-indicator span {
  height: 8px; width: 8px; background: #00939C; border-radius: 50%;
  display: inline-block; margin-right: 5px; animation: typing 0.5s infinite ease-in-out;
}
.chat-typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.chat-typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0% { transform:translateY(0); } 50% { transform:translateY(-5px); } 100% { transform:translateY(0); } }

/* Input */
.chat-input-bar { padding: 6px 15px 4px; flex-shrink: 0; }
.chat-input-wrapper {
  position: relative; display: flex; align-items: flex-start;
  padding: 0 40px 0 0; background: #fff;
  border: 1px solid rgba(0,147,156,0.3); border-radius: 24px;
}
.chat-input {
  width: 100%; border: none; background: #fff; font-family: 'Poppins', sans-serif;
  font-size: 14px; line-height: 1.5; color: #333; outline: none;
  resize: none !important; overflow-y: auto !important;
  padding: 12px 15px; min-height: 44px; max-height: 150px;
  border-radius: 24px; box-sizing: border-box; scrollbar-width: thin;
}
.chat-input::placeholder { color: #CCC; }
.chat-send-inline {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; padding: 5px;
  display: flex; align-items: center; justify-content: center;
}
.chat-send-inline:hover { opacity: 0.7; }
.chat-send-inline svg { width: 20px; height: 20px; fill: #00939C; display: block; }

.chat-footer { padding: 4px 15px 6px; flex-shrink: 0; }
.footer-disclaimer { font-size: 12px; color: #888; text-align: center; }

/* Responsive */
@media (max-width: 768px) {
  .chat-page { padding: 0; }
  .chat-window {
    width: 100vw; height: 100vh; height: 100dvh;
    max-width: 100%; max-height: 100dvh; border-radius: 0;
  }
  .chat-header { padding-top: max(10px, env(safe-area-inset-top)); }
  .chat-input-bar { padding-bottom: max(4px, env(safe-area-inset-bottom)); }
  .btn-new-chat span, .btn-download span { display: none; }
  .btn-new-chat, .btn-download { padding: 6px 8px; }
}
</style>
