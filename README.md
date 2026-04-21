# Taskboard Sticky Notes (Bun + Hapi + Vue + PostgreSQL + RabbitMQ + Docker)

Aplikasi sticky notes berbasis web dengan gaya papan kosong:
- klik `+` untuk membuat note baru (warna & posisi acak),
- drag & resize bebas (desktop + mobile),
- edit judul (double click desktop / tap-hold mobile),
- autosave ke PostgreSQL secara real-time.

## Stack

- Frontend: Vue 3 + Vite + Interact.js
- Backend: Bun.js + Hapi.js (fully async)
- Database: PostgreSQL
- Event bus: RabbitMQ
- Infra: Docker Compose

## Fitur Utama (UI Saat Ini)

- Halaman putih minimalis + tombol `+` di kiri atas
- Sticky note tak terbatas
- Posisi note bisa digeser bebas
- Ukuran note bisa di-resize
- Isi note (title + content) editable
- Hapus note
- Persisten setelah refresh/restart backend (autosave ke DB)

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
