export const mapTaskRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  assignee: row.assignee,
  priority: row.priority,
  status: row.status,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at
});

export const mapCommentRow = (row) => ({
  id: row.id,
  taskId: row.task_id,
  author: row.author,
  message: row.message,
  createdAt: row.created_at
});
