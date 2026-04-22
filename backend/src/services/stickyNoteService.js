export class StickyNoteService {
  constructor(stickyNoteRepository, boardService, eventPublisher, realtimeHub) {
    this.stickyNoteRepository = stickyNoteRepository;
    this.boardService = boardService;
    this.eventPublisher = eventPublisher;
    this.realtimeHub = realtimeHub;
  }

  async listNotes(boardId) {
    await this.boardService.ensureBoardExists(boardId);
    return this.stickyNoteRepository.findAllByBoard(boardId);
  }

  async createNote(boardId, payload) {
    await this.boardService.ensureBoardExists(boardId);
    const note = await this.stickyNoteRepository.create({ ...payload, boardId });

    await this.eventPublisher.publish('sticky_note.created', { noteId: note.id, boardId, note });
    this.realtimeHub.broadcastToBoard(boardId, 'sticky_note.created', { note, boardId });

    return note;
  }

  async updateNote(boardId, id, payload) {
    await this.boardService.ensureBoardExists(boardId);
    const note = await this.stickyNoteRepository.update(id, boardId, payload);
    if (!note) {
      throw new Error('STICKY_NOTE_NOT_FOUND');
    }

    await this.eventPublisher.publish('sticky_note.updated', { noteId: note.id, boardId, note });
    this.realtimeHub.broadcastToBoard(boardId, 'sticky_note.updated', { note, boardId });

    return note;
  }

  async deleteNote(boardId, id) {
    await this.boardService.ensureBoardExists(boardId);
    const ok = await this.stickyNoteRepository.remove(id, boardId);
    if (!ok) {
      throw new Error('STICKY_NOTE_NOT_FOUND');
    }

    await this.eventPublisher.publish('sticky_note.deleted', { noteId: id, boardId });
    this.realtimeHub.broadcastToBoard(boardId, 'sticky_note.deleted', { noteId: id, boardId });
  }
}
