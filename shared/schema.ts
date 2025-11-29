import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for email/password authentication
// IMPORTANT: Keep default() on id for migration compatibility from old UUID-based system
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // Bcrypt hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: text("is_admin").notNull().default("false"),
  approved: text("approved").notNull().default("false"), // Admin approval status
  approvedBy: varchar("approved_by"), // ID of admin who approved this account
  approvedAt: timestamp("approved_at"), // When the account was approved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  userType: text("user_type").notNull(), // "admin" or "driver"
  expiresAt: timestamp("expires_at").notNull(),
  used: text("used").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const trucks = pgTable("trucks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckNumber: text("truck_number").notNull().unique(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  licensePlate: text("license_plate").notNull(),
  vin: text("vin"),
  year: integer("year"),
  make: text("make"),
  model: text("model"),
  // Cab Card section
  cabCardExpirationDate: text("cab_card_expiration_date"),
  cabCardAttachments: jsonb("cab_card_attachments").$type<Array<{ fileName: string; fileData: string; uploadedAt: string }>>(),
});

export const insertTruckSchema = createInsertSchema(trucks).omit({
  id: true,
}).extend({
  status: z.enum(["available", "in-use", "maintenance", "out-of-service", "terminated"]),
});

export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucks.$inferSelect;

export const trailers = pgTable("trailers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trailerNumber: text("trailer_number").notNull().unique(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  licensePlate: text("license_plate").notNull(),
  vin: text("vin"),
  year: integer("year"),
  make: text("make"),
  model: text("model"),
  // Insurance section
  insuranceProvider: text("insurance_provider"),
  insurancePolicyNumber: text("insurance_policy_number"),
  insuranceExpirationDate: text("insurance_expiration_date"),
  // Dates section
  pickupDate: text("pickup_date"),
  dropOffDate: text("drop_off_date"),
  // Tolls section - stores array of file attachments as JSON
  tollsAttachments: jsonb("tolls_attachments").$type<Array<{ fileName: string; fileData: string; uploadedAt: string }>>(),
  // Repairs section
  repairs: text("repairs"),
  // Rent section
  rentPerMonth: decimal("rent_per_month", { precision: 10, scale: 2 }),
  // Pickup pictures section - stores array of image attachments as JSON
  pickupPictures: jsonb("pickup_pictures").$type<Array<{ fileName: string; fileData: string; uploadedAt: string }>>(),
});

export const insertTrailerSchema = createInsertSchema(trailers).omit({
  id: true,
});

export type InsertTrailer = z.infer<typeof insertTrailerSchema>;
export type Trailer = typeof trailers.$inferSelect;

