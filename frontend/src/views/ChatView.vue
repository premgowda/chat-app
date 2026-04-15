<template>
  <!-- Contact Form Overlay -->
  <div v-if="showForm" class="contact-form-overlay">
    <div class="contact-form-container">
      <div class="contact-form-header">
        <div class="contact-form-title">Let's Get Started</div>
        <div class="contact-form-subtitle">Please provide your information to begin chatting</div>
      </div>
      <form @submit.prevent="submitForm">
        <div class="contact-form-row">
          <div class="contact-form-group">
            <label class="contact-form-label required">First Name</label>
            <input v-model="form.firstName" class="contact-form-input" placeholder="John" />
            <div v-if="errors.firstName" class="contact-form-error active">Please enter your first name</div>
          </div>
          <div class="contact-form-group">
            <label class="contact-form-label required">Last Name</label>
            <input v-model="form.lastName" class="contact-form-input" placeholder="Doe" />
            <div v-if="errors.lastName" class="contact-form-error active">Please enter your last name</div>
          </div>
        </div>
        <div class="contact-form-group">
          <label class="contact-form-label required">Email</label>
          <input v-model="form.email" type="email" class="contact-form-input" placeholder="john.doe@example.com" />
          <div v-if="errors.email" class="contact-form-error active">Please enter a valid email address</div>
        </div>
        <div class="contact-form-group">
          <label class="contact-form-label">Phone (Optional)</label>
          <input v-model="form.phone" type="tel" class="contact-form-input" placeholder="(555) 123-4567" />
        </div>
        <button type="submit" class="contact-form-submit" :disabled="submitting">
          {{ submitting ? 'Starting...' : 'Start Chatting' }}
        </button>
      </form>
    </div>
  </div>

  <!-- Chat Window (full page, same style as original) -->
  <div v-else class="chat-page">
    <div class="chat-window">
      <div class="chat-header">
        <div class="chat-header-content">
          <img :src="aiAvatarUrl" alt="AI Avatar" class="chat-avatar-header" />
          <span class="chat-title">Chat with Sophie</span>
          <span class="chat-note">Note: refreshing the page will clear the conversation</span>
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
import { ref, nextTick, onMounted } from 'vue';
import { API_BASE } from '../config.js';

const aiAvatarUrl = 'https://res.cloudinary.com/dj7vfd5hv/image/upload/e_enhance/Sophie_udkp0r.png';
const userAvatarUrl = 'https://res.cloudinary.com/dj7vfd5hv/image/upload/e_enhance/Asbury_Logo_nmvisg.jpg';

const showForm = ref(true);
const submitting = ref(false);
const form = ref({ firstName: '', lastName: '', email: '', phone: '' });
const errors = ref({});

const messages = ref([]);
const inputText = ref('');
const loading = ref(false);
const messagesEl = ref(null);
const inputEl = ref(null);

let sessionId = '';
let userEmail = '';
let msgId = 0;

// Check sessionStorage for returning user
onMounted(() => {
  const saved = sessionStorage.getItem('chatbot_user_info');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.email) {
        form.value = parsed;
        userEmail = parsed.email;
        sessionId = sessionStorage.getItem('chatbot_session_id') || `sess_${Date.now()}`;
        sessionStorage.setItem('chatbot_session_id', sessionId);
        showForm.value = false;
        addAIMessage("Hello, I'm Sophie, your HR Assistant. I'm here to help you with policies, requests, and employee support. How can I assist you today?");
      }
    } catch {}
  }
});

