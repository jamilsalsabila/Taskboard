import { pool } from '../db/pool.js';
import { mapCommentRow, mapTaskRow } from '../utils/mapper.js';

export class TaskRepository {
  async findAll() {
    const result = await pool.query(`
      SELECT id, title, description, assignee, priority, status, due_date, created_at, updated_at, completed_at
      FROM tasks
      ORDER BY created_at DESC
    `);
    return result.rows.map(mapTaskRow);
  }

  async findById(id) {
    const result = await pool.query(
      `SELECT id, title, description, assignee, priority, status, due_date, created_at, updated_at, completed_at
       FROM tasks
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
  }

  async create({ title, description, assignee, priority, status, dueDate }) {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, assignee, priority, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, assignee, priority, status, due_date, created_at, updated_at, completed_at`,
      [title, description, assignee, priority, status, dueDate]
    );

    return mapTaskRow(result.rows[0]);
  }

  async update(id, payload) {
    const fields = [];
    const values = [id];

    if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
      fields.push(`title = $${values.length + 1}`);
      values.push(payload.title);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
      fields.push(`description = $${values.length + 1}`);
      values.push(payload.description);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'assignee')) {
      fields.push(`assignee = $${values.length + 1}`);
      values.push(payload.assignee);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'priority')) {
      fields.push(`priority = $${values.length + 1}`);
      values.push(payload.priority);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'dueDate')) {
      fields.push(`due_date = $${values.length + 1}`);
      values.push(payload.dueDate);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    const result = await pool.query(
      `UPDATE tasks
       SET ${fields.join(', ')},
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, description, assignee, priority, status, due_date, created_at, updated_at, completed_at`,
      values
    );

    return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
  }

  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE tasks
       SET status = $2,
           completed_at = CASE WHEN $2 = 'done' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, description, assignee, priority, status, due_date, created_at, updated_at, completed_at`,
      [id, status]
    );

    return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
  }

  async remove(id) {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    return Boolean(result.rowCount);
  }

  async countInProgressByAssignee(assignee, excludeTaskId = null) {
    const values = [assignee];
    let sql = `SELECT COUNT(*)::int AS count FROM tasks WHERE assignee = $1 AND status = 'in_progress'`;

    if (excludeTaskId) {
      values.push(excludeTaskId);
      sql += ` AND id <> $2`;
    }

    const result = await pool.query(sql, values);
    return result.rows[0].count;
  }

  async addComment(taskId, { author, message }) {
    const result = await pool.query(
      `INSERT INTO task_comments (task_id, author, message)
       VALUES ($1, $2, $3)
       RETURNING id, task_id, author, message, created_at`,
      [taskId, author, message]
    );

    return mapCommentRow(result.rows[0]);
  }

  async getComments(taskId) {
    const result = await pool.query(
      `SELECT id, task_id, author, message, created_at
       FROM task_comments
       WHERE task_id = $1
       ORDER BY created_at ASC`,
      [taskId]
    );

    return result.rows.map(mapCommentRow);
  }

  async getAssigneeAnalytics() {
    const result = await pool.query(`
      SELECT
        assignee,
        COUNT(*)::int AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'todo')::int AS todo_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'done')::int AS done_tasks,
        COALESCE(
          AVG(
            CASE
              WHEN completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
              ELSE NULL
            END
          ),
          0
        )::float AS avg_completion_hours
      FROM tasks
      GROUP BY assignee
      ORDER BY done_tasks DESC, total_tasks DESC
    `);

    return result.rows.map((row) => ({
      assignee: row.assignee,
      totalTasks: row.total_tasks,
      todoTasks: row.todo_tasks,
      inProgressTasks: row.in_progress_tasks,
      doneTasks: row.done_tasks,
      avgCompletionHours: Number(row.avg_completion_hours.toFixed(2))
    }));
  }
}
