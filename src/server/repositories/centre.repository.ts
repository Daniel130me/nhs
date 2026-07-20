import { query } from "../config/database";

export interface Centre {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  timezone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class CentreRepository {
  static async getAll(): Promise<Centre[]> {
    const rows = await query<any>(
      `SELECT id, name, code, address, city, state, country, timezone, status, 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM centres 
       WHERE status = 'ACTIVE' 
       ORDER BY name ASC`
    );
    return rows;
  }

  static async getById(id: string): Promise<Centre | null> {
    const rows = await query<any>(
      `SELECT id, name, code, address, city, state, country, timezone, status, 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM centres 
       WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async getByName(name: string): Promise<Centre | null> {
    const rows = await query<any>(
      `SELECT id, name, code, address, city, state, country, timezone, status, 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM centres 
       WHERE LOWER(name) = LOWER($1)`,
      [name]
    );
    return rows[0] || null;
  }

  static async create(centre: Omit<Centre, "id" | "createdAt" | "updatedAt">): Promise<Centre> {
    const rows = await query<any>(
      `INSERT INTO centres (name, code, address, city, state, country, timezone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, code, address, city, state, country, timezone, status, 
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        centre.name,
        centre.code,
        centre.address || null,
        centre.city || null,
        centre.state || null,
        centre.country || "Nigeria",
        centre.timezone || "Africa/Lagos",
        centre.status || "ACTIVE",
      ]
    );
    return rows[0];
  }
}
