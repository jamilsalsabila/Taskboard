import { pool } from '../db/pool.js';

const mapUserRow = (row) => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at
});

export class UserRepository {
  async findByName(name) {
    const result = await pool.query(
      `SELECT id, name, created_at
       FROM users
       WHERE lower(name) = lower($1)
       LIMIT 1`,
      [name]
    );

    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  async create(name) {
    const result = await pool.query(
      `INSERT INTO users (name)
       VALUES ($1)
       RETURNING id, name, created_at`,
      [name]
    );

    return mapUserRow(result.rows[0]);
  }

  async findOrCreateByName(name) {
    const existing = await this.findByName(name);
    if (existing) return existing;

    try {
      return await this.create(name);
    } catch {
      // Handle race if name created concurrently
      return this.findByName(name);
    }
  }
}
