<template>
  <div class="app">
    <nav v-if="isAdminPage" class="navbar">
      <router-link to="/admin/home" class="logo">ThriveWell Admin</router-link>
      <button class="btn-logout" @click="logout">Logout</button>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const isAdminPage = computed(() => route.path.startsWith('/admin') && route.path !== '/admin/login');

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  router.push('/admin/login');
}
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}
.logo {
  font-weight: 700;
  font-size: 16px;
  color: var(--primary);
}
.btn-logout {
  background: transparent;
  color: var(--text-muted);
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
}
.btn-logout:hover { color: var(--red); border-color: var(--red); }
</style>
