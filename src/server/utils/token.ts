import crypto from "crypto";

const JWT_SECRET = process.env.SESSION_SECRET || "nhs-super-secret-key-123456";

export interface TokenPayload {
  userId: string;
  role: string;
  expiresAt: number;
}

/**
 * Generates a signed stateless authentication token.
 */
export function generateToken(payload: { userId: string; role: string }, expiresInDays = 7): string {
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const data = `${payload.userId}:${payload.role}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
  return Buffer.from(`${data}:${signature}`).toString("base64url");
}

/**
 * Verifies and decodes a signed authentication token.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    
    const [userId, role, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    
    // Check expiration
    if (Date.now() > expiresAt) return null;
    
    // Validate HMAC signature
    const data = `${userId}:${role}:${expiresAt}`;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
    
    if (signature !== expectedSignature) return null;
    
    return { userId, role, expiresAt };
  } catch (err) {
    return null;
  }
}
