# Taskboard Sticky Notes

Aplikasi sticky notes realtime berbasis web dengan konsep papan bebas (blank canvas), dibangun dengan Bun + Hapi + Vue.

## Stack

- Frontend: Vue 3 + Vite + Interact.js + PQueue + idb-keyval
- Backend: Bun.js + Hapi.js (fully async)
- Database: PostgreSQL
- Event bus: RabbitMQ
- Realtime: WebSocket (`ws`)
- Infra: Docker Compose

## Fitur Saat Ini

- Halaman putih minimalis + tombol `+` di kiri atas
- Multi-board:
  - pilih board aktif dari dropdown
  - buat board baru dari tombol `+ Board`
  - board aktif disimpan di `localStorage` key `taskboard-board-id`
- Sticky note tak terbatas per board
- Posisi random + warna random saat note dibuat
- Drag, resize, bring-to-front (`zIndex`) desktop + mobile
- Edit judul (double click desktop / tap-hold mobile)
- Edit konten bebas
- Hapus note
- Infinite canvas (scroll horizontal + vertical)
- Kolaborasi realtime per-board:
  - sinkron create/update/delete note
  - presence user online per-board
  - ubah nama kolaborasi
- Auth guest berbasis token
- Autosave stabil:
  - debounce input
  - save queue per-note
  - status sinkronisasi: `Queued`, `Saving...`, `Saved`, `Draft`, `Offline draft`
- Offline safety:
  - draft lokal di IndexedDB
  - dirty field protection agar update realtime tidak menimpa edit lokal

## Arsitektur (SRP)

- `controllers/`: validasi request + response HTTP
- `services/`: aturan bisnis/use-case
- `repositories/`: query database
- `routes/`: registrasi endpoint
- `realtime/`: WebSocket hub
- `db/`: pool koneksi + migrasi

## Menjalankan Dengan Docker

1. Jalankan service:
```bash
docker compose up -d --build postgres rabbitmq backend frontend
```

2. Jalankan migrasi:
```bash
docker compose run --rm backend-migrate
```

3. Akses:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- RabbitMQ UI: `http://localhost:15672` (`guest` / `guest`)

## Menjalankan Mode Dev

Backend:
```bash
cd backend
bun install
bun run dev
```

Frontend:
```bash
cd frontend
bun install
bun run dev --host 0.0.0.0 --port 5173
```

## Environment Backend

- `PORT`
- `CORS_ORIGIN`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `RABBITMQ_URL`
- `AUTH_SECRET`

## API Ringkas

Auth:
- `POST /api/auth/guest` body: `{ "name": "Alice" }`

Boards:
- `GET /api/boards`
- `POST /api/boards`

Sticky notes (butuh `Authorization: Bearer <token>` + query `boardId`):
- `GET /api/sticky-notes?boardId=<board_id>`
- `POST /api/sticky-notes?boardId=<board_id>`
- `PATCH /api/sticky-notes/{noteId}?boardId=<board_id>`
- `DELETE /api/sticky-notes/{noteId}?boardId=<board_id>`

Realtime:
- `WS /ws?token=<auth_token>&boardId=<board_id>`
- Event:
  - `sticky_note.created`
  - `sticky_note.updated`
  - `sticky_note.deleted`
  - `presence.snapshot`
  - `presence.joined`
  - `presence.left`
  - `presence.updated`

Health:
- `GET /health`

Legacy taskboard API (tetap tersedia):
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/{taskId}`
- `PATCH /api/tasks/{taskId}/status`
- `DELETE /api/tasks/{taskId}`
- `GET /api/tasks/{taskId}/comments`
- `POST /api/tasks/{taskId}/comments`
- `GET /api/analytics/assignees`
