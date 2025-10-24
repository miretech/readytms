import { 
  type User, 
  type UpsertUser,
  type Load,
  type InsertLoad,
  type Truck,
  type InsertTruck,
  type Driver,
  type InsertDriver,
  type Customer,
  type InsertCustomer,
  type Document,
  type InsertDocument,
  type Expense,
  type InsertExpense,
  type Invoice,
  type InsertInvoice,
  type Payment,
  type InsertPayment,
  type Inspection,
  type InsertInspection,
  type Accident,
  type InsertAccident,
  type Violation,
  type InsertViolation,
  type Settlement,
  type InsertSettlement,
  type SettlementLineItem,
  type InsertSettlementLineItem,
  type RecurringExpense,
  type InsertRecurringExpense,
  type Maintenance,
  type InsertMaintenance,
  type FuelTransaction,
  type InsertFuelTransaction,
  type FuelCard,
  type InsertFuelCard,
  type GpsLocation,
  type InsertGpsLocation,
  users,
  loads,
  trucks,
  drivers,
  customers,
  documents,
  expenses,
  invoices,
  payments,
  inspections,
  accidents,
  violations,
  settlements,
  settlementLineItems,
  recurringExpenses,
  maintenance,
  fuelCards,
  fuelTransactions,
  gpsLocations
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getAllLoads(): Promise<Load[]>;
  getLoad(id: string): Promise<Load | undefined>;
  createLoad(load: InsertLoad): Promise<Load>;
  updateLoad(id: string, load: Partial<InsertLoad>): Promise<Load | undefined>;
  deleteLoad(id: string): Promise<boolean>;
  
  getAllTrucks(): Promise<Truck[]>;
  getTruck(id: string): Promise<Truck | undefined>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  updateTruck(id: string, truck: Partial<InsertTruck>): Promise<Truck | undefined>;
  deleteTruck(id: string): Promise<boolean>;
  
  getAllDrivers(): Promise<Driver[]>;
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByEmail(email: string): Promise<Driver | undefined>;
  getDriverByLicense(licenseNumber: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<boolean>;
  
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByLoad(loadId: string): Promise<Document[]>;
  
  // Expenses
  getAllExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  getExpensesByLoad(loadId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  
  // Invoices
  getAllInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  
  // Payments
  getAllPayments(): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;
  
  // Inspections
  getAllInspections(): Promise<Inspection[]>;
  getInspection(id: string): Promise<Inspection | undefined>;
  getInspectionsByTruck(truckId: string): Promise<Inspection[]>;
  getInspectionsByDriver(driverId: string): Promise<Inspection[]>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: string, inspection: Partial<InsertInspection>): Promise<Inspection | undefined>;
  deleteInspection(id: string): Promise<boolean>;
  
  // Accidents
  getAllAccidents(): Promise<Accident[]>;
  getAccident(id: string): Promise<Accident | undefined>;
  getAccidentsByDriver(driverId: string): Promise<Accident[]>;
  createAccident(accident: InsertAccident): Promise<Accident>;
  updateAccident(id: string, accident: Partial<InsertAccident>): Promise<Accident | undefined>;
  deleteAccident(id: string): Promise<boolean>;
  
  // Violations
  getAllViolations(): Promise<Violation[]>;
  getViolation(id: string): Promise<Violation | undefined>;
  getViolationsByDriver(driverId: string): Promise<Violation[]>;
  createViolation(violation: InsertViolation): Promise<Violation>;
  updateViolation(id: string, violation: Partial<InsertViolation>): Promise<Violation | undefined>;
  deleteViolation(id: string): Promise<boolean>;
  
  // Settlements
  getAllSettlements(): Promise<Settlement[]>;
  getSettlement(id: string): Promise<Settlement | undefined>;
  getSettlementsByDriver(driverId: string): Promise<Settlement[]>;
  createSettlement(settlement: InsertSettlement): Promise<Settlement>;
  updateSettlement(id: string, settlement: Partial<InsertSettlement>): Promise<Settlement | undefined>;
  deleteSettlement(id: string): Promise<boolean>;
  
  // Settlement Line Items
  getSettlementLineItems(settlementId: string): Promise<SettlementLineItem[]>;
  createSettlementLineItem(lineItem: InsertSettlementLineItem): Promise<SettlementLineItem>;
  updateSettlementLineItem(id: string, lineItem: Partial<InsertSettlementLineItem>): Promise<SettlementLineItem | undefined>;
  deleteSettlementLineItem(id: string): Promise<boolean>;
  
  // Recurring Expenses
  getAllRecurringExpenses(): Promise<RecurringExpense[]>;
  getRecurringExpense(id: string): Promise<RecurringExpense | undefined>;
  getRecurringExpensesByDriver(driverId: string): Promise<RecurringExpense[]>;
  getActiveRecurringExpenses(driverId?: string): Promise<RecurringExpense[]>;
  createRecurringExpense(expense: InsertRecurringExpense): Promise<RecurringExpense>;
  updateRecurringExpense(id: string, expense: Partial<InsertRecurringExpense>): Promise<RecurringExpense | undefined>;
  deleteRecurringExpense(id: string): Promise<boolean>;
  
  // Maintenance
  getAllMaintenance(): Promise<Maintenance[]>;
  getMaintenance(id: string): Promise<Maintenance | undefined>;
  getMaintenanceByTruck(truckId: string): Promise<Maintenance[]>;
  createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance>;
  updateMaintenance(id: string, maintenance: Partial<InsertMaintenance>): Promise<Maintenance | undefined>;
  deleteMaintenance(id: string): Promise<boolean>;
  
  // Fuel Cards
  getAllFuelCards(): Promise<FuelCard[]>;
  getFuelCard(id: string): Promise<FuelCard | undefined>;
  createFuelCard(fuelCard: InsertFuelCard): Promise<FuelCard>;
  updateFuelCard(id: string, fuelCard: Partial<InsertFuelCard>): Promise<FuelCard | undefined>;
  deleteFuelCard(id: string): Promise<boolean>;
  
  // Fuel Transactions
  getAllFuelTransactions(): Promise<FuelTransaction[]>;
  getFuelTransaction(id: string): Promise<FuelTransaction | undefined>;
  getFuelTransactionsByTruck(truckId: string): Promise<FuelTransaction[]>;
  getFuelTransactionsByDriver(driverId: string): Promise<FuelTransaction[]>;
  getFuelTransactionsByLoad(loadId: string): Promise<FuelTransaction[]>;
  createFuelTransaction(fuelTransaction: InsertFuelTransaction): Promise<FuelTransaction>;
  updateFuelTransaction(id: string, fuelTransaction: Partial<InsertFuelTransaction>): Promise<FuelTransaction | undefined>;
  deleteFuelTransaction(id: string): Promise<boolean>;
  
  // GPS Locations
  getAllGpsLocations(): Promise<GpsLocation[]>;
  getLatestGpsLocations(): Promise<GpsLocation[]>;
  getGpsLocationsByDriver(driverId: string, limit?: number): Promise<GpsLocation[]>;
  getGpsLocationsByTruck(truckId: string, limit?: number): Promise<GpsLocation[]>;
  getGpsLocationsByLoad(loadId: string): Promise<GpsLocation[]>;
  createGpsLocation(location: InsertGpsLocation): Promise<GpsLocation>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllLoads(): Promise<Load[]> {
    return await db.select().from(loads).orderBy(desc(loads.createdAt));
  }

  async getLoad(id: string): Promise<Load | undefined> {
    const [load] = await db.select().from(loads).where(eq(loads.id, id));
    return load || undefined;
  }

  async createLoad(insertLoad: InsertLoad): Promise<Load> {
    const [load] = await db
      .insert(loads)
      .values({
        ...insertLoad,
        pickupDate: new Date(insertLoad.pickupDate),
        deliveryDate: new Date(insertLoad.deliveryDate),
      })
      .returning();
    return load;
  }

  async updateLoad(id: string, updateData: Partial<InsertLoad>): Promise<Load | undefined> {
    const values: any = { ...updateData };
    if (updateData.pickupDate) {
      values.pickupDate = new Date(updateData.pickupDate);
    }
    if (updateData.deliveryDate) {
      values.deliveryDate = new Date(updateData.deliveryDate);
    }
    
    const [load] = await db
      .update(loads)
      .set(values)
      .where(eq(loads.id, id))
      .returning();
    return load || undefined;
  }

  async deleteLoad(id: string): Promise<boolean> {
    const result = await db.delete(loads).where(eq(loads.id, id)).returning();
    return result.length > 0;
  }

  async getAllTrucks(): Promise<Truck[]> {
    return await db.select().from(trucks);
  }

  async getTruck(id: string): Promise<Truck | undefined> {
    const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
    return truck || undefined;
  }

  async createTruck(insertTruck: InsertTruck): Promise<Truck> {
    const [truck] = await db
      .insert(trucks)
      .values(insertTruck)
      .returning();
    return truck;
  }

  async updateTruck(id: string, updateData: Partial<InsertTruck>): Promise<Truck | undefined> {
    const [truck] = await db
      .update(trucks)
      .set(updateData)
      .where(eq(trucks.id, id))
      .returning();
    return truck || undefined;
  }

  async deleteTruck(id: string): Promise<boolean> {
    const result = await db.delete(trucks).where(eq(trucks.id, id)).returning();
    return result.length > 0;
  }

  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }

  async getDriverByEmail(email: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.email, email));
    return driver || undefined;
  }

  async getDriverByLicense(licenseNumber: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.licenseNumber, licenseNumber));
    return driver || undefined;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const values: any = { ...insertDriver };
    
    if (insertDriver.licenseExpiration && insertDriver.licenseExpiration.trim() !== "") {
      values.licenseExpiration = new Date(insertDriver.licenseExpiration);
    } else {
      values.licenseExpiration = null;
    }
    
    if (insertDriver.medicalCardExpiration && insertDriver.medicalCardExpiration.trim() !== "") {
      values.medicalCardExpiration = new Date(insertDriver.medicalCardExpiration);
    } else {
      values.medicalCardExpiration = null;
    }
    
    const [driver] = await db
      .insert(drivers)
      .values(values)
      .returning();
    return driver;
  }

  async updateDriver(id: string, updateData: Partial<InsertDriver>): Promise<Driver | undefined> {
    const values: any = { ...updateData };
    
    if (updateData.licenseExpiration !== undefined) {
      if (updateData.licenseExpiration && updateData.licenseExpiration.trim() !== "") {
        values.licenseExpiration = new Date(updateData.licenseExpiration);
      } else {
        values.licenseExpiration = null;
      }
    }
    
    if (updateData.medicalCardExpiration !== undefined) {
      if (updateData.medicalCardExpiration && updateData.medicalCardExpiration.trim() !== "") {
        values.medicalCardExpiration = new Date(updateData.medicalCardExpiration);
      } else {
        values.medicalCardExpiration = null;
      }
    }
    
    const [driver] = await db
      .update(drivers)
      .set(values)
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async deleteDriver(id: string): Promise<boolean> {
    const result = await db.delete(drivers).where(eq(drivers.id, id)).returning();
    return result.length > 0;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(insertCustomer)
      .returning();
    return customer;
  }

  async updateCustomer(id: string, updateData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async getDocumentsByLoad(loadId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.loadId, loadId));
  }

  // Expenses
  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async getExpensesByLoad(loadId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.loadId, loadId));
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values({
        ...insertExpense,
        expenseDate: new Date(insertExpense.expenseDate),
      })
      .returning();
    return expense;
  }

  async updateExpense(id: string, updateData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const values: any = { ...updateData };
    if (updateData.expenseDate) {
      values.expenseDate = new Date(updateData.expenseDate);
    }
    const [expense] = await db
      .update(expenses)
      .set(values)
      .where(eq(expenses.id, id))
      .returning();
    return expense || undefined;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  // Invoices
  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.invoiceDate));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...insertInvoice,
        invoiceDate: new Date(insertInvoice.invoiceDate),
        dueDate: new Date(insertInvoice.dueDate),
      })
      .returning();
    return invoice;
  }

  async updateInvoice(id: string, updateData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const values: any = { ...updateData };
    if (updateData.invoiceDate) {
      values.invoiceDate = new Date(updateData.invoiceDate);
    }
    if (updateData.dueDate) {
      values.dueDate = new Date(updateData.dueDate);
    }
    const [invoice] = await db
      .update(invoices)
      .set(values)
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return result.length > 0;
  }

  // Payments
  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.paymentDate));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values({
        ...insertPayment,
        paymentDate: new Date(insertPayment.paymentDate),
      })
      .returning();
    return payment;
  }

  async updatePayment(id: string, updateData: Partial<InsertPayment>): Promise<Payment | undefined> {
    const values: any = { ...updateData };
    if (updateData.paymentDate) {
      values.paymentDate = new Date(updateData.paymentDate);
    }
    const [payment] = await db
      .update(payments)
      .set(values)
      .where(eq(payments.id, id))
      .returning();
    return payment || undefined;
  }

  async deletePayment(id: string): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id)).returning();
    return result.length > 0;
  }

  // Inspections
  async getAllInspections(): Promise<Inspection[]> {
    return await db.select().from(inspections).orderBy(desc(inspections.inspectionDate));
  }

  async getInspection(id: string): Promise<Inspection | undefined> {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
    return inspection || undefined;
  }

  async getInspectionsByTruck(truckId: string): Promise<Inspection[]> {
    return await db.select().from(inspections).where(eq(inspections.truckId, truckId));
  }

  async getInspectionsByDriver(driverId: string): Promise<Inspection[]> {
    return await db.select().from(inspections).where(eq(inspections.driverId, driverId));
  }

  async createInspection(insertInspection: InsertInspection): Promise<Inspection> {
    const [inspection] = await db
      .insert(inspections)
      .values({
        ...insertInspection,
        inspectionDate: new Date(insertInspection.inspectionDate),
      })
      .returning();
    return inspection;
  }

  async updateInspection(id: string, updateData: Partial<InsertInspection>): Promise<Inspection | undefined> {
    const values: any = { ...updateData };
    if (updateData.inspectionDate) {
      values.inspectionDate = new Date(updateData.inspectionDate);
    }
    const [inspection] = await db
      .update(inspections)
      .set(values)
      .where(eq(inspections.id, id))
      .returning();
    return inspection || undefined;
  }

  async deleteInspection(id: string): Promise<boolean> {
    const result = await db.delete(inspections).where(eq(inspections.id, id)).returning();
    return result.length > 0;
  }

  // Accidents
  async getAllAccidents(): Promise<Accident[]> {
    return await db.select().from(accidents).orderBy(desc(accidents.accidentDate));
  }

  async getAccident(id: string): Promise<Accident | undefined> {
    const [accident] = await db.select().from(accidents).where(eq(accidents.id, id));
    return accident || undefined;
  }

  async getAccidentsByDriver(driverId: string): Promise<Accident[]> {
    return await db.select().from(accidents).where(eq(accidents.driverId, driverId));
  }

  async createAccident(insertAccident: InsertAccident): Promise<Accident> {
    const [accident] = await db
      .insert(accidents)
      .values({
        ...insertAccident,
        accidentDate: new Date(insertAccident.accidentDate),
      })
      .returning();
    return accident;
  }

  async updateAccident(id: string, updateData: Partial<InsertAccident>): Promise<Accident | undefined> {
    const values: any = { ...updateData };
    if (updateData.accidentDate) {
      values.accidentDate = new Date(updateData.accidentDate);
    }
    const [accident] = await db
      .update(accidents)
      .set(values)
      .where(eq(accidents.id, id))
      .returning();
    return accident || undefined;
  }

  async deleteAccident(id: string): Promise<boolean> {
    const result = await db.delete(accidents).where(eq(accidents.id, id)).returning();
    return result.length > 0;
  }

  // Violations
  async getAllViolations(): Promise<Violation[]> {
    return await db.select().from(violations).orderBy(desc(violations.violationDate));
  }

  async getViolation(id: string): Promise<Violation | undefined> {
    const [violation] = await db.select().from(violations).where(eq(violations.id, id));
    return violation || undefined;
  }

  async getViolationsByDriver(driverId: string): Promise<Violation[]> {
    return await db.select().from(violations).where(eq(violations.driverId, driverId));
  }

  async createViolation(insertViolation: InsertViolation): Promise<Violation> {
    const [violation] = await db
      .insert(violations)
      .values({
        ...insertViolation,
        violationDate: new Date(insertViolation.violationDate),
        dueDate: insertViolation.dueDate ? new Date(insertViolation.dueDate) : undefined,
      })
      .returning();
    return violation;
  }

  async updateViolation(id: string, updateData: Partial<InsertViolation>): Promise<Violation | undefined> {
    const values: any = { ...updateData };
    if (updateData.violationDate) {
      values.violationDate = new Date(updateData.violationDate);
    }
    if (updateData.dueDate) {
      values.dueDate = new Date(updateData.dueDate);
    }
    const [violation] = await db
      .update(violations)
      .set(values)
      .where(eq(violations.id, id))
      .returning();
    return violation || undefined;
  }

  async deleteViolation(id: string): Promise<boolean> {
    const result = await db.delete(violations).where(eq(violations.id, id)).returning();
    return result.length > 0;
  }

  // Settlements
  async getAllSettlements(): Promise<Settlement[]> {
    return await db.select().from(settlements).orderBy(desc(settlements.periodEnd));
  }

  async getSettlement(id: string): Promise<Settlement | undefined> {
    const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id));
    return settlement || undefined;
  }

  async getSettlementsByDriver(driverId: string): Promise<Settlement[]> {
    return await db.select().from(settlements).where(eq(settlements.driverId, driverId));
  }

  async createSettlement(insertSettlement: InsertSettlement): Promise<Settlement> {
    const [settlement] = await db
      .insert(settlements)
      .values({
        ...insertSettlement,
        periodStart: new Date(insertSettlement.periodStart),
        periodEnd: new Date(insertSettlement.periodEnd),
        paidDate: insertSettlement.paidDate ? new Date(insertSettlement.paidDate) : undefined,
      })
      .returning();
    return settlement;
  }

  async updateSettlement(id: string, updateData: Partial<InsertSettlement>): Promise<Settlement | undefined> {
    const values: any = { ...updateData };
    if (updateData.periodStart) {
      values.periodStart = new Date(updateData.periodStart);
    }
    if (updateData.periodEnd) {
      values.periodEnd = new Date(updateData.periodEnd);
    }
    if (updateData.paidDate) {
      values.paidDate = new Date(updateData.paidDate);
    }
    const [settlement] = await db
      .update(settlements)
      .set(values)
      .where(eq(settlements.id, id))
      .returning();
    return settlement || undefined;
  }

  async deleteSettlement(id: string): Promise<boolean> {
    const result = await db.delete(settlements).where(eq(settlements.id, id)).returning();
    return result.length > 0;
  }

  // Settlement Line Items
  async getSettlementLineItems(settlementId: string): Promise<SettlementLineItem[]> {
    return await db.select().from(settlementLineItems).where(eq(settlementLineItems.settlementId, settlementId));
  }

  async createSettlementLineItem(lineItem: InsertSettlementLineItem): Promise<SettlementLineItem> {
    const [created] = await db
      .insert(settlementLineItems)
      .values(lineItem)
      .returning();
    return created;
  }

  async updateSettlementLineItem(id: string, updateData: Partial<InsertSettlementLineItem>): Promise<SettlementLineItem | undefined> {
    const [updated] = await db
      .update(settlementLineItems)
      .set(updateData)
      .where(eq(settlementLineItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSettlementLineItem(id: string): Promise<boolean> {
    const result = await db.delete(settlementLineItems).where(eq(settlementLineItems.id, id)).returning();
    return result.length > 0;
  }

  // Recurring Expenses
  async getAllRecurringExpenses(): Promise<RecurringExpense[]> {
    return await db.select().from(recurringExpenses).orderBy(desc(recurringExpenses.createdAt));
  }

  async getRecurringExpense(id: string): Promise<RecurringExpense | undefined> {
    const [expense] = await db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id));
    return expense || undefined;
  }

  async getRecurringExpensesByDriver(driverId: string): Promise<RecurringExpense[]> {
    return await db.select().from(recurringExpenses).where(eq(recurringExpenses.driverId, driverId));
  }

  async getActiveRecurringExpenses(driverId?: string): Promise<RecurringExpense[]> {
    const now = new Date();
    let query = db
      .select()
      .from(recurringExpenses)
      .where(eq(recurringExpenses.isActive, "true"))
      .$dynamic();
    
    if (driverId) {
      query = query.where(eq(recurringExpenses.driverId, driverId));
    }
    
    return await query;
  }

  async createRecurringExpense(insertExpense: InsertRecurringExpense): Promise<RecurringExpense> {
    const [expense] = await db
      .insert(recurringExpenses)
      .values({
        ...insertExpense,
        startDate: new Date(insertExpense.startDate),
        endDate: insertExpense.endDate ? new Date(insertExpense.endDate) : undefined,
      })
      .returning();
    return expense;
  }

  async updateRecurringExpense(id: string, updateData: Partial<InsertRecurringExpense>): Promise<RecurringExpense | undefined> {
    const values: any = { ...updateData };
    if (updateData.startDate) {
      values.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      values.endDate = new Date(updateData.endDate);
    }
    const [expense] = await db
      .update(recurringExpenses)
      .set(values)
      .where(eq(recurringExpenses.id, id))
      .returning();
    return expense || undefined;
  }

  async deleteRecurringExpense(id: string): Promise<boolean> {
    const result = await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id)).returning();
    return result.length > 0;
  }

  // Maintenance
  async getAllMaintenance(): Promise<Maintenance[]> {
    return await db.select().from(maintenance).orderBy(desc(maintenance.serviceDate));
  }

  async getMaintenance(id: string): Promise<Maintenance | undefined> {
    const [record] = await db.select().from(maintenance).where(eq(maintenance.id, id));
    return record || undefined;
  }

  async getMaintenanceByTruck(truckId: string): Promise<Maintenance[]> {
    return await db.select().from(maintenance).where(eq(maintenance.truckId, truckId));
  }

  async createMaintenance(insertMaintenance: InsertMaintenance): Promise<Maintenance> {
    const [record] = await db
      .insert(maintenance)
      .values({
        ...insertMaintenance,
        serviceDate: new Date(insertMaintenance.serviceDate),
        nextServiceDate: insertMaintenance.nextServiceDate ? new Date(insertMaintenance.nextServiceDate) : undefined,
      })
      .returning();
    return record;
  }

  async updateMaintenance(id: string, updateData: Partial<InsertMaintenance>): Promise<Maintenance | undefined> {
    const values: any = { ...updateData };
    if (updateData.serviceDate) {
      values.serviceDate = new Date(updateData.serviceDate);
    }
    if (updateData.nextServiceDate) {
      values.nextServiceDate = new Date(updateData.nextServiceDate);
    }
    const [record] = await db
      .update(maintenance)
      .set(values)
      .where(eq(maintenance.id, id))
      .returning();
    return record || undefined;
  }

  async deleteMaintenance(id: string): Promise<boolean> {
    const result = await db.delete(maintenance).where(eq(maintenance.id, id)).returning();
    return result.length > 0;
  }

  // Fuel Cards
  async getAllFuelCards(): Promise<FuelCard[]> {
    return await db.select().from(fuelCards).orderBy(desc(fuelCards.createdAt));
  }

  async getFuelCard(id: string): Promise<FuelCard | undefined> {
    const [card] = await db.select().from(fuelCards).where(eq(fuelCards.id, id));
    return card || undefined;
  }

  async createFuelCard(insertFuelCard: InsertFuelCard): Promise<FuelCard> {
    const [card] = await db
      .insert(fuelCards)
      .values(insertFuelCard)
      .returning();
    return card;
  }

  async updateFuelCard(id: string, updateData: Partial<InsertFuelCard>): Promise<FuelCard | undefined> {
    const [card] = await db
      .update(fuelCards)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(fuelCards.id, id))
      .returning();
    return card || undefined;
  }

  async deleteFuelCard(id: string): Promise<boolean> {
    const result = await db.delete(fuelCards).where(eq(fuelCards.id, id)).returning();
    return result.length > 0;
  }

  // Fuel Transactions
  async getAllFuelTransactions(): Promise<FuelTransaction[]> {
    return await db.select().from(fuelTransactions).orderBy(desc(fuelTransactions.transactionDate));
  }

  async getFuelTransaction(id: string): Promise<FuelTransaction | undefined> {
    const [transaction] = await db.select().from(fuelTransactions).where(eq(fuelTransactions.id, id));
    return transaction || undefined;
  }

  async getFuelTransactionsByTruck(truckId: string): Promise<FuelTransaction[]> {
    return await db.select().from(fuelTransactions).where(eq(fuelTransactions.truckId, truckId)).orderBy(desc(fuelTransactions.transactionDate));
  }

  async getFuelTransactionsByDriver(driverId: string): Promise<FuelTransaction[]> {
    return await db.select().from(fuelTransactions).where(eq(fuelTransactions.driverId, driverId)).orderBy(desc(fuelTransactions.transactionDate));
  }

  async getFuelTransactionsByLoad(loadId: string): Promise<FuelTransaction[]> {
    return await db.select().from(fuelTransactions).where(eq(fuelTransactions.loadId, loadId)).orderBy(desc(fuelTransactions.transactionDate));
  }

  async createFuelTransaction(insertFuelTransaction: InsertFuelTransaction): Promise<FuelTransaction> {
    const [transaction] = await db
      .insert(fuelTransactions)
      .values({
        ...insertFuelTransaction,
        transactionDate: new Date(insertFuelTransaction.transactionDate),
      })
      .returning();
    return transaction;
  }

  async updateFuelTransaction(id: string, updateData: Partial<InsertFuelTransaction>): Promise<FuelTransaction | undefined> {
    const values: any = { ...updateData };
    if (updateData.transactionDate) {
      values.transactionDate = new Date(updateData.transactionDate);
    }
    const [transaction] = await db
      .update(fuelTransactions)
      .set(values)
      .where(eq(fuelTransactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async deleteFuelTransaction(id: string): Promise<boolean> {
    const result = await db.delete(fuelTransactions).where(eq(fuelTransactions.id, id)).returning();
    return result.length > 0;
  }

  // GPS Locations
  async getAllGpsLocations(): Promise<GpsLocation[]> {
    return await db.select().from(gpsLocations).orderBy(desc(gpsLocations.timestamp)).limit(1000);
  }

  async getLatestGpsLocations(): Promise<GpsLocation[]> {
    const latestLocations = await db
      .select()
      .from(gpsLocations)
      .orderBy(desc(gpsLocations.timestamp))
      .limit(100);
    return latestLocations;
  }

  async getGpsLocationsByDriver(driverId: string, limit: number = 100): Promise<GpsLocation[]> {
    return await db.select().from(gpsLocations).where(eq(gpsLocations.driverId, driverId)).orderBy(desc(gpsLocations.timestamp)).limit(limit);
  }

  async getGpsLocationsByTruck(truckId: string, limit: number = 100): Promise<GpsLocation[]> {
    return await db.select().from(gpsLocations).where(eq(gpsLocations.truckId, truckId)).orderBy(desc(gpsLocations.timestamp)).limit(limit);
  }

  async getGpsLocationsByLoad(loadId: string): Promise<GpsLocation[]> {
    return await db.select().from(gpsLocations).where(eq(gpsLocations.loadId, loadId)).orderBy(desc(gpsLocations.timestamp));
  }

  async createGpsLocation(insertGpsLocation: InsertGpsLocation): Promise<GpsLocation> {
    const [location] = await db
      .insert(gpsLocations)
      .values({
        ...insertGpsLocation,
        timestamp: new Date(insertGpsLocation.timestamp),
      })
      .returning();
    return location;
  }
}

export const storage = new DatabaseStorage();
