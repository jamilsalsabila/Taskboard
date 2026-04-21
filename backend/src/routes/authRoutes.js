export const registerAuthRoutes = (server, controller) => {
  server.route([{ method: 'POST', path: '/api/auth/guest', handler: controller.loginGuest }]);
};
