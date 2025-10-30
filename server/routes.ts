import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertLoadSchema, 
  insertTruckSchema, 
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
import { setupAuth, isAuthenticated } from "./replitAuth";
import { extractLoadFromDocument } from "./aiExtraction";
import { autoGenerateInvoice, notifyLoadStatusChange, checkExpiringDocuments } from "./automation";
import { hashPassword, comparePassword, generateResetToken, hashResetToken, requireAuth, optionalAuth } from "./auth";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
      });

      // Set session
      req.session.userId = user.id;
      req.session.email = user.email!;

      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Set session
      req.session.userId = user.id;
      req.session.email = user.email!;

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return res.json({ success: true });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const hashedToken = hashResetToken(resetToken);
      const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await storage.updateUserResetToken(user.id, hashedToken, resetTokenExpires);

      // In a real app, send email here. For now, return token (dev only)
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      res.json({ 
        success: true,
        // Remove this in production - only for development
        resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(400).json({ error: error.message || "Request failed" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);

      const hashedToken = hashResetToken(token);

      // Find user with valid reset token
      const allUsers = await db.select().from(users).where(eq(users.resetToken, hashedToken));
      const user = allUsers[0];

      if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update password and clear reset token
      await storage.updateUserPassword(user.id, passwordHash);
      await storage.updateUserResetToken(user.id, null, null);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(400).json({ error: error.message || "Reset failed" });
    }
  });
  app.get("/api/loads", async (_req, res) => {
    const loads = await storage.getAllLoads();
    res.json(loads);
  });

  app.get("/api/loads/:id", async (req, res) => {
    const load = await storage.getLoad(req.params.id);
    if (!load) {
      return res.status(404).json({ error: "Load not found" });
    }
    res.json(load);
  });

  app.post("/api/loads", async (req, res) => {
    try {
      const validatedData = insertLoadSchema.parse(req.body);
      const load = await storage.createLoad(validatedData);
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

  app.get("/api/trucks", async (_req, res) => {
    const trucks = await storage.getAllTrucks();
    res.json(trucks);
  });

  app.get("/api/trucks/:id", async (req, res) => {
    const truck = await storage.getTruck(req.params.id);
    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }
    res.json(truck);
  });

  app.post("/api/trucks", async (req, res) => {
    try {
      const validatedData = insertTruckSchema.parse(req.body);
      const truck = await storage.createTruck(validatedData);
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

  app.get("/api/drivers", async (_req, res) => {
    const drivers = await storage.getAllDrivers();
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

  app.post("/api/drivers", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.parse(req.body);
      const driver = await storage.createDriver(validatedData);
      res.status(201).json(driver);
    } catch (error: any) {
      console.error("Driver validation error:", error);
      res.status(400).json({ error: "Invalid driver data", details: error.message });
    }
  });

  app.patch("/api/drivers/:id", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.partial().parse(req.body);
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

  app.get("/api/customers", async (_req, res) => {
    const customers = await storage.getAllCustomers();
    res.json(customers);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
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

      const extractedData = await extractLoadFromDocument(fileData, fileType);
      res.json(extractedData);
    } catch (error: any) {
      console.error("Error extracting load:", error);
      res.status(500).json({ error: error.message || "Failed to extract load data" });
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
  app.get("/api/invoices", async (_req, res) => {
    const invoices = await storage.getAllInvoices();
    res.json(invoices);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
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
    } catch (error) {
      res.status(400).json({ error: "Invalid accident data" });
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
  app.get("/api/settlements", async (_req, res) => {
    const settlements = await storage.getAllSettlements();
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
      res.status(400).json({ error: "Invalid settlement data" });
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
      res.status(400).json({ error: "Invalid settlement data" });
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
      res.status(400).json({ error: "Invalid line item data" });
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
      res.status(400).json({ error: "Invalid maintenance data" });
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
      res.status(400).json({ error: "Invalid maintenance data" });
    }
  });

  app.delete("/api/maintenance/:id", async (req, res) => {
    const deleted = await storage.deleteMaintenance(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Maintenance record not found" });
    }
    res.status(204).send();
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

  const httpServer = createServer(app);

  return httpServer;
}
