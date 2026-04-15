<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Asbury</h1>
      <p class="subtitle">Admin Dashboard Login</p>
      <div v-if="error" class="error-msg">{{ error }}</div>
      <div class="field">
        <label>Email</label>
        <input v-model="email" type="email" placeholder="admin@asbury.com" @keyup.enter="login" />
      </div>
      <div class="field">
        <label>Password</label>
        <input v-model="password" type="password" placeholder="••••••••" @keyup.enter="login" />
      </div>
      <button class="submit-btn" :disabled="loading" @click="login">
        {{ loading ? 'Signing in...' : 'Sign In' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { API_BASE } from '../config.js';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function login() {
  error.value = '';
  loading.value = true;
  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    router.push('/admin/home');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; padding: 20px;
  background: linear-gradient(135deg, rgba(1,51,102,0.06), rgba(0,147,156,0.08));
}
.login-card {
  background: #fff; border-radius: 16px; padding: 40px;
  max-width: 420px; width: 100%;
  box-shadow: 0 8px 40px rgba(0,0,0,0.1);
}
h1 { font-size: 26px; font-weight: 700; color: #00939C; margin-bottom: 4px; }
.subtitle { color: #6B7280; font-size: 14px; margin-bottom: 28px; }
.field { margin-bottom: 18px; }
.field label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
.field input { width: 100%; }
.submit-btn {
  width: 100%; padding: 12px; background: #00939C; color: #fff;
  border: none; border-radius: 8px; font-size: 15px; font-weight: 600;
  cursor: pointer; font-family: 'Poppins', sans-serif; margin-top: 4px;
}
.submit-btn:hover { opacity: 0.9; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-msg {
  background: #FEF2F2; border: 1px solid #FECACA; color: #EF4444;
  padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 13px;
}
</style>
