<template>
  <div class="admin-page">
    <h2>Dashboard</h2>

    <!-- Stats -->
    <div v-if="stats" class="stats-grid">
      <div class="stat-card"><span class="stat-label">Total Users</span><span class="stat-value">{{ stats.totalUsers }}</span></div>
      <div class="stat-card"><span class="stat-label">Conversations</span><span class="stat-value">{{ stats.totalSessions }}</span></div>
      <div class="stat-card success"><span class="stat-label">Answered</span><span class="stat-value">{{ stats.answered }}</span></div>
      <div class="stat-card danger"><span class="stat-label">Unanswered</span><span class="stat-value">{{ stats.unanswered }}</span></div>
      <div class="stat-card warning"><span class="stat-label">Pending</span><span class="stat-value">{{ stats.pending }}</span></div>
      <div class="stat-card accent"><span class="stat-label">Success Rate</span><span class="stat-value">{{ stats.successRate }}%</span></div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="{ active: tab === 'sessions' }" @click="tab = 'sessions'">Sessions</button>
      <button :class="{ active: tab === 'topics' }" @click="tab = 'topics'; loadTopics()">Topics</button>
      <button :class="{ active: tab === 'users' }" @click="tab = 'users'; loadUsers()">Users</button>
      <button :class="{ active: tab === 'escalated' }" @click="tab = 'escalated'; loadNegative()">Escalated</button>
    </div>

    <!-- Sessions -->
    <div v-if="tab === 'sessions'">
      <div class="filter-bar">
        <button :class="{ active: filter === '' }" @click="filter = ''; loadSessions()">All</button>
        <button :class="{ active: filter === 'answered' }" @click="filter = 'answered'; loadSessions()">Answered</button>
        <button :class="{ active: filter === 'unanswered' }" @click="filter = 'unanswered'; loadSessions()">Unanswered</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Topic</th><th>Status</th><th>Outcome</th><th>Msgs</th><th>Neg</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="s in sessions" :key="s.id">
              <td>{{ s.display_name }}<br/><small>{{ s.email }}</small></td>
              <td><span class="topic-tag">{{ s.topic || 'General' }}</span></td>
              <td><span :class="['badge', s.status]">{{ s.status }}</span></td>
              <td><span :class="['badge', s.outcome]">{{ s.outcome }}</span></td>
              <td>{{ s.message_count }}</td>
              <td>{{ s.negative_messages || 0 }}</td>
              <td class="mono">{{ fmtDate(s.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="pagination.pages > 1" class="pagination">
        <button :disabled="pagination.page <= 1" @click="pagination.page--; loadSessions()">←</button>
        <span>{{ pagination.page }} / {{ pagination.pages }}</span>
        <button :disabled="pagination.page >= pagination.pages" @click="pagination.page++; loadSessions()">→</button>
      </div>
    </div>

    <!-- Topics -->
    <div v-if="tab === 'topics'">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Topic</th><th>Total</th><th>Answered</th><th>Unanswered</th><th>Pending</th><th>Escalated</th><th>Success Rate</th></tr></thead>
          <tbody>
            <tr v-for="t in topicStats" :key="t.topic">
              <td><span class="topic-tag">{{ t.topic }}</span></td>
              <td>{{ t.total }}</td>
              <td class="text-green">{{ t.answered }}</td>
              <td class="text-red">{{ t.unanswered }}</td>
              <td class="text-orange">{{ t.pending }}</td>
              <td class="text-red">{{ t.escalated }}</td>
              <td>
                <div class="rate-bar">
                  <div class="rate-fill" :style="{ width: topicRate(t) + '%' }"></div>
                  <span>{{ topicRate(t) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Users -->
    <div v-if="tab === 'users'">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Sessions</th><th>Joined</th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.display_name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.phone || '—' }}</td>
              <td><span :class="['badge', u.role]">{{ u.role }}</span></td>
              <td>{{ u.session_count }}</td>
              <td class="mono">{{ fmtDate(u.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Escalated -->
    <div v-if="tab === 'escalated'">
      <div class="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Bot Response</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="m in negativeMessages" :key="m.id">
              <td>{{ m.display_name }}<br/><small>{{ m.email }}</small></td>
              <td class="content-cell">{{ m.content }}</td>
              <td class="mono">{{ new Date(m.created_at).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { API_BASE } from '../config.js';

const token = localStorage.getItem('admin_token');
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const stats = ref(null);
const tab = ref('sessions');
const filter = ref('');
const sessions = ref([]);
const users = ref([]);
const negativeMessages = ref([]);
const topicStats = ref([]);
const pagination = ref({ page: 1, pages: 1 });

function fmtDate(d) { return new Date(d).toLocaleDateString(); }
function topicRate(t) {
  const resolved = Number(t.answered) + Number(t.unanswered);
  return resolved === 0 ? 0 : Math.round((Number(t.answered) / resolved) * 100);
}

async function api(url) {
  const res = await fetch(`${API_BASE}${url}`, { headers });
  if (res.status === 401) { localStorage.removeItem('admin_token'); window.location.href = '/admin/login'; }
  return res.json();
}

onMounted(async () => {
  stats.value = await api('/api/admin/stats');
  await loadSessions();
});

async function loadSessions() {
  const params = new URLSearchParams({ page: pagination.value.page, limit: 20 });
  if (filter.value) params.set('outcome', filter.value);
  const data = await api(`/api/admin/sessions?${params}`);
  sessions.value = data.sessions;
  pagination.value = { page: data.page, pages: data.pages };
}
async function loadUsers() { users.value = await api('/api/admin/users'); }
async function loadNegative() { negativeMessages.value = await api('/api/admin/negative-messages'); }
async function loadTopics() { topicStats.value = await api('/api/admin/stats/topics'); }
</script>

<style scoped>
.admin-page { max-width: 1100px; margin: 0 auto; padding: 28px 24px; }
h2 { margin-bottom: 20px; font-size: 22px; font-weight: 700; color: #013366; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 12px; margin-bottom: 28px; }
.stat-card {
  background: #fff; border: 1px solid rgba(0,147,156,0.15); border-radius: 12px;
  text-align: center; padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-label { display: block; font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 500; }
.stat-value { font-size: 28px; font-weight: 700; color: #1F2937; }
.stat-card.success .stat-value { color: #22C55E; }
.stat-card.danger .stat-value { color: #EF4444; }
.stat-card.warning .stat-value { color: #F59E0B; }
.stat-card.accent .stat-value { color: #00939C; }

.tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.tabs button {
  padding: 8px 18px; font-size: 13px; font-weight: 600;
  background: #fff; color: #6B7280; border: 1px solid #D1D5DB; border-radius: 8px;
}
.tabs button.active { color: #00939C; border-color: #00939C; background: rgba(0,147,156,0.04); }

.filter-bar { display: flex; gap: 4px; margin-bottom: 12px; }
.filter-bar button {
  padding: 4px 12px; font-size: 12px; background: #fff; color: #6B7280;
  border: 1px solid #D1D5DB; border-radius: 6px;
}
.filter-bar button.active { color: #00939C; border-color: #00939C; }

.table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; border: 1px solid rgba(0,147,156,0.12); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th {
  text-align: left; padding: 10px 12px; color: #6B7280; font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E5E7EB;
  background: #FAFBFC; font-weight: 600;
}
td { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
small { color: #9CA3AF; font-size: 11px; }
.mono { font-size: 12px; color: #6B7280; }
.content-cell { max-width: 400px; line-height: 1.4; }

.badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
.badge.answered, .badge.resolved { background: #DCFCE7; color: #16A34A; }
.badge.unanswered, .badge.escalated { background: #FEE2E2; color: #DC2626; }
.badge.pending, .badge.active { background: #FEF3C7; color: #D97706; }
.badge.admin { background: rgba(0,147,156,0.1); color: #00939C; }
.badge.user { background: #F3F4F6; color: #6B7280; }

.topic-tag {
  font-size: 12px; font-weight: 500; padding: 2px 10px; border-radius: 12px;
  background: rgba(0,147,156,0.08); color: #00939C; white-space: nowrap;
}

.text-green { color: #22C55E; font-weight: 600; }
.text-red { color: #EF4444; font-weight: 600; }
.text-orange { color: #F59E0B; font-weight: 600; }

.rate-bar { position: relative; background: #F3F4F6; border-radius: 4px; height: 22px; min-width: 80px; overflow: hidden; }
.rate-fill { position: absolute; top: 0; left: 0; height: 100%; background: #22C55E; opacity: 0.2; border-radius: 4px; }
.rate-bar span { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; height: 100%; font-size: 11px; font-weight: 600; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pagination button { padding: 6px 14px; background: #fff; color: #6B7280; border: 1px solid #D1D5DB; border-radius: 8px; }
.pagination button:disabled { opacity: 0.3; cursor: default; }
</style>
