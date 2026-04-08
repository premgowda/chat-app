# ThriveWell Chatbot — Production

HR chatbot powered by Personal AI with admin dashboard, message logging, topic detection, and conversation analytics.

## Tech Stack

- **Backend:** Node.js, Fastify, MySQL
- **Frontend:** Vue 3, Vue Router, Vite
- **AI:** Personal AI Enterprise API

## Project Structure

```
thrivewell/
├── backend/
│   ├── src/
│   │   ├── server.js              # Fastify entry point
│   │   ├── plugins/
│   │   │   ├── db.js              # MySQL connection pool
│   │   │   └── auth.js            # JWT auth (admin only)
│   │   ├── routes/
│   │   │   ├── auth.js            # POST /api/admin/login
│   │   │   ├── chat.js            # POST /api/chat (public, SSE streaming)
│   │   │   └── admin.js           # Stats, sessions, topics, users, escalated
│   │   └── utils/
│   │       ├── negativeDetector.js # Detects "I don't know" responses
│   │       └── topicDetector.js   # Keyword-based topic classification
│   ├── sql/
│   │   ├── schema.sql             # Full schema + sample data
│   │   └── migration_v2.sql       # Migration for existing DBs
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/index.js
│   │   ├── views/
│   │   │   ├── ChatView.vue       # /chat - public chat with contact form
│   │   │   ├── AdminLogin.vue     # /admin/login
│   │   │   └── AdminHome.vue      # /admin/home - dashboard
│   │   └── assets/main.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Routes

| Route | Auth | Description |
|---|---|---|
| `/chat` | Public | Contact form → chat with Sophie (same UI as original widget) |
| `/admin/login` | Public | Admin login page |
| `/admin/home` | Admin JWT | Dashboard with stats, sessions, topics, users, escalated |

## Setup

### 1. Database

```bash
mysql -u root -p < backend/sql/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # Edit with your credentials
npm install
npm run dev
```

Runs on `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. Vite proxies `/api` to backend.

## How It Works

### Chat Flow (no login required)
1. User opens `/chat` → contact form asks for name, email, phone (optional)
2. User info saved to `sessionStorage` (persists until tab closes)
3. Backend creates/finds user by email automatically
4. Messages stream via SSE (same Personal AI passthrough as original)
5. Bot responses are scanned for negative patterns → session marked as escalated

### Topic Detection
First message in each session is classified into topics like: Leave Policy, Payroll, Health Insurance, IT Support, Grievance, etc. Uses keyword scoring (longer match = higher confidence). Falls back to "General".

### Admin Dashboard (`/admin/home`)
- **Stats cards:** Users, conversations, answered, unanswered, pending, success rate
- **Sessions tab:** All sessions with topic, outcome, message count (filterable)
- **Topics tab:** Per-topic breakdown with success rate bars
- **Users tab:** All users with phone, session counts
- **Escalated tab:** All bot responses flagged as negative

## Sample Admin Login

Generate a proper bcrypt hash for your admin password:
```bash
node -e "require('bcrypt').hash('yourpassword', 10).then(h => console.log(h))"
```

Update the admin user's `password_hash` in the database.

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/chat | Public | Send message, streams SSE response |
| POST | /api/chat/register | Public | Register visitor from contact form |
| POST | /api/admin/login | Public | Admin login, returns JWT |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/stats/topics | Admin | Topic breakdown |
| GET | /api/admin/stats/daily | Admin | Daily breakdown (30 days) |
| GET | /api/admin/sessions | Admin | Paginated sessions |
| GET | /api/admin/users | Admin | All users |
| GET | /api/admin/negative-messages | Admin | Escalated bot responses |
