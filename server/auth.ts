import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Middleware for optional authentication
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Just pass through, user info available in req.session.userId if logged in
  next();
}

// Extend Express Session type
declare module "express-session" {
  interface SessionData {
    userId?: string;
    email?: string;
  }
}
