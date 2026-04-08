import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/chat', name: 'Chat', component: () => import('../views/ChatView.vue') },
  { path: '/admin/login', name: 'AdminLogin', component: () => import('../views/AdminLogin.vue'), meta: { guest: true } },
  { path: '/admin/home', name: 'AdminHome', component: () => import('../views/AdminHome.vue'), meta: { admin: true } },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  if (to.meta.admin) {
    const token = localStorage.getItem('admin_token');
    if (!token) return '/admin/login';
  }
  if (to.meta.guest) {
    const token = localStorage.getItem('admin_token');
    if (token) return '/admin/home';
  }
});

export default router;
