import { pool } from '../db/pool.js';

const mapBoardRow = (row) => ({
  id: row.id,
  name: row.name,
  createdBy: row.created_by,
  createdAt: row.created_at
});

export class BoardRepository {
  async findAll() {
    const result = await pool.query(
      `SELECT id, name, created_by, created_at
       FROM boards
       ORDER BY created_at ASC`
    );

    return result.rows.map(mapBoardRow);
  }

  async create({ name, createdBy }) {
    const result = await pool.query(
      `INSERT INTO boards (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_by, created_at`,
      [name, createdBy || null]
    );

    return mapBoardRow(result.rows[0]);
  }

  async findById(id) {
    const result = await pool.query(
      `SELECT id, name, created_by, created_at
       FROM boards
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapBoardRow(result.rows[0]) : null;
  }
}
