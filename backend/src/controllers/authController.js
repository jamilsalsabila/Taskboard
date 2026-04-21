import Joi from 'joi';

const guestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required()
});

export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  loginGuest = async (request, h) => {
    const payload = await guestSchema.validateAsync(request.payload, { abortEarly: false });
    const result = await this.authService.loginGuest(payload.name);
    return h.response({ data: result }).code(200);
  };
}
