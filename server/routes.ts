import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLoadSchema, insertTruckSchema, insertDriverSchema, insertCustomerSchema, insertDocumentSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { extractLoadFromDocument } from "./aiExtraction";

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
      const validatedData = insertLoadSchema.partial().parse(req.body);
      const load = await storage.updateLoad(req.params.id, validatedData);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
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

  const httpServer = createServer(app);

  return httpServer;
}
