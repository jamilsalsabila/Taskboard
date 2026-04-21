export const registerTaskRoutes = (server, controller) => {
  server.route([
    { method: 'GET', path: '/api/tasks', handler: controller.listTasks },
    { method: 'POST', path: '/api/tasks', handler: controller.createTask },
    { method: 'PATCH', path: '/api/tasks/{taskId}', handler: controller.updateTask },
    { method: 'PATCH', path: '/api/tasks/{taskId}/status', handler: controller.moveTask },
    { method: 'DELETE', path: '/api/tasks/{taskId}', handler: controller.deleteTask },
    { method: 'GET', path: '/api/tasks/{taskId}/comments', handler: controller.listComments },
    { method: 'POST', path: '/api/tasks/{taskId}/comments', handler: controller.addComment },
    { method: 'GET', path: '/api/analytics/assignees', handler: controller.analytics }
  ]);
};
