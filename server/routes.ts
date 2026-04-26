import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertLoadSchema, 
  insertTruckSchema,
  insertTrailerSchema,
  insertDriverSchema, 
  insertCustomerSchema, 
  insertDocumentSchema,
  insertExpenseSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  insertInspectionSchema,
  insertAccidentSchema,
  insertViolationSchema,
  insertSettlementSchema,
  insertMaintenanceSchema,
  insertFuelCardSchema,
  insertFuelTransactionSchema,
  insertGpsLocationSchema,
  insertShortPaySchema,
  insertChargeBackSchema
} from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin, isDriver } from "./auth";
import passport from "passport";
import bcrypt from "bcrypt";
import { extractLoadFromDocument } from "./aiExtraction";
import { autoGenerateInvoice, notifyLoadStatusChange, checkExpiringDocuments } from "./automation";
import { sendGPSEnabledNotification, sendGPSReminderNotification, sendEmail } from "./notifications";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up email/password Auth middleware
  await setupAuth(app);

  // Admin login
  app.post("/api/admin/login", (req, res, next) => {
    passport.authenticate('admin-local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        return res.json({ message: "Login successful", user: { id: user.id, email: user.email, type: user.type } });
      });
    })(req, res, next);
  });

  // Admin register
  app.post("/api/admin/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate role - only allow admin or dispatch
      const userRole = role === "dispatch" ? "dispatch" : "admin";

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check if this is the first admin user
      const approvedAdmins = await storage.getApprovedAdmins();
      const isFirstAdmin = approvedAdmins.length === 0;

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin: userRole === "admin" ? "true" : "false",
        role: userRole,
        approved: isFirstAdmin ? "true" : "false", // First admin is auto-approved
        approvedBy: isFirstAdmin ? null : null,
        approvedAt: isFirstAdmin ? new Date() : null,
      });

      if (isFirstAdmin) {
        res.status(201).json({ 
          message: "Admin registered successfully. You can now login.", 
          user: { id: user.id, email: user.email },
          approved: true
        });
      } else {
        // Send email notification to existing admins
        try {
          await storage.sendAdminApprovalNotification(user.email, approvedAdmins);
        } catch (emailError) {
          console.error("Failed to send approval notification:", emailError);
          // Don't fail registration if email fails
        }

        res.status(201).json({ 
          message: "Registration pending approval. Existing admins have been notified.", 
          user: { id: user.id, email: user.email },
          approved: false,
          pendingApproval: true
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Driver login
  app.post("/api/driver/login", (req, res, next) => {
    passport.authenticate('driver-local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        return res.json({ message: "Login successful", user: { id: user.id, email: user.email, type: user.type } });
      });
    })(req, res, next);
  });

  // Get current user (works for both admin and driver)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.user;
      
      if (sessionUser.type === 'admin') {
        const user = await storage.getUser(sessionUser.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.json({ ...userWithoutPassword, type: 'admin' });
      } else if (sessionUser.type === 'driver') {
        const driver = await storage.getDriver(sessionUser.id);
        if (!driver) {
          return res.status(404).json({ message: "Driver not found" });
        }
        // Remove password from response
        const { password, ...driverWithoutPassword } = driver;
        return res.json({ ...driverWithoutPassword, type: 'driver' });
      }
      
      res.status(404).json({ message: "User not found" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Password Reset - Request reset email
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      console.log("[API] Password reset request received");
      const { email, userType } = req.body;
      console.log(`[API] Email: ${email}, UserType: ${userType}`);
      
      if (!email || !userType) {
        console.log("[API] Missing email or userType");
        return res.status(400).json({ message: "Email and user type are required" });
      }

      if (userType !== "admin" && userType !== "driver") {
        console.log("[API] Invalid userType");
        return res.status(400).json({ message: "Invalid user type" });
      }

      console.log("[API] Calling storage.requestPasswordReset...");
      // Generate reset token and send email
      const result = await storage.requestPasswordReset(email, userType);
      console.log("[API] Result from storage:", result);
      
      if (!result.success) {
        console.log("[API] Reset failed, returning generic message");
        // Don't reveal if email exists or not for security
        return res.json({ message: "If the email exists, a password reset link has been sent." });
      }

      console.log("[API] Reset successful, email sent");
      res.json({ message: "Password reset link has been sent to your email." });
    } catch (error) {
      console.error("[API] Password reset request error:", error);
      // Don't reveal internal errors
      res.json({ message: "If the email exists, a password reset link has been sent." });
    }
  });

  // Password Reset - Verify token and reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const result = await storage.resetPassword(token, password);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message || "Invalid or expired reset token" });
      }

      res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin Approval Routes
  app.get("/api/admin/pending", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pendingAdmins = await storage.getPendingAdmins();
      // Division admins only see pending users from their own division
      const currentUserDivisionId = req.user?.divisionId || null;
      const filtered = currentUserDivisionId
        ? pendingAdmins.filter((u: any) => u.divisionId === currentUserDivisionId)
        : pendingAdmins;
      // Remove passwords from response
      const sanitized = filtered.map(({ password, ...user }: any) => user);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching pending admins:", error);
      res.status(500).json({ message: "Failed to fetch pending admins" });
    }
  });

  app.post("/api/admin/approve/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const approvedBy = req.user.id; // Current admin user ID

      const user = await storage.approveAdmin(userId, approvedBy);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send approval email to the approved user
      try {
        await storage.sendAdminApprovedEmail(user.email);
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail approval if email fails
      }

      res.json({ message: "Admin approved successfully", user: { id: user.id, email: user.email } });
    } catch (error) {
      console.error("Error approving admin:", error);
      res.status(500).json({ message: "Failed to approve admin" });
    }
  });

  app.post("/api/admin/reject/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.rejectAdmin(userId);
      res.json({ message: "Admin registration rejected" });
    } catch (error) {
      console.error("Error rejecting admin:", error);
      res.status(500).json({ message: "Failed to reject admin" });
    }
  });

  app.get("/api/loads", async (req: any, res) => {
    const loads = await storage.getAllLoads(req.user?.divisionId || undefined);
    res.json(loads);
  });

  app.get("/api/loads/:id", async (req, res) => {
    const load = await storage.getLoad(req.params.id);
    if (!load) {
      return res.status(404).json({ error: "Load not found" });
    }
    res.json(load);
  });

  app.post("/api/loads", async (req: any, res) => {
    try {
      const validatedData = insertLoadSchema.parse(req.body);
      const load = await storage.createLoad(validatedData, req.user?.divisionId || undefined);
      res.status(201).json(load);
    } catch (error) {
      res.status(400).json({ error: "Invalid load data" });
    }
  });

  app.patch("/api/loads/:id", async (req, res) => {
    try {
      // Get the old load data before update
      const oldLoad = await storage.getLoad(req.params.id);
      if (!oldLoad) {
        return res.status(404).json({ error: "Load not found" });
      }
      
      const validatedData = insertLoadSchema.partial().parse(req.body);
      const load = await storage.updateLoad(req.params.id, validatedData);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }

      // Trigger automation: Auto-generate invoice if status changed to "delivered"
      if (validatedData.status && validatedData.status.toLowerCase() === "delivered" && oldLoad.status !== "delivered") {
        await autoGenerateInvoice(load);
      }

      // Trigger automation: Notify about status change
      if (validatedData.status && validatedData.status !== oldLoad.status) {
        await notifyLoadStatusChange(load, oldLoad.status, validatedData.status);
      }
      
      res.json(load);
    } catch (error) {
      res.status(400).json({ error: "Invalid load data" });
    }
  });

  app.delete("/api/loads/:id", async (req, res) => {
    const deleted = await storage.deleteLoad(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Load not found" });
    }
    res.status(204).send();
  });

  // Driver POD Upload Routes - Require driver authentication
  app.get("/api/driver/loads", isAuthenticated, isDriver, async (req: any, res) => {
    try {
      const sessionUser = req.user;
      
      if (!sessionUser || sessionUser.type !== 'driver') {
        return res.status(403).json({ error: "Driver access required" });
      }
      
      // Get the driver from the database
      const driver = await storage.getDriver(sessionUser.id);
      
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      
      // Get loads assigned to this driver only
      const allLoads = await storage.getAllLoads();
      const driverLoads = allLoads.filter(load => load.assignedDriverId === driver.id);
      res.json(driverLoads);
    } catch (error) {
      console.error("Error fetching driver loads:", error);
      res.status(500).json({ error: "Failed to fetch loads" });
    }
  });

  app.post("/api/driver/loads/:id/pod", isAuthenticated, isDriver, async (req: any, res) => {
    try {
      const loadId = req.params.id;
      const { podAttachments } = req.body;
      const sessionUser = req.user;
      
      if (!sessionUser || sessionUser.type !== 'driver') {
        return res.status(403).json({ error: "Driver access required" });
      }
      
      if (!podAttachments || !Array.isArray(podAttachments)) {
        return res.status(400).json({ error: "POD attachments are required" });
      }
      
      // Validate attachment schema
      const podSchema = z.array(z.object({
        filename: z.string(),
        data: z.string(),
        type: z.string(),
      }));
      
      try {
        podSchema.parse(podAttachments);
      } catch (validationError) {
        return res.status(400).json({ error: "Invalid attachment format" });
      }
      
      // Limit: max 10 POD attachments per upload
      if (podAttachments.length > 10) {
        return res.status(400).json({ error: "Maximum 10 POD attachments allowed per upload" });
      }
      
      // Limit: max 10MB per attachment (base64 is ~1.37x original size, so ~7.3MB original)
      const maxSize = 10 * 1024 * 1024; // 10MB in base64
      for (const att of podAttachments) {
        if (att.data.length > maxSize) {
          return res.status(400).json({ error: `Attachment ${att.filename} exceeds 10MB limit` });
        }
      }
      
      // Get existing load
      const existingLoad = await storage.getLoad(loadId);
      if (!existingLoad) {
        return res.status(404).json({ error: "Load not found" });
      }
      
      // Verify the load is assigned to the authenticated driver
      const driver = await storage.getDriver(sessionUser.id);
      
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      
      if (existingLoad.assignedDriverId !== driver.id) {
        return res.status(403).json({ error: "This load is not assigned to you" });
      }
      
      // Add uploadedAt timestamp to each attachment
      const timestampedAttachments = podAttachments.map(att => ({
        ...att,
        uploadedAt: new Date().toISOString(),
      }));
      
      // Merge with existing POD attachments if any
      const existingPODs = (existingLoad.podAttachments as any) || [];
      const allPODs = [...existingPODs, ...timestampedAttachments];
      
      // Limit: max 50 total POD attachments per load
      if (allPODs.length > 50) {
        return res.status(400).json({ error: "Maximum 50 total POD attachments allowed per load" });
      }
      
      // Update load with POD attachments
      const updatedLoad = await storage.updateLoad(loadId, {
        podAttachments: allPODs,
        status: "delivered", // Automatically mark as delivered when POD uploaded
      });
      
      if (!updatedLoad) {
        return res.status(404).json({ error: "Load not found" });
      }
      
      // Trigger automation: Auto-generate invoice
      await autoGenerateInvoice(updatedLoad);
      
      res.json(updatedLoad);
    } catch (error) {
      console.error("Error uploading POD:", error);
      res.status(400).json({ 
        error: "Failed to upload POD",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/trucks", async (req: any, res) => {
    const trucks = await storage.getAllTrucks(req.user?.divisionId || undefined);
    res.json(trucks);
  });

  app.get("/api/trucks/:id", async (req, res) => {
    const truck = await storage.getTruck(req.params.id);
    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }
    res.json(truck);
  });

  app.post("/api/trucks", async (req: any, res) => {
    try {
      const validatedData = insertTruckSchema.parse(req.body);
      const truck = await storage.createTruck(validatedData, req.user?.divisionId || undefined);
      res.status(201).json(truck);
    } catch (error) {
      res.status(400).json({ error: "Invalid truck data" });
    }
  });

  app.patch("/api/trucks/:id", async (req, res) => {
    try {
      const validatedData = insertTruckSchema.partial().parse(req.body);
      const truck = await storage.updateTruck(req.params.id, validatedData);
      if (!truck) {
        return res.status(404).json({ error: "Truck not found" });
      }
      res.json(truck);
    } catch (error) {
      res.status(400).json({ error: "Invalid truck data" });
    }
  });

  app.delete("/api/trucks/:id", async (req, res) => {
    const deleted = await storage.deleteTruck(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Truck not found" });
    }
    res.status(204).send();
  });

  app.get("/api/trailers", async (req: any, res) => {
    try {
      const trailers = await storage.getAllTrailers(req.user?.divisionId || undefined);
      res.json(trailers);
    } catch (error) {
      console.error("Error fetching trailers:", error);
      res.status(500).json({ error: "Failed to fetch trailers", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/trailers/:id", async (req, res) => {
    const trailer = await storage.getTrailer(req.params.id);
    if (!trailer) {
      return res.status(404).json({ error: "Trailer not found" });
    }
    res.json(trailer);
  });

  app.post("/api/trailers", async (req: any, res) => {
    try {
      const validatedData = insertTrailerSchema.parse(req.body);
      const trailer = await storage.createTrailer(validatedData, req.user?.divisionId || undefined);
      res.status(201).json(trailer);
    } catch (error) {
      console.error("Trailer validation error:", error);
      res.status(400).json({ error: "Invalid trailer data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/trailers/:id", async (req, res) => {
    try {
      const validatedData = insertTrailerSchema.partial().parse(req.body);
      const trailer = await storage.updateTrailer(req.params.id, validatedData);
      if (!trailer) {
        return res.status(404).json({ error: "Trailer not found" });
      }
      res.json(trailer);
    } catch (error) {
      console.error("Trailer update validation error:", error);
      res.status(400).json({ error: "Invalid trailer data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/trailers/:id", async (req, res) => {
    const deleted = await storage.deleteTrailer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Trailer not found" });
    }
    res.status(204).send();
  });

  app.get("/api/drivers", async (req: any, res) => {
    const drivers = await storage.getAllDrivers(req.user?.divisionId || undefined);
    res.json(drivers);
  });

  app.get("/api/drivers/:id", async (req, res) => {
    const driver = await storage.getDriver(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }
    res.json(driver);
  });

  // Public driver signup endpoint (no authentication required)
  app.post("/api/drivers/signup", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.parse({
        ...req.body,
        status: "Active", // Default status for new drivers
      });
      
      // Check if driver with this email already exists
      const existingDriver = await storage.getDriverByEmail(validatedData.email);
      if (existingDriver) {
        return res.status(409).json({ message: "A driver with this email already exists" });
      }
      
      // Check if driver with this license number already exists
      const existingLicense = await storage.getDriverByLicense(validatedData.licenseNumber);
      if (existingLicense) {
        return res.status(409).json({ message: "A driver with this CDL license number already exists" });
      }
      
      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 12);
      }
      
      const driver = await storage.createDriver(validatedData);
      res.status(201).json({ 
        message: "Driver account created successfully",
        driver: { id: driver.id, name: driver.name, email: driver.email }
      });
    } catch (error: any) {
      console.error("Driver signup error:", error);
      res.status(400).json({ message: error.message || "Invalid driver data" });
    }
  });

  app.post("/api/drivers", async (req: any, res) => {
    try {
      const validatedData = insertDriverSchema.parse(req.body);
      
      // If password is provided, hash it
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 12);
      }
      
      const driver = await storage.createDriver(validatedData, req.user?.divisionId || undefined);
      res.status(201).json(driver);
    } catch (error: any) {
      console.error("Driver validation error:", error);
      res.status(400).json({ error: "Invalid driver data", details: error.message });
    }
  });

  app.patch("/api/drivers/:id", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.partial().parse(req.body);
      
      // If password is being updated, hash it
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 12);
      }
      
      const driver = await storage.updateDriver(req.params.id, validatedData);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json(driver);
    } catch (error: any) {
      console.error("Driver update error:", error);
      res.status(400).json({ error: "Invalid driver data", details: error.message });
    }
  });

  app.delete("/api/drivers/:id", async (req, res) => {
    const deleted = await storage.deleteDriver(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Driver not found" });
    }
    res.status(204).send();
  });

  app.get("/api/customers", async (req: any, res) => {
    const customers = await storage.getAllCustomers(req.user?.divisionId || undefined);
    res.json(customers);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  });

  app.post("/api/customers", async (req: any, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData, req.user?.divisionId || undefined);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const deleted = await storage.deleteCustomer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.status(204).send();
  });

  app.post("/api/extract-load", async (req, res) => {
    try {
      const { fileData, fileType } = req.body;
      
      if (!fileData || !fileType) {
        return res.status(400).json({ error: "Missing file data or type" });
      }

      // Server-side file size validation
      // Base64 adds ~33% overhead, so for a 5MB file limit, max base64 string is ~6.65MB
      const base64Content = fileData.split(",")[1] || fileData;
      const sizeInBytes = (base64Content.length * 3) / 4;
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit (OpenAI Vision API constraint)
      
      if (sizeInBytes > maxSizeBytes) {
        return res.status(413).json({ 
          error: `File is too large. Maximum size is 5MB due to AI processing limits.` 
        });
      }

      console.log(`[AI Extract] Starting extraction for file type: ${fileType}`);
      const extractedData = await extractLoadFromDocument(fileData, fileType);
      console.log(`[AI Extract] Extraction successful. Broker info: ${extractedData.brokerName ? 'Yes' : 'No'}`);
      
      // If broker information was extracted, create/find customer automatically
      let customerId: string | undefined;
      if (extractedData.brokerName) {
        // Normalize broker name for matching (remove punctuation, extra spaces, make lowercase)
        const normalizeName = (name: string) => {
          return name
            .toLowerCase()
            .trim()
            .replace(/[.,\-_()]/g, '') // Remove common punctuation
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
        };
        
        // Clean broker address - filter out explanatory AI messages
        const cleanBrokerAddress = (address: string | null): string | null => {
          if (!address) return null;
          const lowerAddress = address.toLowerCase();
          // Filter out common AI explanatory text
          if (lowerAddress.includes('not explicitly mentioned') ||
              lowerAddress.includes('not mentioned') ||
              lowerAddress.includes('not found') ||
              lowerAddress.includes('not available') ||
              lowerAddress.includes('not provided') ||
              lowerAddress.includes('n/a') ||
              lowerAddress.includes('unknown') ||
              address.trim().length < 5) {
            return null;
          }
          return address;
        };
        
        const cleanedBrokerAddress = cleanBrokerAddress(extractedData.brokerAddress);
        
        const normalizedBrokerName = normalizeName(extractedData.brokerName);
        
        // Check if customer already exists with this name
        const existingCustomers = await storage.getAllCustomers();
        const existingCustomer = existingCustomers.find(
          c => normalizeName(c.name) === normalizedBrokerName
        );
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
          console.log(`[AI Extract] Found existing customer: ${existingCustomer.name} (ID: ${existingCustomer.id})`);
        } else {
          // Create new customer with extracted broker information
          const newCustomer = await storage.createCustomer({
            name: extractedData.brokerName,
            address: cleanedBrokerAddress,
            city: null,
            state: null,
            zip: null,
            phone: extractedData.brokerPhone || null,
            email: extractedData.brokerEmail || null,
            contactPerson: null,
            mcNumber: null,
            notes: "Auto-created from AI extraction",
          }, (req as any).user?.divisionId || undefined);
          customerId = newCustomer.id;
          console.log(`[AI Extract] Created new customer: ${newCustomer.name} (ID: ${newCustomer.id})`);
        }
      }
      
      // Return both extracted data and customerId
      res.json({
        ...extractedData,
        customerId,
      });
    } catch (error: any) {
      console.error("[AI Extract] Error extracting load:", error);
      console.error("[AI Extract] Error details:", {
        message: error?.message,
        stack: error?.stack,
        fileType: req.body?.fileType,
      });
      
      // Provide more helpful error messages
      let errorMessage = error.message || "Failed to extract load data";
      if (error.message?.includes('data:')) {
        errorMessage = "Invalid file format. Please ensure you're uploading a valid image file.";
      } else if (error.message?.includes('OpenAI') || error.message?.includes('AI')) {
        errorMessage = "AI extraction service error. Please try again or contact support.";
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ error: "Invalid document data" });
    }
  });

  app.get("/api/documents/load/:loadId", async (req, res) => {
    const documents = await storage.getDocumentsByLoad(req.params.loadId);
    res.json(documents);
  });

  // Expenses Routes
  app.get("/api/expenses", async (_req, res) => {
    const expenses = await storage.getAllExpenses();
    res.json(expenses);
  });

  app.get("/api/expenses/:id", async (req, res) => {
    const expense = await storage.getExpense(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json(expense);
  });

  app.get("/api/expenses/load/:loadId", async (req, res) => {
    const expenses = await storage.getExpensesByLoad(req.params.loadId);
    res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid expense data" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validatedData);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid expense data" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const deleted = await storage.deleteExpense(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.status(204).send();
  });

  // Invoices Routes
  app.get("/api/invoices", async (req: any, res) => {
    const invoices = await storage.getAllInvoices(req.user?.divisionId || undefined);
    res.json(invoices);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  });

  app.post("/api/invoices", async (req: any, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData, req.user?.divisionId || undefined);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const deleted = await storage.deleteInvoice(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(204).send();
  });

  // Factoring Email Route
  app.post("/api/accounting/factoring-email", async (req, res) => {
    try {
      console.log('[Factoring Email] Request received:', {
        to: req.body.to,
        from: req.body.from,
        subject: req.body.subject,
        invoiceId: req.body.invoiceId,
        loadId: req.body.loadId,
        attachPods: req.body.attachPods,
        hasPdf: !!req.body.invoicePdf,
      });

      const schema = z.object({
        to: z.string().email(),
        from: z.string().email().optional(),
        subject: z.string().min(1),
        message: z.string().min(1),
        invoiceId: z.string(),
        loadId: z.string().optional(),
        invoicePdf: z.string().optional(), // base64 encoded PDF
        attachPods: z.boolean().default(false),
        invoiceAttachments: z.array(z.any()).optional(), // invoice attachments (rate confirmations, BOLs, etc.)
      });

      const validatedData = schema.parse(req.body);

      // Fetch invoice data
      const invoice = await storage.getInvoice(validatedData.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Prepare attachments array
      const attachments: Array<{ filename: string; content: Buffer | string; type?: string }> = [];

      // Add invoice PDF if provided
      if (validatedData.invoicePdf) {
        const pdfBuffer = Buffer.from(validatedData.invoicePdf, 'base64');
        attachments.push({
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          type: 'application/pdf',
        });
      }

      // Add invoice attachments (rate confirmations, BOLs, etc.)
      if (validatedData.invoiceAttachments && Array.isArray(validatedData.invoiceAttachments)) {
        validatedData.invoiceAttachments.forEach((attachment: any, index: number) => {
          if (attachment.data) {
            // Remove data URI prefix if present
            const base64Data = attachment.data.includes(',') 
              ? attachment.data.split(',')[1] 
              : attachment.data;
            const attachmentBuffer = Buffer.from(base64Data, 'base64');
            attachments.push({
              filename: attachment.filename || `Attachment-${index + 1}.${attachment.type?.split('/')[1] || 'pdf'}`,
              content: attachmentBuffer,
              type: attachment.type || 'application/pdf',
            });
          }
        });
      }

      // Add POD attachments if requested and loadId provided
      if (validatedData.attachPods && validatedData.loadId) {
        const load = await storage.getLoad(validatedData.loadId);
        if (load && load.podAttachments) {
          const pods = Array.isArray(load.podAttachments) ? load.podAttachments : [];
          pods.forEach((pod: any, index: number) => {
            if (pod.data) {
              // Remove data URI prefix if present
              const base64Data = pod.data.includes(',') 
                ? pod.data.split(',')[1] 
                : pod.data;
              const podBuffer = Buffer.from(base64Data, 'base64');
              attachments.push({
                filename: pod.filename || `POD-${index + 1}.${pod.type?.split('/')[1] || 'pdf'}`,
                content: podBuffer,
                type: pod.type || 'application/pdf',
              });
            }
          });
        }
      }

      // Send email
      const emailSent = await sendEmail({
        to: validatedData.to,
        from: validatedData.from,
        subject: validatedData.subject,
        html: validatedData.message.replace(/\n/g, '<br>'),
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (!emailSent) {
        return res.status(500).json({ error: "Failed to send email" });
      }

      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error('[Factoring Email] Error:', error);
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  // Payments Routes
  app.get("/api/payments", async (_req, res) => {
    const payments = await storage.getAllPayments();
    res.json(payments);
  });

  app.get("/api/payments/:id", async (req, res) => {
    const payment = await storage.getPayment(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(payment);
  });

  app.get("/api/payments/invoice/:invoiceId", async (req, res) => {
    const payments = await storage.getPaymentsByInvoice(req.params.invoiceId);
    res.json(payments);
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ error: "Invalid payment data" });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(req.params.id, validatedData);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(400).json({ error: "Invalid payment data" });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    const deleted = await storage.deletePayment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.status(204).send();
  });

  // Inspections Routes
  app.get("/api/inspections", async (_req, res) => {
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  app.get("/api/inspections/:id", async (req, res) => {
    const inspection = await storage.getInspection(req.params.id);
    if (!inspection) {
      return res.status(404).json({ error: "Inspection not found" });
    }
    res.json(inspection);
  });

  app.get("/api/inspections/truck/:truckId", async (req, res) => {
    const inspections = await storage.getInspectionsByTruck(req.params.truckId);
    res.json(inspections);
  });

  app.get("/api/inspections/driver/:driverId", async (req, res) => {
    const inspections = await storage.getInspectionsByDriver(req.params.driverId);
    res.json(inspections);
  });

  app.post("/api/inspections", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.parse(req.body);
      const inspection = await storage.createInspection(validatedData);
      res.status(201).json(inspection);
    } catch (error) {
      res.status(400).json({ error: "Invalid inspection data" });
    }
  });

  app.patch("/api/inspections/:id", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.partial().parse(req.body);
      const inspection = await storage.updateInspection(req.params.id, validatedData);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      res.status(400).json({ error: "Invalid inspection data" });
    }
  });

  app.delete("/api/inspections/:id", async (req, res) => {
    const deleted = await storage.deleteInspection(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Inspection not found" });
    }
    res.status(204).send();
  });

  // Accidents Routes
  app.get("/api/accidents", async (_req, res) => {
    const accidents = await storage.getAllAccidents();
    res.json(accidents);
  });

  app.get("/api/accidents/:id", async (req, res) => {
    const accident = await storage.getAccident(req.params.id);
    if (!accident) {
      return res.status(404).json({ error: "Accident not found" });
    }
    res.json(accident);
  });

  app.get("/api/accidents/driver/:driverId", async (req, res) => {
    const accidents = await storage.getAccidentsByDriver(req.params.driverId);
    res.json(accidents);
  });

  app.post("/api/accidents", async (req, res) => {
    try {
      const validatedData = insertAccidentSchema.parse(req.body);
      const accident = await storage.createAccident(validatedData);
      res.status(201).json(accident);
    } catch (error: any) {
      console.error("[Accident] Create error:", error?.message, error?.issues ?? "");
      res.status(400).json({ error: "Invalid accident data", details: error?.message });
    }
  });

  app.patch("/api/accidents/:id", async (req, res) => {
    try {
      const validatedData = insertAccidentSchema.partial().parse(req.body);
      const accident = await storage.updateAccident(req.params.id, validatedData);
      if (!accident) {
        return res.status(404).json({ error: "Accident not found" });
      }
      res.json(accident);
    } catch (error) {
      res.status(400).json({ error: "Invalid accident data" });
    }
  });

  app.delete("/api/accidents/:id", async (req, res) => {
    const deleted = await storage.deleteAccident(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Accident not found" });
    }
    res.status(204).send();
  });

  // Violations Routes
  app.get("/api/violations", async (_req, res) => {
    const violations = await storage.getAllViolations();
    res.json(violations);
  });

  app.get("/api/violations/:id", async (req, res) => {
    const violation = await storage.getViolation(req.params.id);
    if (!violation) {
      return res.status(404).json({ error: "Violation not found" });
    }
    res.json(violation);
  });

  app.get("/api/violations/driver/:driverId", async (req, res) => {
    const violations = await storage.getViolationsByDriver(req.params.driverId);
    res.json(violations);
  });

  app.post("/api/violations", async (req, res) => {
    try {
      const validatedData = insertViolationSchema.parse(req.body);
      const violation = await storage.createViolation(validatedData);
      res.status(201).json(violation);
    } catch (error) {
      res.status(400).json({ error: "Invalid violation data" });
    }
  });

  app.patch("/api/violations/:id", async (req, res) => {
    try {
      const validatedData = insertViolationSchema.partial().parse(req.body);
      const violation = await storage.updateViolation(req.params.id, validatedData);
      if (!violation) {
        return res.status(404).json({ error: "Violation not found" });
      }
      res.json(violation);
    } catch (error) {
      res.status(400).json({ error: "Invalid violation data" });
    }
  });

  app.delete("/api/violations/:id", async (req, res) => {
    const deleted = await storage.deleteViolation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Violation not found" });
    }
    res.status(204).send();
  });

  // Settlements Routes
  app.get("/api/settlements", async (req: any, res) => {
    const settlements = await storage.getAllSettlements(req.user?.divisionId || undefined);
    res.json(settlements);
  });

  app.get("/api/settlements/:id", async (req, res) => {
    const settlement = await storage.getSettlement(req.params.id);
    if (!settlement) {
      return res.status(404).json({ error: "Settlement not found" });
    }
    res.json(settlement);
  });

  app.get("/api/settlements/driver/:driverId", async (req, res) => {
    const settlements = await storage.getSettlementsByDriver(req.params.driverId);
    res.json(settlements);
  });

  app.post("/api/settlements", async (req, res) => {
    try {
      const validatedData = insertSettlementSchema.parse(req.body);
      const settlement = await storage.createSettlement(validatedData);
      res.status(201).json(settlement);
    } catch (error) {
      console.error("Settlement validation error:", error);
      res.status(400).json({ 
        error: "Invalid settlement data", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.patch("/api/settlements/:id", async (req, res) => {
    try {
      const validatedData = insertSettlementSchema.partial().parse(req.body);
      const settlement = await storage.updateSettlement(req.params.id, validatedData);
      if (!settlement) {
        return res.status(404).json({ error: "Settlement not found" });
      }
      res.json(settlement);
    } catch (error) {
      console.error("Settlement update validation error:", error);
      res.status(400).json({ 
        error: "Invalid settlement data", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.delete("/api/settlements/:id", async (req, res) => {
    const deleted = await storage.deleteSettlement(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Settlement not found" });
    }
    res.status(204).send();
  });

  // Settlement Line Items Routes
  app.get("/api/settlements/:settlementId/line-items", async (req, res) => {
    const lineItems = await storage.getSettlementLineItems(req.params.settlementId);
    res.json(lineItems);
  });

  app.post("/api/settlements/:settlementId/line-items", async (req, res) => {
    try {
      const { insertSettlementLineItemSchema } = await import("@shared/schema");
      const validatedData = insertSettlementLineItemSchema.parse({
        ...req.body,
        settlementId: req.params.settlementId,
      });
      const lineItem = await storage.createSettlementLineItem(validatedData);
      res.status(201).json(lineItem);
    } catch (error) {
      console.error("Line item validation error:", error);
      res.status(400).json({ error: "Invalid line item data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/settlement-line-items/:id", async (req, res) => {
    try {
      const { insertSettlementLineItemSchema } = await import("@shared/schema");
      const validatedData = insertSettlementLineItemSchema.partial().parse(req.body);
      const lineItem = await storage.updateSettlementLineItem(req.params.id, validatedData);
      if (!lineItem) {
        return res.status(404).json({ error: "Line item not found" });
      }
      res.json(lineItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid line item data" });
    }
  });

  app.delete("/api/settlement-line-items/:id", async (req, res) => {
    const deleted = await storage.deleteSettlementLineItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Line item not found" });
    }
    res.status(204).send();
  });

  // Auto-generate settlement from loads
  app.post("/api/settlements/auto-generate", async (req, res) => {
    try {
      const { driverId, periodStart, periodEnd, payRate } = req.body;
      
      if (!driverId || !periodStart || !periodEnd) {
        return res.status(400).json({ error: "driverId, periodStart, and periodEnd are required" });
      }

      // Get all delivered loads for the driver in the period
      const allLoads = await storage.getAllLoads();
      const driverLoads = allLoads.filter(load => 
        load.assignedDriverId === driverId &&
        load.status === "Delivered" &&
        new Date(load.deliveryDate) >= new Date(periodStart) &&
        new Date(load.deliveryDate) <= new Date(periodEnd)
      );

      if (driverLoads.length === 0) {
        return res.status(404).json({ error: "No delivered loads found for this driver in the period" });
      }

      // Calculate totals
      const totalRevenue = driverLoads.reduce((sum, load) => sum + parseFloat(load.rate.toString()), 0);
      const totalMiles = driverLoads.reduce((sum, load) => sum + (load.weight || 0), 0); // Using weight as placeholder for miles

      // Calculate driver pay (using percentage or per-mile rate)
      const rateValue = parseFloat(payRate || "0.70"); // Default 70% of revenue
      const driverPay = payRate && payRate < 10 ? totalRevenue * rateValue : totalMiles * rateValue;

      // Get recurring expenses for this driver
      const recurringExpenses = await storage.getActiveRecurringExpenses(driverId);
      const deductions = recurringExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

      const netPay = driverPay - deductions;

      // Generate settlement number
      const today = new Date();
      const settlementNumber = `SETTLE-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Create settlement
      const settlement = await storage.createSettlement({
        driverId,
        settlementNumber,
        periodStart,
        periodEnd,
        totalMiles,
        totalRevenue: totalRevenue.toFixed(2),
        driverPayPercentage: (rateValue * 100).toFixed(2), // Convert to percentage
        deductions: deductions.toFixed(2),
        netPay: netPay.toFixed(2),
        status: "Pending",
      });

      // Create line items for each load
      for (const load of driverLoads) {
        const loadRevenue = parseFloat(load.rate.toString());
        const loadPay = payRate && payRate < 10 ? loadRevenue * rateValue : (load.weight || 0) * rateValue;
        
        await storage.createSettlementLineItem({
          settlementId: settlement.id,
          loadId: load.id,
          description: `Load ${load.loadNumber} - ${load.pickupLocation} to ${load.deliveryLocation}`,
          quantity: (load.weight || 0).toString(),
          rate: rateValue.toFixed(4),
          amount: loadPay.toFixed(2),
          itemType: "revenue",
        });
      }

      // Create line items for recurring expenses
      for (const expense of recurringExpenses) {
        await storage.createSettlementLineItem({
          settlementId: settlement.id,
          description: `${expense.name} - ${expense.description || expense.category}`,
          amount: `-${expense.amount}`,
          itemType: "deduction",
        });
      }

      res.status(201).json(settlement);
    } catch (error) {
      console.error("Error auto-generating settlement:", error);
      res.status(500).json({ error: "Failed to auto-generate settlement" });
    }
  });

  // Recurring Expenses Routes
  app.get("/api/recurring-expenses", async (_req, res) => {
    const expenses = await storage.getAllRecurringExpenses();
    res.json(expenses);
  });

  app.get("/api/recurring-expenses/:id", async (req, res) => {
    const expense = await storage.getRecurringExpense(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: "Recurring expense not found" });
    }
    res.json(expense);
  });

  app.get("/api/recurring-expenses/driver/:driverId", async (req, res) => {
    const expenses = await storage.getRecurringExpensesByDriver(req.params.driverId);
    res.json(expenses);
  });

  app.get("/api/recurring-expenses/active/:driverId?", async (req, res) => {
    const expenses = await storage.getActiveRecurringExpenses(req.params.driverId);
    res.json(expenses);
  });

  app.post("/api/recurring-expenses", async (req, res) => {
    try {
      const { insertRecurringExpenseSchema } = await import("@shared/schema");
      const validatedData = insertRecurringExpenseSchema.parse(req.body);
      const expense = await storage.createRecurringExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid recurring expense data" });
    }
  });

  app.patch("/api/recurring-expenses/:id", async (req, res) => {
    try {
      const { insertRecurringExpenseSchema } = await import("@shared/schema");
      const validatedData = insertRecurringExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateRecurringExpense(req.params.id, validatedData);
      if (!expense) {
        return res.status(404).json({ error: "Recurring expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid recurring expense data" });
    }
  });

  app.delete("/api/recurring-expenses/:id", async (req, res) => {
    const deleted = await storage.deleteRecurringExpense(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Recurring expense not found" });
    }
    res.status(204).send();
  });

  // Maintenance Routes
  app.get("/api/maintenance", async (_req, res) => {
    const maintenance = await storage.getAllMaintenance();
    res.json(maintenance);
  });

  app.get("/api/maintenance/:id", async (req, res) => {
    const record = await storage.getMaintenance(req.params.id);
    if (!record) {
      return res.status(404).json({ error: "Maintenance record not found" });
    }
    res.json(record);
  });

  app.get("/api/maintenance/truck/:truckId", async (req, res) => {
    const maintenance = await storage.getMaintenanceByTruck(req.params.truckId);
    res.json(maintenance);
  });

  app.post("/api/maintenance", async (req, res) => {
    try {
      const validatedData = insertMaintenanceSchema.parse(req.body);
      const record = await storage.createMaintenance(validatedData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Maintenance creation error:", error);
      res.status(400).json({ 
        error: "Invalid maintenance data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.patch("/api/maintenance/:id", async (req, res) => {
    try {
      const validatedData = insertMaintenanceSchema.partial().parse(req.body);
      const record = await storage.updateMaintenance(req.params.id, validatedData);
      if (!record) {
        return res.status(404).json({ error: "Maintenance record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Maintenance update error:", error);
      res.status(400).json({ 
        error: "Invalid maintenance data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/maintenance/:id", async (req, res) => {
    const deleted = await storage.deleteMaintenance(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Maintenance record not found" });
    }
    res.status(204).send();
  });

  // Check and send maintenance reminders
  app.post("/api/maintenance/check-reminders", async (_req, res) => {
    try {
      const { checkAndSendMaintenanceReminders } = await import('./notifications');
      const result = await checkAndSendMaintenanceReminders(
        () => storage.getAllMaintenance(),
        () => storage.getAllTrucks(),
        () => storage.getAllDrivers()
      );
      res.json({
        message: "Maintenance reminders checked",
        sent: result.sent,
        skipped: result.skipped
      });
    } catch (error) {
      console.error("Maintenance reminder check error:", error);
      res.status(500).json({ 
        error: "Failed to check maintenance reminders",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Fuel Card Routes
  app.get("/api/fuel-cards", async (_req, res) => {
    const cards = await storage.getAllFuelCards();
    res.json(cards);
  });

  app.get("/api/fuel-cards/:id", async (req, res) => {
    const card = await storage.getFuelCard(req.params.id);
    if (!card) {
      return res.status(404).json({ error: "Fuel card not found" });
    }
    res.json(card);
  });

  app.post("/api/fuel-cards", async (req, res) => {
    try {
      const validatedData = insertFuelCardSchema.parse(req.body);
      const card = await storage.createFuelCard(validatedData);
      res.status(201).json(card);
    } catch (error) {
      res.status(400).json({ error: "Invalid fuel card data" });
    }
  });

  app.patch("/api/fuel-cards/:id", async (req, res) => {
    try {
      const validatedData = insertFuelCardSchema.partial().parse(req.body);
      const card = await storage.updateFuelCard(req.params.id, validatedData);
      if (!card) {
        return res.status(404).json({ error: "Fuel card not found" });
      }
      res.json(card);
    } catch (error) {
      res.status(400).json({ error: "Invalid fuel card data" });
    }
  });

  app.delete("/api/fuel-cards/:id", async (req, res) => {
    const deleted = await storage.deleteFuelCard(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Fuel card not found" });
    }
    res.status(204).send();
  });

  // Fuel Transactions Routes
  app.get("/api/fuel", async (_req, res) => {
    const transactions = await storage.getAllFuelTransactions();
    res.json(transactions);
  });

  app.get("/api/fuel/:id", async (req, res) => {
    const transaction = await storage.getFuelTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Fuel transaction not found" });
    }
    res.json(transaction);
  });

  app.get("/api/fuel/truck/:truckId", async (req, res) => {
    const transactions = await storage.getFuelTransactionsByTruck(req.params.truckId);
    res.json(transactions);
  });

  app.get("/api/fuel/driver/:driverId", async (req, res) => {
    const transactions = await storage.getFuelTransactionsByDriver(req.params.driverId);
    res.json(transactions);
  });

  app.get("/api/fuel/load/:loadId", async (req, res) => {
    const transactions = await storage.getFuelTransactionsByLoad(req.params.loadId);
    res.json(transactions);
  });

  app.post("/api/fuel", async (req, res) => {
    try {
      const validatedData = insertFuelTransactionSchema.parse(req.body);
      const transaction = await storage.createFuelTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid fuel transaction data" });
    }
  });

  app.patch("/api/fuel/:id", async (req, res) => {
    try {
      const validatedData = insertFuelTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateFuelTransaction(req.params.id, validatedData);
      if (!transaction) {
        return res.status(404).json({ error: "Fuel transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid fuel transaction data" });
    }
  });

  app.delete("/api/fuel/:id", async (req, res) => {
    const deleted = await storage.deleteFuelTransaction(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Fuel transaction not found" });
    }
    res.status(204).send();
  });

  // GPS Tracking Routes
  app.get("/api/gps", async (_req, res) => {
    const locations = await storage.getAllGpsLocations();
    res.json(locations);
  });

  app.get("/api/gps/latest", async (_req, res) => {
    const locations = await storage.getLatestGpsLocations();
    res.json(locations);
  });

  // Admin: Enable/Disable GPS tracking for a driver
  app.patch("/api/drivers/:id/gps", async (req, res) => {
    try {
      const { gpsEnabled } = req.body;
      if (typeof gpsEnabled !== "boolean") {
        return res.status(400).json({ error: "gpsEnabled must be a boolean" });
      }

      const driver = await storage.updateDriver(req.params.id, {
        gpsEnabled: gpsEnabled ? "true" : "false",
      });

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      // Send notification when GPS is enabled
      if (gpsEnabled && driver.gpsNotificationsEnabled === "true") {
        sendGPSEnabledNotification(driver).catch(error => {
          console.error("Failed to send GPS enabled notification:", error);
        });
      }

      res.json({
        message: `GPS tracking ${gpsEnabled ? "enabled" : "disabled"} for ${driver.name}`,
        driver,
      });
    } catch (error: any) {
      console.error("GPS toggle error:", error);
      res.status(500).json({ error: "Failed to update GPS tracking status" });
    }
  });

  app.get("/api/gps/driver/:driverId", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const locations = await storage.getGpsLocationsByDriver(req.params.driverId, limit);
    res.json(locations);
  });

  app.get("/api/gps/truck/:truckId", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const locations = await storage.getGpsLocationsByTruck(req.params.truckId, limit);
    res.json(locations);
  });

  app.get("/api/gps/load/:loadId", async (req, res) => {
    const locations = await storage.getGpsLocationsByLoad(req.params.loadId);
    res.json(locations);
  });

  app.post("/api/gps", async (req, res) => {
    try {
      const validatedData = insertGpsLocationSchema.parse(req.body);
      const location = await storage.createGpsLocation(validatedData);
      
      // Update driver's last GPS update timestamp
      if (validatedData.driverId) {
        await storage.updateDriver(validatedData.driverId, {
          lastGpsUpdate: new Date(),
        });
      }
      
      res.status(201).json(location);
    } catch (error) {
      res.status(400).json({ error: "Invalid GPS location data" });
    }
  });

  // Automation & Notifications Routes
  app.get("/api/notifications", async (_req, res) => {
    const notifications = await storage.getAllNotifications();
    res.json(notifications);
  });

  app.get("/api/notifications/unread", async (_req, res) => {
    const notifications = await storage.getUnreadNotifications();
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    const success = await storage.markNotificationAsRead(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json({ success: true });
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    const deleted = await storage.deleteNotification(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(204).send();
  });

  // Send GPS reminders to drivers who haven't shared location in 24 hours
  app.post("/api/gps/send-reminders", isAdmin, async (req, res) => {
    try {
      const drivers = await storage.getAllDrivers();
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const remindersToSend = drivers.filter(driver => {
        // Only send reminders to drivers with GPS enabled and notifications enabled
        if (driver.gpsEnabled !== "true" || driver.gpsNotificationsEnabled !== "true") {
          return false;
        }
        
        // Check if they haven't shared location in 24 hours
        if (!driver.lastGpsUpdate) {
          return true; // Never shared location
        }
        
        const lastUpdate = new Date(driver.lastGpsUpdate);
        if (lastUpdate < twentyFourHoursAgo) {
          return true; // Haven't shared in 24 hours
        }
        
        return false;
      });
      
      // Send reminders
      const results = await Promise.allSettled(
        remindersToSend.map(async (driver) => {
          await sendGPSReminderNotification(driver);
          // Update the last notification sent timestamp
          await storage.updateDriver(driver.id, {
            lastGpsNotificationSent: new Date(),
          });
        })
      );
      
      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      res.json({
        message: "GPS reminders sent",
        total: remindersToSend.length,
        successful,
        failed,
      });
    } catch (error: any) {
      console.error("GPS reminder error:", error);
      res.status(500).json({ error: "Failed to send GPS reminders" });
    }
  });

  app.get("/api/automation/settings", async (_req, res) => {
    const settings = await storage.getAllAutomationSettings();
    res.json(settings);
  });

  app.patch("/api/automation/settings/:name", async (req, res) => {
    try {
      // Validate request body
      const validData = z.object({
        enabled: z.enum(["true", "false"]).optional(),
        config: z.record(z.any()).optional(),
      }).parse(req.body);
      
      const setting = await storage.updateAutomationSetting(req.params.name, validData);
      if (!setting) {
        return res.status(404).json({ error: "Automation setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(400).json({ error: "Invalid automation setting data" });
    }
  });

  app.post("/api/automation/check-expiring", async (_req, res) => {
    try {
      await checkExpiringDocuments();
      res.json({ success: true, message: "Expiring documents checked successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to check expiring documents" });
    }
  });

  app.get("/api/activity-log", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const logs = await storage.getAllActivityLogs(limit);
    res.json(logs);
  });

  // Short Pays Routes
  app.get("/api/short-pays", async (_req, res) => {
    const shortPays = await storage.getAllShortPays();
    res.json(shortPays);
  });

  app.get("/api/short-pays/:id", async (req, res) => {
    const shortPay = await storage.getShortPay(req.params.id);
    if (!shortPay) {
      return res.status(404).json({ error: "Short pay not found" });
    }
    res.json(shortPay);
  });

  app.get("/api/short-pays/customer/:customerId", async (req, res) => {
    const shortPays = await storage.getShortPaysByCustomer(req.params.customerId);
    res.json(shortPays);
  });

  app.get("/api/short-pays/status/:status", async (req, res) => {
    const shortPays = await storage.getShortPaysByStatus(req.params.status);
    res.json(shortPays);
  });

  app.post("/api/short-pays", async (req, res) => {
    try {
      // Get load and customer info
      const load = await storage.getLoad(req.body.loadId);
      const customer = await storage.getCustomer(req.body.customerId);
      
      if (!load || !customer) {
        return res.status(400).json({ error: "Invalid load or customer" });
      }

      // Map form data to schema
      const shortPayData = {
        loadId: req.body.loadId,
        loadNumber: load.loadNumber,
        customerId: req.body.customerId,
        customerName: customer.name,
        expectedAmount: req.body.originalAmount || req.body.expectedAmount,
        paidAmount: req.body.paidAmount,
        shortAmount: req.body.shortPayAmount || req.body.shortAmount,
        reason: req.body.reason,
        status: req.body.status || "open",
        notes: req.body.notes || null,
        resolvedAt: req.body.resolutionDate ? new Date(req.body.resolutionDate) : null,
      };

      const validatedData = insertShortPaySchema.parse(shortPayData);
      const shortPay = await storage.createShortPay(validatedData);
      res.status(201).json(shortPay);
    } catch (error) {
      console.error("Short pay creation error:", error);
      res.status(400).json({ error: "Invalid short pay data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/short-pays/:id", async (req, res) => {
    try {
      // Get load and customer info if IDs are provided
      const updateData: any = {};
      
      if (req.body.loadId) {
        const load = await storage.getLoad(req.body.loadId);
        if (!load) {
          return res.status(400).json({ error: "Invalid load" });
        }
        updateData.loadId = req.body.loadId;
        updateData.loadNumber = load.loadNumber;
      }
      
      if (req.body.customerId) {
        const customer = await storage.getCustomer(req.body.customerId);
        if (!customer) {
          return res.status(400).json({ error: "Invalid customer" });
        }
        updateData.customerId = req.body.customerId;
        updateData.customerName = customer.name;
      }
      
      // Map field names
      if (req.body.originalAmount) updateData.expectedAmount = req.body.originalAmount;
      if (req.body.paidAmount) updateData.paidAmount = req.body.paidAmount;
      if (req.body.shortPayAmount) updateData.shortAmount = req.body.shortPayAmount;
      if (req.body.reason) updateData.reason = req.body.reason;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.resolutionDate) updateData.resolvedAt = new Date(req.body.resolutionDate);

      const validatedData = insertShortPaySchema.partial().parse(updateData);
      const shortPay = await storage.updateShortPay(req.params.id, validatedData);
      if (!shortPay) {
        return res.status(404).json({ error: "Short pay not found" });
      }
      res.json(shortPay);
    } catch (error) {
      console.error("Short pay update error:", error);
      res.status(400).json({ error: "Invalid short pay data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/short-pays/:id", async (req, res) => {
    const success = await storage.deleteShortPay(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Short pay not found" });
    }
    res.status(204).send();
  });

  // Charge Backs Routes
  app.get("/api/charge-backs", async (_req, res) => {
    const chargeBacks = await storage.getAllChargeBacks();
    res.json(chargeBacks);
  });

  app.get("/api/charge-backs/:id", async (req, res) => {
    const chargeBack = await storage.getChargeBack(req.params.id);
    if (!chargeBack) {
      return res.status(404).json({ error: "Charge back not found" });
    }
    res.json(chargeBack);
  });

  app.get("/api/charge-backs/customer/:customerId", async (req, res) => {
    const chargeBacks = await storage.getChargeBacksByCustomer(req.params.customerId);
    res.json(chargeBacks);
  });

  app.get("/api/charge-backs/status/:status", async (req, res) => {
    const chargeBacks = await storage.getChargeBacksByStatus(req.params.status);
    res.json(chargeBacks);
  });

  app.post("/api/charge-backs", async (req, res) => {
    try {
      // Get load and customer info
      const load = await storage.getLoad(req.body.loadId);
      const customer = await storage.getCustomer(req.body.customerId);
      
      if (!load || !customer) {
        return res.status(400).json({ error: "Invalid load or customer" });
      }

      // Map form data to schema
      const chargeBackData = {
        loadId: req.body.loadId,
        loadNumber: load.loadNumber,
        customerId: req.body.customerId,
        customerName: customer.name,
        amount: req.body.amount,
        reason: req.body.reason,
        category: req.body.category || "other",
        status: req.body.status || "pending",
        submittedDate: req.body.chargeBackDate || new Date().toISOString().split("T")[0],
        resolvedDate: req.body.resolutionDate || null,
        resolution: req.body.resolution || null,
        notes: req.body.notes || null,
      };

      const validatedData = insertChargeBackSchema.parse(chargeBackData);
      const chargeBack = await storage.createChargeBack(validatedData);
      res.status(201).json(chargeBack);
    } catch (error) {
      console.error("Charge back creation error:", error);
      res.status(400).json({ error: "Invalid charge back data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/charge-backs/:id", async (req, res) => {
    try {
      // Get load and customer info if IDs are provided
      const updateData: any = {};
      
      if (req.body.loadId) {
        const load = await storage.getLoad(req.body.loadId);
        if (!load) {
          return res.status(400).json({ error: "Invalid load" });
        }
        updateData.loadId = req.body.loadId;
        updateData.loadNumber = load.loadNumber;
      }
      
      if (req.body.customerId) {
        const customer = await storage.getCustomer(req.body.customerId);
        if (!customer) {
          return res.status(400).json({ error: "Invalid customer" });
        }
        updateData.customerId = req.body.customerId;
        updateData.customerName = customer.name;
      }
      
      // Map field names
      if (req.body.amount) updateData.amount = req.body.amount;
      if (req.body.reason) updateData.reason = req.body.reason;
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.chargeBackDate) updateData.submittedDate = req.body.chargeBackDate;
      if (req.body.resolutionDate) updateData.resolvedDate = req.body.resolutionDate;
      if (req.body.resolution) updateData.resolution = req.body.resolution;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;

      const validatedData = insertChargeBackSchema.partial().parse(updateData);
      const chargeBack = await storage.updateChargeBack(req.params.id, validatedData);
      if (!chargeBack) {
        return res.status(404).json({ error: "Charge back not found" });
      }
      res.json(chargeBack);
    } catch (error) {
      console.error("Charge back update error:", error);
      res.status(400).json({ error: "Invalid charge back data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/charge-backs/:id", async (req, res) => {
    const success = await storage.deleteChargeBack(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Charge back not found" });
    }
    res.status(204).send();
  });

  // File upload routes
  app.post("/api/upload", async (req, res) => {
    try {
      const { file, filename } = req.body;
      
      if (!file || !filename) {
        return res.status(400).json({ error: "File and filename are required" });
      }

      // Extract base64 data (remove data:image/png;base64, or similar prefix)
      const base64Data = file.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename to prevent collisions
      const timestamp = Date.now();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFilename = `${timestamp}-${sanitizedFilename}`;
      const filePath = `uploaded_files/${uniqueFilename}`;

      // Write file to disk
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, buffer);

      res.json({ 
        success: true, 
        filename: uniqueFilename,
        path: `/api/files/${uniqueFilename}`
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/files/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `uploaded_files/${sanitizedFilename}`;

      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ error: "File not found" });
      }

      // Determine content type based on extension
      const ext = path.extname(sanitizedFilename).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);

      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("File serve error:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });

  app.delete("/api/files/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `uploaded_files/${sanitizedFilename}`;

      const fs = await import('fs/promises');
      
      try {
        await fs.unlink(filePath);
        res.json({ success: true });
      } catch {
        return res.status(404).json({ error: "File not found" });
      }
    } catch (error) {
      console.error("File delete error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getAllTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const task = await storage.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const { insertTaskSchema } = await import("@shared/schema");
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Task creation error:", error);
      res.status(400).json({ error: "Invalid task data", details: error.message });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { insertTaskSchema } = await import("@shared/schema");
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, validatedData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      console.error("Task update error:", error);
      res.status(400).json({ error: "Invalid task data", details: error.message });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const success = await storage.deleteTask(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).send();
  });

  // Company Settings Routes
  app.get("/api/company-settings", async (_req, res) => {
    const settings = await storage.getCompanySettings();
    if (!settings) {
      return res.status(404).json({ error: "Company settings not found" });
    }
    res.json(settings);
  });

  app.patch("/api/company-settings", async (req, res) => {
    try {
      const { insertCompanySettingsSchema } = await import("@shared/schema");
      const validatedData = insertCompanySettingsSchema.partial().parse(req.body);
      const settings = await storage.updateCompanySettings(validatedData);
      if (!settings) {
        return res.status(404).json({ error: "Failed to update company settings" });
      }
      res.json(settings);
    } catch (error: any) {
      console.error("Company settings update error:", error);
      res.status(400).json({ error: "Invalid settings data", details: error.message });
    }
  });

  // Divisions Routes
  app.get("/api/divisions", async (_req, res) => {
    const allDivisions = await storage.getAllDivisions();
    res.json(allDivisions);
  });

  app.get("/api/divisions/:id", async (req, res) => {
    const division = await storage.getDivision(req.params.id);
    if (!division) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.json(division);
  });

  app.post("/api/divisions", async (req, res) => {
    try {
      const { insertDivisionSchema } = await import("@shared/schema");
      const validatedData = insertDivisionSchema.parse(req.body);
      const division = await storage.createDivision(validatedData);
      res.status(201).json(division);
    } catch (error: any) {
      console.error("Division creation error:", error);
      res.status(400).json({ error: "Invalid division data", details: error.message });
    }
  });

  app.patch("/api/divisions/:id", async (req, res) => {
    try {
      const { insertDivisionSchema } = await import("@shared/schema");
      const validatedData = insertDivisionSchema.partial().parse(req.body);
      const division = await storage.updateDivision(req.params.id, validatedData);
      if (!division) {
        return res.status(404).json({ error: "Division not found" });
      }
      res.json(division);
    } catch (error: any) {
      console.error("Division update error:", error);
      res.status(400).json({ error: "Invalid division data", details: error.message });
    }
  });

  app.delete("/api/divisions/:id", async (req, res) => {
    const deleted = await storage.deleteDivision(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.status(204).send();
  });

  app.post("/api/divisions/:divisionId/invite", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { divisionId } = req.params;
      const { email, role } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const division = await storage.getDivision(divisionId);
      if (!division) {
        return res.status(404).json({ error: "Division not found" });
      }

      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await storage.createDivisionInvitation({
        divisionId,
        email,
        token,
        role: role || "admin",
        status: "pending",
        invitedBy: req.user.id,
        expiresAt,
      });

      const { sendEmail } = await import('./notifications');
      const host = req.headers.host || 'readytms.com';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const appUrl = `${protocol}://${host}`;
      const signupLink = `${appUrl}/division-signup/${token}`;
      
      let emailSent = false;
      try {
        emailSent = await sendEmail({
          to: email,
          subject: `You're invited to join ${division.companyName} on Ready TMS`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>You're Invited!</h1>
                </div>
                <div class="content">
                  <p>You've been invited to join <strong>${division.companyName}</strong> as a subdivision on Ready TMS.</p>
                  <p>Click the button below to create your account and get started:</p>
                  <div style="text-align: center;">
                    <a href="${signupLink}" class="button">Accept Invitation & Sign Up</a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">This invitation link will expire in 7 days.</p>
                  <p style="color: #6b7280; font-size: 14px;">If you can't click the button, copy this link: ${signupLink}</p>
                </div>
                <div class="footer">
                  <p>Ready TMS - Transportation Management System</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      } catch (emailErr) {
        console.error("Email sending failed for division invite:", emailErr);
      }

      res.status(201).json({ message: "Invitation created", invitation, emailSent, signupLink });
    } catch (error: any) {
      console.error("Division invitation error:", error);
      res.status(500).json({ error: "Failed to send invitation", details: error.message });
    }
  });

  app.get("/api/divisions/:divisionId/invitations", isAuthenticated, async (req, res) => {
    try {
      const invitations = await storage.getDivisionInvitations(req.params.divisionId);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.get("/api/division-invite/:token", async (req, res) => {
    try {
      const invitation = await storage.getDivisionInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation" });
      }
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation already used" });
      }
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invitation expired" });
      }
      const division = await storage.getDivision(invitation.divisionId);
      res.json({ invitation, division });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to validate invitation" });
    }
  });

  app.post("/api/division-signup", async (req, res) => {
    try {
      const { token, email, password, firstName, lastName } = req.body;
      
      if (!token || !email || !password) {
        return res.status(400).json({ error: "Token, email, and password are required" });
      }

      const invitation = await storage.getDivisionInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation" });
      }
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation already used" });
      }
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invitation expired" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin: "true",
        role: invitation.role || "admin",
        approved: "false",
        divisionId: invitation.divisionId,
      });

      await storage.updateDivisionInvitation(invitation.id, { status: "accepted" });

      const approvedAdmins = await storage.getApprovedAdmins();
      const division = await storage.getDivision(invitation.divisionId);
      const { sendEmail } = await import('./notifications');
      
      for (const admin of approvedAdmins) {
        if (!admin.divisionId) {
          try {
            await sendEmail({
              to: admin.email,
              subject: `New ${division?.companyName || 'Division'} User Pending Approval`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2>New User Registration</h2>
                  <p>A new user has signed up for <strong>${division?.companyName || 'a division'}</strong> and needs your approval:</p>
                  <ul>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Name:</strong> ${firstName || ''} ${lastName || ''}</li>
                    <li><strong>Division:</strong> ${division?.companyName || 'Unknown'}</li>
                    <li><strong>Role:</strong> ${invitation.role}</li>
                  </ul>
                  <p>Please log in to Ready TMS to approve or reject this user.</p>
                </div>
              `,
            });
          } catch (e) {
            console.error("Failed to send approval notification:", e);
          }
        }
      }

      res.status(201).json({
        message: "Registration successful. Your account is pending admin approval.",
        pendingApproval: true,
      });
    } catch (error: any) {
      console.error("Division signup error:", error);
      res.status(500).json({ error: "Registration failed", details: error.message });
    }
  });

  // Division-scoped login — only allows users belonging to this division
  app.post("/api/divisions/:divisionId/login", async (req, res, next) => {
    try {
      const { divisionId } = req.params;
      const { email, password } = req.body;

      const division = await storage.getDivision(divisionId);
      if (!division) {
        return res.status(404).json({ error: "Division not found" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Validate password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Enforce division scoping — user must belong to this division
      if (user.divisionId !== divisionId) {
        return res.status(403).json({ error: "You do not have access to this company portal" });
      }

      if (user.approved !== "true") {
        return res.status(403).json({ error: "Your account is pending approval" });
      }

      // Log user in
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _pw, ...safeUser } = user as any;
        return res.json({ user: safeUser });
      });
    } catch (error: any) {
      console.error("Division login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Request access to a division without an invite token
  app.post("/api/divisions/:divisionId/request-access", async (req, res) => {
    try {
      const { divisionId } = req.params;
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const division = await storage.getDivision(divisionId);
      if (!division) {
        return res.status(404).json({ error: "Division not found" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin: "true",
        role: "admin",
        approved: "false",
        divisionId,
      });

      // Notify division admins (approved admins with same divisionId)
      const { sendEmail } = await import('./notifications');
      const allAdmins = await storage.getApprovedAdmins();
      const divisionAdmins = allAdmins.filter((a: any) => a.divisionId === divisionId);

      // Build notification email list: division email first, then division admins, then platform admins as fallback
      const notifyEmails = new Set<string>();
      if (division.email) notifyEmails.add(division.email); // Always notify division contact email
      if (divisionAdmins.length > 0) {
        divisionAdmins.forEach((a: any) => notifyEmails.add(a.email));
      } else {
        // Fall back to platform admins if no division-specific admins exist
        allAdmins.filter((a: any) => !a.divisionId).forEach((a: any) => notifyEmails.add(a.email));
      }

      for (const notifyEmail of notifyEmails) {
        try {
          await sendEmail({
            to: notifyEmail,
            subject: `New Access Request for ${division.companyName}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2>New Access Request</h2>
                <p>A new user has requested access to <strong>${division.companyName}</strong>:</p>
                <ul>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Name:</strong> ${firstName || ''} ${lastName || ''}</li>
                </ul>
                <p>Log in to Ready TMS and go to <strong>Admin Approvals</strong> to approve or reject this request.</p>
              </div>
            `,
          });
        } catch (e) {
          console.error("Failed to send access request notification:", e);
        }
      }

      res.status(201).json({
        message: "Access request submitted. An admin will review your request.",
        pendingApproval: true,
      });
    } catch (error: any) {
      console.error("Division request-access error:", error);
      res.status(500).json({ error: "Request failed", details: error.message });
    }
  });

  app.get("/api/divisions/:divisionId/pending-users", isAuthenticated, async (req, res) => {
    try {
      const pendingUsers = await storage.getPendingUsersByDivision(req.params.divisionId);
      const sanitized = pendingUsers.map(({ password, ...user }) => user);
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch pending users" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
