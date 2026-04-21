export const registerStickyNoteRoutes = (server, controller) => {
  server.route([
    { method: 'GET', path: '/api/sticky-notes', handler: controller.listNotes },
    { method: 'POST', path: '/api/sticky-notes', handler: controller.createNote },
    { method: 'PATCH', path: '/api/sticky-notes/{noteId}', handler: controller.updateNote },
    { method: 'DELETE', path: '/api/sticky-notes/{noteId}', handler: controller.deleteNote }
  ]);
};
