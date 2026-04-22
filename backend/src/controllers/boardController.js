import Joi from 'joi';

const createBoardSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required()
});

export class BoardController {
  constructor(boardService, authTokenService) {
    this.boardService = boardService;
    this.authTokenService = authTokenService;
  }

  #authenticate(request) {
    return this.authTokenService.extractFromAuthorizationHeader(request.headers.authorization);
  }

  listBoards = async (request, h) => {
    this.#authenticate(request);
    const boards = await this.boardService.listBoards();
    return h.response({ data: boards }).code(200);
  };

  createBoard = async (request, h) => {
    const actor = this.#authenticate(request);
    const payload = await createBoardSchema.validateAsync(request.payload, { abortEarly: false });
    const board = await this.boardService.createBoard(payload, actor);
    return h.response({ data: board }).code(201);
  };
}
