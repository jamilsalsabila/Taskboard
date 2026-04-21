import Joi from 'joi';

const createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(180).required(),
  description: Joi.string().allow('').default(''),
  assignee: Joi.string().max(120).default('Unassigned'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  status: Joi.string().valid('todo', 'in_progress', 'done').default('todo'),
  dueDate: Joi.date().iso().allow(null).default(null)
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(180),
  description: Joi.string().allow(''),
  assignee: Joi.string().max(120),
  priority: Joi.string().valid('low', 'medium', 'high'),
  dueDate: Joi.date().iso().allow(null)
}).min(1);

const statusSchema = Joi.object({
  status: Joi.string().valid('todo', 'in_progress', 'done').required()
});

const commentSchema = Joi.object({
  author: Joi.string().min(2).max(120).required(),
  message: Joi.string().min(1).max(2000).required()
});

export class TaskController {
  constructor(taskService) {
    this.taskService = taskService;
  }

  listTasks = async (_request, h) => {
    const tasks = await this.taskService.listTasks();
    return h.response({ data: tasks }).code(200);
  };

  createTask = async (request, h) => {
    const payload = await createTaskSchema.validateAsync(request.payload, { abortEarly: false });
    const task = await this.taskService.createTask(payload);
    return h.response({ data: task }).code(201);
  };

  updateTask = async (request, h) => {
    const payload = await updateTaskSchema.validateAsync(request.payload, { abortEarly: false });
    const task = await this.taskService.updateTask(request.params.taskId, payload);
    return h.response({ data: task }).code(200);
  };

  moveTask = async (request, h) => {
    const payload = await statusSchema.validateAsync(request.payload, { abortEarly: false });
    const task = await this.taskService.moveTask(request.params.taskId, payload.status);
    return h.response({ data: task }).code(200);
  };

  deleteTask = async (request, h) => {
    await this.taskService.deleteTask(request.params.taskId);
    return h.response().code(204);
  };

  listComments = async (request, h) => {
    const comments = await this.taskService.listComments(request.params.taskId);
    return h.response({ data: comments }).code(200);
  };

  addComment = async (request, h) => {
    const payload = await commentSchema.validateAsync(request.payload, { abortEarly: false });
    const comment = await this.taskService.addComment(request.params.taskId, payload);
    return h.response({ data: comment }).code(201);
  };

  analytics = async (_request, h) => {
    const result = await this.taskService.analytics();
    return h.response({ data: result }).code(200);
  };
}
