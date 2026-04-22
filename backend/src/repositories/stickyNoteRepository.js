import { pool } from '../db/pool.js';

const mapStickyNoteRow = (row) => ({
  id: row.id,
  boardId: row.board_id,
  title: row.title,
  content: row.content,
  color: row.color,
  x: row.x,
  y: row.y,
  width: row.width,
  height: row.height,
  zIndex: row.z_index,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class StickyNoteRepository {
  async findAllByBoard(boardId) {
    const result = await pool.query(
      `SELECT id, board_id, title, content, color, x, y, width, height, z_index, created_at, updated_at
       FROM sticky_notes
       WHERE board_id = $1
       ORDER BY z_index ASC, created_at ASC`,
      [boardId]
    );

    return result.rows.map(mapStickyNoteRow);
  }

  async create({ boardId, title, content, color, x, y, width, height, zIndex }) {
    const result = await pool.query(
      `INSERT INTO sticky_notes (board_id, title, content, color, x, y, width, height, z_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, board_id, title, content, color, x, y, width, height, z_index, created_at, updated_at`,
      [boardId, title, content, color, x, y, width, height, zIndex]
    );

    return mapStickyNoteRow(result.rows[0]);
  }

  async update(id, boardId, payload) {
    const fields = [];
    const values = [id, boardId];

    if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
      fields.push(`title = $${values.length + 1}`);
      values.push(payload.title);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'content')) {
      fields.push(`content = $${values.length + 1}`);
      values.push(payload.content);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'color')) {
      fields.push(`color = $${values.length + 1}`);
      values.push(payload.color);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'x')) {
      fields.push(`x = $${values.length + 1}`);
      values.push(payload.x);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'y')) {
      fields.push(`y = $${values.length + 1}`);
      values.push(payload.y);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'width')) {
      fields.push(`width = $${values.length + 1}`);
      values.push(payload.width);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'height')) {
      fields.push(`height = $${values.length + 1}`);
      values.push(payload.height);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'zIndex')) {
      fields.push(`z_index = $${values.length + 1}`);
      values.push(payload.zIndex);
    }

    if (fields.length === 0) {
      const existing = await pool.query(
        `SELECT id, board_id, title, content, color, x, y, width, height, z_index, created_at, updated_at
         FROM sticky_notes
         WHERE id = $1 AND board_id = $2`,
        [id, boardId]
      );
      return existing.rows[0] ? mapStickyNoteRow(existing.rows[0]) : null;
    }

    const result = await pool.query(
      `UPDATE sticky_notes
       SET ${fields.join(', ')},
           updated_at = NOW()
       WHERE id = $1 AND board_id = $2
       RETURNING id, board_id, title, content, color, x, y, width, height, z_index, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapStickyNoteRow(result.rows[0]) : null;
  }

  async remove(id, boardId) {
    const result = await pool.query(
      'DELETE FROM sticky_notes WHERE id = $1 AND board_id = $2 RETURNING id',
      [id, boardId]
    );
    return Boolean(result.rowCount);
  }
}
