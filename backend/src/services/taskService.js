const WIP_LIMIT_PER_ASSIGNEE = 3;

export class TaskService {
  constructor(taskRepository, eventPublisher) {
    this.taskRepository = taskRepository;
    this.eventPublisher = eventPublisher;
  }

  async listTasks() {
    return this.taskRepository.findAll();
  }

  async getTask(id) {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new Error('TASK_NOT_FOUND');
    }
    return task;
  }

  async createTask(payload) {
    if (payload.status === 'in_progress') {
      await this.#assertWipLimit(payload.assignee);
    }

    const task = await this.taskRepository.create(payload);
    await this.eventPublisher.publish('task.created', { taskId: task.id, task });
    return task;
  }

  async updateTask(id, payload) {
    const currentTask = await this.getTask(id);
    const nextAssignee = payload.assignee ?? currentTask.assignee;

    if (currentTask.status === 'in_progress' && nextAssignee !== currentTask.assignee) {
      await this.#assertWipLimit(nextAssignee, id);
    }

    const updated = await this.taskRepository.update(id, payload);
    if (!updated) {
      throw new Error('TASK_NOT_FOUND');
    }

    await this.eventPublisher.publish('task.updated', { taskId: updated.id, task: updated });
    return updated;
  }

  async moveTask(id, status) {
    const task = await this.getTask(id);
    if (status === 'in_progress' && task.status !== 'in_progress') {
      await this.#assertWipLimit(task.assignee, id);
    }

    const moved = await this.taskRepository.updateStatus(id, status);
    if (!moved) {
      throw new Error('TASK_NOT_FOUND');
    }

    await this.eventPublisher.publish('task.moved', {
      taskId: moved.id,
      from: task.status,
      to: moved.status,
      task: moved
    });

    return moved;
  }

  async deleteTask(id) {
    const ok = await this.taskRepository.remove(id);
    if (!ok) {
      throw new Error('TASK_NOT_FOUND');
    }
    await this.eventPublisher.publish('task.deleted', { taskId: id });
  }

  async listComments(taskId) {
    await this.getTask(taskId);
    return this.taskRepository.getComments(taskId);
  }

  async addComment(taskId, payload) {
    await this.getTask(taskId);
    const comment = await this.taskRepository.addComment(taskId, payload);

    await this.eventPublisher.publish('task.comment.added', {
      taskId,
      commentId: comment.id,
      comment
    });

    return comment;
  }

  async analytics() {
    return this.taskRepository.getAssigneeAnalytics();
  }

  async #assertWipLimit(assignee, excludeTaskId = null) {
    const inProgressCount = await this.taskRepository.countInProgressByAssignee(assignee, excludeTaskId);
    if (inProgressCount >= WIP_LIMIT_PER_ASSIGNEE) {
      throw new Error('WIP_LIMIT_REACHED');
    }
  }
}