export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Bcrypt hashed password (optional for drivers created by admin)
  phone: text("phone").notNull(),
  address: text("address"),
  licenseNumber: text("license_number").notNull().unique(),
  licenseExpiration: timestamp("license_expiration"),
  licenseIssuedPlace: text("license_issued_place"),
  licenseAttachment: text("license_attachment"),
  medicalCardNumber: text("medical_card_number"),
  medicalCardExpiration: timestamp("medical_card_expiration"),
  medicalCardIssuedDate: timestamp("medical_card_issued_date"),
  medicalCardAttachment: text("medical_card_attachment"), // Medical card document attachment
  socialSecurityNumber: text("social_security_number"),
  socialSecurityAttachment: text("social_security_attachment"),
  status: text("status").notNull(),
  isActive: text("is_active").notNull().default("true"),
  dateHired: timestamp("date_hired"),
  dateTerminated: timestamp("date_terminated"),
  assignedTruckId: varchar("assigned_truck_id"),
  gpsEnabled: text("gps_enabled").notNull().default("false"), // Admin-controlled GPS tracking
  lastGpsUpdate: timestamp("last_gps_update"), // Last time driver shared GPS location
  lastGpsNotificationSent: timestamp("last_gps_notification_sent"), // Last time GPS reminder was sent
  gpsNotificationsEnabled: text("gps_notifications_enabled").notNull().default("true"), // "true" or "false"
  driverType: text("driver_type").notNull().default("company-driver"), // "owner-operator" or "company-driver"
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
}).extend({
  licenseExpiration: z.string().optional().transform(val => val === "" ? undefined : val),
  medicalCardExpiration: z.string().optional().transform(val => val === "" ? undefined : val),
  medicalCardIssuedDate: z.string().optional().transform(val => val === "" ? undefined : val),
  dateHired: z.string().optional().transform(val => val === "" ? undefined : val),
  dateTerminated: z.string().optional().transform(val => val === "" ? undefined : val),
  driverType: z.enum(["owner-operator", "company-driver"]),
});

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  contactPerson: text("contact_person"),
  mcNumber: text("mc_number"),
  notes: text("notes"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const loads = pgTable("loads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadNumber: text("load_number").notNull().unique(),
  customerId: varchar("customer_id"), // Optional - can be added via AI extraction later
  status: text("status").notNull(),
  pickupLocation: text("pickup_location").notNull(),
  pickupDate: timestamp("pickup_date").notNull(),
  deliveryLocation: text("delivery_location").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  assignedDriverId: varchar("assigned_driver_id"),
  assignedTruckId: varchar("assigned_truck_id"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  expenses: decimal("expenses", { precision: 10, scale: 2 }).default("0"),
  weight: integer("weight"),
  commodity: text("commodity"),
  notes: text("notes"),
  invoiceAttachment: text("invoice_attachment"), // Base64 encoded invoice document
  podAttachment: text("pod_attachment"), // Base64 encoded proof of delivery document - DEPRECATED
  podAttachments: jsonb("pod_attachments"), // Array of {filename: string, data: string (base64), type: string, uploadedAt: string}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoadSchema = createInsertSchema(loads).omit({
  id: true,
  createdAt: true,
}).extend({
  customerId: z.string().optional(), // Optional - can be added via AI extraction later
  pickupDate: z.string(),
  deliveryDate: z.string(),
  rate: z.string(),
  expenses: z.string().optional(),
  podAttachments: z.array(z.object({
    filename: z.string(),
    data: z.string(),
    type: z.string(),
    uploadedAt: z.string(),
  })).optional(),
});

export type InsertLoad = z.infer<typeof insertLoadSchema>;
export type Load = typeof loads.$inferSelect;

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: text("file_data").notNull(),
  documentType: text("document_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Expenses - Individual expense tracking
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  vendor: text("vendor"),
  paymentMethod: text("payment_method"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
}).extend({
  expenseDate: z.string(),
  amount: z.string(),
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Invoices - Customer billing
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  loadId: varchar("load_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  status: text("status").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  lumperFee: decimal("lumper_fee", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  attachments: jsonb("attachments"), // Array of {filename: string, data: string (base64), type: string, uploadedAt: string, label: string}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
}).extend({
  invoiceDate: z.string(),
  dueDate: z.string(),
  subtotal: z.string(),
  lumperFee: z.string().optional(),
  tax: z.string().optional(),
  total: z.string(),
  paidAmount: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    data: z.string(),
    type: z.string(),
    uploadedAt: z.string(),
    label: z.string().optional(), // e.g., "Rate Confirmation", "BOL", "Other"
  })).optional(),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Payments - Payment tracking
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id"),
  customerId: varchar("customer_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  paymentDate: z.string(),
  amount: z.string(),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Safety Inspections
export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  inspectionType: text("inspection_type").notNull(),
  inspectionDate: timestamp("inspection_date").notNull(),
  status: text("status").notNull(),
  defects: text("defects"),
  notes: text("notes"),
  performedBy: text("performed_by"),
  attachments: jsonb("attachments"), // Array of {filename: string, data: string (base64), type: string}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
  createdAt: true,
}).extend({
  inspectionDate: z.string(),
  attachments: z.array(z.object({
    filename: z.string(),
    data: z.string(),
    type: z.string(),
  })).optional(),
});

