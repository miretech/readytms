var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accidents: () => accidents,
  activityLog: () => activityLog,
  automationSettings: () => automationSettings,
  chargeBacks: () => chargeBacks,
  companies: () => companies,
  companySettings: () => companySettings,
  companyUsers: () => companyUsers,
  customers: () => customers,
  divisionInvitations: () => divisionInvitations,
  divisions: () => divisions,
  documents: () => documents,
  drivers: () => drivers,
  expenses: () => expenses,
  feedbacks: () => feedbacks,
  fuelCards: () => fuelCards,
  fuelTransactions: () => fuelTransactions,
  gmailTokens: () => gmailTokens,
  gpsLocations: () => gpsLocations,
  insertAccidentSchema: () => insertAccidentSchema,
  insertActivityLogSchema: () => insertActivityLogSchema,
  insertAutomationSettingSchema: () => insertAutomationSettingSchema,
  insertChargeBackSchema: () => insertChargeBackSchema,
  insertCompanySettingsSchema: () => insertCompanySettingsSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertDivisionInvitationSchema: () => insertDivisionInvitationSchema,
  insertDivisionSchema: () => insertDivisionSchema,
  insertDocumentSchema: () => insertDocumentSchema,
  insertDriverSchema: () => insertDriverSchema,
  insertExpenseSchema: () => insertExpenseSchema,
  insertFeedbackSchema: () => insertFeedbackSchema,
  insertFuelCardSchema: () => insertFuelCardSchema,
  insertFuelTransactionSchema: () => insertFuelTransactionSchema,
  insertGpsLocationSchema: () => insertGpsLocationSchema,
  insertInspectionSchema: () => insertInspectionSchema,
  insertInvoiceSchema: () => insertInvoiceSchema,
  insertLoadDocumentSchema: () => insertLoadDocumentSchema,
  insertLoadSchema: () => insertLoadSchema,
  insertMaintenanceSchema: () => insertMaintenanceSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertRecurringExpenseSchema: () => insertRecurringExpenseSchema,
  insertSentEmailSchema: () => insertSentEmailSchema,
  insertSettlementLineItemSchema: () => insertSettlementLineItemSchema,
  insertSettlementSchema: () => insertSettlementSchema,
  insertShortPaySchema: () => insertShortPaySchema,
  insertTaskSchema: () => insertTaskSchema,
  insertTrailerDotInspectionSchema: () => insertTrailerDotInspectionSchema,
  insertTrailerSchema: () => insertTrailerSchema,
  insertTrailerTruckAssignmentSchema: () => insertTrailerTruckAssignmentSchema,
  insertTruckSchema: () => insertTruckSchema,
  insertViolationSchema: () => insertViolationSchema,
  inspections: () => inspections,
  invoices: () => invoices,
  loadDocuments: () => loadDocuments,
  loads: () => loads,
  maintenance: () => maintenance,
  notifications: () => notifications,
  passwordResetTokens: () => passwordResetTokens,
  payments: () => payments,
  recurringExpenses: () => recurringExpenses,
  sentEmails: () => sentEmails,
  sessions: () => sessions,
  settlementLineItems: () => settlementLineItems,
  settlements: () => settlements,
  shortPays: () => shortPays,
  tasks: () => tasks,
  trailerDotInspections: () => trailerDotInspections,
  trailerTruckAssignments: () => trailerTruckAssignments,
  trailers: () => trailers,
  trucks: () => trucks,
  users: () => users,
  violations: () => violations
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, index, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions, users, passwordResetTokens, trucks, insertTruckSchema, trailers, insertTrailerSchema, trailerTruckAssignments, insertTrailerTruckAssignmentSchema, trailerDotInspections, insertTrailerDotInspectionSchema, drivers, insertDriverSchema, customers, insertCustomerSchema, loads, insertLoadSchema, documents, insertDocumentSchema, expenses, insertExpenseSchema, invoices, insertInvoiceSchema, payments, insertPaymentSchema, inspections, insertInspectionSchema, accidents, insertAccidentSchema, violations, insertViolationSchema, settlements, insertSettlementSchema, settlementLineItems, insertSettlementLineItemSchema, recurringExpenses, insertRecurringExpenseSchema, maintenance, insertMaintenanceSchema, fuelCards, insertFuelCardSchema, fuelTransactions, insertFuelTransactionSchema, gpsLocations, insertGpsLocationSchema, automationSettings, insertAutomationSettingSchema, notifications, insertNotificationSchema, activityLog, insertActivityLogSchema, shortPays, insertShortPaySchema, chargeBacks, insertChargeBackSchema, tasks, insertTaskSchema, companySettings, insertCompanySettingsSchema, divisions, insertDivisionSchema, divisionInvitations, insertDivisionInvitationSchema, gmailTokens, feedbacks, insertFeedbackSchema, sentEmails, insertSentEmailSchema, loadDocuments, insertLoadDocumentSchema, companies, companyUsers;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: varchar("email").unique().notNull(),
      password: varchar("password").notNull(),
      // Bcrypt hashed password
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      profileImageUrl: varchar("profile_image_url"),
      isAdmin: text("is_admin").notNull().default("false"),
      role: text("role").notNull().default("admin"),
      // "admin", "dispatch", or "driver"
      approved: text("approved").notNull().default("false"),
      // Admin approval status
      approvedBy: varchar("approved_by"),
      // ID of admin who approved this account
      approvedAt: timestamp("approved_at"),
      // When the account was approved
      divisionId: varchar("division_id"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    passwordResetTokens = pgTable("password_reset_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: varchar("email").notNull(),
      token: varchar("token").notNull().unique(),
      userType: text("user_type").notNull(),
      // "admin" or "driver"
      expiresAt: timestamp("expires_at").notNull(),
      used: text("used").notNull().default("false"),
      createdAt: timestamp("created_at").defaultNow()
    });
    trucks = pgTable("trucks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      truckNumber: text("truck_number").notNull(),
      type: text("type").notNull(),
      status: text("status").notNull(),
      licensePlate: text("license_plate").notNull(),
      vin: text("vin"),
      year: integer("year"),
      make: text("make"),
      model: text("model"),
      // Cab Card section
      cabCardExpirationDate: text("cab_card_expiration_date"),
      cabCardAttachments: jsonb("cab_card_attachments").$type(),
      // Annual DOT Inspection section
      dotInspectionDate: text("dot_inspection_date"),
      dotInspectionExpirationDate: text("dot_inspection_expiration_date"),
      dotInspectionAttachments: jsonb("dot_inspection_attachments").$type(),
      // Repair Receipts
      repairReceiptAttachments: jsonb("repair_receipt_attachments").$type(),
      // Company Dates
      dateAddedToCompany: text("date_added_to_company"),
      dateTerminated: text("date_terminated"),
      // Owner Info
      ownerFullName: text("owner_full_name"),
      isCompanyTruck: boolean("is_company_truck").default(false),
      companyId: varchar("company_id")
    });
    insertTruckSchema = createInsertSchema(trucks).omit({
      id: true
    }).extend({
      status: z.enum(["available", "in-use", "maintenance", "out-of-service", "terminated"])
    });
    trailers = pgTable("trailers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      trailerNumber: text("trailer_number").notNull(),
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
      terminatedDate: text("terminated_date"),
      // Date trailer was terminated/retired
      // Tolls section - stores array of file attachments as JSON
      tollsAttachments: jsonb("tolls_attachments").$type(),
      // Repairs section
      repairs: text("repairs"),
      repairsAttachments: jsonb("repairs_attachments").$type(),
      // Rent section
      rentPerMonth: decimal("rent_per_month", { precision: 10, scale: 2 }),
      // Pickup pictures section - stores array of image attachments as JSON
      pickupPictures: jsonb("pickup_pictures").$type(),
      // Truck currently hauling this trailer
      haulingTruckId: varchar("hauling_truck_id"),
      companyId: varchar("company_id")
    });
    insertTrailerSchema = createInsertSchema(trailers).omit({
      id: true
    });
    trailerTruckAssignments = pgTable("trailer_truck_assignments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      trailerId: varchar("trailer_id").notNull(),
      truckId: varchar("truck_id").notNull(),
      startDate: text("start_date").notNull(),
      endDate: text("end_date"),
      // null = currently active
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertTrailerTruckAssignmentSchema = createInsertSchema(trailerTruckAssignments).omit({
      id: true,
      createdAt: true
    });
    trailerDotInspections = pgTable("trailer_dot_inspections", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      trailerId: varchar("trailer_id").notNull(),
      issueDate: text("issue_date"),
      expirationDate: text("expiration_date"),
      shopName: text("shop_name"),
      shopAddress: text("shop_address"),
      result: text("result"),
      // "passed" | "failed"
      notes: text("notes"),
      attachments: jsonb("attachments").$type(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertTrailerDotInspectionSchema = createInsertSchema(trailerDotInspections).omit({
      id: true,
      createdAt: true
    });
    drivers = pgTable("drivers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      email: text("email").notNull(),
      password: text("password"),
      // Bcrypt hashed password (optional for drivers created by admin)
      phone: text("phone").notNull(),
      address: text("address"),
      licenseNumber: text("license_number").notNull().unique(),
      licenseExpiration: timestamp("license_expiration"),
      licenseIssuedPlace: text("license_issued_place"),
      licenseAttachment: text("license_attachment"),
      medicalCardNumber: text("medical_card_number"),
      medicalCardExpiration: timestamp("medical_card_expiration"),
      medicalCardIssuedDate: timestamp("medical_card_issued_date"),
      medicalCardAttachment: text("medical_card_attachment"),
      // Medical card document attachment
      socialSecurityNumber: text("social_security_number"),
      socialSecurityAttachment: text("social_security_attachment"),
      status: text("status").notNull(),
      isActive: text("is_active").notNull().default("true"),
      dateHired: timestamp("date_hired"),
      dateTerminated: timestamp("date_terminated"),
      assignedTruckId: varchar("assigned_truck_id"),
      gpsEnabled: text("gps_enabled").notNull().default("false"),
      // Admin-controlled GPS tracking
      lastGpsUpdate: timestamp("last_gps_update"),
      // Last time driver shared GPS location
      lastGpsNotificationSent: timestamp("last_gps_notification_sent"),
      // Last time GPS reminder was sent
      gpsNotificationsEnabled: text("gps_notifications_enabled").notNull().default("true"),
      // "true" or "false"
      driverType: text("driver_type").notNull().default("company-driver"),
      // "owner-operator" or "company-driver"
      companyId: varchar("company_id")
    });
    insertDriverSchema = createInsertSchema(drivers).omit({
      id: true
    }).extend({
      licenseExpiration: z.string().optional().transform((val) => val === "" ? void 0 : val),
      medicalCardExpiration: z.string().optional().transform((val) => val === "" ? void 0 : val),
      medicalCardIssuedDate: z.string().optional().transform((val) => val === "" ? void 0 : val),
      dateHired: z.string().optional().transform((val) => val === "" ? void 0 : val),
      dateTerminated: z.string().optional().transform((val) => val === "" ? void 0 : val),
      driverType: z.enum(["owner-operator", "company-driver"])
    });
    customers = pgTable("customers", {
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
      companyId: varchar("company_id")
    });
    insertCustomerSchema = createInsertSchema(customers).omit({
      id: true
    });
    loads = pgTable("loads", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      loadNumber: text("load_number").notNull(),
      customerId: varchar("customer_id"),
      // Optional - can be added via AI extraction later
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
      invoiceAttachment: text("invoice_attachment"),
      // Base64 encoded invoice document
      podAttachment: text("pod_attachment"),
      // Base64 encoded proof of delivery document - DEPRECATED
      podAttachments: jsonb("pod_attachments"),
      // Array of {filename: string, data: string (base64), type: string, uploadedAt: string}
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id"),
      source: text("source").default("manual"),
      rateConUrl: text("rate_con_url"),
      paperworkStatus: text("paperwork_status").default("missing"),
      paperworkReceivedAt: timestamp("paperwork_received_at"),
      paperworkApprovedAt: timestamp("paperwork_approved_at"),
      paperworkNotes: text("paperwork_notes")
    });
    insertLoadSchema = createInsertSchema(loads).omit({
      id: true,
      createdAt: true
    }).extend({
      customerId: z.string().optional(),
      source: z.enum(["manual", "ai_extract"]).optional(),
      // Optional - can be added via AI extraction later
      pickupDate: z.string().optional(),
      deliveryDate: z.string().optional(),
      rate: z.string(),
      expenses: z.string().optional(),
      podAttachments: z.array(z.object({
        filename: z.string(),
        data: z.string(),
        type: z.string(),
        uploadedAt: z.string()
      })).optional()
    });
    documents = pgTable("documents", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      loadId: varchar("load_id"),
      fileName: text("file_name").notNull(),
      fileType: text("file_type").notNull(),
      fileSize: integer("file_size").notNull(),
      fileData: text("file_data").notNull(),
      documentType: text("document_type"),
      uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
    });
    insertDocumentSchema = createInsertSchema(documents).omit({
      id: true,
      uploadedAt: true
    });
    expenses = pgTable("expenses", {
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
      companyId: varchar("company_id")
    });
    insertExpenseSchema = createInsertSchema(expenses).omit({
      id: true,
      createdAt: true
    }).extend({
      expenseDate: z.string(),
      amount: z.string()
    });
    invoices = pgTable("invoices", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      invoiceNumber: text("invoice_number").notNull(),
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
      attachments: jsonb("attachments"),
      // Array of {filename: string, data: string (base64), type: string, uploadedAt: string, label: string}
      carrierName: text("carrier_name"),
      // Editable carrier name for invoice
      carrierAddress: text("carrier_address"),
      // Editable carrier address for invoice
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertInvoiceSchema = createInsertSchema(invoices).omit({
      id: true,
      createdAt: true
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
        label: z.string().optional()
        // e.g., "Rate Confirmation", "BOL", "Other"
      })).optional()
    });
    payments = pgTable("payments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      invoiceId: varchar("invoice_id"),
      customerId: varchar("customer_id"),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      paymentDate: timestamp("payment_date").notNull(),
      paymentMethod: text("payment_method").notNull(),
      referenceNumber: text("reference_number"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertPaymentSchema = createInsertSchema(payments).omit({
      id: true,
      createdAt: true
    }).extend({
      paymentDate: z.string(),
      amount: z.string()
    });
    inspections = pgTable("inspections", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      truckId: varchar("truck_id").notNull(),
      driverId: varchar("driver_id").notNull(),
      inspectionType: text("inspection_type").notNull(),
      inspectionDate: timestamp("inspection_date").notNull(),
      status: text("status").notNull(),
      defects: text("defects"),
      notes: text("notes"),
      performedBy: text("performed_by"),
      attachments: jsonb("attachments"),
      // Array of {filename: string, data: string (base64), type: string}
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertInspectionSchema = createInsertSchema(inspections).omit({
      id: true,
      createdAt: true
    }).extend({
      inspectionDate: z.string(),
      attachments: z.array(z.object({
        filename: z.string(),
        data: z.string(),
        type: z.string()
      })).optional()
    });
    accidents = pgTable("accidents", {
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
      attachments: jsonb("attachments"),
      // Array of {filename: string, data: string (base64), type: string}
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertAccidentSchema = createInsertSchema(accidents).omit({
      id: true,
      createdAt: true
    }).extend({
      accidentDate: z.string(),
      estimatedCost: z.string().optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        data: z.string(),
        type: z.string()
      })).optional()
    });
    violations = pgTable("violations", {
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
      attachments: jsonb("attachments"),
      // Array of {filename: string, data: string (base64), type: string}
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertViolationSchema = createInsertSchema(violations).omit({
      id: true,
      createdAt: true
    }).extend({
      violationDate: z.string(),
      dueDate: z.string().optional(),
      fineAmount: z.string().optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        data: z.string(),
        type: z.string()
      })).optional()
    });
    settlements = pgTable("settlements", {
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
      companyId: varchar("company_id")
    });
    insertSettlementSchema = createInsertSchema(settlements).omit({
      id: true,
      createdAt: true
    }).extend({
      periodStart: z.string(),
      periodEnd: z.string(),
      totalRevenue: z.coerce.string(),
      driverPayPercentage: z.coerce.string(),
      dispatchPercentage: z.coerce.string().optional(),
      advance: z.coerce.string().optional(),
      advanceBalance: z.coerce.string().optional(),
      advanceDate: z.string().optional().transform((v) => v || void 0),
      fuelFlyingJ: z.coerce.string().optional(),
      fuelFlyingJStartDate: z.string().optional().transform((v) => v || void 0),
      fuelFlyingJEndDate: z.string().optional().transform((v) => v || void 0),
      fuelFleetOne: z.coerce.string().optional(),
      fuelFleetOneStartDate: z.string().optional().transform((v) => v || void 0),
      fuelFleetOneEndDate: z.string().optional().transform((v) => v || void 0),
      tolls: z.coerce.string().optional(),
      tollsStartDate: z.string().optional().transform((v) => v || void 0),
      tollsEndDate: z.string().optional().transform((v) => v || void 0),
      fuel: z.coerce.string().optional(),
      factoringFeePercentage: z.coerce.string().optional(),
      insurance: z.coerce.string().optional(),
      insuranceStartDate: z.string().optional().transform((v) => v || void 0),
      insuranceEndDate: z.string().optional().transform((v) => v || void 0),
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
      paidDate: z.string().optional().transform((v) => v || void 0)
    });
    settlementLineItems = pgTable("settlement_line_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      settlementId: varchar("settlement_id").notNull(),
      loadId: varchar("load_id"),
      // Optional - can be manual entry
      brokerName: text("broker_name"),
      // Broker/Customer name for this load
      description: text("description").notNull(),
      quantity: decimal("quantity", { precision: 10, scale: 2 }),
      // e.g., miles, loads, hours
      rate: decimal("rate", { precision: 10, scale: 4 }),
      // e.g., per mile, per load, per hour
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      // Gross amount for this load
      itemType: text("item_type").notNull(),
      // "revenue", "deduction", "bonus", "adjustment"
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertSettlementLineItemSchema = createInsertSchema(settlementLineItems).omit({
      id: true,
      createdAt: true
    }).extend({
      brokerName: z.string().optional(),
      description: z.string().min(1, "Description is required"),
      quantity: z.string().optional(),
      rate: z.string().optional(),
      amount: z.string().min(1, "Amount is required"),
      itemType: z.string().default("revenue"),
      settlementId: z.string()
    });
    recurringExpenses = pgTable("recurring_expenses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      driverId: varchar("driver_id"),
      // null = applies to all drivers
      name: text("name").notNull(),
      description: text("description"),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      frequency: text("frequency").notNull(),
      // "weekly", "biweekly", "monthly"
      category: text("category").notNull(),
      // "insurance", "truck_lease", "fuel_advance", "other"
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date"),
      // null = ongoing
      isActive: text("is_active").notNull().default("true"),
      // "true" or "false"
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertRecurringExpenseSchema = createInsertSchema(recurringExpenses).omit({
      id: true,
      createdAt: true
    }).extend({
      amount: z.string(),
      startDate: z.string(),
      endDate: z.string().optional()
    });
    maintenance = pgTable("maintenance", {
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
      attachments: jsonb("attachments"),
      // Array of {filename: string, data: string (base64), type: string}
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertMaintenanceSchema = createInsertSchema(maintenance).omit({
      id: true,
      createdAt: true
    }).extend({
      serviceDate: z.string(),
      nextServiceDate: z.string().optional(),
      cost: z.string(),
      attachments: z.array(z.object({
        filename: z.string(),
        data: z.string(),
        type: z.string()
      })).optional()
    });
    fuelCards = pgTable("fuel_cards", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      provider: text("provider").notNull(),
      // FleetOne, Pilot Flying J
      accountName: text("account_name").notNull(),
      accountNumber: text("account_number").notNull(),
      cardNumbers: text("card_numbers").array(),
      // List of card numbers
      apiUsername: text("api_username"),
      // For future API integration
      apiEnabled: text("api_enabled").notNull().default("false"),
      // true/false
      portalUrl: text("portal_url"),
      contactEmail: text("contact_email"),
      contactPhone: text("contact_phone"),
      notes: text("notes"),
      status: text("status").notNull().default("active"),
      // active, inactive
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertFuelCardSchema = createInsertSchema(fuelCards).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    fuelTransactions = pgTable("fuel_transactions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      truckId: varchar("truck_id").notNull(),
      driverId: varchar("driver_id").notNull(),
      loadId: varchar("load_id"),
      transactionDate: timestamp("transaction_date").notNull(),
      vendor: text("vendor").notNull(),
      // FleetOne, Pilot, Love's, TA, Flying J, Speedway, Other
      location: text("location").notNull(),
      // City, State or full address
      gallons: decimal("gallons", { precision: 10, scale: 3 }).notNull(),
      pricePerGallon: decimal("price_per_gallon", { precision: 10, scale: 3 }).notNull(),
      totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
      cardNumber: text("card_number"),
      // Last 4 digits for security
      receiptNumber: text("receipt_number"),
      odometerReading: integer("odometer_reading"),
      fuelType: text("fuel_type").notNull(),
      // Diesel, Gas, DEF
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertFuelTransactionSchema = createInsertSchema(fuelTransactions).omit({
      id: true,
      createdAt: true
    }).extend({
      transactionDate: z.string(),
      gallons: z.string(),
      pricePerGallon: z.string(),
      totalCost: z.string()
    });
    gpsLocations = pgTable("gps_locations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      driverId: varchar("driver_id"),
      truckId: varchar("truck_id"),
      loadId: varchar("load_id"),
      latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
      longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
      speed: decimal("speed", { precision: 5, scale: 2 }),
      // mph
      heading: integer("heading"),
      // 0-359 degrees
      accuracy: integer("accuracy"),
      // meters
      timestamp: timestamp("timestamp").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertGpsLocationSchema = createInsertSchema(gpsLocations).omit({
      id: true,
      createdAt: true
    }).extend({
      latitude: z.string(),
      longitude: z.string(),
      speed: z.string().optional(),
      timestamp: z.string()
    });
    automationSettings = pgTable("automation_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull().unique(),
      // e.g., "auto_invoice_on_delivery", "alert_license_expiry"
      enabled: text("enabled").notNull().default("true"),
      // "true" or "false"
      config: jsonb("config"),
      // JSON configuration for the automation
      lastRun: timestamp("last_run"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertAutomationSettingSchema = createInsertSchema(automationSettings).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      type: text("type").notNull(),
      // "alert", "info", "warning", "success"
      category: text("category").notNull(),
      // "license_expiry", "invoice_created", "load_delivered", etc.
      title: text("title").notNull(),
      message: text("message").notNull(),
      relatedEntityType: text("related_entity_type"),
      // "load", "driver", "invoice", etc.
      relatedEntityId: varchar("related_entity_id"),
      isRead: text("is_read").notNull().default("false"),
      // "true" or "false"
      recipientEmail: text("recipient_email"),
      sentAt: timestamp("sent_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true
    });
    activityLog = pgTable("activity_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      action: text("action").notNull(),
      // "invoice_created", "notification_sent", "alert_triggered"
      entityType: text("entity_type"),
      // "load", "driver", "invoice"
      entityId: varchar("entity_id"),
      details: text("details"),
      // Human-readable description
      metadata: jsonb("metadata"),
      // Additional data
      status: text("status").notNull(),
      // "success", "failed", "pending"
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertActivityLogSchema = createInsertSchema(activityLog).omit({
      id: true,
      createdAt: true
    });
    shortPays = pgTable("short_pays", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      loadId: varchar("load_id").notNull(),
      loadNumber: text("load_number").notNull(),
      customerId: varchar("customer_id").notNull(),
      customerName: text("customer_name").notNull(),
      expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }).notNull(),
      paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull(),
      shortAmount: decimal("short_amount", { precision: 10, scale: 2 }).notNull(),
      reason: text("reason"),
      status: text("status").notNull().default("open"),
      // "open", "disputed", "resolved", "written_off"
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      resolvedAt: timestamp("resolved_at"),
      companyId: varchar("company_id")
    });
    insertShortPaySchema = createInsertSchema(shortPays).omit({
      id: true,
      createdAt: true
    }).extend({
      expectedAmount: z.string(),
      paidAmount: z.string(),
      shortAmount: z.string()
    });
    chargeBacks = pgTable("charge_backs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      loadId: varchar("load_id").notNull(),
      loadNumber: text("load_number").notNull(),
      customerId: varchar("customer_id").notNull(),
      customerName: text("customer_name").notNull(),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      reason: text("reason").notNull(),
      category: text("category").notNull(),
      // "damaged_freight", "late_delivery", "missing_items", "billing_dispute", "other"
      status: text("status").notNull().default("pending"),
      // "pending", "under_review", "approved", "denied", "resolved"
      submittedDate: timestamp("submitted_date").notNull(),
      resolvedDate: timestamp("resolved_date"),
      resolution: text("resolution"),
      // Description of how it was resolved
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertChargeBackSchema = createInsertSchema(chargeBacks).omit({
      id: true,
      createdAt: true
    }).extend({
      amount: z.string(),
      submittedDate: z.string(),
      resolvedDate: z.string().nullable().optional()
    });
    tasks = pgTable("tasks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      description: text("description"),
      dueDate: timestamp("due_date").notNull(),
      dueTime: text("due_time"),
      // HH:MM format like "09:00"
      repeatDaily: text("repeat_daily").notNull().default("false"),
      // "true" or "false"
      reminderEmail: text("reminder_email"),
      // Email address to send daily reminders to
      assignedTo: text("assigned_to"),
      // Person/department responsible
      status: text("status").notNull().default("pending"),
      // "pending", "completed", "overdue"
      priority: text("priority").notNull().default("medium"),
      // "low", "medium", "high"
      category: text("category"),
      // "maintenance", "paperwork", "dispatch", "other"
      completedAt: timestamp("completed_at"),
      attachments: jsonb("attachments").$type(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      companyId: varchar("company_id")
    });
    insertTaskSchema = createInsertSchema(tasks).omit({
      id: true,
      createdAt: true
    }).extend({
      dueDate: z.string(),
      completedAt: z.string().optional().transform((val) => val === "" ? void 0 : val),
      attachments: z.array(z.object({
        fileName: z.string(),
        fileData: z.string(),
        uploadedAt: z.string()
      })).optional()
    });
    companySettings = pgTable("company_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      companyName: text("company_name").notNull().default("Ready Carrier LLC"),
      address: text("address").notNull().default("2380 Wycliff Street Ste 200"),
      cityStateZip: text("city_state_zip").notNull().default("St Paul, MN 55114"),
      phone: text("phone").notNull().default("612-567-5034"),
      logoUrl: text("logo_url"),
      dispatchNotificationEmail: text("dispatch_notification_email"),
      gmailAccessToken: text("gmail_access_token"),
      gmailRefreshToken: text("gmail_refresh_token"),
      gmailEmail: text("gmail_email"),
      gmailTokenExpiry: text("gmail_token_expiry"),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
      id: true,
      updatedAt: true
    });
    divisions = pgTable("divisions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      companyName: text("company_name").notNull(),
      address: text("address").notNull(),
      cityStateZip: text("city_state_zip").notNull(),
      phone: text("phone").notNull(),
      email: text("email"),
      logoUrl: text("logo_url"),
      isPrimary: boolean("is_primary").notNull().default(false),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertDivisionSchema = createInsertSchema(divisions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    divisionInvitations = pgTable("division_invitations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      divisionId: varchar("division_id").notNull(),
      email: text("email").notNull(),
      token: varchar("token").notNull().unique(),
      role: text("role").notNull().default("admin"),
      status: text("status").notNull().default("pending"),
      invitedBy: varchar("invited_by").notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertDivisionInvitationSchema = createInsertSchema(divisionInvitations).omit({
      id: true,
      createdAt: true
    });
    gmailTokens = pgTable("gmail_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      accessToken: text("access_token").notNull(),
      refreshToken: text("refresh_token").notNull(),
      connectedEmail: text("connected_email").notNull(),
      connectedAt: timestamp("connected_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    feedbacks = pgTable("feedbacks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      personName: text("person_name").notNull(),
      note: text("note").notNull(),
      attachmentFileName: text("attachment_file_name"),
      attachmentFileData: text("attachment_file_data"),
      status: text("status").notNull().default("open"),
      // "open" or "resolved"
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertFeedbackSchema = createInsertSchema(feedbacks).omit({
      id: true,
      createdAt: true
    });
    sentEmails = pgTable("sent_emails", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      invoiceId: text("invoice_id"),
      invoiceNumber: text("invoice_number"),
      toEmail: text("to_email").notNull(),
      ccEmails: text("cc_emails"),
      // comma-separated list of CC recipients
      subject: text("subject"),
      sentAt: timestamp("sent_at").defaultNow().notNull()
    });
    insertSentEmailSchema = createInsertSchema(sentEmails).omit({
      id: true,
      sentAt: true
    });
    loadDocuments = pgTable("load_documents", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      loadId: varchar("load_id"),
      emailMessageId: text("email_message_id"),
      fileName: text("file_name").notNull(),
      fileType: text("file_type").notNull(),
      fileData: text("file_data"),
      documentType: text("document_type").notNull().default("other"),
      extractedLoadNumber: text("extracted_load_number"),
      extractedDriverName: text("extracted_driver_name"),
      extractedTruckNumber: text("extracted_truck_number"),
      extractedPickupDate: text("extracted_pickup_date"),
      extractedDeliveryDate: text("extracted_delivery_date"),
      extractedPickupLocation: text("extracted_pickup_location"),
      extractedDeliveryLocation: text("extracted_delivery_location"),
      extractedShipper: text("extracted_shipper"),
      extractedReceiver: text("extracted_receiver"),
      isSigned: boolean("is_signed"),
      pageCount: integer("page_count"),
      confidenceScore: decimal("confidence_score", { precision: 4, scale: 3 }),
      status: text("status").notNull().default("received"),
      rejectionReason: text("rejection_reason"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertLoadDocumentSchema = createInsertSchema(loadDocuments).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    companies = pgTable("companies", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      displayName: text("display_name").notNull(),
      address: text("address"),
      cityStateZip: text("city_state_zip"),
      phone: text("phone"),
      email: text("email"),
      logoUrl: text("logo_url"),
      isActive: text("is_active").notNull().default("true"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    companyUsers = pgTable("company_users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      companyId: varchar("company_id").notNull(),
      role: text("role").notNull().default("admin"),
      isPrimary: text("is_primary").notNull().default("false"),
      createdAt: timestamp("created_at").defaultNow()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/storage.ts
import { eq, desc, and, sql as sql2 } from "drizzle-orm";
import { Resend } from "resend";
import bcrypt from "bcrypt";
import crypto from "crypto";
var resend, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    resend = new Resend(process.env.RESEND_API_KEY);
    DatabaseStorage = class {
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async upsertUser(userData) {
        if (userData.email) {
          const [existingUser] = await db.select().from(users).where(eq(users.email, userData.email));
          if (existingUser) {
            const [updated] = await db.update(users).set({
              ...userData,
              id: existingUser.id,
              // Keep the existing ID
              isAdmin: existingUser.isAdmin,
              // Preserve admin status
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq(users.email, userData.email)).returning();
            return updated;
          }
        }
        const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            isAdmin: sql2`COALESCE(${users.isAdmin}, 'false')`,
            // Preserve existing isAdmin on conflict
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return user;
      }
      async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(
          sql2`lower(${users.email}) = ${email.toLowerCase()}`
        );
        return user || void 0;
      }
      async createUser(userData) {
        const [user] = await db.insert(users).values(userData).returning();
        return user;
      }
      async updateUser(id, userData) {
        const [user] = await db.update(users).set({ ...userData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
        return user || void 0;
      }
      async getApprovedAdmins() {
        return await db.select().from(users).where(and(eq(users.isAdmin, "true"), eq(users.approved, "true")));
      }
      async getPendingAdmins() {
        return await db.select().from(users).where(and(eq(users.isAdmin, "true"), eq(users.approved, "false"))).orderBy(desc(users.createdAt));
      }
      async approveAdmin(userId, approvedBy) {
        const [user] = await db.update(users).set({
          approved: "true",
          approvedBy,
          approvedAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.id, userId)).returning();
        return user || void 0;
      }
      async rejectAdmin(userId) {
        const result = await db.delete(users).where(eq(users.id, userId));
        return true;
      }
      async sendAdminApprovalNotification(newUserEmail, approvedAdmins) {
        console.log(`Admin approval notification would be sent to ${approvedAdmins.length} admins for new user: ${newUserEmail}`);
      }
      async sendAdminApprovedEmail(email) {
        console.log(`Admin approved notification would be sent to: ${email}`);
      }
      async requestPasswordReset(email, userType) {
        try {
          console.log(`[Password Reset] Request for ${userType}: ${email}`);
          let userExists = false;
          if (userType === "admin") {
            const user = await this.getUserByEmail(email);
            userExists = !!user;
            console.log(`[Password Reset] Admin user exists: ${userExists}`);
          } else {
            const driver = await this.getDriverByEmail(email);
            userExists = !!driver;
            console.log(`[Password Reset] Driver exists: ${userExists}`);
          }
          if (!userExists) {
            console.log(`[Password Reset] User not found for email: ${email}`);
            return { success: false, message: "User not found" };
          }
          const rawToken = crypto.randomBytes(32).toString("hex");
          const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
          const expiresAt = /* @__PURE__ */ new Date();
          expiresAt.setHours(expiresAt.getHours() + 1);
          console.log(`[Password Reset] Saving token to database for ${email}`);
          await db.insert(passwordResetTokens).values({
            email,
            token: hashedToken,
            userType,
            expiresAt,
            used: "false"
          });
          const resetUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost:5000"}/reset-password?token=${rawToken}&type=${userType}`;
          console.log(`[Password Reset] Attempting to send email to: ${email}`);
          console.log(`[Password Reset] Reset URL: ${resetUrl}`);
          const emailResult = await resend.emails.send({
            from: "Ready TMS <noreply@readytms.com>",
            to: email,
            subject: "Password Reset Request - Ready TMS",
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password for your ${userType === "admin" ? "Admin" : "Driver"} account at Ready TMS.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <hr style="margin: 24px 0;">
            <p style="color: #666; font-size: 12px;">Ready TMS - Transportation Management System</p>
          </div>
        `
          });
          console.log(`[Password Reset] Email sent successfully!`, emailResult);
          return { success: true };
        } catch (error) {
          console.error("[Password Reset] ERROR:", error);
          return { success: false, message: "Failed to send reset email" };
        }
      }
      async resetPassword(token, newPassword) {
        try {
          const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
          const [resetToken] = await db.select().from(passwordResetTokens).where(and(
            eq(passwordResetTokens.token, hashedToken),
            eq(passwordResetTokens.used, "false")
          ));
          if (!resetToken) {
            return { success: false, message: "Invalid or expired reset token" };
          }
          if (/* @__PURE__ */ new Date() > new Date(resetToken.expiresAt)) {
            return { success: false, message: "Reset token has expired" };
          }
          const hashedPassword = await bcrypt.hash(newPassword, 12);
          if (resetToken.userType === "admin") {
            await db.update(users).set({ password: hashedPassword, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.email, resetToken.email));
          } else {
            await db.update(drivers).set({ password: hashedPassword }).where(eq(drivers.email, resetToken.email));
          }
          await db.update(passwordResetTokens).set({ used: "true" }).where(eq(passwordResetTokens.id, resetToken.id));
          return { success: true };
        } catch (error) {
          console.error("Password reset error:", error);
          return { success: false, message: "Failed to reset password" };
        }
      }
      async getAllLoads(companyId) {
        const baseQuery = db.select({
          id: loads.id,
          loadNumber: loads.loadNumber,
          customerId: loads.customerId,
          status: loads.status,
          pickupLocation: loads.pickupLocation,
          pickupDate: loads.pickupDate,
          deliveryLocation: loads.deliveryLocation,
          deliveryDate: loads.deliveryDate,
          assignedDriverId: loads.assignedDriverId,
          assignedTruckId: loads.assignedTruckId,
          rate: loads.rate,
          expenses: loads.expenses,
          weight: loads.weight,
          commodity: loads.commodity,
          notes: loads.notes,
          createdAt: loads.createdAt,
          // Set attachment fields to null in list view for performance
          invoiceAttachment: sql2`null`.as("invoice_attachment"),
          podAttachment: sql2`null`.as("pod_attachment"),
          podAttachments: sql2`null`.as("pod_attachments")
        }).from(loads);
        const results = companyId ? await baseQuery.where(sql2`(${loads}.company_id = ${companyId} OR ${loads}.company_id IS NULL)`).orderBy(desc(loads.createdAt)) : await baseQuery.orderBy(desc(loads.createdAt));
        return results;
      }
      async getLoad(id) {
        const [load] = await db.select().from(loads).where(eq(loads.id, id));
        return load || void 0;
      }
      async getLoadByNumber(loadNumber) {
        const [load] = await db.select().from(loads).where(eq(loads.loadNumber, loadNumber));
        return load || void 0;
      }
      async createLoad(insertLoad, companyId) {
        const [load] = await db.insert(loads).values({
          ...insertLoad,
          pickupDate: insertLoad.pickupDate ? new Date(insertLoad.pickupDate) : /* @__PURE__ */ new Date(),
          deliveryDate: insertLoad.deliveryDate ? new Date(insertLoad.deliveryDate) : /* @__PURE__ */ new Date()
        }).returning();
        if (companyId) {
          await db.execute(sql2`UPDATE loads SET company_id = ${companyId} WHERE id = ${load.id}`);
        }
        return load;
      }
      async updateLoad(id, updateData) {
        const values = { ...updateData };
        if (updateData.pickupDate) {
          values.pickupDate = new Date(updateData.pickupDate);
        }
        if (updateData.deliveryDate) {
          values.deliveryDate = new Date(updateData.deliveryDate);
        }
        const existingLoad = await this.getLoad(id);
        if (existingLoad) {
          if (values.podAttachments === void 0) {
            values.podAttachments = existingLoad.podAttachments;
          }
        }
        const [load] = await db.update(loads).set(values).where(eq(loads.id, id)).returning();
        return load || void 0;
      }
      async deleteLoad(id) {
        const result = await db.delete(loads).where(eq(loads.id, id)).returning();
        return result.length > 0;
      }
      async getAllTrucks(companyId) {
        const baseQuery = db.select({
          id: trucks.id,
          truckNumber: trucks.truckNumber,
          type: trucks.type,
          status: trucks.status,
          licensePlate: trucks.licensePlate,
          vin: trucks.vin,
          year: trucks.year,
          make: trucks.make,
          model: trucks.model,
          cabCardExpirationDate: trucks.cabCardExpirationDate,
          dotInspectionDate: trucks.dotInspectionDate,
          dotInspectionExpirationDate: trucks.dotInspectionExpirationDate,
          dateAddedToCompany: trucks.dateAddedToCompany,
          dateTerminated: trucks.dateTerminated,
          ownerFullName: trucks.ownerFullName,
          isCompanyTruck: trucks.isCompanyTruck,
          // Set attachment fields to null in list view for performance
          cabCardAttachments: sql2`null`.as("cab_card_attachments"),
          dotInspectionAttachments: sql2`null`.as("dot_inspection_attachments"),
          repairReceiptAttachments: sql2`null`.as("repair_receipt_attachments")
        }).from(trucks);
        const results = companyId ? await baseQuery.where(sql2`(${trucks}.company_id = ${companyId} OR ${trucks}.company_id IS NULL)`) : await baseQuery;
        return results;
      }
      async getTruck(id) {
        const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
        return truck || void 0;
      }
      async createTruck(insertTruck, companyId) {
        const [truck] = await db.insert(trucks).values(insertTruck).returning();
        if (companyId) {
          await db.execute(sql2`UPDATE trucks SET company_id = ${companyId} WHERE id = ${truck.id}`);
        }
        return truck;
      }
      async updateTruck(id, updateData) {
        const existingTruck = await this.getTruck(id);
        const values = { ...updateData };
        if (existingTruck) {
          if (values.cabCardAttachments === void 0) {
            values.cabCardAttachments = existingTruck.cabCardAttachments;
          }
          if (values.dotInspectionAttachments === void 0) {
            values.dotInspectionAttachments = existingTruck.dotInspectionAttachments;
          }
          if (values.repairReceiptAttachments === void 0) {
            values.repairReceiptAttachments = existingTruck.repairReceiptAttachments;
          }
        }
        const [truck] = await db.update(trucks).set(values).where(eq(trucks.id, id)).returning();
        return truck || void 0;
      }
      async deleteTruck(id) {
        const result = await db.delete(trucks).where(eq(trucks.id, id)).returning();
        return result.length > 0;
      }
      async getAllTrailers(companyId) {
        const baseQuery = db.select({
          id: trailers.id,
          trailerNumber: trailers.trailerNumber,
          type: trailers.type,
          status: trailers.status,
          licensePlate: trailers.licensePlate,
          vin: trailers.vin,
          year: trailers.year,
          make: trailers.make,
          model: trailers.model,
          insuranceProvider: trailers.insuranceProvider,
          insurancePolicyNumber: trailers.insurancePolicyNumber,
          insuranceExpirationDate: trailers.insuranceExpirationDate,
          pickupDate: trailers.pickupDate,
          dropOffDate: trailers.dropOffDate,
          terminatedDate: trailers.terminatedDate,
          repairs: trailers.repairs,
          rentPerMonth: trailers.rentPerMonth,
          haulingTruckId: trailers.haulingTruckId,
          // Set attachment fields to null in list view for performance
          tollsAttachments: sql2`null`.as("tolls_attachments"),
          repairsAttachments: sql2`null`.as("repairs_attachments"),
          pickupPictures: sql2`null`.as("pickup_pictures")
        }).from(trailers);
        const results = companyId ? await baseQuery.where(sql2`(${trailers}.company_id = ${companyId} OR ${trailers}.company_id IS NULL)`) : await baseQuery;
        return results;
      }
      async getTrailer(id) {
        const [trailer] = await db.select().from(trailers).where(eq(trailers.id, id));
        return trailer || void 0;
      }
      async createTrailer(insertTrailer, companyId) {
        const [trailer] = await db.insert(trailers).values(insertTrailer).returning();
        if (companyId) {
          await db.execute(sql2`UPDATE trailers SET company_id = ${companyId} WHERE id = ${trailer.id}`);
        }
        return trailer;
      }
      async updateTrailer(id, updateData) {
        const existingTrailer = await this.getTrailer(id);
        const values = { ...updateData };
        if (existingTrailer) {
          if (values.pickupPictures === void 0) {
            values.pickupPictures = existingTrailer.pickupPictures;
          }
          if (values.tollsAttachments === void 0) {
            values.tollsAttachments = existingTrailer.tollsAttachments;
          }
          if (values.repairsAttachments === void 0) {
            values.repairsAttachments = existingTrailer.repairsAttachments;
          }
        }
        const [trailer] = await db.update(trailers).set(values).where(eq(trailers.id, id)).returning();
        return trailer || void 0;
      }
      async deleteTrailer(id) {
        const result = await db.delete(trailers).where(eq(trailers.id, id)).returning();
        return result.length > 0;
      }
      async getTrailerAssignments(trailerId) {
        return await db.select().from(trailerTruckAssignments).where(eq(trailerTruckAssignments.trailerId, trailerId)).orderBy(desc(trailerTruckAssignments.startDate));
      }
      async createTrailerAssignment(data) {
        const [result] = await db.insert(trailerTruckAssignments).values(data).returning();
        return result;
      }
      async updateTrailerAssignment(id, data) {
        const [result] = await db.update(trailerTruckAssignments).set(data).where(eq(trailerTruckAssignments.id, id)).returning();
        return result;
      }
      async deleteTrailerAssignment(id) {
        const result = await db.delete(trailerTruckAssignments).where(eq(trailerTruckAssignments.id, id)).returning();
        return result.length > 0;
      }
      async getTrailerDotInspections(trailerId) {
        return await db.select().from(trailerDotInspections).where(eq(trailerDotInspections.trailerId, trailerId)).orderBy(desc(trailerDotInspections.createdAt));
      }
      async createTrailerDotInspection(data) {
        const [result] = await db.insert(trailerDotInspections).values(data).returning();
        return result;
      }
      async updateTrailerDotInspection(id, data) {
        const [result] = await db.update(trailerDotInspections).set(data).where(eq(trailerDotInspections.id, id)).returning();
        return result;
      }
      async deleteTrailerDotInspection(id) {
        const result = await db.delete(trailerDotInspections).where(eq(trailerDotInspections.id, id)).returning();
        return result.length > 0;
      }
      async getAllDrivers(companyId) {
        const baseQuery = db.select({
          id: drivers.id,
          name: drivers.name,
          email: drivers.email,
          password: drivers.password,
          phone: drivers.phone,
          address: drivers.address,
          licenseNumber: drivers.licenseNumber,
          licenseExpiration: drivers.licenseExpiration,
          licenseIssuedPlace: drivers.licenseIssuedPlace,
          medicalCardNumber: drivers.medicalCardNumber,
          medicalCardExpiration: drivers.medicalCardExpiration,
          medicalCardIssuedDate: drivers.medicalCardIssuedDate,
          socialSecurityNumber: drivers.socialSecurityNumber,
          status: drivers.status,
          isActive: drivers.isActive,
          dateHired: drivers.dateHired,
          dateTerminated: drivers.dateTerminated,
          assignedTruckId: drivers.assignedTruckId,
          gpsEnabled: drivers.gpsEnabled,
          lastGpsUpdate: drivers.lastGpsUpdate,
          lastGpsNotificationSent: drivers.lastGpsNotificationSent,
          gpsNotificationsEnabled: drivers.gpsNotificationsEnabled,
          driverType: drivers.driverType,
          // Set attachment fields to null in list view for performance
          licenseAttachment: sql2`null`.as("license_attachment"),
          medicalCardAttachment: sql2`null`.as("medical_card_attachment"),
          socialSecurityAttachment: sql2`null`.as("social_security_attachment")
        }).from(drivers);
        const results = companyId ? await baseQuery.where(sql2`(${drivers}.company_id = ${companyId} OR ${drivers}.company_id IS NULL)`) : await baseQuery;
        return results;
      }
      async getDriver(id) {
        const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
        return driver || void 0;
      }
      async getDriverByEmail(email) {
        const [driver] = await db.select().from(drivers).where(
          sql2`lower(${drivers.email}) = ${email.toLowerCase()}`
        );
        return driver || void 0;
      }
      async getDriverByLicense(licenseNumber) {
        const [driver] = await db.select().from(drivers).where(eq(drivers.licenseNumber, licenseNumber));
        return driver || void 0;
      }
      async createDriver(insertDriver, companyId) {
        const values = { ...insertDriver };
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
        if (insertDriver.medicalCardIssuedDate && insertDriver.medicalCardIssuedDate.trim() !== "") {
          values.medicalCardIssuedDate = new Date(insertDriver.medicalCardIssuedDate);
        } else {
          values.medicalCardIssuedDate = null;
        }
        if (insertDriver.dateHired && insertDriver.dateHired.trim() !== "") {
          values.dateHired = new Date(insertDriver.dateHired);
        } else {
          values.dateHired = null;
        }
        if (insertDriver.dateTerminated && insertDriver.dateTerminated.trim() !== "") {
          values.dateTerminated = new Date(insertDriver.dateTerminated);
        } else {
          values.dateTerminated = null;
        }
        const [driver] = await db.insert(drivers).values(values).returning();
        if (companyId) {
          await db.execute(sql2`UPDATE drivers SET company_id = ${companyId} WHERE id = ${driver.id}`);
        }
        return driver;
      }
      async updateDriver(id, updateData) {
        const values = { ...updateData };
        if (updateData.licenseExpiration !== void 0) {
          if (updateData.licenseExpiration && updateData.licenseExpiration.trim() !== "") {
            values.licenseExpiration = new Date(updateData.licenseExpiration);
          } else {
            values.licenseExpiration = null;
          }
        }
        if (updateData.medicalCardExpiration !== void 0) {
          if (updateData.medicalCardExpiration && updateData.medicalCardExpiration.trim() !== "") {
            values.medicalCardExpiration = new Date(updateData.medicalCardExpiration);
          } else {
            values.medicalCardExpiration = null;
          }
        }
        if (updateData.medicalCardIssuedDate !== void 0) {
          if (updateData.medicalCardIssuedDate && updateData.medicalCardIssuedDate.trim() !== "") {
            values.medicalCardIssuedDate = new Date(updateData.medicalCardIssuedDate);
          } else {
            values.medicalCardIssuedDate = null;
          }
        }
        if (updateData.dateHired !== void 0) {
          if (updateData.dateHired && updateData.dateHired.trim() !== "") {
            values.dateHired = new Date(updateData.dateHired);
          } else {
            values.dateHired = null;
          }
        }
        if (updateData.dateTerminated !== void 0) {
          if (updateData.dateTerminated && updateData.dateTerminated.trim() !== "") {
            values.dateTerminated = new Date(updateData.dateTerminated);
          } else {
            values.dateTerminated = null;
          }
        }
        const [driver] = await db.update(drivers).set(values).where(eq(drivers.id, id)).returning();
        return driver || void 0;
      }
      async deleteDriver(id) {
        const result = await db.delete(drivers).where(eq(drivers.id, id)).returning();
        return result.length > 0;
      }
      async getAllCustomers(companyId) {
        if (companyId) {
          return await db.select().from(customers).where(sql2`(${customers}.company_id = ${companyId} OR ${customers}.company_id IS NULL)`);
        }
        return await db.select().from(customers);
      }
      async getCustomer(id) {
        const [customer] = await db.select().from(customers).where(eq(customers.id, id));
        return customer || void 0;
      }
      async createCustomer(insertCustomer, companyId) {
        const [customer] = await db.insert(customers).values(insertCustomer).returning();
        if (companyId) {
          await db.execute(sql2`UPDATE customers SET company_id = ${companyId} WHERE id = ${customer.id}`);
        }
        return customer;
      }
      async updateCustomer(id, updateData) {
        const [customer] = await db.update(customers).set(updateData).where(eq(customers.id, id)).returning();
        return customer || void 0;
      }
      async deleteCustomer(id) {
        const result = await db.delete(customers).where(eq(customers.id, id)).returning();
        return result.length > 0;
      }
      async createDocument(insertDocument) {
        const [document] = await db.insert(documents).values(insertDocument).returning();
        return document;
      }
      async getDocumentsByLoad(loadId) {
        return await db.select().from(documents).where(eq(documents.loadId, loadId));
      }
      // Expenses
      async getAllExpenses() {
        return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
      }
      async getExpense(id) {
        const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
        return expense || void 0;
      }
      async getExpensesByLoad(loadId) {
        return await db.select().from(expenses).where(eq(expenses.loadId, loadId));
      }
      async createExpense(insertExpense) {
        const [expense] = await db.insert(expenses).values({
          ...insertExpense,
          expenseDate: new Date(insertExpense.expenseDate)
        }).returning();
        return expense;
      }
      async updateExpense(id, updateData) {
        const values = { ...updateData };
        if (updateData.expenseDate) {
          values.expenseDate = new Date(updateData.expenseDate);
        }
        const [expense] = await db.update(expenses).set(values).where(eq(expenses.id, id)).returning();
        return expense || void 0;
      }
      async deleteExpense(id) {
        const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
        return result.length > 0;
      }
      // Invoices
      async getAllInvoices(companyId) {
        if (companyId) {
          return await db.select().from(invoices).where(sql2`(${invoices}.company_id = ${companyId} OR ${invoices}.company_id IS NULL)`).orderBy(desc(invoices.invoiceDate));
        }
        return await db.select().from(invoices).orderBy(desc(invoices.invoiceDate));
      }
      async getInvoice(id) {
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
        return invoice || void 0;
      }
      async createInvoice(insertInvoice, companyId) {
        const [invoice] = await db.insert(invoices).values({
          ...insertInvoice,
          invoiceDate: new Date(insertInvoice.invoiceDate),
          dueDate: new Date(insertInvoice.dueDate)
        }).returning();
        if (companyId) {
          await db.execute(sql2`UPDATE invoices SET company_id = ${companyId} WHERE id = ${invoice.id}`);
        }
        return invoice;
      }
      async updateInvoice(id, updateData) {
        const values = { ...updateData };
        if (updateData.invoiceDate) {
          values.invoiceDate = new Date(updateData.invoiceDate);
        }
        if (updateData.dueDate) {
          values.dueDate = new Date(updateData.dueDate);
        }
        const existingInvoice = await this.getInvoice(id);
        if (existingInvoice) {
          if (values.attachments === void 0) {
            values.attachments = existingInvoice.attachments;
          }
        }
        const [invoice] = await db.update(invoices).set(values).where(eq(invoices.id, id)).returning();
        return invoice || void 0;
      }
      async deleteInvoice(id) {
        const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
        return result.length > 0;
      }
      // Payments
      async getAllPayments() {
        return await db.select().from(payments).orderBy(desc(payments.paymentDate));
      }
      async getPayment(id) {
        const [payment] = await db.select().from(payments).where(eq(payments.id, id));
        return payment || void 0;
      }
      async getPaymentsByInvoice(invoiceId) {
        return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
      }
      async createPayment(insertPayment) {
        const [payment] = await db.insert(payments).values({
          ...insertPayment,
          paymentDate: new Date(insertPayment.paymentDate)
        }).returning();
        return payment;
      }
      async updatePayment(id, updateData) {
        const values = { ...updateData };
        if (updateData.paymentDate) {
          values.paymentDate = new Date(updateData.paymentDate);
        }
        const [payment] = await db.update(payments).set(values).where(eq(payments.id, id)).returning();
        return payment || void 0;
      }
      async deletePayment(id) {
        const result = await db.delete(payments).where(eq(payments.id, id)).returning();
        return result.length > 0;
      }
      // Inspections
      async getAllInspections() {
        const results = await db.select({
          id: inspections.id,
          truckId: inspections.truckId,
          driverId: inspections.driverId,
          inspectionType: inspections.inspectionType,
          inspectionDate: inspections.inspectionDate,
          status: inspections.status,
          defects: inspections.defects,
          notes: inspections.notes,
          performedBy: inspections.performedBy,
          createdAt: inspections.createdAt,
          // Set attachment fields to null in list view for performance
          attachments: sql2`null`.as("attachments")
        }).from(inspections).orderBy(desc(inspections.inspectionDate));
        return results;
      }
      async getInspection(id) {
        const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
        return inspection || void 0;
      }
      async getInspectionsByTruck(truckId) {
        return await db.select().from(inspections).where(eq(inspections.truckId, truckId));
      }
      async getInspectionsByDriver(driverId) {
        return await db.select().from(inspections).where(eq(inspections.driverId, driverId));
      }
      async createInspection(insertInspection) {
        const [inspection] = await db.insert(inspections).values({
          ...insertInspection,
          inspectionDate: new Date(insertInspection.inspectionDate)
        }).returning();
        return inspection;
      }
      async updateInspection(id, updateData) {
        const values = { ...updateData };
        if (updateData.inspectionDate) {
          values.inspectionDate = new Date(updateData.inspectionDate);
        }
        const existingInspection = await this.getInspection(id);
        if (existingInspection) {
          if (values.attachments === void 0) {
            values.attachments = existingInspection.attachments;
          }
        }
        const [inspection] = await db.update(inspections).set(values).where(eq(inspections.id, id)).returning();
        return inspection || void 0;
      }
      async deleteInspection(id) {
        const result = await db.delete(inspections).where(eq(inspections.id, id)).returning();
        return result.length > 0;
      }
      // Accidents
      async getAllAccidents() {
        const results = await db.select({
          id: accidents.id,
          driverId: accidents.driverId,
          truckId: accidents.truckId,
          loadId: accidents.loadId,
          accidentDate: accidents.accidentDate,
          location: accidents.location,
          severity: accidents.severity,
          description: accidents.description,
          injuriesReported: accidents.injuriesReported,
          policeReportNumber: accidents.policeReportNumber,
          insuranceClaimNumber: accidents.insuranceClaimNumber,
          estimatedCost: accidents.estimatedCost,
          status: accidents.status,
          createdAt: accidents.createdAt,
          // Set attachment fields to null in list view for performance
          attachments: sql2`null`.as("attachments")
        }).from(accidents).orderBy(desc(accidents.accidentDate));
        return results;
      }
      async getAccident(id) {
        const [accident] = await db.select().from(accidents).where(eq(accidents.id, id));
        return accident || void 0;
      }
      async getAccidentsByDriver(driverId) {
        return await db.select().from(accidents).where(eq(accidents.driverId, driverId));
      }
      async createAccident(insertAccident) {
        const [accident] = await db.insert(accidents).values({
          ...insertAccident,
          accidentDate: new Date(insertAccident.accidentDate),
          estimatedCost: insertAccident.estimatedCost && insertAccident.estimatedCost !== "" ? insertAccident.estimatedCost : null,
          truckId: insertAccident.truckId || null,
          loadId: insertAccident.loadId || null,
          policeReportNumber: insertAccident.policeReportNumber || null,
          insuranceClaimNumber: insertAccident.insuranceClaimNumber || null,
          injuriesReported: insertAccident.injuriesReported ?? 0
        }).returning();
        return accident;
      }
      async updateAccident(id, updateData) {
        const values = { ...updateData };
        if (updateData.accidentDate) {
          values.accidentDate = new Date(updateData.accidentDate);
        }
        if ("estimatedCost" in values) values.estimatedCost = values.estimatedCost && values.estimatedCost !== "" ? values.estimatedCost : null;
        if ("truckId" in values) values.truckId = values.truckId || null;
        if ("loadId" in values) values.loadId = values.loadId || null;
        if ("policeReportNumber" in values) values.policeReportNumber = values.policeReportNumber || null;
        if ("insuranceClaimNumber" in values) values.insuranceClaimNumber = values.insuranceClaimNumber || null;
        const existingAccident = await this.getAccident(id);
        if (existingAccident) {
          if (values.attachments === void 0) {
            values.attachments = existingAccident.attachments;
          }
        }
        const [accident] = await db.update(accidents).set(values).where(eq(accidents.id, id)).returning();
        return accident || void 0;
      }
      async deleteAccident(id) {
        const result = await db.delete(accidents).where(eq(accidents.id, id)).returning();
        return result.length > 0;
      }
      // Violations
      async getAllViolations() {
        const results = await db.select({
          id: violations.id,
          driverId: violations.driverId,
          truckId: violations.truckId,
          violationType: violations.violationType,
          violationDate: violations.violationDate,
          location: violations.location,
          description: violations.description,
          citationNumber: violations.citationNumber,
          fineAmount: violations.fineAmount,
          points: violations.points,
          status: violations.status,
          dueDate: violations.dueDate,
          createdAt: violations.createdAt,
          // Set attachment fields to null in list view for performance
          attachments: sql2`null`.as("attachments")
        }).from(violations).orderBy(desc(violations.violationDate));
        return results;
      }
      async getViolation(id) {
        const [violation] = await db.select().from(violations).where(eq(violations.id, id));
        return violation || void 0;
      }
      async getViolationsByDriver(driverId) {
        return await db.select().from(violations).where(eq(violations.driverId, driverId));
      }
      async createViolation(insertViolation) {
        const [violation] = await db.insert(violations).values({
          ...insertViolation,
          violationDate: new Date(insertViolation.violationDate),
          dueDate: insertViolation.dueDate && insertViolation.dueDate !== "" ? new Date(insertViolation.dueDate) : null,
          fineAmount: insertViolation.fineAmount && insertViolation.fineAmount !== "" ? insertViolation.fineAmount : null,
          points: insertViolation.points ?? null,
          truckId: insertViolation.truckId || null,
          citationNumber: insertViolation.citationNumber || null
        }).returning();
        return violation;
      }
      async updateViolation(id, updateData) {
        const values = { ...updateData };
        if (updateData.violationDate) {
          values.violationDate = new Date(updateData.violationDate);
        }
        if ("dueDate" in values) values.dueDate = values.dueDate && values.dueDate !== "" ? new Date(values.dueDate) : null;
        if ("fineAmount" in values) values.fineAmount = values.fineAmount && values.fineAmount !== "" ? values.fineAmount : null;
        if ("truckId" in values) values.truckId = values.truckId || null;
        if ("citationNumber" in values) values.citationNumber = values.citationNumber || null;
        const existingViolation = await this.getViolation(id);
        if (existingViolation) {
          if (values.attachments === void 0) {
            values.attachments = existingViolation.attachments;
          }
        }
        const [violation] = await db.update(violations).set(values).where(eq(violations.id, id)).returning();
        return violation || void 0;
      }
      async deleteViolation(id) {
        const result = await db.delete(violations).where(eq(violations.id, id)).returning();
        return result.length > 0;
      }
      // Settlements
      async getAllSettlements(companyId) {
        if (companyId) {
          return await db.select().from(settlements).where(sql2`(${settlements}.company_id = ${companyId} OR ${settlements}.company_id IS NULL)`).orderBy(desc(settlements.periodEnd));
        }
        return await db.select().from(settlements).orderBy(desc(settlements.periodEnd));
      }
      async getSettlement(id) {
        const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id));
        return settlement || void 0;
      }
      async getSettlementsByDriver(driverId) {
        return await db.select().from(settlements).where(eq(settlements.driverId, driverId));
      }
      async createSettlement(insertSettlement) {
        const values = {
          ...insertSettlement,
          periodStart: new Date(insertSettlement.periodStart),
          periodEnd: new Date(insertSettlement.periodEnd),
          paidDate: insertSettlement.paidDate ? new Date(insertSettlement.paidDate) : void 0,
          advanceDate: insertSettlement.advanceDate ? new Date(insertSettlement.advanceDate) : void 0
        };
        const [settlement] = await db.insert(settlements).values(values).returning();
        return settlement;
      }
      async updateSettlement(id, updateData) {
        const values = { ...updateData };
        if (updateData.periodStart) {
          values.periodStart = new Date(updateData.periodStart);
        }
        if (updateData.periodEnd) {
          values.periodEnd = new Date(updateData.periodEnd);
        }
        if (updateData.paidDate) {
          values.paidDate = new Date(updateData.paidDate);
        }
        if (updateData.advanceDate) {
          values.advanceDate = new Date(updateData.advanceDate);
        }
        const [settlement] = await db.update(settlements).set(values).where(eq(settlements.id, id)).returning();
        return settlement || void 0;
      }
      async deleteSettlement(id) {
        const result = await db.delete(settlements).where(eq(settlements.id, id)).returning();
        return result.length > 0;
      }
      // Settlement Line Items
      async getSettlementLineItems(settlementId) {
        return await db.select().from(settlementLineItems).where(eq(settlementLineItems.settlementId, settlementId));
      }
      async createSettlementLineItem(lineItem) {
        const [created] = await db.insert(settlementLineItems).values(lineItem).returning();
        return created;
      }
      async updateSettlementLineItem(id, updateData) {
        const [updated] = await db.update(settlementLineItems).set(updateData).where(eq(settlementLineItems.id, id)).returning();
        return updated || void 0;
      }
      async deleteSettlementLineItem(id) {
        const result = await db.delete(settlementLineItems).where(eq(settlementLineItems.id, id)).returning();
        return result.length > 0;
      }
      // Recurring Expenses
      async getAllRecurringExpenses() {
        return await db.select().from(recurringExpenses).orderBy(desc(recurringExpenses.createdAt));
      }
      async getRecurringExpense(id) {
        const [expense] = await db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id));
        return expense || void 0;
      }
      async getRecurringExpensesByDriver(driverId) {
        return await db.select().from(recurringExpenses).where(eq(recurringExpenses.driverId, driverId));
      }
      async getActiveRecurringExpenses(driverId) {
        const now = /* @__PURE__ */ new Date();
        let query = db.select().from(recurringExpenses).where(eq(recurringExpenses.isActive, "true")).$dynamic();
        if (driverId) {
          query = query.where(eq(recurringExpenses.driverId, driverId));
        }
        return await query;
      }
      async createRecurringExpense(insertExpense) {
        const [expense] = await db.insert(recurringExpenses).values({
          ...insertExpense,
          startDate: new Date(insertExpense.startDate),
          endDate: insertExpense.endDate ? new Date(insertExpense.endDate) : void 0
        }).returning();
        return expense;
      }
      async updateRecurringExpense(id, updateData) {
        const values = { ...updateData };
        if (updateData.startDate) {
          values.startDate = new Date(updateData.startDate);
        }
        if (updateData.endDate) {
          values.endDate = new Date(updateData.endDate);
        }
        const [expense] = await db.update(recurringExpenses).set(values).where(eq(recurringExpenses.id, id)).returning();
        return expense || void 0;
      }
      async deleteRecurringExpense(id) {
        const result = await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id)).returning();
        return result.length > 0;
      }
      // Maintenance
      async getAllMaintenance() {
        const results = await db.select({
          id: maintenance.id,
          truckId: maintenance.truckId,
          maintenanceType: maintenance.maintenanceType,
          serviceDate: maintenance.serviceDate,
          mileage: maintenance.mileage,
          cost: maintenance.cost,
          vendor: maintenance.vendor,
          description: maintenance.description,
          nextServiceMileage: maintenance.nextServiceMileage,
          nextServiceDate: maintenance.nextServiceDate,
          status: maintenance.status,
          invoiceNumber: maintenance.invoiceNumber,
          notes: maintenance.notes,
          createdAt: maintenance.createdAt,
          // Set attachment fields to null in list view for performance
          attachments: sql2`null`.as("attachments")
        }).from(maintenance).orderBy(desc(maintenance.serviceDate));
        return results;
      }
      async getMaintenance(id) {
        const [record] = await db.select().from(maintenance).where(eq(maintenance.id, id));
        return record || void 0;
      }
      async getMaintenanceByTruck(truckId) {
        return await db.select().from(maintenance).where(eq(maintenance.truckId, truckId));
      }
      async createMaintenance(insertMaintenance) {
        const [record] = await db.insert(maintenance).values({
          ...insertMaintenance,
          serviceDate: new Date(insertMaintenance.serviceDate),
          nextServiceDate: insertMaintenance.nextServiceDate ? new Date(insertMaintenance.nextServiceDate) : void 0
        }).returning();
        return record;
      }
      async updateMaintenance(id, updateData) {
        const values = { ...updateData };
        if (updateData.serviceDate) {
          values.serviceDate = new Date(updateData.serviceDate);
        }
        if (updateData.nextServiceDate) {
          values.nextServiceDate = new Date(updateData.nextServiceDate);
        }
        const existingMaintenance = await this.getMaintenance(id);
        if (existingMaintenance) {
          if (values.attachments === void 0) {
            values.attachments = existingMaintenance.attachments;
          }
        }
        const [record] = await db.update(maintenance).set(values).where(eq(maintenance.id, id)).returning();
        return record || void 0;
      }
      async deleteMaintenance(id) {
        const result = await db.delete(maintenance).where(eq(maintenance.id, id)).returning();
        return result.length > 0;
      }
      // Fuel Cards
      async getAllFuelCards() {
        return await db.select().from(fuelCards).orderBy(desc(fuelCards.createdAt));
      }
      async getFuelCard(id) {
        const [card] = await db.select().from(fuelCards).where(eq(fuelCards.id, id));
        return card || void 0;
      }
      async createFuelCard(insertFuelCard) {
        const [card] = await db.insert(fuelCards).values(insertFuelCard).returning();
        return card;
      }
      async updateFuelCard(id, updateData) {
        const [card] = await db.update(fuelCards).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(fuelCards.id, id)).returning();
        return card || void 0;
      }
      async deleteFuelCard(id) {
        const result = await db.delete(fuelCards).where(eq(fuelCards.id, id)).returning();
        return result.length > 0;
      }
      // Fuel Transactions
      async getAllFuelTransactions() {
        return await db.select().from(fuelTransactions).orderBy(desc(fuelTransactions.transactionDate));
      }
      async getFuelTransaction(id) {
        const [transaction] = await db.select().from(fuelTransactions).where(eq(fuelTransactions.id, id));
        return transaction || void 0;
      }
      async getFuelTransactionsByTruck(truckId) {
        return await db.select().from(fuelTransactions).where(eq(fuelTransactions.truckId, truckId)).orderBy(desc(fuelTransactions.transactionDate));
      }
      async getFuelTransactionsByDriver(driverId) {
        return await db.select().from(fuelTransactions).where(eq(fuelTransactions.driverId, driverId)).orderBy(desc(fuelTransactions.transactionDate));
      }
      async getFuelTransactionsByLoad(loadId) {
        return await db.select().from(fuelTransactions).where(eq(fuelTransactions.loadId, loadId)).orderBy(desc(fuelTransactions.transactionDate));
      }
      async createFuelTransaction(insertFuelTransaction) {
        const [transaction] = await db.insert(fuelTransactions).values({
          ...insertFuelTransaction,
          transactionDate: new Date(insertFuelTransaction.transactionDate)
        }).returning();
        return transaction;
      }
      async updateFuelTransaction(id, updateData) {
        const values = { ...updateData };
        if (updateData.transactionDate) {
          values.transactionDate = new Date(updateData.transactionDate);
        }
        const [transaction] = await db.update(fuelTransactions).set(values).where(eq(fuelTransactions.id, id)).returning();
        return transaction || void 0;
      }
      async deleteFuelTransaction(id) {
        const result = await db.delete(fuelTransactions).where(eq(fuelTransactions.id, id)).returning();
        return result.length > 0;
      }
      // GPS Locations
      async getAllGpsLocations() {
        return await db.select().from(gpsLocations).orderBy(desc(gpsLocations.timestamp)).limit(1e3);
      }
      async getLatestGpsLocations() {
        const latestLocations = await db.select().from(gpsLocations).orderBy(desc(gpsLocations.timestamp)).limit(100);
        return latestLocations;
      }
      async getGpsLocationsByDriver(driverId, limit = 100) {
        return await db.select().from(gpsLocations).where(eq(gpsLocations.driverId, driverId)).orderBy(desc(gpsLocations.timestamp)).limit(limit);
      }
      async getGpsLocationsByTruck(truckId, limit = 100) {
        return await db.select().from(gpsLocations).where(eq(gpsLocations.truckId, truckId)).orderBy(desc(gpsLocations.timestamp)).limit(limit);
      }
      async getGpsLocationsByLoad(loadId) {
        return await db.select().from(gpsLocations).where(eq(gpsLocations.loadId, loadId)).orderBy(desc(gpsLocations.timestamp));
      }
      async createGpsLocation(insertGpsLocation) {
        const [location] = await db.insert(gpsLocations).values({
          ...insertGpsLocation,
          timestamp: new Date(insertGpsLocation.timestamp)
        }).returning();
        return location;
      }
      // Automation Settings
      async getAllAutomationSettings() {
        return await db.select().from(automationSettings).orderBy(automationSettings.name);
      }
      async getAutomationSetting(name) {
        const [setting] = await db.select().from(automationSettings).where(eq(automationSettings.name, name));
        return setting || void 0;
      }
      async createAutomationSetting(insertSetting) {
        const [setting] = await db.insert(automationSettings).values(insertSetting).returning();
        return setting;
      }
      async updateAutomationSetting(name, updateData) {
        const [setting] = await db.update(automationSettings).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(automationSettings.name, name)).returning();
        return setting || void 0;
      }
      // Notifications
      async getAllNotifications() {
        return await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
      }
      async getUnreadNotifications() {
        return await db.select().from(notifications).where(eq(notifications.isRead, "false")).orderBy(desc(notifications.createdAt));
      }
      async getNotificationsByCategory(category) {
        return await db.select().from(notifications).where(eq(notifications.category, category)).orderBy(desc(notifications.createdAt));
      }
      async createNotification(insertNotification) {
        const [notification] = await db.insert(notifications).values(insertNotification).returning();
        return notification;
      }
      async markNotificationAsRead(id) {
        const [notification] = await db.update(notifications).set({ isRead: "true" }).where(eq(notifications.id, id)).returning();
        return !!notification;
      }
      async deleteNotification(id) {
        const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
        return result.length > 0;
      }
      // Activity Log
      async getAllActivityLogs(limit = 100) {
        return await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
      }
      async getActivityLogsByEntity(entityType, entityId) {
        return await db.select().from(activityLog).where(and(
          eq(activityLog.entityType, entityType),
          eq(activityLog.entityId, entityId)
        )).orderBy(desc(activityLog.createdAt));
      }
      async createActivityLog(insertLog) {
        const [log2] = await db.insert(activityLog).values(insertLog).returning();
        return log2;
      }
      // Short Pays Implementation
      async getAllShortPays() {
        return await db.select().from(shortPays).orderBy(desc(shortPays.createdAt));
      }
      async getShortPay(id) {
        const [shortPay] = await db.select().from(shortPays).where(eq(shortPays.id, id));
        return shortPay || void 0;
      }
      async getShortPaysByCustomer(customerId) {
        return await db.select().from(shortPays).where(eq(shortPays.customerId, customerId)).orderBy(desc(shortPays.createdAt));
      }
      async getShortPaysByStatus(status) {
        return await db.select().from(shortPays).where(eq(shortPays.status, status)).orderBy(desc(shortPays.createdAt));
      }
      async createShortPay(insertShortPay) {
        const [shortPay] = await db.insert(shortPays).values(insertShortPay).returning();
        return shortPay;
      }
      async updateShortPay(id, updateData) {
        const [shortPay] = await db.update(shortPays).set(updateData).where(eq(shortPays.id, id)).returning();
        return shortPay || void 0;
      }
      async deleteShortPay(id) {
        const result = await db.delete(shortPays).where(eq(shortPays.id, id));
        return result.rowCount !== null && result.rowCount > 0;
      }
      // Charge Backs Implementation
      async getAllChargeBacks() {
        return await db.select().from(chargeBacks).orderBy(desc(chargeBacks.createdAt));
      }
      async getChargeBack(id) {
        const [chargeBack] = await db.select().from(chargeBacks).where(eq(chargeBacks.id, id));
        return chargeBack || void 0;
      }
      async getChargeBacksByCustomer(customerId) {
        return await db.select().from(chargeBacks).where(eq(chargeBacks.customerId, customerId)).orderBy(desc(chargeBacks.createdAt));
      }
      async getChargeBacksByStatus(status) {
        return await db.select().from(chargeBacks).where(eq(chargeBacks.status, status)).orderBy(desc(chargeBacks.createdAt));
      }
      async createChargeBack(insertChargeBack) {
        const [chargeBack] = await db.insert(chargeBacks).values({
          ...insertChargeBack,
          submittedDate: new Date(insertChargeBack.submittedDate),
          resolvedDate: insertChargeBack.resolvedDate ? new Date(insertChargeBack.resolvedDate) : void 0
        }).returning();
        return chargeBack;
      }
      async updateChargeBack(id, updateData) {
        const dataToUpdate = { ...updateData };
        if (updateData.submittedDate) {
          dataToUpdate.submittedDate = new Date(updateData.submittedDate);
        }
        if (updateData.resolvedDate) {
          dataToUpdate.resolvedDate = new Date(updateData.resolvedDate);
        }
        const [chargeBack] = await db.update(chargeBacks).set(dataToUpdate).where(eq(chargeBacks.id, id)).returning();
        return chargeBack || void 0;
      }
      async deleteChargeBack(id) {
        const result = await db.delete(chargeBacks).where(eq(chargeBacks.id, id));
        return result.rowCount !== null && result.rowCount > 0;
      }
      // Tasks Implementation
      async getAllTasks() {
        return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
      }
      async getTask(id) {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
        return task || void 0;
      }
      async getTasksByStatus(status) {
        return await db.select().from(tasks).where(eq(tasks.status, status)).orderBy(desc(tasks.dueDate));
      }
      async createTask(insertTask) {
        const [task] = await db.insert(tasks).values({
          ...insertTask,
          dueDate: new Date(insertTask.dueDate),
          completedAt: insertTask.completedAt ? new Date(insertTask.completedAt) : void 0
        }).returning();
        return task;
      }
      async updateTask(id, updateData) {
        const values = { ...updateData };
        if (updateData.dueDate) {
          values.dueDate = new Date(updateData.dueDate);
        }
        if (updateData.completedAt) {
          values.completedAt = new Date(updateData.completedAt);
        }
        const [task] = await db.update(tasks).set(values).where(eq(tasks.id, id)).returning();
        return task || void 0;
      }
      async deleteTask(id) {
        const result = await db.delete(tasks).where(eq(tasks.id, id));
        return result.rowCount !== null && result.rowCount > 0;
      }
      // Company Settings Implementation
      async getCompanySettings() {
        const [settings] = await db.select().from(companySettings).limit(1);
        return settings || void 0;
      }
      async updateCompanySettings(updateData) {
        const existingSettings = await this.getCompanySettings();
        if (existingSettings) {
          const [updated] = await db.update(companySettings).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(companySettings.id, existingSettings.id)).returning();
          return updated || void 0;
        } else {
          const [created] = await db.insert(companySettings).values(updateData).returning();
          return created;
        }
      }
      // Divisions Implementation
      async getAllDivisions() {
        return await db.select().from(divisions).orderBy(desc(divisions.isPrimary), divisions.companyName);
      }
      async getDivision(id) {
        const [division] = await db.select().from(divisions).where(eq(divisions.id, id));
        return division || void 0;
      }
      async createDivision(division) {
        if (division.isPrimary) {
          await db.update(divisions).set({ isPrimary: false });
        }
        const [created] = await db.insert(divisions).values(division).returning();
        return created;
      }
      async updateDivision(id, updateData) {
        if (updateData.isPrimary) {
          await db.update(divisions).set({ isPrimary: false });
        }
        const [updated] = await db.update(divisions).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(divisions.id, id)).returning();
        return updated || void 0;
      }
      async deleteDivision(id) {
        const result = await db.delete(divisions).where(eq(divisions.id, id));
        return result.rowCount !== null && result.rowCount > 0;
      }
      async createDivisionInvitation(invitation) {
        const [created] = await db.insert(divisionInvitations).values(invitation).returning();
        return created;
      }
      async getDivisionInvitationByToken(token) {
        const [invitation] = await db.select().from(divisionInvitations).where(eq(divisionInvitations.token, token));
        return invitation || void 0;
      }
      async updateDivisionInvitation(id, data) {
        const [updated] = await db.update(divisionInvitations).set(data).where(eq(divisionInvitations.id, id)).returning();
        return updated || void 0;
      }
      async getDivisionInvitations(divisionId) {
        return await db.select().from(divisionInvitations).where(eq(divisionInvitations.divisionId, divisionId)).orderBy(desc(divisionInvitations.createdAt));
      }
      async getPendingUsersByDivision(divisionId) {
        return await db.select().from(users).where(and(eq(users.divisionId, divisionId), eq(users.approved, "false")));
      }
      async getAllFeedbacks() {
        return await db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
      }
      async createFeedback(feedback) {
        const [created] = await db.insert(feedbacks).values(feedback).returning();
        return created;
      }
      async deleteFeedback(id) {
        const deleted = await db.delete(feedbacks).where(eq(feedbacks.id, id)).returning();
        return deleted.length > 0;
      }
      async updateFeedbackStatus(id, status) {
        const [updated] = await db.update(feedbacks).set({ status }).where(eq(feedbacks.id, id)).returning();
        return updated || void 0;
      }
      async createSentEmail(data) {
        const [created] = await db.insert(sentEmails).values(data).returning();
        return created;
      }
      async getAllSentEmails() {
        return await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
      }
      async getGmailTokens() {
        const [token] = await db.select().from(gmailTokens).limit(1);
        return token || void 0;
      }
      async saveGmailTokens(tokens) {
        await db.delete(gmailTokens);
        const [created] = await db.insert(gmailTokens).values({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          connectedEmail: tokens.connectedEmail
        }).returning();
        return created;
      }
      async deleteGmailTokens() {
        await db.delete(gmailTokens);
      }
      async createLoadDocument(doc) {
        const [created] = await db.insert(loadDocuments).values(doc).returning();
        return created;
      }
      async getLoadDocuments(filters) {
        const conditions = [];
        if (filters?.loadId) conditions.push(eq(loadDocuments.loadId, filters.loadId));
        if (filters?.status) conditions.push(eq(loadDocuments.status, filters.status));
        const query = db.select().from(loadDocuments);
        if (conditions.length > 0) {
          return await query.where(and(...conditions)).orderBy(desc(loadDocuments.createdAt));
        }
        return await query.orderBy(desc(loadDocuments.createdAt));
      }
      async getLoadDocument(id) {
        const [doc] = await db.select().from(loadDocuments).where(eq(loadDocuments.id, id));
        return doc || void 0;
      }
      async getLoadDocumentByEmailAndFile(emailMessageId, fileName) {
        const [doc] = await db.select().from(loadDocuments).where(
          and(eq(loadDocuments.emailMessageId, emailMessageId), eq(loadDocuments.fileName, fileName))
        );
        return doc || void 0;
      }
      async updateLoadDocument(id, data) {
        const [updated] = await db.update(loadDocuments).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(loadDocuments.id, id)).returning();
        return updated || void 0;
      }
      async deleteLoadDocument(id) {
        const result = await db.delete(loadDocuments).where(eq(loadDocuments.id, id));
        return true;
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/aiExtraction.ts
var aiExtraction_exports = {};
__export(aiExtraction_exports, {
  extractLoadFromDocument: () => extractLoadFromDocument,
  extractPaperworkDocument: () => extractPaperworkDocument
});
import Anthropic from "@anthropic-ai/sdk";
import { z as z2 } from "zod";
async function extractPaperworkDocument(fileData, fileType) {
  const base64Content = fileData.split(",")[1] || fileData;
  let userContent;
  if (fileType === "application/pdf") {
    userContent = [
      { type: "text", text: "Extract driver paperwork details from this transportation document:" },
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Content } }
    ];
  } else {
    const mediaType = fileType;
    userContent = [
      { type: "text", text: "Extract driver paperwork details from this transportation document:" },
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64Content } }
    ];
  }
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: "You are an expert at reading transportation paperwork including PODs (Proof of Delivery), BOLs (Bill of Lading), and delivery receipts. Extract all relevant fields accurately. Return null for missing fields.",
    messages: [{ role: "user", content: userContent }],
    tools: [EXTRACT_PAPERWORK_TOOL],
    tool_choice: { type: "tool", name: "extract_paperwork" }
  });
  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use"
  );
  if (!toolUseBlock) throw new Error("No structured response from AI");
  return extractedPaperworkSchema.parse(toolUseBlock.input);
}
async function extractLoadFromDocument(fileData, fileType) {
  try {
    const isImage = fileType.startsWith("image/");
    if (!fileData.startsWith("data:")) {
      throw new Error("Invalid file format. Please ensure the file is properly encoded.");
    }
    const base64Content = fileData.split(",")[1] || fileData;
    let message;
    let userContent;
    if (fileType === "application/pdf") {
      console.log("[AI Extract] Processing PDF using Anthropic native PDF support");
      userContent = [
        {
          type: "text",
          text: "Extract load information from this PDF document:"
        },
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Content
          }
        }
      ];
    } else if (isImage) {
      const mediaType = fileType;
      console.log(`[AI Extract] Processing image (${fileType})`);
      userContent = [
        {
          type: "text",
          text: "Extract load information from this document:"
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64Content
          }
        }
      ];
    } else {
      const textContent = Buffer.from(base64Content, "base64").toString("utf-8");
      console.log("[AI Extract] Processing text file");
      userContent = `Extract load information from this document:

${textContent}`;
    }
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      tools: [EXTRACT_LOAD_TOOL],
      tool_choice: { type: "tool", name: "extract_load" }
    });
    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use"
    );
    if (!toolUseBlock) {
      throw new Error("No structured response from AI");
    }
    return extractedLoadSchema.parse(toolUseBlock.input);
  } catch (error) {
    console.error("[AI Extract] Error:", error?.message);
    if (error?.status === 413 || error?.message?.includes("too large")) {
      throw new Error("Document is too large. Please use a smaller file (under 5MB).");
    }
    if (error?.status === 400 && error?.message?.includes("pdf")) {
      throw new Error("Unable to process this PDF. Please try converting it to PNG/JPG first.");
    }
    const message = error?.message || "Failed to extract load information from document";
    throw new Error(message);
  }
}
var ANTHROPIC_KEY, anthropic, extractedLoadSchema, SYSTEM_PROMPT, EXTRACT_LOAD_TOOL, extractedPaperworkSchema, EXTRACT_PAPERWORK_TOOL;
var init_aiExtraction = __esm({
  "server/aiExtraction.ts"() {
    "use strict";
    ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
    if (!ANTHROPIC_KEY || !/^sk-ant-[A-Za-z0-9_-]+$/.test(ANTHROPIC_KEY)) {
      console.warn(
        `[AI Extract] WARNING: ANTHROPIC_API_KEY is missing or invalid. Value starts with: "${ANTHROPIC_KEY.substring(0, 12)}..." \u2014 check for spaces, ellipsis (\u2026), or truncation.`
      );
    }
    anthropic = new Anthropic({
      apiKey: ANTHROPIC_KEY
    });
    extractedLoadSchema = z2.object({
      loadNumber: z2.string().nullable(),
      pickupLocation: z2.string(),
      pickupDate: z2.string(),
      deliveryLocation: z2.string(),
      deliveryDate: z2.string(),
      rate: z2.string(),
      weight: z2.number().nullable(),
      commodity: z2.string().nullable(),
      notes: z2.string().nullable(),
      brokerName: z2.string().nullable(),
      brokerAddress: z2.string().nullable(),
      brokerPhone: z2.string().nullable(),
      brokerEmail: z2.string().nullable()
    });
    SYSTEM_PROMPT = `You are an expert at extracting load information from transportation documents like rate confirmations, BOLs (Bill of Lading), and load tenders. Extract all relevant load details from the provided document.

Guidelines:
- Extract pickup and delivery locations (city, state)
- Parse dates into YYYY-MM-DD format
- Extract rate/revenue as a numeric value (without $ sign)
- Extract weight in pounds if available
- Extract commodity type
- Extract load number or reference number if present
- Extract broker/freight company name (the company issuing the rate confirmation)
- Extract broker's full address including street, city, state, and ZIP code
- Extract broker's phone number if available
- Extract broker's email address if available
- Include any special instructions or notes
- Return null for any field that is not found - do not return explanatory text`;
    EXTRACT_LOAD_TOOL = {
      name: "extract_load",
      description: "Extract structured load information from a transportation document",
      input_schema: {
        type: "object",
        properties: {
          loadNumber: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Load number or reference number if present"
          },
          pickupLocation: {
            type: "string",
            description: "Pickup location city and state"
          },
          pickupDate: {
            type: "string",
            description: "Pickup date in ISO format YYYY-MM-DD"
          },
          deliveryLocation: {
            type: "string",
            description: "Delivery location city and state"
          },
          deliveryDate: {
            type: "string",
            description: "Delivery date in ISO format YYYY-MM-DD"
          },
          rate: {
            type: "string",
            description: "Rate or revenue amount as a number"
          },
          weight: {
            anyOf: [{ type: "number" }, { type: "null" }],
            description: "Weight in pounds if available"
          },
          commodity: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Type of commodity or freight if mentioned"
          },
          notes: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Any additional notes or special instructions"
          },
          brokerName: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Name of the broker or freight company issuing the rate confirmation"
          },
          brokerAddress: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Full address of the broker including street, city, state, and ZIP. Return null if not found."
          },
          brokerPhone: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Phone number of the broker. Return null if not found."
          },
          brokerEmail: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Email address of the broker. Return null if not found."
          }
        },
        required: [
          "loadNumber",
          "pickupLocation",
          "pickupDate",
          "deliveryLocation",
          "deliveryDate",
          "rate",
          "weight",
          "commodity",
          "notes",
          "brokerName",
          "brokerAddress",
          "brokerPhone",
          "brokerEmail"
        ]
      }
    };
    extractedPaperworkSchema = z2.object({
      documentType: z2.enum(["pod", "bol", "rate_confirmation", "lumper", "other"]),
      extractedLoadNumber: z2.string().nullable(),
      extractedDriverName: z2.string().nullable(),
      extractedTruckNumber: z2.string().nullable(),
      extractedPickupDate: z2.string().nullable(),
      extractedDeliveryDate: z2.string().nullable(),
      extractedPickupLocation: z2.string().nullable(),
      extractedDeliveryLocation: z2.string().nullable(),
      extractedShipper: z2.string().nullable(),
      extractedReceiver: z2.string().nullable(),
      isSigned: z2.boolean().nullable(),
      pageCount: z2.number().nullable(),
      confidenceScore: z2.number()
    });
    EXTRACT_PAPERWORK_TOOL = {
      name: "extract_paperwork",
      description: "Extract structured information from driver paperwork documents like POD, BOL, delivery receipts",
      input_schema: {
        type: "object",
        properties: {
          documentType: {
            type: "string",
            enum: ["pod", "bol", "rate_confirmation", "lumper", "other"],
            description: "Type of document: pod=Proof of Delivery, bol=Bill of Lading, rate_confirmation, lumper receipt, or other"
          },
          extractedLoadNumber: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Load number, reference number, or shipment ID visible on the document"
          },
          extractedDriverName: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Driver name if visible"
          },
          extractedTruckNumber: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Truck number or unit number if visible"
          },
          extractedPickupDate: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Pickup date in YYYY-MM-DD format"
          },
          extractedDeliveryDate: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Delivery date in YYYY-MM-DD format"
          },
          extractedPickupLocation: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Pickup city and state"
          },
          extractedDeliveryLocation: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Delivery city and state"
          },
          extractedShipper: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Shipper company name"
          },
          extractedReceiver: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Receiver/consignee company name"
          },
          isSigned: {
            anyOf: [{ type: "boolean" }, { type: "null" }],
            description: "Whether the document appears to have a signature"
          },
          pageCount: {
            anyOf: [{ type: "number" }, { type: "null" }],
            description: "Number of pages in the document if determinable"
          },
          confidenceScore: {
            type: "number",
            description: "Confidence score 0.0 to 1.0 that this is a valid transportation paperwork document"
          }
        },
        required: [
          "documentType",
          "extractedLoadNumber",
          "extractedDriverName",
          "extractedTruckNumber",
          "extractedPickupDate",
          "extractedDeliveryDate",
          "extractedPickupLocation",
          "extractedDeliveryLocation",
          "extractedShipper",
          "extractedReceiver",
          "isSigned",
          "pageCount",
          "confidenceScore"
        ]
      }
    };
  }
});

// server/s3.ts
var s3_exports = {};
__export(s3_exports, {
  uploadBufferPaperworkToS3: () => uploadBufferPaperworkToS3,
  uploadPaperworkToS3: () => uploadPaperworkToS3,
  uploadPdfToS3: () => uploadPdfToS3
});
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
async function uploadBufferToS3(buffer, key, mimeType) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    })
  );
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
async function uploadPdfToS3(base64Data, fileName, mimeType = "application/pdf") {
  const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const buffer = Buffer.from(base64, "base64");
  const key = `ratecons/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  return uploadBufferToS3(buffer, key, mimeType);
}
async function uploadPaperworkToS3(base64Data, fileName, mimeType) {
  const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const buffer = Buffer.from(base64, "base64");
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `paperwork/${Date.now()}-${safe}`;
  return uploadBufferToS3(buffer, key, mimeType);
}
async function uploadBufferPaperworkToS3(buffer, fileName, mimeType) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `paperwork/${Date.now()}-${safe}`;
  return uploadBufferToS3(buffer, key, mimeType);
}
var s3Client, BUCKET, REGION;
var init_s3 = __esm({
  "server/s3.ts"() {
    "use strict";
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
      }
    });
    BUCKET = process.env.AWS_S3_BUCKET || "readytms-documents";
    REGION = process.env.AWS_REGION || "us-east-1";
  }
});

// server/notifications.ts
var notifications_exports = {};
__export(notifications_exports, {
  checkAndSendMaintenanceReminders: () => checkAndSendMaintenanceReminders,
  sendEmail: () => sendEmail,
  sendGPSEnabledNotification: () => sendGPSEnabledNotification,
  sendGPSReminderNotification: () => sendGPSReminderNotification,
  sendMaintenanceReminderNotification: () => sendMaintenanceReminderNotification,
  sendSMS: () => sendSMS
});
import { Resend as Resend2 } from "resend";
import { SDK } from "@ringcentral/sdk";
async function initializeRingCentral() {
  if (rcReady) return true;
  const {
    RC_SERVER_URL,
    RC_APP_CLIENT_ID,
    RC_APP_CLIENT_SECRET,
    RC_USER_JWT
  } = process.env;
  if (!RC_SERVER_URL || !RC_APP_CLIENT_ID || !RC_APP_CLIENT_SECRET || !RC_USER_JWT) {
    console.log("[Notifications] RingCentral credentials not configured - SMS notifications disabled");
    return false;
  }
  try {
    rcSDK = new SDK({
      server: RC_SERVER_URL,
      clientId: RC_APP_CLIENT_ID,
      clientSecret: RC_APP_CLIENT_SECRET
    });
    rcPlatform = rcSDK.platform();
    await rcPlatform.login({ jwt: RC_USER_JWT });
    rcReady = true;
    console.log("[Notifications] RingCentral initialized successfully - SMS enabled");
    return true;
  } catch (error) {
    console.error("[Notifications] Failed to initialize RingCentral:", error);
    return false;
  }
}
async function sendEmail(options) {
  if (!resend2) {
    const msg = "Resend not configured \u2014 RESEND_API_KEY missing";
    console.error("[Notifications]", msg);
    return { success: false, error: msg };
  }
  try {
    const verifiedSender = "Ready TMS <noreply@readytms.com>";
    const emailPayload = {
      from: verifiedSender,
      to: options.to,
      subject: options.subject,
      html: options.html
    };
    if (options.from && !options.from.includes("noreply@readytms.com")) {
      emailPayload.replyTo = options.from;
    }
    if (options.cc) {
      const ccList = Array.isArray(options.cc) ? options.cc : [options.cc];
      const filtered = ccList.filter(Boolean);
      if (filtered.length > 0) emailPayload.cc = filtered;
    }
    if (options.attachments && options.attachments.length > 0) {
      emailPayload.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: att.content
      }));
    }
    console.log("[Notifications] Sending email to:", emailPayload.to, "replyTo:", emailPayload.replyTo || "none");
    const { data, error } = await resend2.emails.send(emailPayload);
    if (error) {
      const msg = JSON.stringify(error);
      console.error("[Notifications] Resend error:", msg);
      return { success: false, error: msg };
    }
    console.log("[Notifications] Email sent successfully. ID:", data?.id);
    return { success: true };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[Notifications] Email send exception:", msg);
    return { success: false, error: msg };
  }
}
async function sendSMS(options) {
  if (!rcReady) {
    const initialized = await initializeRingCentral();
    if (!initialized) {
      console.log("[Notifications] SMS not sent - RingCentral not configured");
      return false;
    }
  }
  const { RC_PHONE_NUMBER } = process.env;
  if (!RC_PHONE_NUMBER) {
    console.error("[Notifications] RC_PHONE_NUMBER not configured");
    return false;
  }
  const normalizePhone = (num) => {
    const digits = num.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  };
  const fromNumber = normalizePhone(RC_PHONE_NUMBER);
  const toNumber = normalizePhone(options.to);
  try {
    const response = await rcPlatform.post("/restapi/v1.0/account/~/extension/~/sms", {
      from: { phoneNumber: fromNumber },
      to: [{ phoneNumber: toNumber }],
      text: options.message
    });
    const data = await response.json();
    console.log("[Notifications] SMS sent successfully:", data.id);
    return true;
  } catch (error) {
    console.error("[Notifications] SMS send error:", error);
    return false;
  }
}
async function sendGPSEnabledNotification(driver) {
  const driverPortalUrl = process.env.VITE_APP_URL || "https://readytms.com";
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .steps { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .step { margin: 15px 0; padding-left: 30px; position: relative; }
        .step::before { content: "\u2192"; position: absolute; left: 0; color: #2563eb; font-weight: bold; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GPS Tracking Enabled</h1>
        </div>
        <div class="content">
          <p>Hi ${driver.name},</p>
          
          <p><strong>GPS tracking has been enabled for your account.</strong></p>
          
          <p>Please start sharing your location so dispatch can track your assignments:</p>
          
          <div class="steps">
            <div class="step">Visit the Driver Portal</div>
            <div class="step">Log in with your credentials</div>
            <div class="step">Toggle "On Duty" to start GPS tracking</div>
            <div class="step">Keep the page open while driving</div>
          </div>
          
          <div style="text-align: center;">
            <a href="${driverPortalUrl}/driver-portal" class="button">Open Driver Portal</a>
          </div>
          
          <p><small>Your location will be shared every 3 minutes while you're on duty. You can toggle off duty to stop sharing.</small></p>
          
          <div class="footer">
            <p>Ready TMS - Transportation Management System</p>
            <p>If you have questions, contact dispatch</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  const { success: emailSent } = await sendEmail({
    to: driver.email,
    subject: "GPS Tracking Enabled - Ready TMS",
    html: emailHtml
  });
  const smsMessage = `Ready TMS: GPS tracking enabled for your account. Please visit ${driverPortalUrl}/driver-portal and toggle "On Duty" to start sharing your location.`;
  const smsSent = await sendSMS({
    to: driver.phone,
    message: smsMessage
  });
  console.log(`[Notifications] GPS enabled notification sent to ${driver.name} - Email: ${emailSent}, SMS: ${smsSent}`);
}
async function sendGPSReminderNotification(driver) {
  const driverPortalUrl = process.env.VITE_APP_URL || "https://readytms.com";
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>\u26A0\uFE0F GPS Location Reminder</h1>
        </div>
        <div class="content">
          <p>Hi ${driver.name},</p>
          
          <div class="alert">
            <strong>We haven't received your GPS location in the last 24 hours.</strong>
          </div>
          
          <p>Please share your location if you're currently on duty:</p>
          
          <div style="text-align: center;">
            <a href="${driverPortalUrl}/driver-portal" class="button">Share Location Now</a>
          </div>
          
          <p><strong>How to share your location:</strong></p>
          <ol>
            <li>Open the Driver Portal</li>
            <li>Toggle "On Duty"</li>
            <li>Keep the page open</li>
          </ol>
          
          <p><small>If you're off duty or on vacation, you can ignore this reminder.</small></p>
          
          <div class="footer">
            <p>Ready TMS - Transportation Management System</p>
            <p>This is an automated reminder</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  const { success: emailSent } = await sendEmail({
    to: driver.email,
    subject: "GPS Location Reminder - Ready TMS",
    html: emailHtml
  });
  const smsMessage = `Ready TMS Reminder: We haven't received your GPS location in 24 hours. Please visit ${driverPortalUrl}/driver-portal and toggle "On Duty" to share your location.`;
  const smsSent = await sendSMS({
    to: driver.phone,
    message: smsMessage
  });
  console.log(`[Notifications] GPS reminder sent to ${driver.name} - Email: ${emailSent}, SMS: ${smsSent}`);
}
async function sendMaintenanceReminderNotification(driver, truck, maintenance2) {
  const daysUntilDue = maintenance2.nextServiceDate ? Math.ceil((new Date(maintenance2.nextServiceDate).getTime() - Date.now()) / (1e3 * 60 * 60 * 24)) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const status = isOverdue ? "OVERDUE" : daysUntilDue === 0 ? "DUE TODAY" : `Due in ${daysUntilDue} days`;
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${isOverdue ? "#dc2626" : "#f59e0b"}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert-box { background: ${isOverdue ? "#fee2e2" : "#fef3c7"}; border-left: 4px solid ${isOverdue ? "#dc2626" : "#f59e0b"}; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isOverdue ? "\u26A0\uFE0F MAINTENANCE OVERDUE" : "\u{1F527} Maintenance Reminder"}</h1>
        </div>
        <div class="content">
          <p>Hi ${driver.name},</p>
          
          <div class="alert-box">
            <h3 style="margin-top:0;">${status}</h3>
            <p style="margin-bottom:0;"><strong>${maintenance2.maintenanceType}</strong> is ${isOverdue ? "overdue" : "due soon"} for Truck ${truck.truckNumber}</p>
          </div>

          <div class="details">
            <h3 style="margin-top:0;">Maintenance Details</h3>
            <div class="detail-row">
              <span class="detail-label">Truck:</span>
              <span class="detail-value">${truck.truckNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Service Type:</span>
              <span class="detail-value">${maintenance2.maintenanceType}</span>
            </div>
            ${maintenance2.nextServiceDate ? `
            <div class="detail-row">
              <span class="detail-label">Due Date:</span>
              <span class="detail-value">${new Date(maintenance2.nextServiceDate).toLocaleDateString()}</span>
            </div>
            ` : ""}
            ${maintenance2.nextServiceMileage ? `
            <div class="detail-row">
              <span class="detail-label">Due at Mileage:</span>
              <span class="detail-value">${maintenance2.nextServiceMileage.toLocaleString()} miles</span>
            </div>
            ` : ""}
            ${maintenance2.description ? `
            <div class="detail-row">
              <span class="detail-label">Notes:</span>
              <span class="detail-value">${maintenance2.description}</span>
            </div>
            ` : ""}
          </div>
          
          <p><strong>Action Required:</strong> Please ${isOverdue ? "schedule this service immediately" : "plan to schedule this service"} to keep the truck in optimal condition and comply with DOT regulations.</p>
          
          <p>Contact dispatch or the maintenance department to schedule this service.</p>
          
          <div class="footer">
            <p>Ready TMS - Transportation Management System</p>
            <p>If you have questions, contact dispatch</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  const { success: emailSent } = await sendEmail({
    to: driver.email,
    subject: `${isOverdue ? "\u26A0\uFE0F OVERDUE" : "\u{1F527}"} Maintenance ${status} - Truck ${truck.truckNumber}`,
    html: emailHtml
  });
  const smsMessage = `Ready TMS: ${isOverdue ? "OVERDUE" : "Reminder"} - ${maintenance2.maintenanceType} ${status.toLowerCase()} for Truck ${truck.truckNumber}. ${maintenance2.nextServiceDate ? `Due: ${new Date(maintenance2.nextServiceDate).toLocaleDateString()}` : ""}. Contact dispatch to schedule.`;
  const smsSent = await sendSMS({
    to: driver.phone,
    message: smsMessage
  });
  console.log(`[Notifications] Maintenance reminder sent to ${driver.name} for Truck ${truck.truckNumber} - Email: ${emailSent}, SMS: ${smsSent}`);
}
async function checkAndSendMaintenanceReminders(getAllMaintenance, getAllTrucks, getAllDrivers) {
  console.log("[Notifications] Checking maintenance reminders...");
  const maintenanceRecords = await getAllMaintenance();
  const trucks2 = await getAllTrucks();
  const drivers2 = await getAllDrivers();
  let sent = 0;
  let skipped = 0;
  for (const maintenance2 of maintenanceRecords) {
    if (maintenance2.status !== "Completed" && maintenance2.nextServiceDate) {
      const daysUntilDue = Math.ceil(
        (new Date(maintenance2.nextServiceDate).getTime() - Date.now()) / (1e3 * 60 * 60 * 24)
      );
      if (daysUntilDue <= 7) {
        const truck = trucks2.find((t) => t.id === maintenance2.truckId);
        if (!truck) {
          console.log(`[Notifications] Truck not found for maintenance ${maintenance2.id}`);
          skipped++;
          continue;
        }
        const driver = drivers2.find((d) => d.assignedTruckId === truck.id);
        if (!driver || !driver.email) {
          console.log(`[Notifications] No driver or email found for truck ${truck.truckNumber}`);
          skipped++;
          continue;
        }
        try {
          await sendMaintenanceReminderNotification(driver, truck, maintenance2);
          sent++;
        } catch (error) {
          console.error(`[Notifications] Failed to send maintenance reminder:`, error);
          skipped++;
        }
      }
    }
  }
  console.log(`[Notifications] Maintenance reminders complete - Sent: ${sent}, Skipped: ${skipped}`);
  return { sent, skipped };
}
var resend2, rcSDK, rcPlatform, rcReady;
var init_notifications = __esm({
  "server/notifications.ts"() {
    "use strict";
    resend2 = process.env.RESEND_API_KEY ? new Resend2(process.env.RESEND_API_KEY) : null;
    rcSDK = null;
    rcPlatform = null;
    rcReady = false;
    initializeRingCentral().catch(console.error);
  }
});

// server/automation.ts
var automation_exports = {};
__export(automation_exports, {
  autoGenerateInvoice: () => autoGenerateInvoice,
  checkAndSendMissingPODReminders: () => checkAndSendMissingPODReminders,
  checkExpiringDocuments: () => checkExpiringDocuments,
  initializeAutomationSettings: () => initializeAutomationSettings,
  notifyLoadStatusChange: () => notifyLoadStatusChange,
  sendDailyTaskReminders: () => sendDailyTaskReminders,
  sendSingleTaskReminder: () => sendSingleTaskReminder
});
import { differenceInDays, format } from "date-fns";
async function autoGenerateInvoice(load) {
  try {
    const setting = await storage.getAutomationSetting("auto_invoice_on_delivery");
    if (setting && setting.enabled === "false") {
      return null;
    }
    const existingInvoices = await storage.getAllInvoices();
    const invoiceExists = existingInvoices.some((inv) => inv.loadId === load.id);
    if (invoiceExists) {
      console.log(`Invoice already exists for load ${load.loadNumber}`);
      return null;
    }
    const today = /* @__PURE__ */ new Date();
    const invoiceNumber = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 1e4)).padStart(4, "0")}`;
    const subtotal = parseFloat(load.rate.toString());
    const tax = subtotal * 0;
    const total = subtotal + tax;
    const invoice = await storage.createInvoice({
      invoiceNumber,
      loadId: load.id,
      customerId: load.customerId,
      status: "Pending",
      invoiceDate: (/* @__PURE__ */ new Date()).toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
      // 30 days from now
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      paidAmount: "0.00",
      notes: `Auto-generated invoice for load ${load.loadNumber}`
    });
    await storage.createNotification({
      type: "success",
      category: "invoice_created",
      title: "Invoice Auto-Generated",
      message: `Invoice ${invoiceNumber} has been automatically created for load ${load.loadNumber}`,
      relatedEntityType: "invoice",
      relatedEntityId: invoice.id,
      isRead: "false"
    });
    await storage.createActivityLog({
      action: "invoice_created",
      entityType: "invoice",
      entityId: invoice.id,
      details: `Auto-generated invoice ${invoiceNumber} for load ${load.loadNumber} (Total: $${total.toFixed(2)})`,
      metadata: { loadId: load.id, invoiceId: invoice.id, amount: total },
      status: "success"
    });
    console.log(`Auto-generated invoice ${invoiceNumber} for load ${load.loadNumber}`);
    return invoice;
  } catch (error) {
    console.error("Error auto-generating invoice:", error);
    await storage.createActivityLog({
      action: "invoice_creation_failed",
      entityType: "load",
      entityId: load.id,
      details: `Failed to auto-generate invoice for load ${load.loadNumber}: ${error.message}`,
      status: "failed"
    });
    return null;
  }
}
async function checkExpiringDocuments() {
  try {
    const setting = await storage.getAutomationSetting("alert_expiring_documents");
    if (setting && setting.enabled === "false") {
      return;
    }
    const drivers2 = await storage.getAllDrivers();
    const today = /* @__PURE__ */ new Date();
    const warningDays = 30;
    for (const driver of drivers2) {
      if (driver.licenseExpiration) {
        const daysUntilExpiration = differenceInDays(new Date(driver.licenseExpiration), today);
        if (daysUntilExpiration <= 0) {
          await storage.createNotification({
            type: "alert",
            category: "license_expiry",
            title: "CDL License Expired",
            message: `Driver ${driver.name}'s CDL license has expired`,
            relatedEntityType: "driver",
            relatedEntityId: driver.id,
            recipientEmail: driver.email,
            isRead: "false"
          });
          await storage.createActivityLog({
            action: "alert_triggered",
            entityType: "driver",
            entityId: driver.id,
            details: `CDL license expired for driver ${driver.name}`,
            status: "success"
          });
          if (driver.phone) {
            await sendSMS({
              to: driver.phone,
              message: `Ready TMS ALERT: Your CDL license has EXPIRED. Please renew immediately and contact dispatch. - Ready TMS`
            });
          }
        } else if (daysUntilExpiration > 0 && daysUntilExpiration <= warningDays) {
          await storage.createNotification({
            type: "warning",
            category: "license_expiry",
            title: "CDL License Expiring Soon",
            message: `Driver ${driver.name}'s CDL license expires in ${daysUntilExpiration} days`,
            relatedEntityType: "driver",
            relatedEntityId: driver.id,
            recipientEmail: driver.email,
            isRead: "false"
          });
          if (driver.phone) {
            await sendSMS({
              to: driver.phone,
              message: `Ready TMS Reminder: Your CDL license expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}. Please renew soon and contact dispatch. - Ready TMS`
            });
          }
        }
      }
      if (driver.medicalCardExpiration) {
        const daysUntilExpiration = differenceInDays(new Date(driver.medicalCardExpiration), today);
        if (daysUntilExpiration <= 0) {
          await storage.createNotification({
            type: "alert",
            category: "medical_card_expiry",
            title: "Medical Card Expired",
            message: `Driver ${driver.name}'s medical card has expired`,
            relatedEntityType: "driver",
            relatedEntityId: driver.id,
            recipientEmail: driver.email,
            isRead: "false"
          });
          await storage.createActivityLog({
            action: "alert_triggered",
            entityType: "driver",
            entityId: driver.id,
            details: `Medical card expired for driver ${driver.name}`,
            status: "success"
          });
          if (driver.phone) {
            await sendSMS({
              to: driver.phone,
              message: `Ready TMS ALERT: Your medical card has EXPIRED. You cannot legally drive until it is renewed. Contact dispatch immediately. - Ready TMS`
            });
          }
        } else if (daysUntilExpiration > 0 && daysUntilExpiration <= warningDays) {
          await storage.createNotification({
            type: "warning",
            category: "medical_card_expiry",
            title: "Medical Card Expiring Soon",
            message: `Driver ${driver.name}'s medical card expires in ${daysUntilExpiration} days`,
            relatedEntityType: "driver",
            relatedEntityId: driver.id,
            recipientEmail: driver.email,
            isRead: "false"
          });
          if (driver.phone) {
            await sendSMS({
              to: driver.phone,
              message: `Ready TMS Reminder: Your medical card expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}. Please schedule your DOT physical soon. - Ready TMS`
            });
          }
        }
      }
    }
    console.log("Checked expiring documents for all drivers");
  } catch (error) {
    console.error("Error checking expiring documents:", error);
  }
}
async function notifyLoadStatusChange(load, oldStatus, newStatus) {
  try {
    const setting = await storage.getAutomationSetting("notify_load_status_change");
    if (setting && setting.enabled === "false") {
      return;
    }
    let type = "info";
    let message = `Load ${load.loadNumber} status changed from ${oldStatus} to ${newStatus}`;
    if (newStatus === "delivered") {
      type = "success";
      message = `Load ${load.loadNumber} has been delivered`;
    } else if (newStatus === "cancelled") {
      type = "warning";
      message = `Load ${load.loadNumber} has been cancelled`;
    }
    await storage.createNotification({
      type,
      category: "load_status_change",
      title: "Load Status Updated",
      message,
      relatedEntityType: "load",
      relatedEntityId: load.id,
      isRead: "false"
    });
    await storage.createActivityLog({
      action: "load_status_changed",
      entityType: "load",
      entityId: load.id,
      details: `Load ${load.loadNumber} status changed: ${oldStatus} \u2192 ${newStatus}`,
      metadata: { oldStatus, newStatus },
      status: "success"
    });
  } catch (error) {
    console.error("Error notifying load status change:", error);
  }
}
function parseEmails(raw) {
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}
async function sendSingleTaskReminder(task) {
  try {
    const today = /* @__PURE__ */ new Date();
    const due = task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "\u2014";
    const priority = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    const category = task.category ? ` [${task.category}]` : "";
    const html = `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#1d4ed8;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Task Reminder</h1>
          <p style="color:#bfdbfe;margin:4px 0 0;">${format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
          <p style="color:#374151;margin:0 0 16px;">You have a recurring daily task reminder:</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;">
            <h2 style="margin:0 0 8px;font-size:16px;color:#111827;">${task.title}${category}</h2>
            <p style="margin:0;color:#6b7280;font-size:14px;">
              <strong>Due:</strong> ${due}${task.dueTime ? " at " + task.dueTime : ""} &nbsp;&bull;&nbsp;
              <strong>Priority:</strong> ${priority}${task.assignedTo ? " &nbsp;&bull;&nbsp; <strong>Assigned to:</strong> " + task.assignedTo : ""}
            </p>
          </div>
          <p style="color:#6b7280;font-size:13px;margin:20px 0 0;">This task is set to repeat daily. You will receive a reminder each morning. Log in to Ready TMS to update or complete it.</p>
        </div>
      </div>`;
    const emails = parseEmails(task.reminderEmail);
    let anySuccess = false;
    for (const email of emails) {
      const { success: sent } = await sendEmail({
        to: email,
        subject: `[Ready TMS] Task Reminder: ${task.title}`,
        html
      });
      if (sent) {
        console.log(`[Automation] Sent immediate task reminder to ${email} for task "${task.title}"`);
        anySuccess = true;
      }
    }
    return anySuccess;
  } catch (error) {
    console.error("[Automation] Error sending single task reminder:", error);
    return false;
  }
}
async function sendDailyTaskReminders() {
  try {
    const allTasks = await storage.getAllTasks();
    const today = /* @__PURE__ */ new Date();
    const dailyTasks = allTasks.filter(
      (t) => t.repeatDaily === "true" && t.reminderEmail && t.status !== "completed"
    );
    if (dailyTasks.length === 0) {
      console.log("[Automation] No daily task reminders to send today");
      return;
    }
    const byEmail = {};
    for (const task of dailyTasks) {
      const emails = parseEmails(task.reminderEmail);
      for (const email of emails) {
        if (!byEmail[email]) byEmail[email] = [];
        byEmail[email].push(task);
      }
    }
    for (const [email, tasks2] of Object.entries(byEmail)) {
      const taskRows = tasks2.map((t) => {
        const due = t.dueDate ? format(new Date(t.dueDate), "MMM d, yyyy") : "\u2014";
        const priority = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
        const category = t.category ? ` [${t.category}]` : "";
        return `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${t.title}${category}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${due}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${priority}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${t.assignedTo || "\u2014"}</td>
            </tr>`;
      }).join("");
      const html = `
        <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
          <div style="background:#1d4ed8;padding:24px 32px;border-radius:8px 8px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Daily Task Reminder</h1>
            <p style="color:#bfdbfe;margin:4px 0 0;">${format(today, "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;margin:0 0 16px;">You have <strong>${tasks2.length} recurring task${tasks2.length !== 1 ? "s" : ""}</strong> scheduled as daily reminders:</p>
            <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Task</th>
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Due Date</th>
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Priority</th>
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Assigned To</th>
                </tr>
              </thead>
              <tbody>${taskRows}</tbody>
            </table>
            <p style="color:#6b7280;font-size:13px;margin:20px 0 0;">Log in to Ready TMS to update or complete these tasks.</p>
          </div>
        </div>`;
      const { success: sent } = await sendEmail({
        to: email,
        subject: `[Ready TMS] Daily Task Reminder \u2013 ${tasks2.length} task${tasks2.length !== 1 ? "s" : ""} (${format(today, "MMM d")})`,
        html
      });
      if (sent) {
        console.log(`[Automation] Sent daily task reminder to ${email} (${tasks2.length} tasks)`);
      } else {
        console.error(`[Automation] Failed to send daily task reminder to ${email}`);
      }
    }
  } catch (error) {
    console.error("[Automation] Error sending daily task reminders:", error);
  }
}
async function checkAndSendMissingPODReminders() {
  try {
    const loads2 = await storage.getAllLoads();
    const drivers2 = await storage.getAllDrivers();
    const missingPODLoads = loads2.filter((load) => {
      const isMissingPOD = !load.podAttachment || load.podAttachment === "";
      const isActiveOrDelivered = load.status === "in_transit" || load.status === "delivered";
      const notCancelled = load.status !== "cancelled";
      return isMissingPOD && isActiveOrDelivered && notCancelled;
    });
    let sent = 0;
    for (const load of missingPODLoads) {
      if (!load.assignedDriverId) continue;
      const driver = drivers2.find((d) => d.id === load.assignedDriverId);
      if (!driver || !driver.phone) continue;
      const statusLabel = load.status === "delivered" ? "delivered" : "in transit";
      await sendSMS({
        to: driver.phone,
        message: `Ready TMS: Load ${load.loadNumber} is ${statusLabel} but no POD has been submitted. Please upload your Proof of Delivery at readytms.com/driver-pod. - Ready TMS`
      });
      sent++;
    }
    console.log(`[Automation] Missing POD reminders sent: ${sent}`);
  } catch (error) {
    console.error("[Automation] Error sending missing POD reminders:", error);
  }
}
async function initializeAutomationSettings() {
  try {
    const defaultSettings = [
      {
        name: "auto_invoice_on_delivery",
        enabled: "true",
        config: { enabled: true, description: "Automatically generate invoices when loads are delivered" }
      },
      {
        name: "alert_expiring_documents",
        enabled: "true",
        config: { enabled: true, warningDays: 30, description: "Alert when CDL licenses and medical cards are expiring" }
      },
      {
        name: "notify_load_status_change",
        enabled: "true",
        config: { enabled: true, description: "Send notifications when load status changes" }
      }
    ];
    for (const setting of defaultSettings) {
      const existing = await storage.getAutomationSetting(setting.name);
      if (!existing) {
        await storage.createAutomationSetting(setting);
        console.log(`Created automation setting: ${setting.name}`);
      }
    }
  } catch (error) {
    console.error("Error initializing automation settings:", error);
  }
}
var init_automation = __esm({
  "server/automation.ts"() {
    "use strict";
    init_storage();
    init_notifications();
  }
});

// server/index.ts
import cors from "cors";
import express2 from "express";
import path3 from "path";
import fs2 from "fs";

// server/routes.ts
init_storage();
init_schema();
import { createServer } from "http";

// server/auth.ts
init_storage();
init_db();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt2 from "bcrypt";
import connectPg from "connect-pg-simple";
import { sql as sql3 } from "drizzle-orm";
async function initSessionTable() {
  try {
    await db.execute(sql3`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        PRIMARY KEY (sid)
      )
    `);
    await db.execute(sql3`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)
    `);
    console.log("Session table initialized successfully");
  } catch (error) {
    console.error("Error initializing session table:", error);
    throw error;
  }
}
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: sessionTtl
    }
  });
}
async function setupAuth(app2) {
  await initSessionTable();
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use("admin-local", new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true
    },
    async (req, email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        const expectedRole = req.body.expectedRole || "admin";
        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }
        if (user.isAdmin !== "true") {
          return done(null, false, { message: "Unauthorized: Access denied" });
        }
        const userRole = user.role || "admin";
        if (userRole !== expectedRole) {
          if (expectedRole === "admin") {
            return done(null, false, { message: "This account is not registered as an Admin. Please use the Dispatch login." });
          } else {
            return done(null, false, { message: "This account is not registered as Dispatch. Please use the Admin login." });
          }
        }
        if (user.approved !== "true") {
          return done(null, false, { message: "Your account is pending approval. An existing admin must approve your registration." });
        }
        const isValid = await bcrypt2.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, { id: user.id, email: user.email, type: "admin", role: userRole });
      } catch (error) {
        return done(error);
      }
    }
  ));
  passport.use("driver-local", new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password"
    },
    async (email, password, done) => {
      try {
        const driver = await storage.getDriverByEmail(email);
        if (!driver) {
          return done(null, false, { message: "Invalid email or password" });
        }
        const isValid = await bcrypt2.compare(password, driver.password || "");
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, { id: driver.id, email: driver.email, type: "driver" });
      } catch (error) {
        return done(error);
      }
    }
  ));
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}
var isAuthenticated = async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  const authHeader = req.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const sessionId = authHeader.substring(7);
    try {
      const result = await pool.query(
        "SELECT sess FROM sessions WHERE (sid = $1 OR sid = $2) AND expire > NOW()",
        [sessionId, "sess:" + sessionId]
      );
      if (result.rows.length > 0) {
        const sess = result.rows[0].sess;
        if (sess.passport && sess.passport.user) {
          req.user = sess.passport.user;
          return next();
        } else {
          console.warn("Token found but no passport.user in session:", sessionId);
        }
      } else {
        console.warn("Token not found or expired in sessions table:", sessionId);
      }
    } catch (err) {
      console.error("Token verification error:", err);
    }
  }
  res.status(401).json({ message: "Unauthorized" });
};
var isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.type === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
};
var isDriver = (req, res, next) => {
  if (req.isAuthenticated() && req.user.type === "driver") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Driver access required" });
};

