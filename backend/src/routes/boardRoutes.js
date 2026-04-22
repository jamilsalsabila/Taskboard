export const registerBoardRoutes = (server, controller) => {
  server.route([
    { method: 'GET', path: '/api/boards', handler: controller.listBoards },
    { method: 'POST', path: '/api/boards', handler: controller.createBoard }
  ]);
};