export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspections.$inferSelect;

// Accidents & Incidents
export const accidents = pgTable("accidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  truckId: varchar("truck_id"),
  loadId: varchar("load_id"),
  accidentDate: timestamp("accident_date").notNull(),
  location: text("location").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  injuriesReported: integer("injuries_reported").default(0),
  policeReportNumber: text("police_report_number"),
  insuranceClaimNumber: text("insurance_claim_number"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  status: text("status").notNull(),
  attachments: jsonb("attachments"), // Array of {filename: string, data: string (base64), type: string}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAccidentSchema = createInsertSchema(accidents).omit({
  id: true,
  createdAt: true,
}).extend({
  accidentDate: z.string(),
  estimatedCost: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    data: z.string(),
    type: z.string(),
  })).optional(),
});

export type InsertAccident = z.infer<typeof insertAccidentSchema>;
export type Accident = typeof accidents.$inferSelect;

// Violations - DOT/Traffic violations
export const violations = pgTable("violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  truckId: varchar("truck_id"),
  violationType: text("violation_type").notNull(),
  violationDate: timestamp("violation_date").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  citationNumber: text("citation_number"),
  fineAmount: decimal("fine_amount", { precision: 10, scale: 2 }),
  points: integer("points"),
  status: text("status").notNull(),
  dueDate: timestamp("due_date"),
  attachments: jsonb("attachments"), // Array of {filename: string, data: string (base64), type: string}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertViolationSchema = createInsertSchema(violations).omit({
  id: true,
  createdAt: true,
}).extend({
  violationDate: z.string(),
  dueDate: z.string().optional(),
  fineAmount: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    data: z.string(),
    type: z.string(),
  })).optional(),
});

export type InsertViolation = z.infer<typeof insertViolationSchema>;
export type Violation = typeof violations.$inferSelect;