function submitForm() {
  errors.value = {};
  if (!form.value.firstName.trim()) errors.value.firstName = true;
  if (!form.value.lastName.trim()) errors.value.lastName = true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.value.email.trim() || !emailRegex.test(form.value.email)) errors.value.email = true;
  if (Object.keys(errors.value).length) return;

  submitting.value = true;
  userEmail = form.value.email;
  sessionId = `sess_${Date.now()}`;

  // Save to sessionStorage
  sessionStorage.setItem('chatbot_user_info', JSON.stringify(form.value));
  sessionStorage.setItem('chatbot_session_id', sessionId);

  // Register user in backend
  fetch(`${API_BASE}/api/chat/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  }).catch(() => {});

  showForm.value = false;
  submitting.value = false;

  addAIMessage("Hello, I'm Sophie, your HR Assistant. I'm here to help you with policies, requests, and employee support. How can I assist you today?");
}

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMessage(text) {
  // Same markdown formatting as original
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/^### (.+)$/gm, '<h3 style="margin:8px 0 4px;font-size:14px;font-weight:bold">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 style="margin:10px 0 6px;font-size:16px;font-weight:bold">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 style="margin:12px 0 8px;font-size:18px;font-weight:bold">$1</h1>');

  // Lists
  text = text.replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin:6px 0 2px;font-weight:bold;line-height:1.4"><span style="margin-right:8px">$1.</span>$2</div>');
  text = text.replace(/^[•\-*+]\s(.+)$/gm, '<div style="margin:2px 0 2px 20px;line-height:1.4">• $1</div>');

  // URLs
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  text = text.replace(/\n\s*\n/g, '<br><br>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

function addAIMessage(text) {
  messages.value.push({
    id: ++msgId,
    sender: 'ai',
    html: formatMessage(text),
    time: getCurrentTime(),
  });
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

async function send() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  messages.value.push({
    id: ++msgId,
    sender: 'user',
    html: text,
    time: getCurrentTime(),
  });
  inputText.value = '';
  if (inputEl.value) inputEl.value.style.height = 'auto';
  loading.value = true;
  await scrollBottom();

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sessionId,
        email: userEmail,
        firstName: form.value.firstName,
        lastName: form.value.lastName,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let streamMsgId = ++msgId;
    let started = false;

    // Add placeholder message
    messages.value.push({ id: streamMsgId, sender: 'ai', html: '', time: getCurrentTime() });
    loading.value = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (dataStr === '[DONE]' || dataStr === '') continue;
        try {
          const json = JSON.parse(dataStr);
          if (!json.ai_message || json.ai_message.trim() === '') continue;
          if (json.ai_score && json.ai_score > 0) continue;
          accumulated += json.ai_message;
          started = true;

          // Update the message in place
          const idx = messages.value.findIndex((m) => m.id === streamMsgId);
          if (idx >= 0) messages.value[idx].html = formatMessage(accumulated);
          await scrollBottom();
        } catch {}
      }
    }

    if (!started) {
      const idx = messages.value.findIndex((m) => m.id === streamMsgId);
      if (idx >= 0) messages.value[idx].html = "Sorry, I didn't receive a response. Please try again.";
    }
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

  await scrollBottom();
}
</script>

<style scoped>
/* ==============================
   CONTACT FORM - matches original
   ============================== */
.contact-form-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex; align-items: center; justify-content: center;
}
.contact-form-container {
  background: #fff; border-radius: 16px; padding: 32px;
  max-width: 450px; width: 90%;
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
}
.contact-form-input:focus { border-color: #00939C; box-shadow: 0 0 0 3px rgba(0,147,156,0.12); }
.contact-form-input::placeholder { color: #9CA3AF; }
.contact-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.contact-form-submit {
  width: 100%; padding: 12px; background: #00939C; color: #fff;
  border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
  cursor: pointer; font-family: 'Poppins', sans-serif; margin-top: 8px;
}
.contact-form-submit:hover { opacity: 0.9; }
.contact-form-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.contact-form-error { color: #EF4444; font-size: 12px; margin-top: 4px; }
.contact-form-error.active { display: block; }

@media (max-width: 480px) {
  .contact-form-container { padding: 24px; width: 95%; }
  .contact-form-title { font-size: 20px; }
  .contact-form-row { grid-template-columns: 1fr; }
}

/* ==============================
   CHAT WINDOW - matches original
   ============================== */
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
  display: flex; flex-direction: column; align-items: center;
  padding: 8px 10px 12px; border-bottom: 1px solid rgba(0,147,156,0.2);
  background: linear-gradient(135deg, rgba(1,51,102,0.06) 0%, rgba(0,147,156,0.08) 100%);
  flex-shrink: 0;
}
.chat-header-content { display: flex; flex-direction: column; align-items: center; width: 100%; }
.chat-avatar-header { width: 40px; height: 40px; border-radius: 50%; margin-bottom: 4px; object-fit: cover; }
.chat-title { font-size: 14px; font-weight: 600; color: #013366; margin-bottom: 2px; text-align: center; }
.chat-note { font-size: 12px; color: #888; font-style: italic; text-align: center; line-height: 1.15; }

.chat-messages {
  flex: 1; overflow-y: auto; padding: 10px; min-height: 0;
  display: flex; flex-direction: column;
  scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent;
  -webkit-overflow-scrolling: touch;
}
.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }

.chat-message { display: flex; align-items: flex-start; margin-bottom: 20px; max-width: 100%; }
.chat-message.ai { gap: 12px; }
.chat-message.user {
  justify-content: flex-end; flex-direction: row-reverse; gap: 8px;
  max-width: 70%; margin-left: auto;
  animation: fadeInUp 0.3s ease forwards;
}
@keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

.chat-message-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; object-fit: cover; margin-top: 2px; }
.chat-message-content { min-width: 0; overflow-wrap: break-word; }

.chat-message.ai .chat-message-content {
  background: transparent; color: #313131; padding: 0; width: 100%;
}
.chat-message.user .chat-message-content {
  background: #013366; color: #fff; border-radius: 18px; padding: 10px 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08); display: inline-block;
}

.chat-message-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 8px; }
.chat-message.user .chat-message-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); }
.chat-message.ai .chat-message-name { font-size: 11px; font-weight: 500; color: #888; }
.chat-message.user .chat-message-time { font-size: 10px; color: rgba(255,255,255,0.8); margin-left: auto; }
.chat-message.ai .chat-message-time { font-size: 9px; color: #aaa; display: none; }

.chat-message-text { font-size: 14px; line-height: 1.5; word-wrap: break-word; }
.chat-message.ai .chat-message-text { font-size: 14px; line-height: 1.6; color: #313131; }
.chat-message-text :deep(a) { color: #00939C; text-decoration: underline; }

/* Typing indicator */
.chat-typing-indicator { display: inline-flex; align-items: center; padding: 7px 0; }
.chat-typing-indicator span {
  height: 8px; width: 8px; background: #00939C; border-radius: 50%;
  display: inline-block; margin-right: 5px; animation: typing 0.5s infinite ease-in-out;
}
.chat-typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.chat-typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0% { transform:translateY(0); } 50% { transform:translateY(-5px); } 100% { transform:translateY(0); } }

/* Input bar */
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
  border-radius: 24px; box-sizing: border-box;
  scrollbar-width: thin;
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
  .chat-header { padding-top: max(8px, env(safe-area-inset-top)); }
  .chat-input-bar { padding-bottom: max(4px, env(safe-area-inset-bottom)); }
}
</style>
