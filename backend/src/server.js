import Hapi from '@hapi/hapi';
import Joi from 'joi';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { TaskRepository } from './repositories/taskRepository.js';
import { StickyNoteRepository } from './repositories/stickyNoteRepository.js';
import { RabbitMqPublisher } from './services/rabbitMqPublisher.js';
import { TaskService } from './services/taskService.js';
import { StickyNoteService } from './services/stickyNoteService.js';
import { TaskController } from './controllers/taskController.js';
import { StickyNoteController } from './controllers/stickyNoteController.js';
import { registerTaskRoutes } from './routes/taskRoutes.js';
import { registerStickyNoteRoutes } from './routes/stickyNoteRoutes.js';

const createServer = async () => {
  const server = Hapi.server({
    port: env.port,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: [env.corsOrigin],
        additionalHeaders: ['content-type']
      }
    }
  });

  server.validator(Joi);

  const eventPublisher = new RabbitMqPublisher();
  await eventPublisher.connect();

  const taskRepository = new TaskRepository();
  const stickyNoteRepository = new StickyNoteRepository();
  const taskService = new TaskService(taskRepository, eventPublisher);
  const stickyNoteService = new StickyNoteService(stickyNoteRepository, eventPublisher);
  const taskController = new TaskController(taskService);
  const stickyNoteController = new StickyNoteController(stickyNoteService);

  registerTaskRoutes(server, taskController);
  registerStickyNoteRoutes(server, stickyNoteController);

  server.route({
    method: 'GET',
    path: '/health',
    handler: async () => {
      await pool.query('SELECT 1');
      return { status: 'ok', service: 'taskboard-backend' };
    }
  });

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;

    if (!response || !response.isBoom) {
      return h.continue;
    }

    const message = response.message || 'Unexpected error';
    const statusCode = response.output?.statusCode || 500;

    if (message.includes('TASK_NOT_FOUND')) {
      return h.response({ error: 'Task not found' }).code(404);
    }

    if (message.includes('WIP_LIMIT_REACHED')) {
      return h
        .response({ error: 'WIP limit reached for this assignee (max 3 in progress tasks)' })
        .code(409);
    }

    if (message.includes('STICKY_NOTE_NOT_FOUND')) {
      return h.response({ error: 'Sticky note not found' }).code(404);
    }

    if (response.name === 'ValidationError') {
      return h.response({ error: message }).code(400);
    }

    return h.response({ error: message }).code(statusCode);
  });

  server.events.on('stop', async () => {
    await eventPublisher.close();
    await pool.end();
  });

  return server;
};

const server = await createServer();
await server.start();
console.log(`Taskboard backend is running on http://localhost:${env.port}`);