// Driver Settlements - Payroll/Payments to drivers
export const settlements = pgTable("settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  truckNumber: text("truck_number"),
  settlementNumber: text("settlement_number").notNull().unique(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalMiles: integer("total_miles"),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).notNull(),
  driverPayPercentage: decimal("driver_pay_percentage", { precision: 5, scale: 2 }).notNull(),
  // Dispatch section
  dispatchPercentage: decimal("dispatch_percentage", { precision: 5, scale: 2 }).default("0"),
  // Advance section
  advance: decimal("advance", { precision: 12, scale: 2 }).default("0"),
  advanceBalance: decimal("advance_balance", { precision: 12, scale: 2 }).default("0"),
  advanceDate: timestamp("advance_date"),
  // Fuel sections
  fuelFlyingJ: decimal("fuel_flying_j", { precision: 10, scale: 2 }).default("0"),
  fuelFlyingJStartDate: timestamp("fuel_flying_j_start_date"),
  fuelFlyingJEndDate: timestamp("fuel_flying_j_end_date"),
  fuelFleetOne: decimal("fuel_fleet_one", { precision: 10, scale: 2 }).default("0"),
  fuelFleetOneStartDate: timestamp("fuel_fleet_one_start_date"),
  fuelFleetOneEndDate: timestamp("fuel_fleet_one_end_date"),
  // Other deduction fields
  tolls: decimal("tolls", { precision: 10, scale: 2 }).default("0"),
  tollsStartDate: timestamp("tolls_start_date"),
  tollsEndDate: timestamp("tolls_end_date"),
  fuel: decimal("fuel", { precision: 10, scale: 2 }).default("0"),
  factoringFeePercentage: decimal("factoring_fee_percentage", { precision: 5, scale: 2 }).default("0"),
  insurance: decimal("insurance", { precision: 10, scale: 2 }).default("0"),
  insuranceStartDate: timestamp("insurance_start_date"),
  insuranceEndDate: timestamp("insurance_end_date"),
  trailerFee: decimal("trailer_fee", { precision: 10, scale: 2 }).default("0"),
  truckRepair: decimal("truck_repair", { precision: 10, scale: 2 }).default("0"),
  trailerRepair: decimal("trailer_repair", { precision: 10, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"),
  // New fee sections
  prepassFee: decimal("prepass_fee", { precision: 10, scale: 2 }).default("0"),
  eldFee: decimal("eld_fee", { precision: 10, scale: 2 }).default("0"),
  plateFee: decimal("plate_fee", { precision: 10, scale: 2 }).default("0"),
  fee2290: decimal("fee_2290", { precision: 10, scale: 2 }).default("0"),
  parkingFee: decimal("parking_fee", { precision: 10, scale: 2 }).default("0"),
  truckCredit: decimal("truck_credit", { precision: 10, scale: 2 }).default("0"),
  previousSettlement: decimal("previous_settlement", { precision: 10, scale: 2 }).default("0"),
  netPay: decimal("net_pay", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
  paidDate: timestamp("paid_date"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSettlementSchema = createInsertSchema(settlements).omit({
  id: true,
  createdAt: true,
}).extend({
  periodStart: z.string(),
  periodEnd: z.string(),
  totalRevenue: z.coerce.string(),
  driverPayPercentage: z.coerce.string(),
  dispatchPercentage: z.coerce.string().optional(),
  advance: z.coerce.string().optional(),
  advanceBalance: z.coerce.string().optional(),
  advanceDate: z.string().optional().transform(v => v || undefined),
  fuelFlyingJ: z.coerce.string().optional(),
  fuelFlyingJStartDate: z.string().optional().transform(v => v || undefined),
  fuelFlyingJEndDate: z.string().optional().transform(v => v || undefined),
  fuelFleetOne: z.coerce.string().optional(),
  fuelFleetOneStartDate: z.string().optional().transform(v => v || undefined),
  fuelFleetOneEndDate: z.string().optional().transform(v => v || undefined),
  tolls: z.coerce.string().optional(),
  tollsStartDate: z.string().optional().transform(v => v || undefined),
  tollsEndDate: z.string().optional().transform(v => v || undefined),
  fuel: z.coerce.string().optional(),
  factoringFeePercentage: z.coerce.string().optional(),
  insurance: z.coerce.string().optional(),
  insuranceStartDate: z.string().optional().transform(v => v || undefined),
  insuranceEndDate: z.string().optional().transform(v => v || undefined),
  trailerFee: z.coerce.string().optional(),
  truckRepair: z.coerce.string().optional(),
  trailerRepair: z.coerce.string().optional(),
  deductions: z.coerce.string().optional(),
  prepassFee: z.coerce.string().optional(),
  eldFee: z.coerce.string().optional(),
  plateFee: z.coerce.string().optional(),
  fee2290: z.coerce.string().optional(),
  parkingFee: z.coerce.string().optional(),
  truckCredit: z.coerce.string().optional(),
  previousSettlement: z.coerce.string().optional(),
  netPay: z.coerce.string(),
  paidDate: z.string().optional().transform(v => v || undefined),
});

export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlements.$inferSelect;

// Settlement Line Items - Individual loads/entries within a settlement
export const settlementLineItems = pgTable("settlement_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settlementId: varchar("settlement_id").notNull(),
  loadId: varchar("load_id"), // Optional - can be manual entry
  brokerName: text("broker_name"), // Broker/Customer name for this load
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }), // e.g., miles, loads, hours
  rate: decimal("rate", { precision: 10, scale: 4 }), // e.g., per mile, per load, per hour
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Gross amount for this load
  itemType: text("item_type").notNull(), // "revenue", "deduction", "bonus", "adjustment"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSettlementLineItemSchema = createInsertSchema(settlementLineItems).omit({
  id: true,
  createdAt: true,
}).extend({
  brokerName: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.string().optional(),
  rate: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  itemType: z.string().default("revenue"),
  settlementId: z.string(),
});

export type InsertSettlementLineItem = z.infer<typeof insertSettlementLineItemSchema>;
export type SettlementLineItem = typeof settlementLineItems.$inferSelect;

// Recurring Expenses - Templates for recurring deductions
export const recurringExpenses = pgTable("recurring_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id"), // null = applies to all drivers
  name: text("name").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(), // "weekly", "biweekly", "monthly"
  category: text("category").notNull(), // "insurance", "truck_lease", "fuel_advance", "other"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // null = ongoing
  isActive: text("is_active").notNull().default("true"), // "true" or "false"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecurringExpenseSchema = createInsertSchema(recurringExpenses).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
});

