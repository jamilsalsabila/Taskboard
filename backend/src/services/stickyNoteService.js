export class StickyNoteService {
  constructor(stickyNoteRepository, eventPublisher, realtimeHub) {
    this.stickyNoteRepository = stickyNoteRepository;
    this.eventPublisher = eventPublisher;
    this.realtimeHub = realtimeHub;
  }

  async listNotes() {
    return this.stickyNoteRepository.findAll();
  }

  async createNote(payload) {
    const note = await this.stickyNoteRepository.create(payload);

    await this.eventPublisher.publish('sticky_note.created', { noteId: note.id, note });
    this.realtimeHub.broadcast('sticky_note.created', { note });

    return note;
  }

  async updateNote(id, payload) {
    const note = await this.stickyNoteRepository.update(id, payload);
    if (!note) {
      throw new Error('STICKY_NOTE_NOT_FOUND');
    }

    await this.eventPublisher.publish('sticky_note.updated', { noteId: note.id, note });
    this.realtimeHub.broadcast('sticky_note.updated', { note });

    return note;
  }

  async deleteNote(id) {
    const ok = await this.stickyNoteRepository.remove(id);
    if (!ok) {
      throw new Error('STICKY_NOTE_NOT_FOUND');
    }

    await this.eventPublisher.publish('sticky_note.deleted', { noteId: id });
    this.realtimeHub.broadcast('sticky_note.deleted', { noteId: id });
  }
}
