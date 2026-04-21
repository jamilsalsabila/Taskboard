import Hapi from '@hapi/hapi';
import Joi from 'joi';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { TaskRepository } from './repositories/taskRepository.js';
import { StickyNoteRepository } from './repositories/stickyNoteRepository.js';
import { UserRepository } from './repositories/userRepository.js';
import { RabbitMqPublisher } from './services/rabbitMqPublisher.js';
import { TaskService } from './services/taskService.js';
import { StickyNoteService } from './services/stickyNoteService.js';
import { AuthService } from './services/authService.js';
import { AuthTokenService } from './services/authTokenService.js';
import { TaskController } from './controllers/taskController.js';
import { StickyNoteController } from './controllers/stickyNoteController.js';
import { AuthController } from './controllers/authController.js';
import { registerTaskRoutes } from './routes/taskRoutes.js';
import { registerStickyNoteRoutes } from './routes/stickyNoteRoutes.js';
import { registerAuthRoutes } from './routes/authRoutes.js';
import { StickyNoteRealtimeHub } from './realtime/stickyNoteRealtimeHub.js';

const createServer = async () => {
  const server = Hapi.server({
    port: env.port,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: [env.corsOrigin],
        additionalHeaders: ['content-type', 'authorization']
      }
    }
  });

  server.validator(Joi);

  const eventPublisher = new RabbitMqPublisher();
  await eventPublisher.connect();

  const authTokenService = new AuthTokenService();
  const realtimeHub = new StickyNoteRealtimeHub(authTokenService);
  realtimeHub.attach(server.listener);

  const taskRepository = new TaskRepository();
  const stickyNoteRepository = new StickyNoteRepository();
  const userRepository = new UserRepository();

  const taskService = new TaskService(taskRepository, eventPublisher);
  const stickyNoteService = new StickyNoteService(stickyNoteRepository, eventPublisher, realtimeHub);
  const authService = new AuthService(userRepository, authTokenService);

  const taskController = new TaskController(taskService);
  const stickyNoteController = new StickyNoteController(stickyNoteService, authTokenService);
  const authController = new AuthController(authService);

  registerAuthRoutes(server, authController);
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

    if (
      message.includes('AUTH_REQUIRED') ||
      message.includes('AUTH_INVALID') ||
      message.includes('AUTH_EXPIRED')
    ) {
      return h.response({ error: 'Unauthorized' }).code(401);
    }

    if (message.includes('AUTH_NAME_REQUIRED')) {
      return h.response({ error: 'Name is required' }).code(400);
    }

    if (response.name === 'ValidationError') {
      return h.response({ error: message }).code(400);
    }

    return h.response({ error: message }).code(statusCode);
  });

  server.events.on('stop', async () => {
    realtimeHub.close();
    await eventPublisher.close();
    await pool.end();
  });

  return server;
};

const server = await createServer();
await server.start();
console.log(`Taskboard backend is running on http://localhost:${env.port}`);