export type InsertRecurringExpense = z.infer<typeof insertRecurringExpenseSchema>;
export type RecurringExpense = typeof recurringExpenses.$inferSelect;

// Maintenance Records
export const maintenance = pgTable("maintenance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull(),
  maintenanceType: text("maintenance_type").notNull(),
  serviceDate: timestamp("service_date").notNull(),
  mileage: integer("mileage"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  vendor: text("vendor"),
  description: text("description").notNull(),
  nextServiceMileage: integer("next_service_mileage"),
  nextServiceDate: timestamp("next_service_date"),
  status: text("status").notNull(),
  invoiceNumber: text("invoice_number"),
  notes: text("notes"),
  attachments: jsonb("attachments"), // Array of {filename: string, data: string (base64), type: string}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceSchema = createInsertSchema(maintenance).omit({
  id: true,
  createdAt: true,
}).extend({
  serviceDate: z.string(),
  nextServiceDate: z.string().optional(),
  cost: z.string(),
  attachments: z.array(z.object({
    filename: z.string(),
    data: z.string(),
    type: z.string(),
  })).optional(),
});

export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type Maintenance = typeof maintenance.$inferSelect;

// Fuel Cards - Store fuel card account information for FleetOne, Pilot Flying J, etc.
export const fuelCards = pgTable("fuel_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // FleetOne, Pilot Flying J
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  cardNumbers: text("card_numbers").array(), // List of card numbers
  apiUsername: text("api_username"), // For future API integration
  apiEnabled: text("api_enabled").notNull().default("false"), // true/false
  portalUrl: text("portal_url"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFuelCardSchema = createInsertSchema(fuelCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFuelCard = z.infer<typeof insertFuelCardSchema>;
export type FuelCard = typeof fuelCards.$inferSelect;

// Fuel Transactions - Track fuel purchases with fuel card vendors
export const fuelTransactions = pgTable("fuel_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  loadId: varchar("load_id"),
  transactionDate: timestamp("transaction_date").notNull(),
  vendor: text("vendor").notNull(), // FleetOne, Pilot, Love's, TA, Flying J, Speedway, Other
  location: text("location").notNull(), // City, State or full address
  gallons: decimal("gallons", { precision: 10, scale: 3 }).notNull(),
  pricePerGallon: decimal("price_per_gallon", { precision: 10, scale: 3 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  cardNumber: text("card_number"), // Last 4 digits for security
  receiptNumber: text("receipt_number"),
  odometerReading: integer("odometer_reading"),
  fuelType: text("fuel_type").notNull(), // Diesel, Gas, DEF
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFuelTransactionSchema = createInsertSchema(fuelTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  transactionDate: z.string(),
  gallons: z.string(),
  pricePerGallon: z.string(),
  totalCost: z.string(),
});

export type InsertFuelTransaction = z.infer<typeof insertFuelTransactionSchema>;
export type FuelTransaction = typeof fuelTransactions.$inferSelect;

// GPS Locations - Real-time driver/truck tracking
export const gpsLocations = pgTable("gps_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id"),
  truckId: varchar("truck_id"),
  loadId: varchar("load_id"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  speed: decimal("speed", { precision: 5, scale: 2 }), // mph
  heading: integer("heading"), // 0-359 degrees
  accuracy: integer("accuracy"), // meters
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGpsLocationSchema = createInsertSchema(gpsLocations).omit({
  id: true,
  createdAt: true,
}).extend({
  latitude: z.string(),
  longitude: z.string(),
  speed: z.string().optional(),
  timestamp: z.string(),
});

export type InsertGpsLocation = z.infer<typeof insertGpsLocationSchema>;
export type GpsLocation = typeof gpsLocations.$inferSelect;

// Automation Settings - Configure automated workflows
export const automationSettings = pgTable("automation_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // e.g., "auto_invoice_on_delivery", "alert_license_expiry"
  enabled: text("enabled").notNull().default("true"), // "true" or "false"
  config: jsonb("config"), // JSON configuration for the automation
  lastRun: timestamp("last_run"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAutomationSettingSchema = createInsertSchema(automationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAutomationSetting = z.infer<typeof insertAutomationSettingSchema>;
export type AutomationSetting = typeof automationSettings.$inferSelect;

// Notifications - System-generated alerts and notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "alert", "info", "warning", "success"
  category: text("category").notNull(), // "license_expiry", "invoice_created", "load_delivered", etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedEntityType: text("related_entity_type"), // "load", "driver", "invoice", etc.
  relatedEntityId: varchar("related_entity_id"),
  isRead: text("is_read").notNull().default("false"), // "true" or "false"
  recipientEmail: text("recipient_email"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Activity Log - Track all automated actions
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // "invoice_created", "notification_sent", "alert_triggered"
  entityType: text("entity_type"), // "load", "driver", "invoice"
  entityId: varchar("entity_id"),
  details: text("details"), // Human-readable description
  metadata: jsonb("metadata"), // Additional data
  status: text("status").notNull(), // "success", "failed", "pending"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// Short Pays - Track loads with payment discrepancies
export const shortPays = pgTable("short_pays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull(),
  loadNumber: text("load_number").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull(),
  shortAmount: decimal("short_amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("open"), // "open", "disputed", "resolved", "written_off"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertShortPaySchema = createInsertSchema(shortPays).omit({
  id: true,
  createdAt: true,
}).extend({
  expectedAmount: z.string(),
  paidAmount: z.string(),
  shortAmount: z.string(),
});

export type InsertShortPay = z.infer<typeof insertShortPaySchema>;
export type ShortPay = typeof shortPays.$inferSelect;

// Charge Backs - Track customer charge backs and disputes
export const chargeBacks = pgTable("charge_backs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull(),
  loadNumber: text("load_number").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  category: text("category").notNull(), // "damaged_freight", "late_delivery", "missing_items", "billing_dispute", "other"
  status: text("status").notNull().default("pending"), // "pending", "under_review", "approved", "denied", "resolved"
  submittedDate: timestamp("submitted_date").notNull(),
  resolvedDate: timestamp("resolved_date"),
  resolution: text("resolution"), // Description of how it was resolved
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChargeBackSchema = createInsertSchema(chargeBacks).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string(),
  submittedDate: z.string(),
  resolvedDate: z.string().nullable().optional(),
});

export type InsertChargeBack = z.infer<typeof insertChargeBackSchema>;
export type ChargeBack = typeof chargeBacks.$inferSelect;

// Tasks - Track daily reminders and recurring tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  dueTime: text("due_time"), // HH:MM format like "09:00"
  repeatDaily: text("repeat_daily").notNull().default("false"), // "true" or "false"
  assignedTo: text("assigned_to"), // Person/department responsible
  status: text("status").notNull().default("pending"), // "pending", "completed", "overdue"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  category: text("category"), // "maintenance", "paperwork", "dispatch", "other"
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.string(),
  completedAt: z.string().optional().transform(val => val === "" ? undefined : val),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Company Settings - Store company branding and information for PDFs
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull().default("Ready Carrier LLC"),
  address: text("address").notNull().default("2380 Wycliff Street Ste 200"),
  cityStateZip: text("city_state_zip").notNull().default("St Paul, MN 55114"),
  phone: text("phone").notNull().default("612-567-5034"),
  logoUrl: text("logo_url"), // URL or base64 data of company logo
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
