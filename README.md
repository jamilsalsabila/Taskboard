# Taskboard Kanban (Bun + Hapi + Vue + PostgreSQL + RabbitMQ + Docker)

Aplikasi taskboard visual untuk memantau alur kerja real-time (To Do, In Progress, Done), lengkap dengan assignment, komentar, WIP limit, dan analitik kinerja assignee.

## Kenapa stack ini?

- Frontend: **Vue.js** (lebih cepat dipelajari untuk pemula, struktur komponen sederhana)
- Backend: **Bun.js + Hapi.js** (async API, performa cepat, struktur server jelas)
- Database: **PostgreSQL** (relasional kuat, cocok untuk analytics, konsistensi data)
- Queue/Event: **RabbitMQ** (publish event task untuk integrasi real-time/worker lain)
- Container: **Docker Compose** (setup lokal cepat dan konsisten)

## Fitur Utama

- Kanban board: drag & drop antar kolom `todo`, `in_progress`, `done`
- CRUD task (judul, deskripsi, assignee, prioritas, due date)
- Komentar pada task untuk kolaborasi
- WIP limit per assignee (`max 3` task `in_progress`)
- Analitik assignee:
  - total task
  - breakdown status
  - rata-rata waktu penyelesaian (jam)
- Event RabbitMQ yang dipublish:
  - `task.created`
  - `task.updated`
  - `task.moved`
  - `task.deleted`
  - `task.comment.added`
  - `sticky_note.created`
  - `sticky_note.updated`
  - `sticky_note.deleted`

## Arsitektur SRP (Single Responsibility Principle)

- `controllers/`: validasi input & HTTP response
- `services/`: aturan bisnis (WIP limit, orkestrasi use case)
- `repositories/`: query database
- `services/rabbitMqPublisher.js`: event publishing
- `routes/`: deklarasi endpoint
- `db/`: koneksi pool + migrasi

## Menjalankan dengan Docker

1. Build dan start service inti:

```bash
docker compose up -d --build postgres rabbitmq backend
```

2. Jalankan migrasi schema:

```bash
docker compose run --rm backend-migrate
```

3. Jalankan frontend:

```bash
docker compose up -d --build frontend
```

4. Akses aplikasi:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- RabbitMQ UI: `http://localhost:15672` (guest / guest)

## Endpoint API ringkas

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/{taskId}`
- `PATCH /api/tasks/{taskId}/status`
- `DELETE /api/tasks/{taskId}`
- `GET /api/tasks/{taskId}/comments`
- `POST /api/tasks/{taskId}/comments`
- `GET /api/analytics/assignees`
- `GET /api/sticky-notes`
- `POST /api/sticky-notes`
- `PATCH /api/sticky-notes/{noteId}`
- `DELETE /api/sticky-notes/{noteId}`
- `GET /health`
