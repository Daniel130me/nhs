import { Request } from "express";
import { query } from "../config/database";

export async function logAudit(options: {
  req?: Request;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
}) {
  const { req, action, entityType, entityId, oldValues, newValues, metadata } = options;
  
  let actorId = options.actorId;
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  if (req) {
    if (req.user) {
      actorId = req.user.id;
    } else if (req.session && req.session.userId) {
      actorId = req.session.userId;
    }
    // Extract real IP
    const xForwardedFor = req.headers["x-forwarded-for"];
    if (xForwardedFor) {
      const parts = (xForwardedFor as string).split(",");
      ipAddress = parts[0].trim();
    } else {
      ipAddress = req.ip || null;
    }
    userAgent = req.headers["user-agent"] || null;
  }

  // Convert IPv6 loopback representation to IPv4 to prevent INET type parsing issues in PostgreSQL
  if (ipAddress === "::1" || ipAddress === "::ffff:127.0.0.1") {
    ipAddress = "127.0.0.1";
  }

  // Validate UUID formats or set them to null if invalid
  const isValidUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  };

  const dbActorId = actorId && isValidUUID(actorId) ? actorId : null;
  const dbEntityId = entityId && isValidUUID(entityId) ? entityId : null;

  try {
    await query(
      `INSERT INTO audit_logs (
        actor_id, action, entity_type, entity_id, old_values, new_values, metadata, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        dbActorId,
        action,
        entityType,
        dbEntityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (err) {
    console.error("[Audit Log Error] Failed to write audit log:", err);
  }
}
