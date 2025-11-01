import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import bcrypt from "bcrypt";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Initialize session table
async function initSessionTable() {
  try {
    // Create session table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        PRIMARY KEY (sid)
      )
    `);
    
    // Create index if not exists
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)
    `);
    
    console.log('Session table initialized successfully');
  } catch (error) {
    console.error('Error initializing session table:', error);
    throw error;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  // Initialize session table before using session middleware
  await initSessionTable();
  
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Admin login strategy
  passport.use('admin-local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (user.isAdmin !== 'true') {
          return done(null, false, { message: 'Unauthorized: Admin access required' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, { id: user.id, email: user.email, type: 'admin' });
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Driver login strategy
  passport.use('driver-local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const driver = await storage.getDriverByEmail(email);
        
        if (!driver) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!driver.password) {
          return done(null, false, { message: 'Please contact admin to set up your password' });
        }

        const isValid = await bcrypt.compare(password, driver.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, { id: driver.id, email: driver.email, type: 'driver' });
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user as any).type === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
};

export const isDriver: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user as any).type === 'driver') {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Driver access required" });
};
