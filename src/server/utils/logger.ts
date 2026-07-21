function sanitize(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }
  const sanitized: any = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("cookie") ||
      lowerKey.includes("token") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("sess") ||
      lowerKey.includes("auth") ||
      lowerKey.includes("key") ||
      lowerKey.includes("credential")
    ) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitize(val);
    }
  }
  return sanitized;
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const sanitizedArgs = args.map(sanitize);
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify({ level: "INFO", timestamp, message, meta: sanitizedArgs }));
    } else {
      console.log(`[INFO] [${timestamp}] ${message}`, ...sanitizedArgs);
    }
  },
  warn: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const sanitizedArgs = args.map(sanitize);
    if (process.env.NODE_ENV === "production") {
      console.warn(JSON.stringify({ level: "WARN", timestamp, message, meta: sanitizedArgs }));
    } else {
      console.warn(`[WARN] [${timestamp}] ${message}`, ...sanitizedArgs);
    }
  },
  error: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const sanitizedArgs = args.map(sanitize);
    if (process.env.NODE_ENV === "production") {
      console.error(JSON.stringify({ level: "ERROR", timestamp, message, meta: sanitizedArgs }));
    } else {
      console.error(`[ERROR] [${timestamp}] ${message}`, ...sanitizedArgs);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      const timestamp = new Date().toISOString();
      const sanitizedArgs = args.map(sanitize);
      console.log(`[DEBUG] [${timestamp}] ${message}`, ...sanitizedArgs);
    }
  },
};

