import { pool } from '../db/pool.js';

const mapStickyNoteRow = (row) => ({
  id: row.id,
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
  async findAll() {
    const result = await pool.query(`
      SELECT id, title, content, color, x, y, width, height, z_index, created_at, updated_at
      FROM sticky_notes
      ORDER BY z_index ASC, created_at ASC
    `);

    return result.rows.map(mapStickyNoteRow);
  }

  async create({ title, content, color, x, y, width, height, zIndex }) {
    const result = await pool.query(
      `INSERT INTO sticky_notes (title, content, color, x, y, width, height, z_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, content, color, x, y, width, height, z_index, created_at, updated_at`,
      [title, content, color, x, y, width, height, zIndex]
    );

    return mapStickyNoteRow(result.rows[0]);
  }

  async update(id, payload) {
    const fields = [];
    const values = [id];

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
        `SELECT id, title, content, color, x, y, width, height, z_index, created_at, updated_at
         FROM sticky_notes
         WHERE id = $1`,
        [id]
      );
      return existing.rows[0] ? mapStickyNoteRow(existing.rows[0]) : null;
    }

    const result = await pool.query(
      `UPDATE sticky_notes
       SET ${fields.join(', ')},
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, content, color, x, y, width, height, z_index, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapStickyNoteRow(result.rows[0]) : null;
  }

  async remove(id) {
    const result = await pool.query('DELETE FROM sticky_notes WHERE id = $1 RETURNING id', [id]);
    return Boolean(result.rowCount);
  }
}
