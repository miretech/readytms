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
  insertGpsLocationSchema
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { extractLoadFromDocument } from "./aiExtraction";
import { autoGenerateInvoice, notifyLoadStatusChange, checkExpiringDocuments } from "./automation";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
    } catch (error) {
      res.status(400).json({ error: "Invalid driver data" });
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
    } catch (error) {
      res.status(400).json({ error: "Invalid driver data" });
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
        driverPay: driverPay.toFixed(2),
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

  const httpServer = createServer(app);

  return httpServer;
}
