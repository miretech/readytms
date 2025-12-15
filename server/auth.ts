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

  // Admin login strategy (for admin role only)
  passport.use('admin-local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    },
    async (req, email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        const expectedRole = req.body.expectedRole || 'admin';
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (user.isAdmin !== 'true') {
          return done(null, false, { message: 'Unauthorized: Access denied' });
        }

        // Check if the user's role matches the expected role
        const userRole = user.role || 'admin';
        if (userRole !== expectedRole) {
          if (expectedRole === 'admin') {
            return done(null, false, { message: 'This account is not registered as an Admin. Please use the Dispatch login.' });
          } else {
            return done(null, false, { message: 'This account is not registered as Dispatch. Please use the Admin login.' });
          }
        }

        // Check if the account is approved
        if (user.approved !== 'true') {
          return done(null, false, { message: 'Your account is pending approval. An existing admin must approve your registration.' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Get user's primary company (or first company if no primary)
        const primaryCompany = await storage.getUserPrimaryCompany(user.id);
        const userCompanies = await storage.getCompaniesByUserId(user.id);
        const activeCompanyId = primaryCompany?.id || userCompanies[0]?.id || null;
        
        console.log("[DEBUG LOGIN] User:", user.email);
        console.log("[DEBUG LOGIN] Primary company:", primaryCompany?.name, primaryCompany?.id);
        console.log("[DEBUG LOGIN] All companies:", userCompanies.map(c => `${c.name}(${c.id})`).join(", "));
        console.log("[DEBUG LOGIN] Active company ID:", activeCompanyId);

        return done(null, { 
          id: user.id, 
          email: user.email, 
          type: 'admin', 
          role: userRole,
          activeCompanyId 
        });
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

        return done(null, { 
          id: driver.id, 
          email: driver.email, 
          type: 'driver',
          activeCompanyId: driver.companyId || null 
        });
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

export const requireActiveCompany: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user as any).activeCompanyId) {
    return next();
  }
  res.status(400).json({ message: "No active company selected. Please select a company." });
};