// server/routes.ts
init_aiExtraction();
init_s3();
init_automation();
init_notifications();
import passport2 from "passport";
import bcrypt3 from "bcrypt";

// server/gmail.ts
init_storage();
import { google } from "googleapis";
var CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
var CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
var REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://readytms.com/api/gmail/oauth/callback";
function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}
function getGmailAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    prompt: "consent"
  });
}
async function exchangeCodeAndSave(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2Api.userinfo.get();
  await storage.updateCompanySettings({
    gmailAccessToken: tokens.access_token ?? void 0,
    gmailRefreshToken: tokens.refresh_token ?? void 0,
    gmailEmail: data.email ?? void 0,
    gmailTokenExpiry: tokens.expiry_date ? String(tokens.expiry_date) : void 0
  });
}
async function getGmailStatus() {
  const settings = await storage.getCompanySettings();
  if (!settings?.gmailRefreshToken) return { connected: false };
  return { connected: true, email: settings.gmailEmail ?? void 0 };
}
async function clearGmailTokens() {
  const settings = await storage.getCompanySettings();
  if (!settings) return;
  const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const { companySettings: companySettings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq2, sql: drizzleSql } = await import("drizzle-orm");
  await db2.execute(drizzleSql`
    UPDATE company_settings
    SET gmail_access_token = NULL,
        gmail_refresh_token = NULL,
        gmail_email = NULL,
        gmail_token_expiry = NULL
    WHERE id = ${settings.id}
  `);
}
function buildRFC2822(opts) {
  const boundary = `----_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines = [];
  lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to}`);
  if (opts.cc?.length) lines.push(`Cc: ${opts.cc.join(", ")}`);
  lines.push(`Subject: ${opts.subject}`);
  lines.push("MIME-Version: 1.0");
  if (opts.attachments?.length) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("");
    lines.push(opts.html);
    for (const att of opts.attachments) {
      const b64 = Buffer.isBuffer(att.content) ? att.content.toString("base64") : Buffer.from(att.content, "base64").toString("base64");
      const chunks = b64.match(/.{1,76}/g) ?? [];
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.type || "application/octet-stream"}; name="${att.filename}"`);
      lines.push("Content-Transfer-Encoding: base64");
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push("");
      lines.push(...chunks);
    }
    lines.push(`--${boundary}--`);
  } else {
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("");
    lines.push(opts.html);
  }
  return lines.join("\r\n");
}
async function sendViaGmail(opts) {
  try {
    const settings = await storage.getCompanySettings();
    if (!settings?.gmailRefreshToken) {
      return { success: false, error: "Gmail not connected" };
    }
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: settings.gmailRefreshToken,
      access_token: settings.gmailAccessToken ?? void 0
    });
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    if (credentials.access_token) {
      await storage.updateCompanySettings({
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date ? String(credentials.expiry_date) : void 0
      });
    }
    const from = settings.gmailEmail ?? "me";
    const raw = buildRFC2822({ from, ...opts });
    const encoded = Buffer.from(raw).toString("base64url");
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.messages.send({ userId: "me", requestBody: { raw: encoded } });
    return { success: true };
  } catch (err) {
    console.error("[Gmail] Send error:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Failed to send via Gmail" };
  }
}
async function scanRateConEmails(companyId) {
  const results = { scanned: 0, created: 0, errors: [] };
  try {
    const settings = await storage.getCompanySettings();
    if (!settings?.gmailRefreshToken) {
      throw new Error("Gmail not connected");
    }
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: settings.gmailRefreshToken,
      access_token: settings.gmailAccessToken ?? void 0
    });
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    if (credentials.access_token) {
      await storage.updateCompanySettings({
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date ? String(credentials.expiry_date) : void 0
      });
    }
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const brokerKeywords = ["rate confirmation", "rate con", "load tender", "load confirmation", "TQL", "Echo Global", "Coyote", "CH Robinson", "CHR", "loadconfirmation", "rateconfirmation"];
    const query = brokerKeywords.map((k) => "subject:(" + k + ")").join(" OR ") + " OR filename:ratecon OR filename:rate_con OR filename:RateConf";
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: "(" + query + ") is:unread newer_than:60d",
      maxResults: 50
    });
    const messages = listRes.data.messages || [];
    results.scanned = messages.length;
    for (const msg of messages) {
      try {
        const fullMsg = await gmail.users.messages.get({ userId: "me", id: msg.id });
        const parts = fullMsg.data.payload?.parts || [];
        let pdfAttachmentId = null;
        let pdfMimeType = "application/pdf";
        const findPdf = (partList) => {
          for (const part of partList) {
            if (part.filename && part.filename.toLowerCase().endsWith(".pdf") && part.body?.attachmentId) {
              pdfAttachmentId = part.body.attachmentId;
              pdfMimeType = part.mimeType || "application/pdf";
              return;
            }
            if (part.parts) findPdf(part.parts);
          }
        };
        findPdf(parts);
        if (!pdfAttachmentId) {
          await gmail.users.messages.modify({ userId: "me", id: msg.id, requestBody: { removeLabelIds: ["UNREAD"] } });
          continue;
        }
        const attachRes = await gmail.users.messages.attachments.get({ userId: "me", messageId: msg.id, id: pdfAttachmentId });
        const rawData = attachRes.data.data || "";
        const base64Pdf = rawData.replace(/-/g, "+").replace(/_/g, "/");
        const { extractLoadFromDocument: extractLoadFromDocument2 } = await Promise.resolve().then(() => (init_aiExtraction(), aiExtraction_exports));
        const extracted = await extractLoadFromDocument2(`data:${pdfMimeType};base64,${base64Pdf}`, pdfMimeType);
        let rateConUrl = "";
        try {
          const { uploadPdfToS3: uploadPdfToS32 } = await Promise.resolve().then(() => (init_s3(), s3_exports));
          rateConUrl = await uploadPdfToS32(base64Pdf, attachment.filename || "ratecon.pdf", pdfMimeType);
        } catch (s3Err) {
          console.warn("S3 upload failed:", s3Err?.message);
        }
        const loadData = {
          loadNumber: extracted.loadNumber || "RC-" + Date.now(),
          status: "pending",
          pickupLocation: extracted.pickupLocation || "",
          pickupDate: extracted.pickupDate ? new Date(extracted.pickupDate) : /* @__PURE__ */ new Date(),
          deliveryLocation: extracted.deliveryLocation || "",
          deliveryDate: extracted.deliveryDate ? new Date(extracted.deliveryDate) : /* @__PURE__ */ new Date(),
          rate: extracted.rate || "0",
          commodity: extracted.commodity || "",
          weight: extracted.weight ? Number(extracted.weight) : null,
          notes: "Auto-imported from Gmail rate con",
          source: "ai_extract",
          rateConUrl
        };
        const existingLoads = await storage.getLoads();
        const dupLoad = existingLoads.find((l) => l.loadNumber === loadData.loadNumber);
        if (dupLoad) {
          await gmail.users.messages.modify({ userId: "me", id: msg.id, requestBody: { removeLabelIds: ["UNREAD"] } });
          continue;
        }
        await storage.createLoad(loadData, companyId);
        await gmail.users.messages.modify({ userId: "me", id: msg.id, requestBody: { removeLabelIds: ["UNREAD"] } });
        results.created++;
      } catch (msgErr) {
        results.errors.push(msgErr?.message || "Unknown error processing email");
      }
    }
  } catch (err) {
    results.errors.push(err?.message || "Failed to scan emails");
  }
  return results;
}

// server/email_processor.js
init_db();
import { Telegraf } from "telegraf";
var TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
var TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
var bot = TELEGRAM_BOT_TOKEN ? new Telegraf(TELEGRAM_BOT_TOKEN) : null;
function parseEmailContent(emailBody) {
  const result = {
    trucks: [],
    trailers: [],
    drivers: [],
    rawActions: []
  };
  const simplePatterns = [
    { pattern: /add\s+truck\s+(?:#)?(\d+)/gi, type: "add_truck" },
    { pattern: /remove\s+truck\s+(?:#)?(\d+)/gi, type: "remove_truck" },
    { pattern: /add\s+driver\s+([^\n]+)/gi, type: "add_driver" },
    { pattern: /add\s+trailer\s+(?:#)?([A-Z0-9\-]+)/gi, type: "add_trailer" },
    { pattern: /remove\s+trailer\s+(?:#)?([A-Z0-9\-]+)/gi, type: "remove_trailer" }
  ];
  for (const { pattern, type } of simplePatterns) {
    let match;
    while ((match = pattern.exec(emailBody)) !== null) {
      const value = match[1].trim();
      result.rawActions.push({ type, value });
      if (type === "add_truck") {
        result.trucks.push({ action: "add", truck_number: value, status: "active" });
      } else if (type === "remove_truck") {
        result.trucks.push({ action: "remove", truck_number: value });
      } else if (type === "add_driver") {
        result.drivers.push({ action: "add", name: value, status: "active" });
      } else if (type === "add_trailer") {
        result.trailers.push({ action: "add", trailer_number: value, status: "active" });
      } else if (type === "remove_trailer") {
        result.trailers.push({ action: "remove", trailer_number: value });
      }
    }
  }
  const csvLines = emailBody.split("\n").filter((line) => line.trim());
  for (let i = 1; i < csvLines.length; i++) {
    const parts = csvLines[i].split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      const truckNum = parts[0].replace(/[^\d]/g, "");
      const vin = parts[1];
      if (truckNum && vin) {
        result.trucks.push({
          action: "add",
          truck_number: truckNum,
          vin,
          status: parts[2]?.toLowerCase() || "active"
        });
      }
    }
  }
  return result;
}
async function addTruck(truckNumber, vin = null, status = "active") {
  try {
    const result = await db.query(
      `INSERT INTO trucks (truck_number, vin, status, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (truck_number) DO UPDATE SET status = $3
       RETURNING *`,
      [truckNumber, vin, status]
    );
    return { success: true, truck: result.rows[0] };
  } catch (error) {
    console.error(`Failed to add truck ${truckNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}
async function removeTruck(truckNumber) {
  try {
    const result = await db.query(
      `UPDATE trucks SET status = 'removed', removed_at = NOW()
       WHERE truck_number = $1
       RETURNING *`,
      [truckNumber]
    );
    return { success: true, truck: result.rows[0] };
  } catch (error) {
    console.error(`Failed to remove truck ${truckNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}
async function addDriver(name, licenseNumber = null, status = "active") {
  try {
    const result = await db.query(
      `INSERT INTO drivers (name, license_number, status, hire_date)
       VALUES ($1, $2, $3, CURRENT_DATE)
       ON CONFLICT (name) DO UPDATE SET status = $3
       RETURNING *`,
      [name, licenseNumber, status]
    );
    return { success: true, driver: result.rows[0] };
  } catch (error) {
    console.error(`Failed to add driver ${name}:`, error.message);
    return { success: false, error: error.message };
  }
}
async function addTrailer(trailerNumber, status = "active") {
  try {
    const result = await db.query(
      `INSERT INTO trailers (trailer_number, status)
       VALUES ($1, $2)
       ON CONFLICT (trailer_number) DO UPDATE SET status = $2
       RETURNING *`,
      [trailerNumber, status]
    );
    return { success: true, trailer: result.rows[0] };
  } catch (error) {
    console.error(`Failed to add trailer ${trailerNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}
async function removeTrailer(trailerNumber) {
  try {
    const result = await db.query(
      `UPDATE trailers SET status = 'removed'
       WHERE trailer_number = $1
       RETURNING *`,
      [trailerNumber]
    );
    return { success: true, trailer: result.rows[0] };
  } catch (error) {
    console.error(`Failed to remove trailer ${trailerNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}
async function notifyTelegram(title, message) {
  if (!bot || !TELEGRAM_CHAT_ID) return;
  try {
    await bot.telegram.sendMessage(
      TELEGRAM_CHAT_ID,
      `${title}
${message}`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Failed to send Telegram notification:", error.message);
  }
}
async function processEmail(emailData) {
  const { subject, sender, body, date } = emailData;
  const result = {
    email: { subject, sender, date },
    parsed: parseEmailContent(body),
    changes: {
      trucks_added: [],
      trucks_removed: [],
      drivers_added: [],
      trailers_added: [],
      trailers_removed: [],
      errors: []
    }
  };
  for (const truck of result.parsed.trucks) {
    if (truck.action === "add") {
      const res = await addTruck(truck.truck_number, truck.vin, truck.status);
      if (res.success) {
        result.changes.trucks_added.push(truck.truck_number);
      } else {
        result.changes.errors.push(`Truck ${truck.truck_number}: ${res.error}`);
      }
    } else if (truck.action === "remove") {
      const res = await removeTruck(truck.truck_number);
      if (res.success) {
        result.changes.trucks_removed.push(truck.truck_number);
      } else {
        result.changes.errors.push(`Remove truck ${truck.truck_number}: ${res.error}`);
      }
    }
  }
  for (const driver of result.parsed.drivers) {
    if (driver.action === "add") {
      const res = await addDriver(driver.name, driver.license_number, driver.status);
      if (res.success) {
        result.changes.drivers_added.push(driver.name);
      } else {
        result.changes.errors.push(`Driver ${driver.name}: ${res.error}`);
      }
    }
  }
  for (const trailer of result.parsed.trailers) {
    if (trailer.action === "add") {
      const res = await addTrailer(trailer.trailer_number, trailer.status);
      if (res.success) {
        result.changes.trailers_added.push(trailer.trailer_number);
      } else {
        result.changes.errors.push(`Trailer ${trailer.trailer_number}: ${res.error}`);
      }
    } else if (trailer.action === "remove") {
      const res = await removeTrailer(trailer.trailer_number);
      if (res.success) {
        result.changes.trailers_removed.push(trailer.trailer_number);
      } else {
        result.changes.errors.push(`Remove trailer ${trailer.trailer_number}: ${res.error}`);
      }
    }
  }
  if (result.changes.trucks_added.length > 0 || result.changes.trucks_removed.length > 0 || result.changes.drivers_added.length > 0 || result.changes.trailers_added.length > 0 || result.changes.trailers_removed.length > 0) {
    let msg = `\u2705 <b>EQUIPMENT UPDATE FROM EMAIL</b>

`;
    msg += `<b>From:</b> ${sender}
`;
    msg += `<b>Subject:</b> ${subject}

`;
    if (result.changes.trucks_added.length > 0) {
      msg += `\u2705 Trucks Added: ${result.changes.trucks_added.join(", ")}
`;
    }
    if (result.changes.trucks_removed.length > 0) {
      msg += `\u274C Trucks Removed: ${result.changes.trucks_removed.join(", ")}
`;
    }
    if (result.changes.drivers_added.length > 0) {
      msg += `\u2705 Drivers Added: ${result.changes.drivers_added.join(", ")}
`;
    }
    if (result.changes.trailers_added.length > 0) {
      msg += `\u2705 Trailers Added: ${result.changes.trailers_added.join(", ")}
`;
    }
    if (result.changes.trailers_removed.length > 0) {
      msg += `\u274C Trailers Removed: ${result.changes.trailers_removed.join(", ")}
`;
    }
    await notifyTelegram("\u{1F4E7} EQUIPMENT AUTO-UPDATE", msg);
  }
  return result;
}
var emailProcessorRoute = async (req, res) => {
  try {
    const { subject, sender, body, date } = req.body;
    if (!sender || !sender.includes("info@readycarrier.com")) {
      return res.status(403).json({ error: "Only info@readycarrier.com emails are processed" });
    }
    const result = await processEmail({ subject, sender, body, date });
    res.json(result);
  } catch (error) {
    console.error("Email processing error:", error);
    res.status(500).json({ error: error.message });
  }
};

// server/routes.ts
init_db();
import { z as z3 } from "zod";
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.post("/api/admin/login", (req, res, next) => {
    passport2.authenticate("admin-local", (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }
      req.logIn(user, (err2) => {
        if (err2) {
          return res.status(500).json({ message: "Login failed" });
        }
        return res.json({ message: "Login successful", user: { id: user.id, email: user.email, type: user.type } });
      });
    })(req, res, next);
  });
  app2.post("/api/admin/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const userRole = role === "dispatch" ? "dispatch" : "admin";
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const approvedAdmins = await storage.getApprovedAdmins();
      const isFirstAdmin = approvedAdmins.length === 0;
      const hashedPassword = await bcrypt3.hash(password, 12);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin: userRole === "admin" ? "true" : "false",
        role: userRole,
        approved: isFirstAdmin ? "true" : "false",
        // First admin is auto-approved
        approvedBy: isFirstAdmin ? null : null,
        approvedAt: isFirstAdmin ? /* @__PURE__ */ new Date() : null
      });
      if (isFirstAdmin) {
        res.status(201).json({
          message: "Admin registered successfully. You can now login.",
          user: { id: user.id, email: user.email },
          approved: true
        });
      } else {
        try {
          await storage.sendAdminApprovalNotification(user.email, approvedAdmins);
        } catch (emailError) {
          console.error("Failed to send approval notification:", emailError);
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
  app2.post("/api/driver/login", (req, res, next) => {
    passport2.authenticate("driver-local", (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }
      req.logIn(user, (err2) => {
        if (err2) {
          return res.status(500).json({ message: "Login failed" });
        }
        return res.json({
          message: "Login successful",
          token: req.sessionID,
          user: { id: user.id, email: user.email, type: user.type }
        });
      });
    })(req, res, next);
  });
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const sessionUser = req.user;
      if (sessionUser.type === "admin") {
        const user = await storage.getUser(sessionUser.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = user;
        return res.json({ ...userWithoutPassword, type: "admin" });
      } else if (sessionUser.type === "driver") {
        const driver = await storage.getDriver(sessionUser.id);
        if (!driver) {
          return res.status(404).json({ message: "Driver not found" });
        }
        const { password, ...driverWithoutPassword } = driver;
        return res.json({ ...driverWithoutPassword, type: "driver" });
      }
      res.status(404).json({ message: "User not found" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.post("/api/auth/request-password-reset", async (req, res) => {
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
      const result = await storage.requestPasswordReset(email, userType);
      console.log("[API] Result from storage:", result);
      if (!result.success) {
        console.log("[API] Reset failed, returning generic message");
        return res.json({ message: "If the email exists, a password reset link has been sent." });
      }
      console.log("[API] Reset successful, email sent");
      res.json({ message: "Password reset link has been sent to your email." });
    } catch (error) {
      console.error("[API] Password reset request error:", error);
      res.json({ message: "If the email exists, a password reset link has been sent." });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
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
  app2.get("/api/admin/pending", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pendingAdmins = await storage.getPendingAdmins();
      const currentUserDivisionId = req.user?.divisionId || null;
      const filtered = currentUserDivisionId ? pendingAdmins.filter((u) => u.divisionId === currentUserDivisionId || !u.divisionId) : pendingAdmins;
      const sanitized = filtered.map(({ password, ...user }) => user);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching pending admins:", error);
      res.status(500).json({ message: "Failed to fetch pending admins" });
    }
  });
  app2.post("/api/admin/approve/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const approvedBy = req.user.id;
      const user = await storage.approveAdmin(userId, approvedBy);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      try {
        await storage.sendAdminApprovedEmail(user.email);
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }
      res.json({ message: "Admin approved successfully", user: { id: user.id, email: user.email } });
    } catch (error) {
      console.error("Error approving admin:", error);
      res.status(500).json({ message: "Failed to approve admin" });
    }
  });
  app2.post("/api/admin/reject/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.rejectAdmin(userId);
      res.json({ message: "Admin registration rejected" });
    } catch (error) {
      console.error("Error rejecting admin:", error);
      res.status(500).json({ message: "Failed to reject admin" });
    }
  });
  app2.post("/api/admin/test-sms", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) return res.status(400).json({ message: "to and message are required" });
      const { sendSMS: sendSMS2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      const success = await sendSMS2({ to, message });
      res.json({ success, to, message });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/loads", async (req, res) => {
    const loads2 = await storage.getAllLoads(req.user?.divisionId || void 0);
    res.json(loads2);
  });
  app2.get("/api/loads/:id", async (req, res) => {
    const load = await storage.getLoad(req.params.id);
    if (!load) {
      return res.status(404).json({ error: "Load not found" });
    }
    res.json(load);
  });
  app2.post("/api/loads", async (req, res) => {
    try {
      const validatedData = insertLoadSchema.parse(req.body);
      const load = await storage.createLoad(validatedData, req.user?.divisionId || void 0);
      res.status(201).json(load);
    } catch (error) {
      res.status(400).json({ error: "Invalid load data" });
    }
  });
  app2.patch("/api/loads/:id", async (req, res) => {
    try {
      const oldLoad = await storage.getLoad(req.params.id);
      if (!oldLoad) {
        return res.status(404).json({ error: "Load not found" });
      }
      const validatedData = insertLoadSchema.partial().parse(req.body);
      const load = await storage.updateLoad(req.params.id, validatedData);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }
      if (validatedData.status && validatedData.status.toLowerCase() === "delivered" && oldLoad.status !== "delivered") {
        await autoGenerateInvoice(load);
      }
      if (validatedData.status && validatedData.status !== oldLoad.status) {
        await notifyLoadStatusChange(load, oldLoad.status, validatedData.status);
      }
      res.json(load);
    } catch (error) {
      res.status(400).json({ error: "Invalid load data" });
    }
  });
  app2.delete("/api/loads/:id", async (req, res) => {
    const deleted = await storage.deleteLoad(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Load not found" });
    }
    res.status(204).send();
  });
  app2.post("/api/public/pod-upload", async (req, res) => {
    try {
      const { driverName, loadNumber, truckNumber, podAttachments } = req.body;
      if (!driverName || !loadNumber || !truckNumber) {
        return res.status(400).json({ error: "Driver name, load number, and truck number are required" });
      }
      if (!podAttachments || !Array.isArray(podAttachments) || podAttachments.length === 0) {
        return res.status(400).json({ error: "At least one POD attachment is required" });
      }
      const podSchema = z3.array(z3.object({
        filename: z3.string(),
        data: z3.string(),
        type: z3.string()
      }));
      try {
        podSchema.parse(podAttachments);
      } catch {
        return res.status(400).json({ error: "Invalid attachment format" });
      }
      if (podAttachments.length > 10) {
        return res.status(400).json({ error: "Maximum 10 POD attachments per upload" });
      }
      const maxSize = 10 * 1024 * 1024;
      for (const att of podAttachments) {
        if (att.data.length > maxSize) {
          return res.status(400).json({ error: `Attachment ${att.filename} exceeds 10MB limit` });
        }
      }
      const load = await storage.getLoadByNumber(loadNumber.trim());
      if (!load) {
        return res.status(404).json({ error: "Load number not found. Please check and try again." });
      }
      if (load.assignedTruckId) {
        const truck = await storage.getTruck(load.assignedTruckId);
        if (truck && truck.truckNumber.toLowerCase() !== truckNumber.trim().toLowerCase()) {
          return res.status(400).json({ error: "Truck number does not match the assigned truck for this load." });
        }
      }
      const timestampedAttachments = podAttachments.map((att) => ({
        ...att,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        uploadedByName: driverName.trim(),
        uploadedByTruck: truckNumber.trim()
      }));
      const existingPODs = load.podAttachments || [];
      const allPODs = [...existingPODs, ...timestampedAttachments];
      if (allPODs.length > 50) {
        return res.status(400).json({ error: "Maximum 50 total POD attachments allowed per load" });
      }
      const updatedLoad = await storage.updateLoad(load.id, {
        podAttachments: allPODs,
        status: "delivered"
      });
      if (!updatedLoad) {
        return res.status(500).json({ error: "Failed to update load" });
      }
      await autoGenerateInvoice(updatedLoad);
      res.json({ message: "POD uploaded successfully", loadNumber: load.loadNumber });
    } catch (error) {
      console.error("Error uploading public POD:", error);
      res.status(500).json({ error: "Failed to upload POD. Please try again." });
    }
  });
  app2.get("/api/driver/loads", isAuthenticated, isDriver, async (req, res) => {
    try {
      const sessionUser = req.user;
      if (!sessionUser || sessionUser.type !== "driver") {
        return res.status(403).json({ error: "Driver access required" });
      }
      const driver = await storage.getDriver(sessionUser.id);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      const allLoads = await storage.getAllLoads();
      const driverLoads = allLoads.filter((load) => load.assignedDriverId === driver.id);
      res.json(driverLoads);
    } catch (error) {
      console.error("Error fetching driver loads:", error);
      res.status(500).json({ error: "Failed to fetch loads" });
    }
  });
  app2.post("/api/driver/loads/:id/pod", isAuthenticated, isDriver, async (req, res) => {
    try {
      const loadId = req.params.id;
      const { podAttachments } = req.body;
      const sessionUser = req.user;
      if (!sessionUser || sessionUser.type !== "driver") {
        return res.status(403).json({ error: "Driver access required" });
      }
      if (!podAttachments || !Array.isArray(podAttachments)) {
        return res.status(400).json({ error: "POD attachments are required" });
      }
      const podSchema = z3.array(z3.object({
        filename: z3.string(),
        data: z3.string(),
        type: z3.string()
      }));
      try {
        podSchema.parse(podAttachments);
      } catch (validationError) {
        return res.status(400).json({ error: "Invalid attachment format" });
      }
      if (podAttachments.length > 10) {
        return res.status(400).json({ error: "Maximum 10 POD attachments allowed per upload" });
      }
      const maxSize = 10 * 1024 * 1024;
      for (const att of podAttachments) {
        if (att.data.length > maxSize) {
          return res.status(400).json({ error: `Attachment ${att.filename} exceeds 10MB limit` });
        }
      }
      const existingLoad = await storage.getLoad(loadId);
      if (!existingLoad) {
        return res.status(404).json({ error: "Load not found" });
      }
      const driver = await storage.getDriver(sessionUser.id);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      if (existingLoad.assignedDriverId !== driver.id) {
        return res.status(403).json({ error: "This load is not assigned to you" });
      }
      const timestampedAttachments = podAttachments.map((att) => ({
        ...att,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
      }));
      const existingPODs = existingLoad.podAttachments || [];
      const allPODs = [...existingPODs, ...timestampedAttachments];
      if (allPODs.length > 50) {
        return res.status(400).json({ error: "Maximum 50 total POD attachments allowed per load" });
      }
      const updatedLoad = await storage.updateLoad(loadId, {
        podAttachments: allPODs,
        status: "delivered"
        // Automatically mark as delivered when POD uploaded
      });
      if (!updatedLoad) {
        return res.status(404).json({ error: "Load not found" });
      }
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
  app2.post("/api/public/pod-upload", async (req, res) => {
    try {
      const { driverName, loadNumber, truckNumber, podAttachments } = req.body;
      if (!driverName || !loadNumber || !truckNumber) {
        return res.status(400).json({ error: "Driver name, load number, and truck number are required" });
      }
      if (!podAttachments || !Array.isArray(podAttachments) || podAttachments.length === 0) {
        return res.status(400).json({ error: "At least one POD file is required" });
      }
      const podSchema = z3.array(z3.object({
        filename: z3.string(),
        data: z3.string(),
        type: z3.string()
      }));
      try {
        podSchema.parse(podAttachments);
      } catch {
        return res.status(400).json({ error: "Invalid attachment format" });
      }
      if (podAttachments.length > 10) {
        return res.status(400).json({ error: "Maximum 10 POD attachments allowed per upload" });
      }
      const maxSize = 10 * 1024 * 1024;
      for (const att of podAttachments) {
        if (att.data.length > maxSize) {
          return res.status(400).json({ error: `Attachment ${att.filename} exceeds 10MB limit` });
        }
      }
      const allLoads = await storage.getAllLoads();
      const matchingLoad = allLoads.find(
        (l) => l.loadNumber.trim().toLowerCase() === String(loadNumber).trim().toLowerCase()
      );
      if (!matchingLoad) {
        return res.status(404).json({ error: `Load #${loadNumber} was not found. Please check the load number and try again.` });
      }
      const timestampedAttachments = podAttachments.map((att) => ({
        ...att,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        uploadedBy: driverName,
        truckNumber
      }));
      const existingPODs = matchingLoad.podAttachments || [];
      const allPODs = [...existingPODs, ...timestampedAttachments];
      if (allPODs.length > 50) {
        return res.status(400).json({ error: "Maximum 50 total POD attachments allowed per load" });
      }
      const updatedLoad = await storage.updateLoad(matchingLoad.id, {
        podAttachments: allPODs,
        status: "delivered"
      });
      if (!updatedLoad) {
        return res.status(500).json({ error: "Failed to update load" });
      }
      await autoGenerateInvoice(updatedLoad);
      try {
        const companySettingsData = await storage.getCompanySettings();
        if (companySettingsData?.dispatchNotificationEmail) {
          await sendEmail({
            to: companySettingsData.dispatchNotificationEmail,
            subject: `POD Uploaded \u2014 Load #${updatedLoad.loadNumber}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <div style="background:#2563eb;color:white;padding:16px 20px;border-radius:6px 6px 0 0;">
                  <h2 style="margin:0;">Proof of Delivery Received</h2>
                </div>
                <div style="background:#f9fafb;padding:20px;border-radius:0 0 6px 6px;border:1px solid #e5e7eb;border-top:none;">
                  <p>A driver has uploaded a POD for <strong>Load #${updatedLoad.loadNumber}</strong>.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="padding:8px;font-weight:bold;color:#6b7280;width:40%;">Driver</td><td style="padding:8px;">${driverName}</td></tr>
                    <tr style="background:#fff;"><td style="padding:8px;font-weight:bold;color:#6b7280;">Truck Number</td><td style="padding:8px;">${truckNumber}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;color:#6b7280;">Load Number</td><td style="padding:8px;">#${updatedLoad.loadNumber}</td></tr>
                    <tr style="background:#fff;"><td style="padding:8px;font-weight:bold;color:#6b7280;">Files Uploaded</td><td style="padding:8px;">${podAttachments.length}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;color:#6b7280;">Time</td><td style="padding:8px;">${(/* @__PURE__ */ new Date()).toLocaleString()}</td></tr>
                  </table>
                  <p style="color:#6b7280;font-size:12px;margin-top:20px;">Ready TMS \u2014 Automated Notification</p>
                </div>
              </div>
            `
          });
        }
      } catch (notifError) {
        console.error("[POD Upload] Failed to send dispatch notification:", notifError);
      }
      res.json({ message: "POD uploaded successfully", loadNumber: updatedLoad.loadNumber });
    } catch (error) {
      console.error("Error in public POD upload:", error);
      res.status(500).json({ error: "Failed to upload POD. Please try again." });
    }
  });
  app2.get("/api/trucks", async (req, res) => {
    const trucks2 = await storage.getAllTrucks(req.user?.divisionId || void 0);
    res.json(trucks2);
  });
  app2.get("/api/trucks/:id", async (req, res) => {
    const truck = await storage.getTruck(req.params.id);
    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }
    res.json(truck);
  });
  app2.post("/api/trucks", async (req, res) => {
    try {
      const validatedData = insertTruckSchema.parse(req.body);
      const truck = await storage.createTruck(validatedData, req.user?.divisionId || void 0);
      res.status(201).json(truck);
    } catch (error) {
      res.status(400).json({ error: "Invalid truck data" });
    }
  });
  app2.patch("/api/trucks/:id", async (req, res) => {
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
  app2.delete("/api/trucks/:id", async (req, res) => {
    const deleted = await storage.deleteTruck(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Truck not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/insurance", async (req, res) => {
    try {
      const trucks2 = await pool.query(`
        SELECT id, unit_number AS "unitNumber", 'truck' AS "unitType",
               year, make, model, vin, physical_damage AS "physicalDamage",
               specific_type AS "specificType", owner_operator AS "ownerOperator",
               loss_payee_name AS "lossPayeeName", loss_payee_address AS "lossPayeeAddress",
               loss_payee_city AS "lossPayeeCity", loss_payee_state AS "lossPayeeState",
               loss_payee_zip AS "lossPayeeZip", status,
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM insurance_trucks ORDER BY unit_number
      `);
      const trailers2 = await pool.query(`
        SELECT id, unit_number AS "unitNumber", 'trailer' AS "unitType",
               year, make, model, vin, physical_damage AS "physicalDamage",
               specific_type AS "specificType",
               loss_payee_name AS "lossPayeeName", loss_payee_address AS "lossPayeeAddress",
               loss_payee_city AS "lossPayeeCity", loss_payee_state AS "lossPayeeState",
               loss_payee_zip AS "lossPayeeZip", status,
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM insurance_trailers ORDER BY unit_number
      `);
      res.json([...trucks2.rows, ...trailers2.rows]);
    } catch (error) {
      console.error("Failed to fetch insurance records:", error);
      res.status(500).json({ error: "Failed to fetch insurance records" });
    }
  });
  app2.get("/api/insurance/:id", async (req, res) => {
    try {
      const truck = await pool.query(
        `SELECT id, unit_number AS "unitNumber", 'truck' AS "unitType",
                year, make, model, vin, physical_damage AS "physicalDamage",
                status, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM insurance_trucks WHERE id = $1`,
        [req.params.id]
      );
      if (truck.rows.length > 0) return res.json(truck.rows[0]);
      const trailer = await pool.query(
        `SELECT id, unit_number AS "unitNumber", 'trailer' AS "unitType",
                year, make, model, vin, physical_damage AS "physicalDamage",
                status, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM insurance_trailers WHERE id = $1`,
        [req.params.id]
      );
      if (trailer.rows.length > 0) return res.json(trailer.rows[0]);
      res.status(404).json({ error: "Record not found" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch record" });
    }
  });
  app2.post("/api/insurance", async (req, res) => {
    try {
      const { unitNumber, unitType, year, make, model, vin, physicalDamage, lossPayeeName, status } = req.body;
      if (!unitNumber || !unitType) {
        return res.status(400).json({ error: "Unit number and type are required" });
      }
      if (unitType === "truck") {
        const result = await pool.query(
          `INSERT INTO insurance_trucks (unit_number, year, make, model, vin, physical_damage, loss_payee_name, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (unit_number) DO UPDATE SET
             year=EXCLUDED.year, make=EXCLUDED.make, model=EXCLUDED.model, vin=EXCLUDED.vin,
             physical_damage=EXCLUDED.physical_damage, loss_payee_name=EXCLUDED.loss_payee_name,
             status=EXCLUDED.status, updated_at=NOW()
           RETURNING id, unit_number AS "unitNumber", 'truck' AS "unitType", year, make, model, vin,
                     physical_damage AS "physicalDamage", status, created_at AS "createdAt"`,
          [unitNumber, year || null, make || null, model || null, vin || null, physicalDamage || null, lossPayeeName || null, status || "active"]
        );
        return res.status(201).json(result.rows[0]);
      } else {
        const result = await pool.query(
          `INSERT INTO insurance_trailers (unit_number, year, make, model, vin, physical_damage, loss_payee_name, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (unit_number) DO UPDATE SET
             year=EXCLUDED.year, make=EXCLUDED.make, model=EXCLUDED.model, vin=EXCLUDED.vin,
             physical_damage=EXCLUDED.physical_damage, loss_payee_name=EXCLUDED.loss_payee_name,
             status=EXCLUDED.status, updated_at=NOW()
           RETURNING id, unit_number AS "unitNumber", 'trailer' AS "unitType", year, make, model, vin,
                     physical_damage AS "physicalDamage", status, created_at AS "createdAt"`,
          [unitNumber, year || null, make || null, model || null, vin || null, physicalDamage || null, lossPayeeName || null, status || "active"]
        );
        return res.status(201).json(result.rows[0]);
      }
    } catch (error) {
      console.error("Failed to create insurance record:", error);
      res.status(500).json({ error: "Failed to create insurance record" });
    }
  });
  app2.patch("/api/insurance/:id", async (req, res) => {
    try {
      const { unitNumber, year, make, model, vin, physicalDamage, lossPayeeName, status, unitType } = req.body;
      const table = unitType === "trailer" ? "insurance_trailers" : "insurance_trucks";
      await pool.query(
        `UPDATE ${table} SET unit_number=$1, year=$2, make=$3, model=$4, vin=$5,
         physical_damage=$6, loss_payee_name=$7, status=$8, updated_at=NOW() WHERE id=$9`,
        [unitNumber, year, make, model, vin, physicalDamage || null, lossPayeeName || null, status, req.params.id]
      );
      res.json({ message: "Record updated" });
    } catch (error) {
      console.error("Failed to update insurance record:", error);
      res.status(500).json({ error: "Failed to update record" });
    }
  });
  app2.delete("/api/insurance/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM insurance_trucks WHERE id = $1", [req.params.id]);
      await pool.query("DELETE FROM insurance_trailers WHERE id = $1", [req.params.id]);
      res.json({ message: "Record deleted" });
    } catch (error) {
      console.error("Failed to delete insurance record:", error);
      res.status(500).json({ error: "Failed to delete record" });
    }
  });
  app2.get("/api/trailers", async (req, res) => {
    try {
      const trailers2 = await storage.getAllTrailers(req.user?.divisionId || void 0);
      res.json(trailers2);
    } catch (error) {
      console.error("Error fetching trailers:", error);
      res.status(500).json({ error: "Failed to fetch trailers", details: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/trailers/:id", async (req, res) => {
    const trailer = await storage.getTrailer(req.params.id);
    if (!trailer) {
      return res.status(404).json({ error: "Trailer not found" });
    }
    res.json(trailer);
  });
  app2.post("/api/trailers", async (req, res) => {
    try {
      const validatedData = insertTrailerSchema.parse(req.body);
      const trailer = await storage.createTrailer(validatedData, req.user?.divisionId || void 0);
      res.status(201).json(trailer);
    } catch (error) {
      console.error("Trailer validation error:", error);
      res.status(400).json({ error: "Invalid trailer data", details: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.patch("/api/trailers/:id", async (req, res) => {
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
  app2.delete("/api/trailers/:id", async (req, res) => {
    const deleted = await storage.deleteTrailer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Trailer not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/trailers/:trailerId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getTrailerAssignments(req.params.trailerId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });
  app2.post("/api/trailers/:trailerId/assignments", async (req, res) => {
    try {
      const { insertTrailerTruckAssignmentSchema: insertTrailerTruckAssignmentSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const data = insertTrailerTruckAssignmentSchema2.parse({
        ...req.body,
        trailerId: req.params.trailerId
      });
      const assignment = await storage.createTrailerAssignment(data);
      if (!data.endDate) {
        await storage.updateTrailer(req.params.trailerId, { haulingTruckId: data.truckId });
      }
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ error: "Invalid assignment data", details: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.patch("/api/trailer-assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.updateTrailerAssignment(req.params.id, req.body);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ error: "Failed to update assignment" });
    }
  });
  app2.delete("/api/trailer-assignments/:id", async (req, res) => {
    const deleted = await storage.deleteTrailerAssignment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/trailers/:trailerId/dot-inspections", async (req, res) => {
    try {
      const inspections2 = await storage.getTrailerDotInspections(req.params.trailerId);
      res.json(inspections2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch DOT inspections" });
    }
  });
  app2.post("/api/trailers/:trailerId/dot-inspections", async (req, res) => {
    try {
      const data = insertTrailerDotInspectionSchema.parse({
        ...req.body,
        trailerId: req.params.trailerId
      });
      const inspection = await storage.createTrailerDotInspection(data);
      res.status(201).json(inspection);
    } catch (error) {
      res.status(400).json({ error: "Invalid inspection data", details: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.patch("/api/trailer-dot-inspections/:id", async (req, res) => {
    try {
      const inspection = await storage.updateTrailerDotInspection(req.params.id, req.body);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      res.status(400).json({ error: "Failed to update inspection" });
    }
  });
  app2.delete("/api/trailer-dot-inspections/:id", async (req, res) => {
    const deleted = await storage.deleteTrailerDotInspection(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Inspection not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/drivers", async (req, res) => {
    const drivers2 = await storage.getAllDrivers(req.user?.divisionId || void 0);
    res.json(drivers2);
  });
  app2.get("/api/drivers/:id", async (req, res) => {
    const driver = await storage.getDriver(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }
    res.json(driver);
  });
  app2.post("/api/drivers/signup", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.parse({
        ...req.body,
        status: "Active"
        // Default status for new drivers
      });
      const existingDriver = await storage.getDriverByEmail(validatedData.email);
      if (existingDriver) {
        return res.status(409).json({ message: "A driver with this email already exists" });
      }
      const existingLicense = await storage.getDriverByLicense(validatedData.licenseNumber);
      if (existingLicense) {
        return res.status(409).json({ message: "A driver with this CDL license number already exists" });
      }
      if (validatedData.password) {
        validatedData.password = await bcrypt3.hash(validatedData.password, 12);
      }
      const driver = await storage.createDriver(validatedData);
      res.status(201).json({
        message: "Driver account created successfully",
        driver: { id: driver.id, name: driver.name, email: driver.email }
      });
    } catch (error) {
      console.error("Driver signup error:", error);
      res.status(400).json({ message: error.message || "Invalid driver data" });
    }
  });
  app2.post("/api/drivers", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.parse(req.body);
      if (validatedData.password) {
        validatedData.password = await bcrypt3.hash(validatedData.password, 12);
      }
      const driver = await storage.createDriver(validatedData, req.user?.divisionId || void 0);
      res.status(201).json(driver);
    } catch (error) {
      console.error("Driver validation error:", error);
      if (error?.code === "23505") {
        const detail = error?.detail || "";
        if (detail.includes("license_number")) {
          return res.status(409).json({ error: "A driver with this CDL license number already exists." });
        }
        if (detail.includes("email")) {
          return res.status(409).json({ error: "A driver with this email address already exists." });
        }
        return res.status(409).json({ error: "A driver with this information already exists." });
      }
      res.status(400).json({ error: error.message || "Invalid driver data" });
    }
  });
  app2.patch("/api/drivers/:id", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.partial().parse(req.body);
      if (validatedData.password) {
        validatedData.password = await bcrypt3.hash(validatedData.password, 12);
      }
      const driver = await storage.updateDriver(req.params.id, validatedData);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      console.error("Driver update error:", error);
      res.status(400).json({ error: "Invalid driver data", details: error.message });
    }
  });
  app2.delete("/api/drivers/:id", async (req, res) => {
    const deleted = await storage.deleteDriver(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Driver not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/customers", async (req, res) => {
    const customers2 = await storage.getAllCustomers(req.user?.divisionId || void 0);
    res.json(customers2);
  });
  app2.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  });
  app2.post("/api/customers", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData, req.user?.divisionId || void 0);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });
  app2.patch("/api/customers/:id", async (req, res) => {
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
  app2.delete("/api/customers/:id", async (req, res) => {
    const deleted = await storage.deleteCustomer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.status(204).send();
  });
  app2.post("/api/extract-load", async (req, res) => {
    try {
      const { fileData, fileType } = req.body;
      if (!fileData || !fileType) {
        return res.status(400).json({ error: "Missing file data or type" });
      }
      const base64Content = fileData.split(",")[1] || fileData;
      const sizeInBytes = base64Content.length * 3 / 4;
      const maxSizeBytes = 5 * 1024 * 1024;
      if (sizeInBytes > maxSizeBytes) {
        return res.status(413).json({
          error: `File is too large. Maximum size is 5MB due to AI processing limits.`
        });
      }
      console.log(`[AI Extract] Starting extraction for file type: ${fileType}`);
      const extractedData = await extractLoadFromDocument(fileData, fileType);
      console.log(`[AI Extract] Extraction successful. Broker info: ${extractedData.brokerName ? "Yes" : "No"}`);
      let customerId;
      if (extractedData.brokerName) {
        const normalizeName = (name) => {
          return name.toLowerCase().trim().replace(/[.,\-_()]/g, "").replace(/\s+/g, " ").trim();
        };
        const cleanBrokerAddress = (address) => {
          if (!address) return null;
          const lowerAddress = address.toLowerCase();
          if (lowerAddress.includes("not explicitly mentioned") || lowerAddress.includes("not mentioned") || lowerAddress.includes("not found") || lowerAddress.includes("not available") || lowerAddress.includes("not provided") || lowerAddress.includes("n/a") || lowerAddress.includes("unknown") || address.trim().length < 5) {
            return null;
          }
          return address;
        };
        const cleanedBrokerAddress = cleanBrokerAddress(extractedData.brokerAddress);
        const normalizedBrokerName = normalizeName(extractedData.brokerName);
        const existingCustomers = await storage.getAllCustomers();
        const existingCustomer = existingCustomers.find(
          (c) => normalizeName(c.name) === normalizedBrokerName
        );
        if (existingCustomer) {
          customerId = existingCustomer.id;
          console.log(`[AI Extract] Found existing customer: ${existingCustomer.name} (ID: ${existingCustomer.id})`);
        } else {
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
            notes: "Auto-created from AI extraction"
          }, req.user?.divisionId || void 0);
          customerId = newCustomer.id;
          console.log(`[AI Extract] Created new customer: ${newCustomer.name} (ID: ${newCustomer.id})`);
        }
      }
      res.json({
        ...extractedData,
        customerId
      });
    } catch (error) {
      console.error("[AI Extract] Error extracting load:", error);
      console.error("[AI Extract] Error details:", {
        message: error?.message,
        stack: error?.stack,
        fileType: req.body?.fileType
      });
      let errorMessage = error.message || "Failed to extract load data";
      if (error.message?.includes("data:")) {
        errorMessage = "Invalid file format. Please ensure you're uploading a valid image file.";
      } else if (error.message?.includes("OpenAI") || error.message?.includes("AI")) {
        errorMessage = "AI extraction service error. Please try again or contact support.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ error: "Invalid document data" });
    }
  });
  app2.get("/api/documents/load/:loadId", async (req, res) => {
    const documents2 = await storage.getDocumentsByLoad(req.params.loadId);
    res.json(documents2);
  });
  app2.get("/api/expenses", async (_req, res) => {
    const expenses2 = await storage.getAllExpenses();
    res.json(expenses2);
  });
  app2.get("/api/expenses/:id", async (req, res) => {
    const expense = await storage.getExpense(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json(expense);
  });
  app2.get("/api/expenses/load/:loadId", async (req, res) => {
    const expenses2 = await storage.getExpensesByLoad(req.params.loadId);
    res.json(expenses2);
  });
  app2.post("/api/expenses", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid expense data" });
    }
  });
  app2.patch("/api/expenses/:id", async (req, res) => {
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
  app2.delete("/api/expenses/:id", async (req, res) => {
    const deleted = await storage.deleteExpense(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/invoices", async (req, res) => {
    const invoices2 = await storage.getAllInvoices(req.user?.divisionId || void 0);
    res.json(invoices2);
  });
  app2.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  });
  app2.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData, req.user?.divisionId || void 0);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });
  app2.patch("/api/invoices/:id", async (req, res) => {
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
  app2.delete("/api/invoices/:id", async (req, res) => {
    const deleted = await storage.deleteInvoice(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(204).send();
  });
  app2.post("/api/accounting/factoring-email", async (req, res) => {
    try {
      console.log("[Factoring Email] Request received:", {
        to: req.body.to,
        from: req.body.from,
        subject: req.body.subject,
        invoiceId: req.body.invoiceId,
        loadId: req.body.loadId,
        attachPods: req.body.attachPods,
        hasPdf: !!req.body.invoicePdf
      });
      const schema = z3.object({
        to: z3.string().email(),
        cc: z3.string().email().optional(),
        from: z3.string().email().optional(),
        subject: z3.string().min(1),
        message: z3.string().min(1),
        invoiceId: z3.string(),
        loadId: z3.string().optional(),
        invoicePdf: z3.string().optional(),
        // base64 encoded PDF
        attachPods: z3.boolean().default(false),
        invoiceAttachments: z3.array(z3.any()).optional()
        // invoice attachments (rate confirmations, BOLs, etc.)
      });
      const validatedData = schema.parse(req.body);
      const invoice = await storage.getInvoice(validatedData.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      const attachments = [];
      if (validatedData.invoicePdf) {
        const pdfBuffer = Buffer.from(validatedData.invoicePdf, "base64");
        attachments.push({
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          type: "application/pdf"
        });
      }
      if (validatedData.invoiceAttachments && Array.isArray(validatedData.invoiceAttachments)) {
        validatedData.invoiceAttachments.forEach((attachment2, index2) => {
          if (attachment2.data) {
            const base64Data = attachment2.data.includes(",") ? attachment2.data.split(",")[1] : attachment2.data;
            const attachmentBuffer = Buffer.from(base64Data, "base64");
            attachments.push({
              filename: attachment2.filename || `Attachment-${index2 + 1}.${attachment2.type?.split("/")[1] || "pdf"}`,
              content: attachmentBuffer,
              type: attachment2.type || "application/pdf"
            });
          }
        });
      }
      if (validatedData.attachPods && validatedData.loadId) {
        const load = await storage.getLoad(validatedData.loadId);
        if (load && load.podAttachments) {
          const pods = Array.isArray(load.podAttachments) ? load.podAttachments : [];
          pods.forEach((pod, index2) => {
            if (pod.data) {
              const base64Data = pod.data.includes(",") ? pod.data.split(",")[1] : pod.data;
              const podBuffer = Buffer.from(base64Data, "base64");
              attachments.push({
                filename: pod.filename || `POD-${index2 + 1}.${pod.type?.split("/")[1] || "pdf"}`,
                content: podBuffer,
                type: pod.type || "application/pdf"
              });
            }
          });
        }
      }
      const ccRecipients = [];
      if (validatedData.cc) ccRecipients.push(validatedData.cc);
      if (validatedData.from) ccRecipients.push(validatedData.from);
      const gmailStatus = await getGmailStatus();
      let emailResult;
      if (gmailStatus.connected) {
        emailResult = await sendViaGmail({
          to: validatedData.to,
          cc: ccRecipients.length > 0 ? ccRecipients : void 0,
          subject: validatedData.subject,
          html: validatedData.message.replace(/\n/g, "<br>"),
          attachments: attachments.length > 0 ? attachments : void 0
        });
        if (!emailResult.success) {
          console.warn("[Factoring Email] Gmail failed, falling back to Resend:", emailResult.error);
          emailResult = await sendEmail({
            to: validatedData.to,
            cc: ccRecipients.length > 0 ? ccRecipients : void 0,
            from: validatedData.from,
            subject: validatedData.subject,
            html: validatedData.message.replace(/\n/g, "<br>"),
            attachments: attachments.length > 0 ? attachments : void 0
          });
        }
      } else {
        emailResult = await sendEmail({
          to: validatedData.to,
          cc: ccRecipients.length > 0 ? ccRecipients : void 0,
          from: validatedData.from,
          subject: validatedData.subject,
          html: validatedData.message.replace(/\n/g, "<br>"),
          attachments: attachments.length > 0 ? attachments : void 0
        });
      }
      if (!emailResult.success) {
        console.error("[Factoring Email] Send failed:", emailResult.error);
        return res.status(500).json({ error: "Failed to send email", details: emailResult.error });
      }
      try {
        await storage.createSentEmail({
          invoiceId: validatedData.invoiceId,
          invoiceNumber: invoice?.invoiceNumber || void 0,
          toEmail: validatedData.to,
          ccEmails: ccRecipients.length > 0 ? ccRecipients.join(", ") : void 0,
          subject: validatedData.subject
        });
      } catch (logErr) {
        console.error("[Factoring Email] Failed to log sent email:", logErr);
      }
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("[Factoring Email] Error:", error);
      res.status(400).json({ error: "Invalid request data" });
    }
  });
  app2.get("/api/accounting/sent-emails", async (_req, res) => {
    const records = await storage.getAllSentEmails();
    res.json(records);
  });
  app2.get("/api/payments", async (_req, res) => {
    const payments2 = await storage.getAllPayments();
    res.json(payments2);
  });
  app2.get("/api/payments/:id", async (req, res) => {
    const payment = await storage.getPayment(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(payment);
  });
  app2.get("/api/payments/invoice/:invoiceId", async (req, res) => {
    const payments2 = await storage.getPaymentsByInvoice(req.params.invoiceId);
    res.json(payments2);
  });
  app2.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ error: "Invalid payment data" });
    }
  });
  app2.patch("/api/payments/:id", async (req, res) => {
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
  app2.delete("/api/payments/:id", async (req, res) => {
    const deleted = await storage.deletePayment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/inspections", async (_req, res) => {
    const inspections2 = await storage.getAllInspections();
    res.json(inspections2);
  });
  app2.get("/api/inspections/:id", async (req, res) => {
    const inspection = await storage.getInspection(req.params.id);
    if (!inspection) {
      return res.status(404).json({ error: "Inspection not found" });
    }
    res.json(inspection);
  });
  app2.get("/api/inspections/truck/:truckId", async (req, res) => {
    const inspections2 = await storage.getInspectionsByTruck(req.params.truckId);
    res.json(inspections2);
  });
  app2.get("/api/inspections/driver/:driverId", async (req, res) => {
    const inspections2 = await storage.getInspectionsByDriver(req.params.driverId);
    res.json(inspections2);
  });
  app2.post("/api/inspections", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.parse(req.body);
      const inspection = await storage.createInspection(validatedData);
      res.status(201).json(inspection);
    } catch (error) {
      res.status(400).json({ error: "Invalid inspection data" });
    }
  });
  app2.patch("/api/inspections/:id", async (req, res) => {
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
  app2.delete("/api/inspections/:id", async (req, res) => {
    const deleted = await storage.deleteInspection(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Inspection not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/accidents", async (_req, res) => {
    const accidents2 = await storage.getAllAccidents();
    res.json(accidents2);
  });
  app2.get("/api/accidents/:id", async (req, res) => {
    const accident = await storage.getAccident(req.params.id);
    if (!accident) {
      return res.status(404).json({ error: "Accident not found" });
    }
    res.json(accident);
  });
  app2.get("/api/accidents/driver/:driverId", async (req, res) => {
    const accidents2 = await storage.getAccidentsByDriver(req.params.driverId);
    res.json(accidents2);
  });
  app2.post("/api/accidents", async (req, res) => {
    try {
      const validatedData = insertAccidentSchema.parse(req.body);
      const accident = await storage.createAccident(validatedData);
      res.status(201).json(accident);
    } catch (error) {
      console.error("[Accident] Create error:", error?.message, error?.issues ?? "");
      res.status(400).json({ error: "Invalid accident data", details: error?.message });
    }
  });
  app2.patch("/api/accidents/:id", async (req, res) => {
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
  app2.delete("/api/accidents/:id", async (req, res) => {
    const deleted = await storage.deleteAccident(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Accident not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/violations", async (_req, res) => {
    const violations2 = await storage.getAllViolations();
    res.json(violations2);
  });
  app2.get("/api/violations/:id", async (req, res) => {
    const violation = await storage.getViolation(req.params.id);
    if (!violation) {
      return res.status(404).json({ error: "Violation not found" });
    }
    res.json(violation);
  });
  app2.get("/api/violations/driver/:driverId", async (req, res) => {
    const violations2 = await storage.getViolationsByDriver(req.params.driverId);
    res.json(violations2);
  });
  app2.post("/api/violations", async (req, res) => {
    try {
      const validatedData = insertViolationSchema.parse(req.body);
      const violation = await storage.createViolation(validatedData);
      res.status(201).json(violation);
    } catch (error) {
      res.status(400).json({ error: "Invalid violation data" });
    }
  });
  app2.patch("/api/violations/:id", async (req, res) => {
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
  app2.delete("/api/violations/:id", async (req, res) => {
    const deleted = await storage.deleteViolation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Violation not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/settlements", async (req, res) => {
    const settlements2 = await storage.getAllSettlements(req.user?.divisionId || void 0);
    res.json(settlements2);
  });
  app2.get("/api/settlements/:id", async (req, res) => {
    const settlement = await storage.getSettlement(req.params.id);
    if (!settlement) {
      return res.status(404).json({ error: "Settlement not found" });
    }
    res.json(settlement);
  });
  app2.get("/api/settlements/driver/:driverId", async (req, res) => {
    const settlements2 = await storage.getSettlementsByDriver(req.params.driverId);
    res.json(settlements2);
  });
  app2.post("/api/settlements", async (req, res) => {
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
  app2.patch("/api/settlements/:id", async (req, res) => {
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
  app2.delete("/api/settlements/:id", async (req, res) => {
    const deleted = await storage.deleteSettlement(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Settlement not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/settlements/:settlementId/line-items", async (req, res) => {
    const lineItems = await storage.getSettlementLineItems(req.params.settlementId);
    res.json(lineItems);
  });
  app2.post("/api/settlements/:settlementId/line-items", async (req, res) => {
    try {
      const { insertSettlementLineItemSchema: insertSettlementLineItemSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertSettlementLineItemSchema2.parse({
        ...req.body,
        settlementId: req.params.settlementId
      });
      const lineItem = await storage.createSettlementLineItem(validatedData);
      res.status(201).json(lineItem);
    } catch (error) {
      console.error("Line item validation error:", error);
      res.status(400).json({ error: "Invalid line item data", details: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.patch("/api/settlement-line-items/:id", async (req, res) => {
    try {
      const { insertSettlementLineItemSchema: insertSettlementLineItemSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertSettlementLineItemSchema2.partial().parse(req.body);
      const lineItem = await storage.updateSettlementLineItem(req.params.id, validatedData);
      if (!lineItem) {
        return res.status(404).json({ error: "Line item not found" });
      }
      res.json(lineItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid line item data" });
    }
  });
  app2.delete("/api/settlement-line-items/:id", async (req, res) => {
    const deleted = await storage.deleteSettlementLineItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Line item not found" });
    }
    res.status(204).send();
  });
  app2.post("/api/settlements/auto-generate", async (req, res) => {
    try {
      const { driverId, periodStart, periodEnd, payRate } = req.body;
      if (!driverId || !periodStart || !periodEnd) {
        return res.status(400).json({ error: "driverId, periodStart, and periodEnd are required" });
      }
      const allLoads = await storage.getAllLoads();
      const driverLoads = allLoads.filter(
        (load) => load.assignedDriverId === driverId && load.status === "Delivered" && new Date(load.deliveryDate) >= new Date(periodStart) && new Date(load.deliveryDate) <= new Date(periodEnd)
      );
      if (driverLoads.length === 0) {
        return res.status(404).json({ error: "No delivered loads found for this driver in the period" });
      }
      const totalRevenue = driverLoads.reduce((sum, load) => sum + parseFloat(load.rate.toString()), 0);
      const totalMiles = driverLoads.reduce((sum, load) => sum + (load.weight || 0), 0);
      const rateValue = parseFloat(payRate || "0.70");
      const driverPay = payRate && payRate < 10 ? totalRevenue * rateValue : totalMiles * rateValue;
      const recurringExpenses2 = await storage.getActiveRecurringExpenses(driverId);
      const deductions = recurringExpenses2.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
      const netPay = driverPay - deductions;
      const today = /* @__PURE__ */ new Date();
      const settlementNumber = `SETTLE-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 1e4)).padStart(4, "0")}`;
      const settlement = await storage.createSettlement({
        driverId,
        settlementNumber,
        periodStart,
        periodEnd,
        totalMiles,
        totalRevenue: totalRevenue.toFixed(2),
        driverPayPercentage: (rateValue * 100).toFixed(2),
        // Convert to percentage
        deductions: deductions.toFixed(2),
        netPay: netPay.toFixed(2),
        status: "Pending"
      });
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
          itemType: "revenue"
        });
      }
      for (const expense of recurringExpenses2) {
        await storage.createSettlementLineItem({
          settlementId: settlement.id,
          description: `${expense.name} - ${expense.description || expense.category}`,
          amount: `-${expense.amount}`,
          itemType: "deduction"
        });
      }
      res.status(201).json(settlement);
    } catch (error) {
      console.error("Error auto-generating settlement:", error);
      res.status(500).json({ error: "Failed to auto-generate settlement" });
    }
  });
  app2.get("/api/recurring-expenses", async (_req, res) => {
    const expenses2 = await storage.getAllRecurringExpenses();
    res.json(expenses2);
  });
  app2.get("/api/recurring-expenses/:id", async (req, res) => {
    const expense = await storage.getRecurringExpense(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: "Recurring expense not found" });
    }
    res.json(expense);
  });
  app2.get("/api/recurring-expenses/driver/:driverId", async (req, res) => {
    const expenses2 = await storage.getRecurringExpensesByDriver(req.params.driverId);
    res.json(expenses2);
  });
  app2.get("/api/recurring-expenses/active/:driverId?", async (req, res) => {
    const expenses2 = await storage.getActiveRecurringExpenses(req.params.driverId);
    res.json(expenses2);
  });
  app2.post("/api/recurring-expenses", async (req, res) => {
    try {
      const { insertRecurringExpenseSchema: insertRecurringExpenseSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertRecurringExpenseSchema2.parse(req.body);
      const expense = await storage.createRecurringExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid recurring expense data" });
    }
  });
  app2.patch("/api/recurring-expenses/:id", async (req, res) => {
    try {
      const { insertRecurringExpenseSchema: insertRecurringExpenseSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertRecurringExpenseSchema2.partial().parse(req.body);
      const expense = await storage.updateRecurringExpense(req.params.id, validatedData);
      if (!expense) {
        return res.status(404).json({ error: "Recurring expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid recurring expense data" });
    }
  });
  app2.delete("/api/recurring-expenses/:id", async (req, res) => {
    const deleted = await storage.deleteRecurringExpense(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Recurring expense not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/maintenance", async (_req, res) => {
    const maintenance2 = await storage.getAllMaintenance();
    res.json(maintenance2);
  });
  app2.get("/api/maintenance/:id", async (req, res) => {
    const record = await storage.getMaintenance(req.params.id);
    if (!record) {
      return res.status(404).json({ error: "Maintenance record not found" });
    }
    res.json(record);
  });
  app2.get("/api/maintenance/truck/:truckId", async (req, res) => {
    const maintenance2 = await storage.getMaintenanceByTruck(req.params.truckId);
    res.json(maintenance2);
  });
  app2.post("/api/maintenance", async (req, res) => {
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
  app2.patch("/api/maintenance/:id", async (req, res) => {
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
  app2.delete("/api/maintenance/:id", async (req, res) => {
    const deleted = await storage.deleteMaintenance(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Maintenance record not found" });
    }
    res.status(204).send();
  });
  app2.post("/api/maintenance/check-reminders", async (_req, res) => {
    try {
      const { checkAndSendMaintenanceReminders: checkAndSendMaintenanceReminders2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      const result = await checkAndSendMaintenanceReminders2(
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
  app2.get("/api/fuel-cards", async (_req, res) => {
    const cards = await storage.getAllFuelCards();
    res.json(cards);
  });
  app2.get("/api/fuel-cards/:id", async (req, res) => {
    const card = await storage.getFuelCard(req.params.id);
    if (!card) {
      return res.status(404).json({ error: "Fuel card not found" });
    }
    res.json(card);
  });
  app2.post("/api/fuel-cards", async (req, res) => {
    try {
      const validatedData = insertFuelCardSchema.parse(req.body);
      const card = await storage.createFuelCard(validatedData);
      res.status(201).json(card);
    } catch (error) {
      res.status(400).json({ error: "Invalid fuel card data" });
    }
  });
  app2.patch("/api/fuel-cards/:id", async (req, res) => {
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
  app2.delete("/api/fuel-cards/:id", async (req, res) => {
    const deleted = await storage.deleteFuelCard(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Fuel card not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/fuel", async (_req, res) => {
    const transactions = await storage.getAllFuelTransactions();
    res.json(transactions);
  });
  app2.get("/api/fuel/:id", async (req, res) => {
    const transaction = await storage.getFuelTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Fuel transaction not found" });
    }
    res.json(transaction);
  });
  app2.get("/api/fuel/truck/:truckId", async (req, res) => {
    const transactions = await storage.getFuelTransactionsByTruck(req.params.truckId);
    res.json(transactions);
  });
  app2.get("/api/fuel/driver/:driverId", async (req, res) => {
    const transactions = await storage.getFuelTransactionsByDriver(req.params.driverId);
    res.json(transactions);
  });
  app2.get("/api/fuel/load/:loadId", async (req, res) => {
    const transactions = await storage.getFuelTransactionsByLoad(req.params.loadId);
    res.json(transactions);
  });
  app2.post("/api/fuel", async (req, res) => {
    try {
      const validatedData = insertFuelTransactionSchema.parse(req.body);
      const transaction = await storage.createFuelTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid fuel transaction data" });
    }
  });
  app2.patch("/api/fuel/:id", async (req, res) => {
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
  app2.delete("/api/fuel/:id", async (req, res) => {
    const deleted = await storage.deleteFuelTransaction(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Fuel transaction not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/gps", async (_req, res) => {
    const locations = await storage.getAllGpsLocations();
    res.json(locations);
  });
  app2.get("/api/gps/latest", async (_req, res) => {
    const locations = await storage.getLatestGpsLocations();
    res.json(locations);
  });
  app2.patch("/api/drivers/:id/gps", async (req, res) => {
    try {
      const { gpsEnabled } = req.body;
      if (typeof gpsEnabled !== "boolean") {
        return res.status(400).json({ error: "gpsEnabled must be a boolean" });
      }
      const driver = await storage.updateDriver(req.params.id, {
        gpsEnabled: gpsEnabled ? "true" : "false"
      });
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      if (gpsEnabled && driver.gpsNotificationsEnabled === "true") {
        sendGPSEnabledNotification(driver).catch((error) => {
          console.error("Failed to send GPS enabled notification:", error);
        });
      }
      res.json({
        message: `GPS tracking ${gpsEnabled ? "enabled" : "disabled"} for ${driver.name}`,
        driver
      });
    } catch (error) {
      console.error("GPS toggle error:", error);
      res.status(500).json({ error: "Failed to update GPS tracking status" });
    }
  });
  app2.get("/api/gps/driver/:driverId", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
    const locations = await storage.getGpsLocationsByDriver(req.params.driverId, limit);
    res.json(locations);
  });
  app2.get("/api/gps/truck/:truckId", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
    const locations = await storage.getGpsLocationsByTruck(req.params.truckId, limit);
    res.json(locations);
  });
  app2.get("/api/gps/load/:loadId", async (req, res) => {
    const locations = await storage.getGpsLocationsByLoad(req.params.loadId);
    res.json(locations);
  });
  app2.post("/api/gps", async (req, res) => {
    try {
      const validatedData = insertGpsLocationSchema.parse(req.body);
      const location = await storage.createGpsLocation(validatedData);
      if (validatedData.driverId) {
        await storage.updateDriver(validatedData.driverId, {
          lastGpsUpdate: /* @__PURE__ */ new Date()
        });
      }
      res.status(201).json(location);
    } catch (error) {
      res.status(400).json({ error: "Invalid GPS location data" });
    }
  });
  app2.get("/api/notifications", async (_req, res) => {
    const notifications2 = await storage.getAllNotifications();
    res.json(notifications2);
  });
  app2.get("/api/notifications/unread", async (_req, res) => {
    const notifications2 = await storage.getUnreadNotifications();
    res.json(notifications2);
  });
  app2.patch("/api/notifications/:id/read", async (req, res) => {
    const success = await storage.markNotificationAsRead(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json({ success: true });
  });
  app2.delete("/api/notifications/:id", async (req, res) => {
    const deleted = await storage.deleteNotification(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(204).send();
  });
  app2.post("/api/gps/send-reminders", isAdmin, async (req, res) => {
    try {
      const drivers2 = await storage.getAllDrivers();
      const now = /* @__PURE__ */ new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
      const remindersToSend = drivers2.filter((driver) => {
        if (driver.gpsEnabled !== "true" || driver.gpsNotificationsEnabled !== "true") {
          return false;
        }
        if (!driver.lastGpsUpdate) {
          return true;
        }
        const lastUpdate = new Date(driver.lastGpsUpdate);
        if (lastUpdate < twentyFourHoursAgo) {
          return true;
        }
        return false;
      });
      const results = await Promise.allSettled(
        remindersToSend.map(async (driver) => {
          await sendGPSReminderNotification(driver);
          await storage.updateDriver(driver.id, {
            lastGpsNotificationSent: /* @__PURE__ */ new Date()
          });
        })
      );
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      res.json({
        message: "GPS reminders sent",
        total: remindersToSend.length,
        successful,
        failed
      });
    } catch (error) {
      console.error("GPS reminder error:", error);
      res.status(500).json({ error: "Failed to send GPS reminders" });
    }
  });
  app2.get("/api/automation/settings", async (_req, res) => {
    const settings = await storage.getAllAutomationSettings();
    res.json(settings);
  });
  app2.patch("/api/automation/settings/:name", async (req, res) => {
    try {
      const validData = z3.object({
        enabled: z3.enum(["true", "false"]).optional(),
        config: z3.record(z3.any()).optional()
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
  app2.post("/api/automation/check-expiring", async (_req, res) => {
    try {
      await checkExpiringDocuments();
      res.json({ success: true, message: "Expiring documents checked successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to check expiring documents" });
    }
  });
  app2.get("/api/activity-log", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const logs = await storage.getAllActivityLogs(limit);
    res.json(logs);
  });
  app2.get("/api/short-pays", async (_req, res) => {
    const shortPays2 = await storage.getAllShortPays();
    res.json(shortPays2);
  });
  app2.get("/api/short-pays/:id", async (req, res) => {
    const shortPay = await storage.getShortPay(req.params.id);
    if (!shortPay) {
      return res.status(404).json({ error: "Short pay not found" });
    }
    res.json(shortPay);
  });
  app2.get("/api/short-pays/customer/:customerId", async (req, res) => {
    const shortPays2 = await storage.getShortPaysByCustomer(req.params.customerId);
    res.json(shortPays2);
  });
  app2.get("/api/short-pays/status/:status", async (req, res) => {
    const shortPays2 = await storage.getShortPaysByStatus(req.params.status);
    res.json(shortPays2);
  });
  app2.post("/api/short-pays", async (req, res) => {
    try {
      const load = await storage.getLoad(req.body.loadId);
      const customer = await storage.getCustomer(req.body.customerId);
      if (!load || !customer) {
        return res.status(400).json({ error: "Invalid load or customer" });
      }
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
        resolvedAt: req.body.resolutionDate ? new Date(req.body.resolutionDate) : null
      };
      const validatedData = insertShortPaySchema.parse(shortPayData);
      const shortPay = await storage.createShortPay(validatedData);
      res.status(201).json(shortPay);
    } catch (error) {
      console.error("Short pay creation error:", error);
      res.status(400).json({ error: "Invalid short pay data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.patch("/api/short-pays/:id", async (req, res) => {
    try {
      const updateData = {};
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
      if (req.body.originalAmount) updateData.expectedAmount = req.body.originalAmount;
      if (req.body.paidAmount) updateData.paidAmount = req.body.paidAmount;
      if (req.body.shortPayAmount) updateData.shortAmount = req.body.shortPayAmount;
      if (req.body.reason) updateData.reason = req.body.reason;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.notes !== void 0) updateData.notes = req.body.notes;
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
  app2.delete("/api/short-pays/:id", async (req, res) => {
    const success = await storage.deleteShortPay(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Short pay not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/charge-backs", async (_req, res) => {
    const chargeBacks2 = await storage.getAllChargeBacks();
    res.json(chargeBacks2);
  });
  app2.get("/api/charge-backs/:id", async (req, res) => {
    const chargeBack = await storage.getChargeBack(req.params.id);
    if (!chargeBack) {
      return res.status(404).json({ error: "Charge back not found" });
    }
    res.json(chargeBack);
  });
  app2.get("/api/charge-backs/customer/:customerId", async (req, res) => {
    const chargeBacks2 = await storage.getChargeBacksByCustomer(req.params.customerId);
    res.json(chargeBacks2);
  });
  app2.get("/api/charge-backs/status/:status", async (req, res) => {
    const chargeBacks2 = await storage.getChargeBacksByStatus(req.params.status);
    res.json(chargeBacks2);
  });
  app2.post("/api/charge-backs", async (req, res) => {
    try {
      const load = await storage.getLoad(req.body.loadId);
      const customer = await storage.getCustomer(req.body.customerId);
      if (!load || !customer) {
        return res.status(400).json({ error: "Invalid load or customer" });
      }
      const chargeBackData = {
        loadId: req.body.loadId,
        loadNumber: load.loadNumber,
        customerId: req.body.customerId,
        customerName: customer.name,
        amount: req.body.amount,
        reason: req.body.reason,
        category: req.body.category || "other",
        status: req.body.status || "pending",
        submittedDate: req.body.chargeBackDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        resolvedDate: req.body.resolutionDate || null,
        resolution: req.body.resolution || null,
        notes: req.body.notes || null
      };
      const validatedData = insertChargeBackSchema.parse(chargeBackData);
      const chargeBack = await storage.createChargeBack(validatedData);
      res.status(201).json(chargeBack);
    } catch (error) {
      console.error("Charge back creation error:", error);
      res.status(400).json({ error: "Invalid charge back data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.patch("/api/charge-backs/:id", async (req, res) => {
    try {
      const updateData = {};
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
      if (req.body.amount) updateData.amount = req.body.amount;
      if (req.body.reason) updateData.reason = req.body.reason;
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.chargeBackDate) updateData.submittedDate = req.body.chargeBackDate;
      if (req.body.resolutionDate) updateData.resolvedDate = req.body.resolutionDate;
      if (req.body.resolution) updateData.resolution = req.body.resolution;
      if (req.body.notes !== void 0) updateData.notes = req.body.notes;
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
  app2.delete("/api/charge-backs/:id", async (req, res) => {
    const success = await storage.deleteChargeBack(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Charge back not found" });
    }
    res.status(204).send();
  });
  app2.post("/api/upload", async (req, res) => {
    try {
      const { file, filename } = req.body;
      if (!file || !filename) {
        return res.status(400).json({ error: "File and filename are required" });
      }
      const base64Data = file.replace(/^data:([A-Za-z-+\/]+);base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const timestamp2 = Date.now();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFilename = `${timestamp2}-${sanitizedFilename}`;
      const filePath = `uploaded_files/${uniqueFilename}`;
      const fs3 = await import("fs/promises");
      await fs3.writeFile(filePath, buffer);
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
  app2.get("/api/files/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `uploaded_files/${sanitizedFilename}`;
      const fs3 = await import("fs/promises");
      const path4 = await import("path");
      try {
        await fs3.access(filePath);
      } catch {
        return res.status(404).json({ error: "File not found" });
      }
      const ext = path4.extname(sanitizedFilename).toLowerCase();
      const contentTypes = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp"
      };
      const contentType = contentTypes[ext] || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${sanitizedFilename}"`);
      const fileBuffer = await fs3.readFile(filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("File serve error:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });
  app2.delete("/api/files/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `uploaded_files/${sanitizedFilename}`;
      const fs3 = await import("fs/promises");
      try {
        await fs3.unlink(filePath);
        res.json({ success: true });
      } catch {
        return res.status(404).json({ error: "File not found" });
      }
    } catch (error) {
      console.error("File delete error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });
  app2.get("/api/tasks", async (_req, res) => {
    const tasks2 = await storage.getAllTasks();
    res.json(tasks2);
  });
  app2.get("/api/tasks/:id", async (req, res) => {
    const task = await storage.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  });
  app2.post("/api/tasks", async (req, res) => {
    try {
      const { insertTaskSchema: insertTaskSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { sendSingleTaskReminder: sendSingleTaskReminder2 } = await Promise.resolve().then(() => (init_automation(), automation_exports));
      const validatedData = insertTaskSchema2.parse(req.body);
      const task = await storage.createTask(validatedData);
      if (task.repeatDaily === "true" && task.reminderEmail) {
        sendSingleTaskReminder2(task).catch(console.error);
      }
      res.status(201).json(task);
    } catch (error) {
      console.error("Task creation error:", error);
      res.status(400).json({ error: "Invalid task data", details: error.message });
    }
  });
  app2.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { insertTaskSchema: insertTaskSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { sendSingleTaskReminder: sendSingleTaskReminder2 } = await Promise.resolve().then(() => (init_automation(), automation_exports));
      const validatedData = insertTaskSchema2.partial().parse(req.body);
      const existingTask = await storage.getTask(req.params.id);
      const task = await storage.updateTask(req.params.id, validatedData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      const justEnabled = task.repeatDaily === "true" && task.reminderEmail && (existingTask?.repeatDaily !== "true" || existingTask?.reminderEmail !== task.reminderEmail);
      if (justEnabled) {
        sendSingleTaskReminder2(task).catch(console.error);
      }
      res.json(task);
    } catch (error) {
      console.error("Task update error:", error);
      res.status(400).json({ error: "Invalid task data", details: error.message });
    }
  });
  app2.delete("/api/tasks/:id", async (req, res) => {
    const success = await storage.deleteTask(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).send();
  });
  app2.get("/api/company-settings", async (_req, res) => {
    const settings = await storage.getCompanySettings();
    if (!settings) {
      return res.status(404).json({ error: "Company settings not found" });
    }
    res.json(settings);
  });
  app2.patch("/api/company-settings", async (req, res) => {
    try {
      const { insertCompanySettingsSchema: insertCompanySettingsSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertCompanySettingsSchema2.partial().parse(req.body);
      const settings = await storage.updateCompanySettings(validatedData);
      if (!settings) {
        return res.status(404).json({ error: "Failed to update company settings" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Company settings update error:", error);
      res.status(400).json({ error: "Invalid settings data", details: error.message });
    }
  });
  app2.get("/api/gmail/status", async (_req, res) => {
    try {
      const status = await getGmailStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ connected: false, error: err.message });
    }
  });
  app2.get("/api/gmail/oauth/connect", (req, res) => {
    try {
      const url = getGmailAuthUrl();
      res.redirect(url);
    } catch (err) {
      res.status(500).send("Failed to generate Gmail authorization URL: " + err.message);
    }
  });
  app2.get("/api/gmail/oauth/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) {
      return res.redirect("/company-settings?gmail=error");
    }
    try {
      await exchangeCodeAndSave(code);
      res.redirect("/company-settings?gmail=connected");
    } catch (err) {
      console.error("[Gmail OAuth] Callback error:", err.message);
      console.error("[Gmail OAuth] Full error details:", JSON.stringify({
        message: err.message,
        code: err.code,
        status: err.status,
        response: err.response?.data,
        clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...",
        redirectUri: process.env.GOOGLE_REDIRECT_URI || "https://readytms.com/api/gmail/oauth/callback (fallback)"
      }, null, 2));
      res.redirect("/company-settings?gmail=error");
    }
  });
  app2.post("/api/gmail/disconnect", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      await clearGmailTokens();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/gmail/scan-ratecons", isAuthenticated, async (req, res) => {
    try {
      const companyId = req.user?.divisionId || void 0;
      const results = await scanRateConEmails(companyId);
      return res.json({ success: true, ...results });
    } catch (err) {
      console.error("[Gmail Scan] Error:", err?.message);
      return res.status(500).json({ error: err?.message || "Failed to scan emails" });
    }
  });
  app2.get("/api/divisions", async (_req, res) => {
    const allDivisions = await storage.getAllDivisions();
    res.json(allDivisions);
  });
  app2.get("/api/divisions/:id", async (req, res) => {
    const division = await storage.getDivision(req.params.id);
    if (!division) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.json(division);
  });
  app2.post("/api/divisions", async (req, res) => {
    try {
      const { insertDivisionSchema: insertDivisionSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertDivisionSchema2.parse(req.body);
      const division = await storage.createDivision(validatedData);
      res.status(201).json(division);
    } catch (error) {
      console.error("Division creation error:", error);
      res.status(400).json({ error: "Invalid division data", details: error.message });
    }
  });
  app2.patch("/api/divisions/:id", async (req, res) => {
    try {
      const { insertDivisionSchema: insertDivisionSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertDivisionSchema2.partial().parse(req.body);
      const division = await storage.updateDivision(req.params.id, validatedData);
      if (!division) {
        return res.status(404).json({ error: "Division not found" });
      }
      res.json(division);
    } catch (error) {
      console.error("Division update error:", error);
      res.status(400).json({ error: "Invalid division data", details: error.message });
    }
  });
  app2.delete("/api/divisions/:id", async (req, res) => {
    const deleted = await storage.deleteDivision(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.status(204).send();
  });
  app2.post("/api/divisions/:divisionId/invite", isAuthenticated, isAdmin, async (req, res) => {
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
      const crypto2 = await import("crypto");
      const token = crypto2.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      const invitation = await storage.createDivisionInvitation({
        divisionId,
        email,
        token,
        role: role || "admin",
        status: "pending",
        invitedBy: req.user.id,
        expiresAt
      });
      const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      const host = req.headers.host || "readytms.com";
      const protocol = host.includes("localhost") ? "http" : "https";
      const appUrl = `${protocol}://${host}`;
      const signupLink = `${appUrl}/division-signup/${token}`;
      let emailSent = false;
      try {
        const inviteEmailResult = await sendEmail2({
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
          `
        });
        emailSent = inviteEmailResult.success;
      } catch (emailErr) {
        console.error("Email sending failed for division invite:", emailErr);
      }
      res.status(201).json({ message: "Invitation created", invitation, emailSent, signupLink });
    } catch (error) {
      console.error("Division invitation error:", error);
      res.status(500).json({ error: "Failed to send invitation", details: error.message });
    }
  });
  app2.get("/api/divisions/:divisionId/invitations", isAuthenticated, async (req, res) => {
    try {
      const invitations = await storage.getDivisionInvitations(req.params.divisionId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });
  app2.get("/api/division-invite/:token", async (req, res) => {
    try {
      const invitation = await storage.getDivisionInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation" });
      }
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation already used" });
      }
      if (new Date(invitation.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "Invitation expired" });
      }
      const division = await storage.getDivision(invitation.divisionId);
      res.json({ invitation, division });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate invitation" });
    }
  });
  app2.post("/api/division-signup", async (req, res) => {
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
      if (new Date(invitation.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "Invitation expired" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const hashedPassword = await bcrypt3.hash(password, 12);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin: "true",
        role: invitation.role || "admin",
        approved: "false",
        divisionId: invitation.divisionId
      });
      await storage.updateDivisionInvitation(invitation.id, { status: "accepted" });
      const approvedAdmins = await storage.getApprovedAdmins();
      const division = await storage.getDivision(invitation.divisionId);
      const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      for (const admin of approvedAdmins) {
        if (!admin.divisionId) {
          try {
            await sendEmail2({
              to: admin.email,
              subject: `New ${division?.companyName || "Division"} User Pending Approval`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2>New User Registration</h2>
                  <p>A new user has signed up for <strong>${division?.companyName || "a division"}</strong> and needs your approval:</p>
                  <ul>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Name:</strong> ${firstName || ""} ${lastName || ""}</li>
                    <li><strong>Division:</strong> ${division?.companyName || "Unknown"}</li>
                    <li><strong>Role:</strong> ${invitation.role}</li>
                  </ul>
                  <p>Please log in to Ready TMS to approve or reject this user.</p>
                </div>
              `
            });
          } catch (e) {
            console.error("Failed to send approval notification:", e);
          }
        }
      }
      res.status(201).json({
        message: "Registration successful. Your account is pending admin approval.",
        pendingApproval: true
      });
    } catch (error) {
      console.error("Division signup error:", error);
      res.status(500).json({ error: "Registration failed", details: error.message });
    }
  });
  app2.post("/api/divisions/:divisionId/login", async (req, res, next) => {
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
      const isValid = await bcrypt3.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (user.divisionId !== divisionId) {
        return res.status(403).json({ error: "You do not have access to this company portal" });
      }
      if (user.approved !== "true") {
        return res.status(403).json({ error: "Your account is pending approval" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _pw, ...safeUser } = user;
        return res.json({ user: safeUser });
      });
    } catch (error) {
      console.error("Division login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.post("/api/divisions/:divisionId/request-access", async (req, res) => {
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
      const hashedPassword = await bcrypt3.hash(password, 12);
      await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin: "true",
        role: "admin",
        approved: "false",
        divisionId
      });
      const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
      const allAdmins = await storage.getApprovedAdmins();
      const divisionAdmins = allAdmins.filter((a) => a.divisionId === divisionId);
      const notifyEmails = /* @__PURE__ */ new Set();
      if (division.email) notifyEmails.add(division.email);
      if (divisionAdmins.length > 0) {
        divisionAdmins.forEach((a) => notifyEmails.add(a.email));
      } else {
        allAdmins.filter((a) => !a.divisionId).forEach((a) => notifyEmails.add(a.email));
      }
      for (const notifyEmail of notifyEmails) {
        try {
          await sendEmail2({
            to: notifyEmail,
            subject: `New Access Request for ${division.companyName}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2>New Access Request</h2>
                <p>A new user has requested access to <strong>${division.companyName}</strong>:</p>
                <ul>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Name:</strong> ${firstName || ""} ${lastName || ""}</li>
                </ul>
                <p>Log in to Ready TMS and go to <strong>Admin Approvals</strong> to approve or reject this request.</p>
              </div>
            `
          });
        } catch (e) {
          console.error("Failed to send access request notification:", e);
        }
      }
      res.status(201).json({
        message: "Access request submitted. An admin will review your request.",
        pendingApproval: true
      });
    } catch (error) {
      console.error("Division request-access error:", error);
      res.status(500).json({ error: "Request failed", details: error.message });
    }
  });
  app2.get("/api/divisions/:divisionId/pending-users", isAuthenticated, async (req, res) => {
    try {
      const pendingUsers = await storage.getPendingUsersByDivision(req.params.divisionId);
      const sanitized = pendingUsers.map(({ password, ...user }) => user);
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending users" });
    }
  });
  const ALLOWED_ATTACHMENT_MIME = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "application/pdf"
  ];
  const feedbackPostSchema = insertFeedbackSchema.extend({
    personName: z3.string().trim().min(1, { message: "Name is required" }),
    note: z3.string().trim().min(1, { message: "Feedback note is required" }),
    attachmentFileData: z3.string().nullable().optional().refine(
      (val) => {
        if (!val) return true;
        const match = val.match(/^data:([^;]+);base64,/);
        if (!match) return false;
        const mime = match[1].toLowerCase();
        return ALLOWED_ATTACHMENT_MIME.includes(mime);
      },
      { message: "Attachment must be a base64 data URI of type image (PNG, JPG, GIF) or PDF" }
    ).refine(
      (val) => {
        if (!val) return true;
        return val.length <= 14 * 1024 * 1024;
      },
      { message: "Attachment exceeds 10 MB limit" }
    ),
    // Enforce that both filename and data are provided together, or both are absent
    attachmentFileName: z3.string().nullable().optional()
  }).refine(
    (data) => {
      const hasData = !!data.attachmentFileData;
      const hasName = !!data.attachmentFileName;
      return hasData === hasName;
    },
    { message: "Attachment filename and file data must both be provided or both be absent" }
  );
  app2.get("/api/feedbacks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allFeedbacks = await storage.getAllFeedbacks();
      res.json(allFeedbacks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch feedbacks" });
    }
  });
  app2.post("/api/feedbacks", isAuthenticated, async (req, res) => {
    try {
      const parsed = feedbackPostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid feedback data", details: parsed.error });
      }
      const { personName, note, attachmentFileName, attachmentFileData } = parsed.data;
      const feedback = await storage.createFeedback({
        personName,
        note,
        attachmentFileName: attachmentFileName ?? null,
        attachmentFileData: attachmentFileData ?? null
      });
      res.status(201).json(feedback);
    } catch (error) {
      res.status(500).json({ error: "Failed to create feedback" });
    }
  });
  app2.patch("/api/feedbacks/:id/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["open", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'open' or 'resolved'" });
      }
      const updated = await storage.updateFeedbackStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update feedback status" });
    }
  });
  app2.delete("/api/feedbacks/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteFeedback(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete feedback" });
    }
  });
  app2.get("/api/public/pod-status/:loadNumber", async (req, res) => {
    try {
      const { loadNumber } = req.params;
      const allLoads = await storage.getAllLoads();
      const matchingLoad = allLoads.find(
        (l) => l.loadNumber.trim().toLowerCase() === loadNumber.trim().toLowerCase()
      );
      if (!matchingLoad) {
        return res.status(404).json({ error: `Load #${loadNumber} was not found.` });
      }
      const pods = matchingLoad.podAttachments || [];
      res.json({
        loadNumber: matchingLoad.loadNumber,
        status: matchingLoad.status,
        podCount: pods.length,
        submissions: pods.map((p) => ({
          filename: p.filename,
          uploadedAt: p.uploadedAt,
          uploadedBy: p.uploadedBy,
          truckNumber: p.truckNumber
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to look up POD status" });
    }
  });
  app2.get("/api/load-documents", isAuthenticated, async (req, res) => {
    try {
      const { loadId, status } = req.query;
      const docs = await storage.getLoadDocuments({ loadId, status });
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/load-documents/:id", isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getLoadDocument(req.params.id);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/load-documents", isAuthenticated, async (req, res) => {
    try {
      const { loadId, fileData, fileName, fileType } = req.body;
      if (!fileData || !fileName || !fileType) {
        return res.status(400).json({ error: "fileData, fileName, and fileType are required" });
      }
      let extracted = {};
      try {
        extracted = await extractPaperworkDocument(fileData, fileType);
      } catch (err) {
        console.error("[Paperwork] AI extraction error:", err.message);
        extracted = { documentType: "other", confidenceScore: 0 };
      }
      let storedFileData = fileData;
      try {
        storedFileData = await uploadPaperworkToS3(fileData, fileName, fileType);
        console.log(`[Paperwork] Uploaded to S3: ${storedFileData}`);
      } catch (err) {
        console.error("[Paperwork] S3 upload failed, storing base64 fallback:", err.message);
      }
      let resolvedLoadId = loadId || null;
      let confidence = extracted.confidenceScore || 0;
      if (!resolvedLoadId && extracted.extractedLoadNumber) {
        const byNumber = await storage.getLoadByNumber(extracted.extractedLoadNumber);
        if (byNumber) {
          resolvedLoadId = byNumber.id;
          confidence = 0.9;
        }
      }
      let docStatus = "received";
      if (!resolvedLoadId) docStatus = "needs_review";
      else if (!extracted.extractedLoadNumber) docStatus = "needs_review";
      else if (extracted.isSigned === false) docStatus = "needs_review";
      else if ((extracted.confidenceScore || 0) < 0.75) docStatus = "needs_review";
      const doc = await storage.createLoadDocument({
        loadId: resolvedLoadId,
        fileName,
        fileType,
        fileData: storedFileData,
        documentType: extracted.documentType || "other",
        extractedLoadNumber: extracted.extractedLoadNumber || null,
        extractedDriverName: extracted.extractedDriverName || null,
        extractedTruckNumber: extracted.extractedTruckNumber || null,
        extractedPickupDate: extracted.extractedPickupDate || null,
        extractedDeliveryDate: extracted.extractedDeliveryDate || null,
        extractedPickupLocation: extracted.extractedPickupLocation || null,
        extractedDeliveryLocation: extracted.extractedDeliveryLocation || null,
        extractedShipper: extracted.extractedShipper || null,
        extractedReceiver: extracted.extractedReceiver || null,
        isSigned: extracted.isSigned ?? null,
        pageCount: extracted.pageCount ?? null,
        confidenceScore: String(confidence),
        status: docStatus
      });
      if (resolvedLoadId && docStatus === "received") {
        await storage.updateLoad(resolvedLoadId, {
          paperworkStatus: "received",
          paperworkReceivedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        await storage.createActivityLog({
          action: "paperwork_uploaded",
          entityType: "load",
          entityId: resolvedLoadId,
          details: `Manual paperwork upload: ${fileName}`,
          metadata: { documentId: doc.id }
        });
      } else if (docStatus === "needs_review" && resolvedLoadId) {
        await storage.createActivityLog({
          action: "paperwork_needs_review",
          entityType: "load",
          entityId: resolvedLoadId,
          details: `Paperwork needs review after upload: ${fileName}`,
          metadata: { documentId: doc.id }
        });
      }
      res.status(201).json(doc);
    } catch (err) {
      console.error("[Paperwork] Upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.patch("/api/load-documents/:id", isAuthenticated, async (req, res) => {
    try {
      const { status, rejectionReason, loadId } = req.body;
      const doc = await storage.getLoadDocument(req.params.id);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      const updateData = {};
      if (status) updateData.status = status;
      if (rejectionReason !== void 0) updateData.rejectionReason = rejectionReason;
      if (loadId !== void 0) updateData.loadId = loadId;
      const updated = await storage.updateLoadDocument(req.params.id, updateData);
      const targetLoadId = loadId ?? doc.loadId;
      if (targetLoadId) {
        if (status === "approved") {
          await storage.updateLoad(targetLoadId, {
            paperworkStatus: "approved",
            paperworkApprovedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          await storage.createActivityLog({
            action: "paperwork_approved",
            entityType: "load",
            entityId: targetLoadId,
            details: `Paperwork approved: ${doc.fileName}`,
            metadata: { documentId: doc.id }
          });
        } else if (status === "rejected") {
          await storage.updateLoad(targetLoadId, {
            paperworkStatus: "rejected",
            paperworkNotes: rejectionReason || null
          });
          await storage.createActivityLog({
            action: "paperwork_rejected",
            entityType: "load",
            entityId: targetLoadId,
            details: `Paperwork rejected: ${doc.fileName}. Reason: ${rejectionReason || "none"}`,
            metadata: { documentId: doc.id }
          });
        } else if (status === "needs_review") {
          await storage.updateLoad(targetLoadId, { paperworkStatus: "needs_review" });
          await storage.createActivityLog({
            action: "paperwork_needs_review",
            entityType: "load",
            entityId: targetLoadId,
            details: `Paperwork flagged for review: ${doc.fileName}`,
            metadata: { documentId: doc.id }
          });
        }
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.delete("/api/load-documents/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteLoadDocument(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.post("/api/email/process", emailProcessorRoute);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_automation();
init_notifications();
init_storage();

// server/gmailPoller.ts
init_storage();
init_aiExtraction();
import { google as google2 } from "googleapis";
var REDIRECT_URI2 = process.env.GOOGLE_REDIRECT_URI || "https://readytms.com/api/gmail/oauth/callback";
function buildOAuth2Client() {
  return new google2.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI2
  );
}
function decodeBase64Url(data) {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}
function generateLoadNumber() {
  const now = /* @__PURE__ */ new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randPart = String(Math.floor(Math.random() * 9e3) + 1e3);
  return `AUTO-${datePart}-${randPart}`;
}
async function processMessage(gmail, messageId) {
  try {
    const msgResp = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full"
    });
    const msg = msgResp.data;
    const payload = msg.payload;
    if (!payload) return { success: false, error: "No payload in message" };
    const subjectHeader = payload.headers?.find(
      (h) => h.name?.toLowerCase() === "subject"
    );
    const subject = subjectHeader?.value || "(no subject)";
    console.log(`[GmailPoller] Processing email: "${subject}"`);
    const pdfParts = [];
    const findPdfParts = (parts) => {
      if (!parts) return;
      for (const part of parts) {
        const mimeType = part.mimeType || "";
        if ((mimeType === "application/pdf" || part.filename?.toLowerCase().endsWith(".pdf")) && part.body?.attachmentId) {
          pdfParts.push({
            partId: part.partId || "",
            filename: part.filename || "attachment.pdf",
            attachmentId: part.body.attachmentId
          });
        }
        if (part.parts) findPdfParts(part.parts);
      }
    };
    findPdfParts(payload.parts);
    if (pdfParts.length === 0) {
      return { success: false, error: "No PDF attachments found" };
    }
    const pdfPart = pdfParts[0];
    console.log(`[GmailPoller] Downloading PDF: ${pdfPart.filename}`);
    const attachResp = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: pdfPart.attachmentId
    });
    const attachData = attachResp.data.data;
    if (!attachData) {
      return { success: false, error: "Empty attachment data" };
    }
    const pdfBuffer = decodeBase64Url(attachData);
    console.log(`[GmailPoller] PDF downloaded (${pdfBuffer.length} bytes), running Claude extraction`);
    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    const extracted = await extractLoadFromDocument(dataUrl, "application/pdf");
    if (!extracted.pickupLocation || !extracted.deliveryLocation) {
      console.log(`[GmailPoller] Not a rate con (no pickup/delivery): "${subject}"`);
      return { success: false, error: "Not a rate confirmation \u2014 no pickup/delivery data" };
    }
    const loadNumber = extracted.loadNumber || generateLoadNumber();
    const existing = await storage.getLoadByNumber(loadNumber);
    if (existing) {
      console.log(`[GmailPoller] Load ${loadNumber} already exists, skipping`);
      return { success: false, error: `Load ${loadNumber} already exists` };
    }
    const load = await storage.createLoad({
      loadNumber,
      status: "pending",
      pickupLocation: extracted.pickupLocation,
      pickupDate: extracted.pickupDate,
      deliveryLocation: extracted.deliveryLocation,
      deliveryDate: extracted.deliveryDate,
      rate: extracted.rate,
      weight: extracted.weight ?? void 0,
      commodity: extracted.commodity ?? void 0,
      source: "ai_extract",
      invoiceAttachment: dataUrl,
      notes: [
        extracted.notes,
        extracted.brokerName ? `Broker: ${extracted.brokerName}` : null,
        extracted.brokerAddress ? `Broker Address: ${extracted.brokerAddress}` : null,
        extracted.brokerPhone ? `Broker Phone: ${extracted.brokerPhone}` : null,
        extracted.brokerEmail ? `Broker Email: ${extracted.brokerEmail}` : null,
        `Auto-imported from Gmail (${pdfPart.filename})`,
        `Email subject: ${subject}`
      ].filter(Boolean).join("\n")
    });
    await storage.createNotification({
      type: "success",
      category: "gmail_auto_import",
      title: "Load Auto-Created from Gmail",
      message: `Load ${load.loadNumber} created from rate con email (${pdfPart.filename}). Pickup: ${extracted.pickupLocation}, Delivery: ${extracted.deliveryLocation}, Rate: $${extracted.rate}.`,
      relatedEntityType: "load",
      relatedEntityId: load.id,
      isRead: "false"
    });
    await storage.createActivityLog({
      action: "gmail_load_import",
      entityType: "load",
      entityId: load.id,
      details: `Auto-created load ${load.loadNumber} from Gmail attachment ${pdfPart.filename}`,
      metadata: {
        gmailMessageId: messageId,
        filename: pdfPart.filename,
        subject,
        brokerName: extracted.brokerName
      },
      status: "success"
    });
    console.log(`[GmailPoller] Created load ${load.loadNumber} from "${subject}"`);
    return { success: true, loadNumber: load.loadNumber };
  } catch (err) {
    console.error(`[GmailPoller] Failed to process message ${messageId}:`, err.message);
    return { success: false, error: err.message };
  }
}
async function pollGmail() {
  const settings = await storage.getCompanySettings();
  if (!settings?.gmailRefreshToken) {
    console.log("[GmailPoller] No Gmail tokens found \u2014 skipping poll");
    return;
  }
  const connectedEmail = settings.gmailEmail ?? "unknown";
  console.log(`[GmailPoller] Polling Gmail for ${connectedEmail}`);
  try {
    const auth = buildOAuth2Client();
    auth.setCredentials({
      refresh_token: settings.gmailRefreshToken,
      access_token: settings.gmailAccessToken ?? void 0
    });
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);
    if (credentials.access_token) {
      await storage.updateCompanySettings({
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date ? String(credentials.expiry_date) : void 0
      });
    }
    const gmail = google2.gmail({ version: "v1", auth });
    const query = "is:unread has:attachment filename:pdf";
    const listResp = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 20 });
    const messages = listResp.data.messages || [];
    if (messages.length === 0) {
      console.log("[GmailPoller] No unread PDF emails found");
      return;
    }
    console.log(`[GmailPoller] Found ${messages.length} unread PDF email(s) to check`);
    for (const message of messages) {
      if (!message.id) continue;
      const result = await processMessage(gmail, message.id);
      await gmail.users.messages.modify({
        userId: "me",
        id: message.id,
        requestBody: { removeLabelIds: ["UNREAD"] }
      });
      if (result.success) {
        console.log(`[GmailPoller] Load created: ${result.loadNumber}`);
      } else {
        console.log(`[GmailPoller] Skipped: ${result.error}`);
      }
    }
  } catch (err) {
    console.error("[GmailPoller] Poll error:", err.message);
    if (err.message?.includes("invalid_grant") || err.message?.includes("Token has been expired")) {
      console.error("[GmailPoller] Token expired/revoked \u2014 clearing Gmail credentials");
      await storage.updateCompanySettings({
        gmailAccessToken: void 0,
        gmailRefreshToken: void 0,
        gmailEmail: void 0,
        gmailTokenExpiry: void 0
      });
    }
  }
}
var POLL_INTERVAL_MS = 5 * 60 * 1e3;
var pollerInterval = null;
function startGmailPoller() {
  if (pollerInterval) return;
  console.log("[GmailPoller] Starting (5-minute interval)");
  pollGmail().catch((err) => console.error("[GmailPoller] Initial poll error:", err));
  pollerInterval = setInterval(() => {
    pollGmail().catch((err) => console.error("[GmailPoller] Poll error:", err));
  }, POLL_INTERVAL_MS);
}

// server/paperworkPoller.ts
init_storage();
init_aiExtraction();
init_s3();
import { google as google3 } from "googleapis";
var REDIRECT_URI3 = process.env.GOOGLE_REDIRECT_URI || "https://readytms.com/api/gmail/oauth/callback";
var PAPERWORK_KEYWORDS = ["pod", "bol", "paperwork", "delivery receipt", "signed", "proof of delivery", "bill of lading"];
function buildOAuth2Client2() {
  return new google3.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI3
  );
}
function decodeBase64Url2(data) {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}
function isPaperworkEmail(subject, body) {
  const text2 = (subject + " " + body).toLowerCase();
  return PAPERWORK_KEYWORDS.some((kw) => text2.includes(kw));
}
async function matchLoadForDocument(extracted) {
  const allLoads = await storage.getAllLoads();
  if (extracted.extractedLoadNumber) {
    const byNumber = allLoads.find(
      (l) => l.loadNumber.toLowerCase().trim() === extracted.extractedLoadNumber.toLowerCase().trim()
    );
    if (byNumber) return { loadId: byNumber.id, confidence: 0.95 };
  }
  if (extracted.extractedTruckNumber && extracted.extractedDeliveryDate) {
    const allTrucks = await storage.getAllTrucks();
    const truck = allTrucks.find(
      (t) => t.truckNumber?.toLowerCase() === extracted.extractedTruckNumber.toLowerCase()
    );
    if (truck) {
      const delivDate = new Date(extracted.extractedDeliveryDate);
      const byTruckDate = allLoads.find((l) => {
        if (l.assignedTruckId !== truck.id) return false;
        const diff = Math.abs(new Date(l.deliveryDate).getTime() - delivDate.getTime());
        return diff < 864e5;
      });
      if (byTruckDate) return { loadId: byTruckDate.id, confidence: 0.8 };
    }
  }
  if (extracted.extractedDriverName && extracted.extractedDeliveryLocation) {
    const allDrivers = await storage.getAllDrivers();
    const driver = allDrivers.find((d) => {
      const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
      return fullName.includes(extracted.extractedDriverName.toLowerCase()) || extracted.extractedDriverName.toLowerCase().includes(fullName);
    });
    if (driver) {
      const byDriver = allLoads.find(
        (l) => l.assignedDriverId === driver.id && l.deliveryLocation.toLowerCase().includes(
          extracted.extractedDeliveryLocation.toLowerCase().split(",")[0]
        )
      );
      if (byDriver) return { loadId: byDriver.id, confidence: 0.7 };
    }
  }
  return { loadId: null, confidence: 0 };
}
function determineStatus(params) {
  const { confidence, loadId, extracted, load } = params;
  if (!loadId) return "needs_review";
  if (!extracted.extractedLoadNumber) return "needs_review";
  if (extracted.isSigned === false) return "needs_review";
  if (confidence < 0.75) return "needs_review";
  if (extracted.extractedDeliveryDate && load?.deliveryDate) {
    const diff = Math.abs(
      new Date(extracted.extractedDeliveryDate).getTime() - new Date(load.deliveryDate).getTime()
    );
    if (diff > 864e5 * 2) return "needs_review";
  }
  return "received";
}
async function processPaperworkMessage(gmail, messageId) {
  const msgResp = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full"
  });
  const msg = msgResp.data;
  const payload = msg.payload;
  if (!payload) return;
  const subjectHeader = payload.headers?.find((h) => h.name?.toLowerCase() === "subject");
  const subject = subjectHeader?.value || "";
  const body = msg.snippet || "";
  if (!isPaperworkEmail(subject, body)) {
    console.log(`[PaperworkPoller] Skipping non-paperwork email: "${subject}"`);
    return;
  }
  const attachments = [];
  const findAttachments = (parts) => {
    if (!parts) return;
    for (const part of parts) {
      const mime = part.mimeType || "";
      const filename = part.filename || "";
      if (part.body?.attachmentId && filename && (mime.includes("pdf") || mime.startsWith("image/") || filename.toLowerCase().endsWith(".pdf"))) {
        attachments.push({
          partId: part.partId || "",
          filename,
          attachmentId: part.body.attachmentId,
          mimeType: mime || "application/pdf"
        });
      }
      if (part.parts) findAttachments(part.parts);
    }
  };
  findAttachments(payload.parts);
  if (attachments.length === 0) {
    console.log(`[PaperworkPoller] No PDF/image attachments in: "${subject}"`);
    return;
  }
  console.log(`[PaperworkPoller] Processing paperwork email: "${subject}" \u2014 ${attachments.length} attachment(s)`);
  for (const att of attachments) {
    const existing = await storage.getLoadDocumentByEmailAndFile(messageId, att.filename);
    if (existing) {
      console.log(`[PaperworkPoller] Duplicate skipped: ${att.filename}`);
      continue;
    }
    const attachResp = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: att.attachmentId
    });
    const rawData = attachResp.data.data;
    if (!rawData) continue;
    const fileBuffer = decodeBase64Url2(rawData);
    const tempBase64DataUrl = `data:${att.mimeType};base64,${fileBuffer.toString("base64")}`;
    console.log(`[PaperworkPoller] Extracting data from ${att.filename} (${fileBuffer.length} bytes)`);
    let extracted = {};
    try {
      extracted = await extractPaperworkDocument(tempBase64DataUrl, att.mimeType);
    } catch (err) {
      console.error(`[PaperworkPoller] AI extraction failed for ${att.filename}:`, err.message);
      extracted = { confidenceScore: 0 };
    }
    let fileUrl;
    try {
      fileUrl = await uploadBufferPaperworkToS3(fileBuffer, att.filename, att.mimeType);
      console.log(`[PaperworkPoller] Uploaded to S3: ${fileUrl}`);
    } catch (err) {
      console.error(`[PaperworkPoller] S3 upload failed for ${att.filename}:`, err.message);
      fileUrl = tempBase64DataUrl;
    }
    const { loadId, confidence } = await matchLoadForDocument(extracted);
    const load = loadId ? await storage.getLoad(loadId) : null;
    const docStatus = determineStatus({ confidence, loadId, extracted, load });
    const doc = await storage.createLoadDocument({
      loadId: loadId ?? void 0,
      emailMessageId: messageId,
      fileName: att.filename,
      fileType: att.mimeType,
      fileData: fileUrl,
      documentType: extracted.documentType || "other",
      extractedLoadNumber: extracted.extractedLoadNumber || null,
      extractedDriverName: extracted.extractedDriverName || null,
      extractedTruckNumber: extracted.extractedTruckNumber || null,
      extractedPickupDate: extracted.extractedPickupDate || null,
      extractedDeliveryDate: extracted.extractedDeliveryDate || null,
      extractedPickupLocation: extracted.extractedPickupLocation || null,
      extractedDeliveryLocation: extracted.extractedDeliveryLocation || null,
      extractedShipper: extracted.extractedShipper || null,
      extractedReceiver: extracted.extractedReceiver || null,
      isSigned: extracted.isSigned ?? null,
      pageCount: extracted.pageCount ?? null,
      confidenceScore: String(extracted.confidenceScore ?? confidence),
      status: docStatus
    });
    if (loadId && docStatus === "received") {
      await storage.updateLoad(loadId, {
        paperworkStatus: "received",
        paperworkReceivedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await storage.createActivityLog({
        action: "paperwork_received",
        entityType: "load",
        entityId: loadId,
        details: `Paperwork received via Gmail: ${att.filename}`,
        metadata: { documentId: doc.id, emailSubject: subject, confidence }
      });
      console.log(`[PaperworkPoller] Matched to load ${load?.loadNumber} \u2014 status: received`);
    } else if (docStatus === "needs_review") {
      if (loadId) {
        await storage.createActivityLog({
          action: "paperwork_needs_review",
          entityType: "load",
          entityId: loadId,
          details: `Paperwork needs review: ${att.filename} (confidence: ${confidence.toFixed(2)})`,
          metadata: { documentId: doc.id, emailSubject: subject }
        });
      }
      console.log(`[PaperworkPoller] Document needs review: ${att.filename}`);
    }
  }
}
async function pollGmailForPaperwork() {
  const settings = await storage.getCompanySettings();
  if (!settings?.gmailRefreshToken) return;
  try {
    const auth = buildOAuth2Client2();
    auth.setCredentials({
      refresh_token: settings.gmailRefreshToken,
      access_token: settings.gmailAccessToken ?? void 0
    });
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);
    if (credentials.access_token) {
      await storage.updateCompanySettings({
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date ? String(credentials.expiry_date) : void 0
      });
    }
    const gmail = google3.gmail({ version: "v1", auth });
    const subjectQuery = PAPERWORK_KEYWORDS.map((k) => `subject:${k}`).join(" OR ");
    const query = `(${subjectQuery} OR has:attachment) is:unread newer_than:7d`;
    const listResp = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 30 });
    const messages = listResp.data.messages || [];
    if (messages.length === 0) {
      console.log("[PaperworkPoller] No new paperwork emails");
      return;
    }
    console.log(`[PaperworkPoller] Found ${messages.length} email(s) to check`);
    for (const message of messages) {
      if (!message.id) continue;
      try {
        await processPaperworkMessage(gmail, message.id);
        await gmail.users.messages.modify({
          userId: "me",
          id: message.id,
          requestBody: { removeLabelIds: ["UNREAD"] }
        });
      } catch (err) {
        console.error(`[PaperworkPoller] Error processing message ${message.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[PaperworkPoller] Poll error:", err.message);
    if (err.message?.includes("invalid_grant") || err.message?.includes("Token has been expired")) {
      await storage.updateCompanySettings({
        gmailAccessToken: void 0,
        gmailRefreshToken: void 0,
        gmailEmail: void 0,
        gmailTokenExpiry: void 0
      });
    }
  }
}
var POLL_INTERVAL_MS2 = 5 * 60 * 1e3;
var pollerInterval2 = null;
function startPaperworkPoller() {
  if (pollerInterval2) return;
  console.log("[PaperworkPoller] Starting (5-minute interval)");
  pollGmailForPaperwork().catch((err) => console.error("[PaperworkPoller] Initial poll error:", err));
  pollerInterval2 = setInterval(() => {
    pollGmailForPaperwork().catch((err) => console.error("[PaperworkPoller] Poll error:", err));
  }, POLL_INTERVAL_MS2);
}

// server/index.ts
var app = express2();
app.use(cors({
  origin: [
    "https://readytms.com",
    "capacitor://localhost",
    "http://localhost",
    "http://localhost:5000",
    "http://localhost:3001",
    "ionic://localhost"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"]
}));
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ extended: false, limit: "50mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await initializeAutomationSettings();
  startGmailPoller();
  startPaperworkPoller();
  let lastDailyCheckDate = "";
  setInterval(async () => {
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0];
    const hour = now.getHours();
    if (hour >= 8 && lastDailyCheckDate !== dateStr) {
      lastDailyCheckDate = dateStr;
      await sendDailyTaskReminders();
      await checkExpiringDocuments();
      await checkAndSendMaintenanceReminders(
        () => storage.getAllMaintenance(),
        () => storage.getAllTrucks(),
        () => storage.getAllDrivers()
      );
      await checkAndSendMissingPODReminders();
    }
  }, 60 * 60 * 1e3);
  const mobileDist = path3.resolve(import.meta.dirname, "..", "dist-mobile");
  if (fs2.existsSync(mobileDist)) {
    app.use("/m", express2.static(mobileDist, { index: "index.html" }));
    app.get(/^\/m(\/.*)?$/, (_req, res) => {
      res.sendFile(path3.join(mobileDist, "index.html"));
    });
  } else {
    app.get("/m", (_req, res) => {
      res.status(503).send("Mobile preview not built. Run: npm run mobile:build");
    });
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
