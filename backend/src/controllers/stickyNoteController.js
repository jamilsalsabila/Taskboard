import Joi from 'joi';

const colorRegex = /^#([0-9A-Fa-f]{6})$/;

const createSchema = Joi.object({
  title: Joi.string().max(120).default('Sticky'),
  content: Joi.string().allow('').default(''),
  color: Joi.string().pattern(colorRegex).required(),
  x: Joi.number().integer().min(0).required(),
  y: Joi.number().integer().min(0).required(),
  width: Joi.number().integer().min(140).required(),
  height: Joi.number().integer().min(120).required(),
  zIndex: Joi.number().integer().min(1).required()
});

const updateSchema = Joi.object({
  title: Joi.string().max(120),
  content: Joi.string().allow(''),
  color: Joi.string().pattern(colorRegex),
  x: Joi.number().integer().min(0),
  y: Joi.number().integer().min(0),
  width: Joi.number().integer().min(140),
  height: Joi.number().integer().min(120),
  zIndex: Joi.number().integer().min(1)
}).min(1);

export class StickyNoteController {
  constructor(stickyNoteService) {
    this.stickyNoteService = stickyNoteService;
  }

  listNotes = async (_request, h) => {
    const notes = await this.stickyNoteService.listNotes();
    return h.response({ data: notes }).code(200);
  };

  createNote = async (request, h) => {
    const payload = await createSchema.validateAsync(request.payload, { abortEarly: false });
    const note = await this.stickyNoteService.createNote(payload);
    return h.response({ data: note }).code(201);
  };

  updateNote = async (request, h) => {
    const payload = await updateSchema.validateAsync(request.payload, { abortEarly: false });
    const note = await this.stickyNoteService.updateNote(request.params.noteId, payload);
    return h.response({ data: note }).code(200);
  };

  deleteNote = async (request, h) => {
    await this.stickyNoteService.deleteNote(request.params.noteId);
    return h.response().code(204);
  };
}
