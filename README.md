# Taskboard Sticky Notes (Bun + Hapi + Vue + PostgreSQL + RabbitMQ + Docker)

Aplikasi sticky notes berbasis web dengan gaya papan kosong:
- klik `+` untuk membuat note baru (warna & posisi acak),
- drag & resize bebas (desktop + mobile),
- edit judul (double click desktop / tap-hold mobile),
- autosave ke PostgreSQL secara real-time.

## Stack

- Frontend: Vue 3 + Vite + Interact.js + PQueue + idb-keyval
- Backend: Bun.js + Hapi.js (fully async)
- Database: PostgreSQL
- Event bus: RabbitMQ
- Infra: Docker Compose

## Fitur Utama (UI Saat Ini)

- Halaman putih minimalis + tombol `+` di kiri atas
- Sticky note tak terbatas
- Infinite canvas (scroll horizontal + vertical)
- Posisi note bisa digeser bebas
- Ukuran note bisa di-resize
- Isi note (title + content) editable
- Hapus note
- Persisten setelah refresh/restart backend (autosave ke DB)
- Draft lokal tahan koneksi putus (IndexedDB)
- Status sinkronisasi per-note: `Queued`, `Saving...`, `Saved`, `Draft`, `Offline draft`
- Autosave queue per-note (lebih stabil saat ngetik cepat)
- Kolaborasi realtime lintas device/browser (WebSocket):
  - perubahan note tersinkron otomatis
  - presence user online
  - ganti nama kolaborasi dari tombol identitas di atas
- Auth sederhana berbasis token:
  - login guest dengan nama
  - sticky notes API protected `Authorization: Bearer <token>`
  - websocket handshake memakai token

## Arsitektur SRP

- `controllers/`: validasi request + response HTTP
- `services/`: aturan bisnis/use-case
- `repositories/`: query database
- `routes/`: registrasi endpoint
- `db/`: koneksi pool + migrasi
- `services/rabbitMqPublisher.js`: publish domain events

## Menjalankan (Docker)

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

## Environment Backend

Variable minimum:
- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `RABBITMQ_URL`
- `AUTH_SECRET`

## Menjalankan (Dev Cepat Tanpa Rebuild)

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

## API Endpoint

Sticky notes:
- `GET /api/sticky-notes`
- `POST /api/sticky-notes`
- `PATCH /api/sticky-notes/{noteId}`
- `DELETE /api/sticky-notes/{noteId}`
(semua endpoint sticky-notes membutuhkan header `Authorization`)

Auth:
- `POST /api/auth/guest` body: `{ "name": "Alice" }`

Realtime collaboration:
- `WS /ws?token=<auth_token>`
- Broadcast event:
  - `sticky_note.created`
  - `sticky_note.updated`
  - `sticky_note.deleted`
  - `presence.snapshot`
  - `presence.joined`
  - `presence.left`
  - `presence.updated`

Taskboard legacy (masih tersedia di backend):
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/{taskId}`
- `PATCH /api/tasks/{taskId}/status`
- `DELETE /api/tasks/{taskId}`
- `GET /api/tasks/{taskId}/comments`
- `POST /api/tasks/{taskId}/comments`
- `GET /api/analytics/assignees`

Health:
- `GET /health`

## Catatan Reliabilitas

- Saat koneksi internet/Wi-Fi putus-putus:
  - perubahan note tetap disimpan sebagai draft lokal (IndexedDB),
  - autosave akan mencoba sinkron ulang saat request berikutnya berhasil,
  - event realtime tidak akan menimpa teks/posisi terbaru yang masih kamu edit.
