import { query } from "../config/database";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, action_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, actionUrl || null]
    );
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}
