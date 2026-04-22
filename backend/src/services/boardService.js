export class BoardService {
  constructor(boardRepository) {
    this.boardRepository = boardRepository;
  }

  async listBoards() {
    return this.boardRepository.findAll();
  }

  async createBoard(payload, actor) {
    const board = await this.boardRepository.create({
      name: payload.name,
      createdBy: actor.userId
    });
    return board;
  }

  async ensureBoardExists(boardId) {
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new Error('BOARD_NOT_FOUND');
    }
    return board;
  }
}
