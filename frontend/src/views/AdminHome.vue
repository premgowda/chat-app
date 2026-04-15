<template>
  <div class="admin-page">
    <h2>Dashboard</h2>

    <!-- Stats Cards -->
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
      <button :class="{ active: tab === 'analytics' }" @click="tab = 'analytics'; loadAnalytics()">Analytics</button>
      <button :class="{ active: tab === 'sessions' }" @click="tab = 'sessions'">Sessions</button>
      <button :class="{ active: tab === 'topics' }" @click="tab = 'topics'; loadTopics()">Topics</button>
      <button :class="{ active: tab === 'users' }" @click="tab = 'users'; loadUsers()">Users</button>
      <button :class="{ active: tab === 'escalated' }" @click="tab = 'escalated'; loadNegative()">Escalated</button>
    </div>

    <!-- ======================== ANALYTICS TAB ======================== -->
    <div v-if="tab === 'analytics'" class="analytics">

      <!-- Row 1: Outcome Donut + Daily Trend -->
      <div class="chart-row">
        <!-- Outcome Donut -->
        <div class="chart-card chart-small">
          <h3>Conversation Outcomes</h3>
          <div v-if="stats" class="donut-wrap">
            <svg viewBox="0 0 200 200" class="donut-svg">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#E5E7EB" stroke-width="24" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="#22C55E" stroke-width="24"
                :stroke-dasharray="donutSegment(stats.answered, stats.totalSessions)" stroke-dashoffset="0"
                transform="rotate(-90 100 100)" stroke-linecap="round" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="#EF4444" stroke-width="24"
                :stroke-dasharray="donutSegment(stats.unanswered, stats.totalSessions)"
                :stroke-dashoffset="'-' + donutOffset(stats.answered, stats.totalSessions)"
                transform="rotate(-90 100 100)" stroke-linecap="round" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="#F59E0B" stroke-width="24"
                :stroke-dasharray="donutSegment(stats.pending, stats.totalSessions)"
                :stroke-dashoffset="'-' + donutOffset(stats.answered + stats.unanswered, stats.totalSessions)"
                transform="rotate(-90 100 100)" stroke-linecap="round" />
              <text x="100" y="95" text-anchor="middle" font-size="28" font-weight="700" fill="#1F2937">{{ stats.successRate }}%</text>
              <text x="100" y="115" text-anchor="middle" font-size="11" fill="#6B7280">success</text>
            </svg>
            <div class="donut-legend">
              <div><span class="dot" style="background:#22C55E"></span> Answered ({{ stats.answered }})</div>
              <div><span class="dot" style="background:#EF4444"></span> Unanswered ({{ stats.unanswered }})</div>
              <div><span class="dot" style="background:#F59E0B"></span> Pending ({{ stats.pending }})</div>
            </div>
          </div>
        </div>

        <!-- Daily Trend Bar Chart -->
        <div class="chart-card chart-wide">
          <h3>Daily Conversations <small>(last 30 days)</small></h3>
          <div v-if="dailyStats.length" class="bar-chart">
            <div class="bar-chart-bars">
              <div v-for="d in dailyStats" :key="d.date" class="bar-group" :title="fmtDateShort(d.date) + ': ' + d.total + ' total'">
                <div class="bar-stack">
                  <div class="bar answered" :style="{ height: barH(d.answered, dailyMax) + 'px' }"></div>
                  <div class="bar unanswered" :style="{ height: barH(d.unanswered, dailyMax) + 'px' }"></div>
                </div>
                <span class="bar-label">{{ dayLabel(d.date) }}</span>
              </div>
            </div>
            <div class="bar-legend">
              <span><span class="dot" style="background:#22C55E"></span> Answered</span>
              <span><span class="dot" style="background:#EF4444"></span> Unanswered</span>
            </div>
          </div>
          <div v-else class="chart-empty">No data yet</div>
        </div>
      </div>

      <!-- Row 2: Topic Distribution + Hourly Activity -->
      <div class="chart-row">
        <!-- Topic Distribution -->
        <div class="chart-card chart-wide">
          <h3>Topic Distribution</h3>
          <div v-if="topicStats.length" class="h-bar-chart">
            <div v-for="t in topicStats.slice(0, 10)" :key="t.topic" class="h-bar-row">
              <span class="h-bar-label">{{ t.topic }}</span>
              <div class="h-bar-track">
                <div class="h-bar-fill answered" :style="{ width: hBarW(t.answered, topicMax) + '%' }"></div>
                <div class="h-bar-fill unanswered" :style="{ width: hBarW(t.unanswered, topicMax) + '%', left: hBarW(t.answered, topicMax) + '%' }"></div>
              </div>
              <span class="h-bar-value">{{ t.total }}</span>
            </div>
          </div>
          <div v-else class="chart-empty">No data yet</div>
        </div>

        <!-- Hourly Activity -->
        <div class="chart-card chart-small">
          <h3>Activity by Hour</h3>
          <div v-if="hourlyStats.length" class="hour-chart">
            <div v-for="h in hourlyStats" :key="h.hour" class="hour-bar"
              :title="h.hour + ':00 — ' + h.count + ' messages'">
              <div class="hour-fill" :style="{ height: barH(h.count, hourlyMax) + 'px', background: hourColor(h.count, hourlyMax) }"></div>
              <span v-if="h.hour % 3 === 0" class="hour-label">{{ h.hour }}h</span>
            </div>
          </div>
          <div v-else class="chart-empty">No data yet</div>
        </div>
      </div>

      <!-- Row 3: Top Users + Weekly Trend -->
      <div class="chart-row">
        <!-- Top Users -->
        <div class="chart-card chart-small">
          <h3>Top Users</h3>
          <div v-if="topUsers.length" class="top-users">
            <div v-for="(u, i) in topUsers" :key="u.email" class="top-user-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <div class="top-user-info">
                <span class="top-user-name">{{ u.display_name }}</span>
                <span class="top-user-email">{{ u.email }}</span>
              </div>
              <div class="top-user-stats">
                <span class="text-green">{{ u.answered }}</span>
                <span class="text-muted">/</span>
                <span class="text-red">{{ u.unanswered }}</span>
                <span class="top-user-total">({{ u.sessions }})</span>
              </div>
            </div>
          </div>
          <div v-else class="chart-empty">No data yet</div>
        </div>

        <!-- Weekly Trend -->
        <div class="chart-card chart-wide">
          <h3>Weekly Trend <small>(last 12 weeks)</small></h3>
          <div v-if="weeklyStats.length" class="bar-chart">
            <div class="bar-chart-bars weekly">
              <div v-for="w in weeklyStats" :key="w.week" class="bar-group" :title="fmtDateShort(w.week_start) + ' — ' + w.total + ' total'">
                <div class="bar-stack">
                  <div class="bar answered" :style="{ height: barH(w.answered, weeklyMax) + 'px' }"></div>
                  <div class="bar unanswered" :style="{ height: barH(w.unanswered, weeklyMax) + 'px' }"></div>
                </div>
                <span class="bar-label">{{ weekLabel(w.week_start) }}</span>
              </div>
            </div>
            <div class="bar-legend">
              <span><span class="dot" style="background:#22C55E"></span> Answered</span>
              <span><span class="dot" style="background:#EF4444"></span> Unanswered</span>
            </div>
          </div>
          <div v-else class="chart-empty">No data yet</div>
        </div>
      </div>
    </div>

    <!-- ======================== SESSIONS TAB ======================== -->
    <div v-if="tab === 'sessions'">
      <div class="filter-bar">
        <button :class="{ active: filter === '' }" @click="filter = ''; loadSessions()">All</button>
        <button :class="{ active: filter === 'answered' }" @click="filter = 'answered'; loadSessions()">Answered</button>
        <button :class="{ active: filter === 'unanswered' }" @click="filter = 'unanswered'; loadSessions()">Unanswered</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Topic</th><th>Form Campus</th><th>Chat Campus</th><th>Outcome</th><th>Msgs</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="s in sessions" :key="s.id">
              <td>{{ s.display_name }}<br/><small>{{ s.email }}</small></td>
              <td><span class="topic-tag">{{ s.topic || 'General' }}</span></td>
              <td>{{ s.form_campus_name || '—' }}</td>
              <td>{{ s.chat_campus_name || '—' }}</td>
              <td><span :class="['badge', s.outcome]">{{ s.outcome }}</span></td>
              <td>{{ s.message_count }}</td>
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

    <!-- ======================== TOPICS TAB ======================== -->
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

    <!-- ======================== USERS TAB ======================== -->
    <div v-if="tab === 'users'">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Campus</th><th>Role</th><th>Sessions</th><th>Joined</th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.display_name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.campus || '—' }}</td>
              <td><span :class="['badge', u.role]">{{ u.role }}</span></td>
              <td>{{ u.session_count }}</td>
              <td class="mono">{{ fmtDate(u.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================== ESCALATED TAB ======================== -->
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
import { ref, computed, onMounted } from 'vue';
import { API_BASE } from '../config.js';

const token = localStorage.getItem('admin_token');
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const stats = ref(null);
const tab = ref('analytics');
const filter = ref('');
const sessions = ref([]);
const users = ref([]);
const negativeMessages = ref([]);
const topicStats = ref([]);
const dailyStats = ref([]);
const hourlyStats = ref([]);
const topUsers = ref([]);
const weeklyStats = ref([]);
const pagination = ref({ page: 1, pages: 1 });

// Helpers
function fmtDate(d) { return new Date(d).toLocaleDateString(); }
function fmtDateShort(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function dayLabel(d) { return new Date(d).toLocaleDateString('en-US', { day: 'numeric' }); }
function weekLabel(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

function topicRate(t) {
  const resolved = Number(t.answered) + Number(t.unanswered);
  return resolved === 0 ? 0 : Math.round((Number(t.answered) / resolved) * 100);
}

// Chart helpers
const CHART_H = 120;
function barH(val, max) { return max > 0 ? Math.max(2, (Number(val) / max) * CHART_H) : 2; }
function hBarW(val, max) { return max > 0 ? (Number(val) / max) * 100 : 0; }

function donutSegment(val, total) {
  const circ = 2 * Math.PI * 80;
  const pct = total > 0 ? val / total : 0;
  return `${pct * circ} ${circ}`;
}
function donutOffset(consumed, total) {
  const circ = 2 * Math.PI * 80;
  return total > 0 ? (consumed / total) * circ : 0;
}

function hourColor(val, max) {
  if (max === 0) return '#E5E7EB';
  const intensity = val / max;
  if (intensity > 0.7) return '#00939C';
  if (intensity > 0.4) return '#34D399';
  if (intensity > 0.15) return '#93E8C6';
  return '#D1FAE5';
}

const dailyMax = computed(() => Math.max(...dailyStats.value.map(d => Number(d.total)), 1));
const hourlyMax = computed(() => Math.max(...hourlyStats.value.map(h => Number(h.count)), 1));
const topicMax = computed(() => Math.max(...topicStats.value.map(t => Number(t.total)), 1));
const weeklyMax = computed(() => Math.max(...weeklyStats.value.map(w => Number(w.total)), 1));

// API
async function api(url) {
  const res = await fetch(`${API_BASE}${url}`, { headers });
  if (res.status === 401) { localStorage.removeItem('admin_token'); window.location.href = '/admin/login'; }
  return res.json();
}

onMounted(async () => {
  stats.value = await api('/api/admin/stats');
  await loadAnalytics();
});

async function loadAnalytics() {
  const [daily, topics, hourly, top, weekly] = await Promise.all([
    api('/api/admin/stats/daily'),
    api('/api/admin/stats/topics'),
    api('/api/admin/stats/hourly'),
    api('/api/admin/stats/users-top'),
    api('/api/admin/stats/weekly'),
  ]);
  dailyStats.value = daily;
  topicStats.value = topics;
  hourlyStats.value = hourly;
  topUsers.value = top;
  weeklyStats.value = weekly;
}

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
.admin-page { max-width: 1200px; margin: 0 auto; padding: 28px 24px; }
h2 { margin-bottom: 20px; font-size: 22px; font-weight: 700; color: #013366; }

/* Stats Cards */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 12px; margin-bottom: 28px; }
.stat-card {
  background: #fff; border: 1px solid rgba(0,147,156,0.15); border-radius: 12px;
  text-align: center; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-label { display: block; font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 500; }
.stat-value { font-size: 28px; font-weight: 700; color: #1F2937; }
.stat-card.success .stat-value { color: #22C55E; }
.stat-card.danger .stat-value { color: #EF4444; }
.stat-card.warning .stat-value { color: #F59E0B; }
.stat-card.accent .stat-value { color: #00939C; }

/* Tabs */
.tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.tabs button {
  padding: 8px 18px; font-size: 13px; font-weight: 600;
  background: #fff; color: #6B7280; border: 1px solid #D1D5DB; border-radius: 8px;
}
.tabs button.active { color: #00939C; border-color: #00939C; background: rgba(0,147,156,0.04); }

/* ======================== ANALYTICS CHARTS ======================== */
.analytics { display: flex; flex-direction: column; gap: 16px; }
.chart-row { display: flex; gap: 16px; }
.chart-card {
  background: #fff; border: 1px solid rgba(0,147,156,0.12); border-radius: 12px;
  padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.chart-card h3 { font-size: 14px; font-weight: 600; color: #013366; margin: 0 0 16px; }
.chart-card h3 small { font-weight: 400; color: #9CA3AF; font-size: 12px; }
.chart-small { flex: 0 0 320px; }
.chart-wide { flex: 1; min-width: 0; }
.chart-empty { color: #9CA3AF; font-size: 13px; text-align: center; padding: 30px 0; }

/* Donut */
.donut-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.donut-svg { width: 160px; height: 160px; }
.donut-legend { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #4B5563; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }

/* Bar Chart (daily / weekly) */
.bar-chart { display: flex; flex-direction: column; gap: 8px; }
.bar-chart-bars { display: flex; align-items: flex-end; gap: 3px; height: 130px; padding-bottom: 20px; position: relative; }
.bar-chart-bars.weekly { gap: 8px; }
.bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; }
.bar-stack { display: flex; flex-direction: column; justify-content: flex-end; width: 100%; min-height: 2px; }
.bar { width: 100%; border-radius: 2px 2px 0 0; transition: height 0.3s; }
.bar.answered { background: #22C55E; }
.bar.unanswered { background: #EF4444; }
.bar-label { font-size: 9px; color: #9CA3AF; margin-top: 4px; white-space: nowrap; }
.bar-legend { display: flex; gap: 16px; font-size: 11px; color: #6B7280; }

/* Horizontal Bar Chart (topics) */
.h-bar-chart { display: flex; flex-direction: column; gap: 8px; }
.h-bar-row { display: flex; align-items: center; gap: 10px; }
.h-bar-label { width: 120px; font-size: 12px; color: #374151; font-weight: 500; text-align: right; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-bar-track { flex: 1; height: 20px; background: #F3F4F6; border-radius: 4px; position: relative; overflow: hidden; }
.h-bar-fill { position: absolute; top: 0; height: 100%; border-radius: 4px; transition: width 0.3s; }
.h-bar-fill.answered { background: #22C55E; left: 0; }
.h-bar-fill.unanswered { background: #EF4444; }
.h-bar-value { font-size: 12px; font-weight: 600; color: #374151; width: 30px; text-align: right; }

/* Hourly Chart */
.hour-chart { display: flex; align-items: flex-end; gap: 2px; height: 120px; padding-bottom: 18px; }
.hour-bar { display: flex; flex-direction: column; align-items: center; flex: 1; justify-content: flex-end; }
.hour-fill { width: 100%; min-height: 2px; border-radius: 2px 2px 0 0; transition: height 0.3s; }
.hour-label { font-size: 9px; color: #9CA3AF; margin-top: 3px; }

/* Top Users */
.top-users { display: flex; flex-direction: column; gap: 8px; }
.top-user-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #F3F4F6; }
.top-user-row:last-child { border-bottom: none; }
.top-rank { width: 22px; height: 22px; border-radius: 50%; background: rgba(0,147,156,0.08); color: #00939C; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.top-user-info { flex: 1; min-width: 0; }
.top-user-name { display: block; font-size: 13px; font-weight: 500; color: #1F2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-user-email { font-size: 11px; color: #9CA3AF; }
.top-user-stats { display: flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.top-user-total { font-weight: 400; color: #9CA3AF; font-size: 11px; }
.text-green { color: #22C55E; }
.text-red { color: #EF4444; }
.text-muted { color: #D1D5DB; }

/* ======================== TABLE STYLES ======================== */
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

.topic-tag { font-size: 12px; font-weight: 500; padding: 2px 10px; border-radius: 12px; background: rgba(0,147,156,0.08); color: #00939C; white-space: nowrap; }
.text-orange { color: #F59E0B; font-weight: 600; }
.rate-bar { position: relative; background: #F3F4F6; border-radius: 4px; height: 22px; min-width: 80px; overflow: hidden; }
.rate-fill { position: absolute; top: 0; left: 0; height: 100%; background: #22C55E; opacity: 0.2; border-radius: 4px; }
.rate-bar span { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; height: 100%; font-size: 11px; font-weight: 600; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pagination button { padding: 6px 14px; background: #fff; color: #6B7280; border: 1px solid #D1D5DB; border-radius: 8px; }
.pagination button:disabled { opacity: 0.3; cursor: default; }

/* Responsive */
@media (max-width: 768px) {
  .chart-row { flex-direction: column; }
  .chart-small { flex: auto; }
  .h-bar-label { width: 80px; font-size: 11px; }
}
</style>
