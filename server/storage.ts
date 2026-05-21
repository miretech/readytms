import { 
  type User, 
  type UpsertUser,
  type Load,
  type InsertLoad,
  type Truck,
  type InsertTruck,
  type Trailer,
  type InsertTrailer,
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
  type AutomationSetting,
  type InsertAutomationSetting,
  type Notification,
  type InsertNotification,
  type ActivityLog,
  type InsertActivityLog,
  type ShortPay,
  type InsertShortPay,
  type ChargeBack,
  type InsertChargeBack,
  type Task,
  type InsertTask,
  type CompanySettings,
  type InsertCompanySettings,
  type Division,
  type InsertDivision,
  type DivisionInvitation,
  type InsertDivisionInvitation,
  type PasswordResetToken,
  type TrailerTruckAssignment,
  type InsertTrailerTruckAssignment,
  type TrailerDotInspection,
  type InsertTrailerDotInspection,
  type Feedback,
  type InsertFeedback,
  type SentEmail,
  type InsertSentEmail,
  sentEmails,
  users,
  loads,
  trucks,
  trailers,
  trailerTruckAssignments,
  trailerDotInspections,
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
  gpsLocations,
  automationSettings,
  notifications,
  activityLog,
  shortPays,
  chargeBacks,
  tasks,
  companySettings,
  divisions,
  divisionInvitations,
  passwordResetTokens,
  feedbacks,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { Resend } from "resend";
import bcrypt from "bcrypt";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: Partial<UpsertUser>): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User | undefined>;
  getApprovedAdmins(): Promise<User[]>;
  getPendingAdmins(): Promise<User[]>;
  approveAdmin(userId: string, approvedBy: string): Promise<User | undefined>;
  rejectAdmin(userId: string): Promise<boolean>;
  sendAdminApprovalNotification(newUserEmail: string, approvedAdmins: User[]): Promise<void>;
  sendAdminApprovedEmail(email: string): Promise<void>;
  requestPasswordReset(email: string, userType: "admin" | "driver"): Promise<{ success: boolean; message?: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string }>;
  
  getAllLoads(companyId?: string): Promise<Load[]>;
  getLoad(id: string): Promise<Load | undefined>;
  createLoad(load: InsertLoad, companyId?: string): Promise<Load>;
  updateLoad(id: string, load: Partial<InsertLoad>): Promise<Load | undefined>;
  deleteLoad(id: string): Promise<boolean>;
  
  getAllTrucks(companyId?: string): Promise<Truck[]>;
  getTruck(id: string): Promise<Truck | undefined>;
  createTruck(truck: InsertTruck, companyId?: string): Promise<Truck>;
  updateTruck(id: string, truck: Partial<InsertTruck>): Promise<Truck | undefined>;
  deleteTruck(id: string): Promise<boolean>;
  
  getAllTrailers(companyId?: string): Promise<Trailer[]>;
  getTrailer(id: string): Promise<Trailer | undefined>;
  createTrailer(trailer: InsertTrailer, companyId?: string): Promise<Trailer>;
  updateTrailer(id: string, trailer: Partial<InsertTrailer>): Promise<Trailer | undefined>;
  deleteTrailer(id: string): Promise<boolean>;

  getTrailerAssignments(trailerId: string): Promise<TrailerTruckAssignment[]>;
  createTrailerAssignment(data: InsertTrailerTruckAssignment): Promise<TrailerTruckAssignment>;
  updateTrailerAssignment(id: string, data: Partial<InsertTrailerTruckAssignment>): Promise<TrailerTruckAssignment | undefined>;
  deleteTrailerAssignment(id: string): Promise<boolean>;

  getTrailerDotInspections(trailerId: string): Promise<TrailerDotInspection[]>;
  createTrailerDotInspection(data: InsertTrailerDotInspection): Promise<TrailerDotInspection>;
  updateTrailerDotInspection(id: string, data: Partial<InsertTrailerDotInspection>): Promise<TrailerDotInspection | undefined>;
  deleteTrailerDotInspection(id: string): Promise<boolean>;

  getAllDrivers(companyId?: string): Promise<Driver[]>;
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByEmail(email: string): Promise<Driver | undefined>;
  getDriverByLicense(licenseNumber: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver, companyId?: string): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<boolean>;
  
  getAllCustomers(companyId?: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer, companyId?: string): Promise<Customer>;
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
  getAllInvoices(companyId?: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice, companyId?: string): Promise<Invoice>;
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
  getAllSettlements(companyId?: string): Promise<Settlement[]>;
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
  
  // Automation Settings
  getAllAutomationSettings(): Promise<AutomationSetting[]>;
  getAutomationSetting(name: string): Promise<AutomationSetting | undefined>;
  createAutomationSetting(setting: InsertAutomationSetting): Promise<AutomationSetting>;
  updateAutomationSetting(name: string, setting: Partial<InsertAutomationSetting>): Promise<AutomationSetting | undefined>;
  
  // Notifications
  getAllNotifications(): Promise<Notification[]>;
  getUnreadNotifications(): Promise<Notification[]>;
  getNotificationsByCategory(category: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;
  
  // Activity Log
  getAllActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByEntity(entityType: string, entityId: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Short Pays
  getAllShortPays(): Promise<ShortPay[]>;
  getShortPay(id: string): Promise<ShortPay | undefined>;
  getShortPaysByCustomer(customerId: string): Promise<ShortPay[]>;
  getShortPaysByStatus(status: string): Promise<ShortPay[]>;
  createShortPay(shortPay: InsertShortPay): Promise<ShortPay>;
  updateShortPay(id: string, shortPay: Partial<InsertShortPay>): Promise<ShortPay | undefined>;
  deleteShortPay(id: string): Promise<boolean>;
  
  // Charge Backs
  getAllChargeBacks(): Promise<ChargeBack[]>;
  getChargeBack(id: string): Promise<ChargeBack | undefined>;
  getChargeBacksByCustomer(customerId: string): Promise<ChargeBack[]>;
  getChargeBacksByStatus(status: string): Promise<ChargeBack[]>;
  createChargeBack(chargeBack: InsertChargeBack): Promise<ChargeBack>;
  updateChargeBack(id: string, chargeBack: Partial<InsertChargeBack>): Promise<ChargeBack | undefined>;
  deleteChargeBack(id: string): Promise<boolean>;
  
  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getTasksByStatus(status: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Company Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  updateCompanySettings(settings: Partial<InsertCompanySettings>): Promise<CompanySettings | undefined>;

  // Divisions
  getAllDivisions(): Promise<Division[]>;
  getDivision(id: string): Promise<Division | undefined>;
  createDivision(division: InsertDivision): Promise<Division>;
  updateDivision(id: string, division: Partial<InsertDivision>): Promise<Division | undefined>;
  deleteDivision(id: string): Promise<boolean>;

  createDivisionInvitation(invitation: InsertDivisionInvitation): Promise<DivisionInvitation>;
  getDivisionInvitationByToken(token: string): Promise<DivisionInvitation | undefined>;
  updateDivisionInvitation(id: string, data: Partial<InsertDivisionInvitation>): Promise<DivisionInvitation | undefined>;
  getDivisionInvitations(divisionId: string): Promise<DivisionInvitation[]>;
  getPendingUsersByDivision(divisionId: string): Promise<User[]>;

  // Feedback
  getAllFeedbacks(): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  deleteFeedback(id: string): Promise<boolean>;
  updateFeedbackStatus(id: string, status: string): Promise<Feedback | undefined>;

  // Sent Emails
  createSentEmail(data: InsertSentEmail): Promise<SentEmail>;
  getAllSentEmails(): Promise<SentEmail[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if a user with this email exists
    if (userData.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingUser) {
        // Update existing user by email, preserving isAdmin status
        const [updated] = await db
          .update(users)
          .set({
            ...userData,
            id: existingUser.id, // Keep the existing ID
            isAdmin: existingUser.isAdmin, // Preserve admin status
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return updated;
      }
    }
    
    // No existing user with this email, insert new one
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          isAdmin: sql`COALESCE(${users.isAdmin}, 'false')`, // Preserve existing isAdmin on conflict
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db.insert(users).values(userData as UpsertUser).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getApprovedAdmins(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.isAdmin, "true"), eq(users.approved, "true")));
  }

  async getPendingAdmins(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.isAdmin, "true"), eq(users.approved, "false")))
      .orderBy(desc(users.createdAt));
  }

  async approveAdmin(userId: string, approvedBy: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        approved: "true",
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async rejectAdmin(userId: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, userId));
    return true;
  }

  async sendAdminApprovalNotification(newUserEmail: string, approvedAdmins: User[]): Promise<void> {
    // Email sending functionality - will be implemented after Resend integration setup
    console.log(`Admin approval notification would be sent to ${approvedAdmins.length} admins for new user: ${newUserEmail}`);
    // TODO: Integrate with Resend to send actual emails
  }

  async sendAdminApprovedEmail(email: string): Promise<void> {
    // Email sending functionality - will be implemented after Resend integration setup
    console.log(`Admin approved notification would be sent to: ${email}`);
    // TODO: Integrate with Resend to send actual emails
  }

  async requestPasswordReset(email: string, userType: "admin" | "driver"): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`[Password Reset] Request for ${userType}: ${email}`);
      
      // Check if user/driver exists
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
        // Don't reveal if email exists or not
        return { success: false, message: "User not found" };
      }

      // Generate secure random token (this will be sent in the email)
      const rawToken = crypto.randomBytes(32).toString('hex');
      
      // Hash the token before storing in database (SHA-256)
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      // Token expires in 1 hour
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      console.log(`[Password Reset] Saving token to database for ${email}`);
      // Save hashed token to database
      await db.insert(passwordResetTokens).values({
        email,
        token: hashedToken,
        userType,
        expiresAt,
        used: "false",
      });

      // Send reset email with raw token (user needs this to reset password)
      const resetUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/reset-password?token=${rawToken}&type=${userType}`;
      
      console.log(`[Password Reset] Attempting to send email to: ${email}`);
      console.log(`[Password Reset] Reset URL: ${resetUrl}`);
      
      const emailResult = await resend.emails.send({
        from: 'Ready TMS <noreply@readytms.com>',
        to: email,
        subject: 'Password Reset Request - Ready TMS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password for your ${userType === 'admin' ? 'Admin' : 'Driver'} account at Ready TMS.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <hr style="margin: 24px 0;">
            <p style="color: #666; font-size: 12px;">Ready TMS - Transportation Management System</p>
          </div>
        `,
      });

      console.log(`[Password Reset] Email sent successfully!`, emailResult);
      return { success: true };
    } catch (error) {
      console.error("[Password Reset] ERROR:", error);
      return { success: false, message: "Failed to send reset email" };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Hash the incoming token to compare with stored hashed token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // Find the token by hashed value
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, hashedToken),
          eq(passwordResetTokens.used, "false")
        ));

      if (!resetToken) {
        return { success: false, message: "Invalid or expired reset token" };
      }

      // Check if token is expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        return { success: false, message: "Reset token has expired" };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password based on user type
      if (resetToken.userType === "admin") {
        await db
          .update(users)
          .set({ password: hashedPassword, updatedAt: new Date() })
          .where(eq(users.email, resetToken.email));
      } else {
        await db
          .update(drivers)
          .set({ password: hashedPassword })
          .where(eq(drivers.email, resetToken.email));
      }

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: "true" })
        .where(eq(passwordResetTokens.id, resetToken.id));

      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, message: "Failed to reset password" };
    }
  }

  async getAllLoads(companyId?: string): Promise<Load[]> {
    // Exclude large attachment fields to prevent exceeding response size limits
    // Attachments are fetched separately via getLoad(id)
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
      invoiceAttachment: sql`null`.as('invoice_attachment'),
      podAttachment: sql`null`.as('pod_attachment'),
      podAttachments: sql`null`.as('pod_attachments'),
    }).from(loads);
    const results = companyId
      ? await baseQuery.where(sql`${loads}.company_id = ${companyId}`).orderBy(desc(loads.createdAt))
      : await baseQuery.orderBy(desc(loads.createdAt));
    return results as Load[];
  }

  async getLoad(id: string): Promise<Load | undefined> {
    const [load] = await db.select().from(loads).where(eq(loads.id, id));
    return load || undefined;
  }

  async createLoad(insertLoad: InsertLoad, companyId?: string): Promise<Load> {
    const [load] = await db
      .insert(loads)
      .values({
        ...insertLoad,
        pickupDate: new Date(insertLoad.pickupDate),
        deliveryDate: new Date(insertLoad.deliveryDate),
      })
      .returning();
    if (companyId) {
      await db.execute(sql`UPDATE loads SET company_id = ${companyId} WHERE id = ${load.id}`);
    }
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
    
    // Preserve existing attachment fields if not explicitly provided in update
    const existingLoad = await this.getLoad(id);
    if (existingLoad) {
      if (values.podAttachments === undefined) {
        values.podAttachments = existingLoad.podAttachments;
      }
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

  async getAllTrucks(companyId?: string): Promise<Truck[]> {
    // Exclude large attachment fields to prevent exceeding response size limits
    // Attachments are fetched separately via getTruck(id)
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
      cabCardAttachments: sql`null`.as('cab_card_attachments'),
      dotInspectionAttachments: sql`null`.as('dot_inspection_attachments'),
      repairReceiptAttachments: sql`null`.as('repair_receipt_attachments'),
    }).from(trucks);
    const results = companyId
      ? await baseQuery.where(sql`${trucks}.company_id = ${companyId}`)
      : await baseQuery;
    return results as Truck[];
  }

  async getTruck(id: string): Promise<Truck | undefined> {
    const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
    return truck || undefined;
  }

  async createTruck(insertTruck: InsertTruck, companyId?: string): Promise<Truck> {
    const [truck] = await db
      .insert(trucks)
      .values(insertTruck as any)
      .returning();
    if (companyId) {
      await db.execute(sql`UPDATE trucks SET company_id = ${companyId} WHERE id = ${truck.id}`);
    }
    return truck;
  }

  async updateTruck(id: string, updateData: Partial<InsertTruck>): Promise<Truck | undefined> {
    // Preserve existing attachment fields if not explicitly provided in update
    const existingTruck = await this.getTruck(id);
    const values: any = { ...updateData };
    if (existingTruck) {
      if (values.cabCardAttachments === undefined) {
        values.cabCardAttachments = existingTruck.cabCardAttachments;
      }
      if (values.dotInspectionAttachments === undefined) {
        values.dotInspectionAttachments = existingTruck.dotInspectionAttachments;
      }
      if (values.repairReceiptAttachments === undefined) {
        values.repairReceiptAttachments = existingTruck.repairReceiptAttachments;
      }
    }
    
    const [truck] = await db
      .update(trucks)
      .set(values)
      .where(eq(trucks.id, id))
      .returning();
    return truck || undefined;
  }

  async deleteTruck(id: string): Promise<boolean> {
    const result = await db.delete(trucks).where(eq(trucks.id, id)).returning();
    return result.length > 0;
  }

  async getAllTrailers(companyId?: string): Promise<Trailer[]> {
    // Exclude large attachment fields to prevent exceeding response size limits
    // Attachments are fetched separately via getTrailer(id)
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
      tollsAttachments: sql`null`.as('tolls_attachments'),
      repairsAttachments: sql`null`.as('repairs_attachments'),
      pickupPictures: sql`null`.as('pickup_pictures'),
    }).from(trailers);
    const results = companyId
      ? await baseQuery.where(sql`${trailers}.company_id = ${companyId}`)
      : await baseQuery;
    return results as Trailer[];
  }

  async getTrailer(id: string): Promise<Trailer | undefined> {
    const [trailer] = await db.select().from(trailers).where(eq(trailers.id, id));
    return trailer || undefined;
  }

  async createTrailer(insertTrailer: InsertTrailer, companyId?: string): Promise<Trailer> {
    const [trailer] = await db
      .insert(trailers)
      .values(insertTrailer as any)
      .returning();
    if (companyId) {
      await db.execute(sql`UPDATE trailers SET company_id = ${companyId} WHERE id = ${trailer.id}`);
    }
    return trailer;
  }

  async updateTrailer(id: string, updateData: Partial<InsertTrailer>): Promise<Trailer | undefined> {
    // Preserve existing attachment fields if not explicitly provided in update
    const existingTrailer = await this.getTrailer(id);
    const values: any = { ...updateData };
    if (existingTrailer) {
      // Only preserve attachments if they're undefined in the update (not explicitly set to null/empty)
      if (values.pickupPictures === undefined) {
        values.pickupPictures = existingTrailer.pickupPictures;
      }
      if (values.tollsAttachments === undefined) {
        values.tollsAttachments = existingTrailer.tollsAttachments;
      }
      if (values.repairsAttachments === undefined) {
        values.repairsAttachments = existingTrailer.repairsAttachments;
      }
    }
    
    const [trailer] = await db
      .update(trailers)
      .set(values)
      .where(eq(trailers.id, id))
      .returning();
    return trailer || undefined;
  }

  async deleteTrailer(id: string): Promise<boolean> {
    const result = await db.delete(trailers).where(eq(trailers.id, id)).returning();
    return result.length > 0;
  }

  async getTrailerAssignments(trailerId: string): Promise<TrailerTruckAssignment[]> {
    return await db
      .select()
      .from(trailerTruckAssignments)
      .where(eq(trailerTruckAssignments.trailerId, trailerId))
      .orderBy(desc(trailerTruckAssignments.startDate));
  }

  async createTrailerAssignment(data: InsertTrailerTruckAssignment): Promise<TrailerTruckAssignment> {
    const [result] = await db.insert(trailerTruckAssignments).values(data).returning();
    return result;
  }

  async updateTrailerAssignment(id: string, data: Partial<InsertTrailerTruckAssignment>): Promise<TrailerTruckAssignment | undefined> {
    const [result] = await db
      .update(trailerTruckAssignments)
      .set(data)
      .where(eq(trailerTruckAssignments.id, id))
      .returning();
    return result;
  }

  async deleteTrailerAssignment(id: string): Promise<boolean> {
    const result = await db.delete(trailerTruckAssignments).where(eq(trailerTruckAssignments.id, id)).returning();
    return result.length > 0;
  }

  async getTrailerDotInspections(trailerId: string): Promise<TrailerDotInspection[]> {
    return await db
      .select()
      .from(trailerDotInspections)
      .where(eq(trailerDotInspections.trailerId, trailerId))
      .orderBy(desc(trailerDotInspections.createdAt));
  }

  async createTrailerDotInspection(data: InsertTrailerDotInspection): Promise<TrailerDotInspection> {
    const [result] = await db.insert(trailerDotInspections).values(data).returning();
    return result;
  }

  async updateTrailerDotInspection(id: string, data: Partial<InsertTrailerDotInspection>): Promise<TrailerDotInspection | undefined> {
    const [result] = await db
      .update(trailerDotInspections)
      .set(data)
      .where(eq(trailerDotInspections.id, id))
      .returning();
    return result;
  }

  async deleteTrailerDotInspection(id: string): Promise<boolean> {
    const result = await db.delete(trailerDotInspections).where(eq(trailerDotInspections.id, id)).returning();
    return result.length > 0;
  }

  async getAllDrivers(companyId?: string): Promise<Driver[]> {
    // Exclude large attachment fields to prevent exceeding response size limits
    // Attachments are fetched separately via getDriver(id)
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
      licenseAttachment: sql`null`.as('license_attachment'),
      medicalCardAttachment: sql`null`.as('medical_card_attachment'),
      socialSecurityAttachment: sql`null`.as('social_security_attachment'),
    }).from(drivers);
    const results = companyId
      ? await baseQuery.where(sql`${drivers}.company_id = ${companyId}`)
      : await baseQuery;
    return results as Driver[];
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

  async createDriver(insertDriver: InsertDriver, companyId?: string): Promise<Driver> {
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
    
    const [driver] = await db
      .insert(drivers)
      .values(values)
      .returning();
    if (companyId) {
      await db.execute(sql`UPDATE drivers SET company_id = ${companyId} WHERE id = ${driver.id}`);
    }
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
    
    if (updateData.medicalCardIssuedDate !== undefined) {
      if (updateData.medicalCardIssuedDate && updateData.medicalCardIssuedDate.trim() !== "") {
        values.medicalCardIssuedDate = new Date(updateData.medicalCardIssuedDate);
      } else {
        values.medicalCardIssuedDate = null;
      }
    }
    
    if (updateData.dateHired !== undefined) {
      if (updateData.dateHired && updateData.dateHired.trim() !== "") {
        values.dateHired = new Date(updateData.dateHired);
      } else {
        values.dateHired = null;
      }
    }
    
    if (updateData.dateTerminated !== undefined) {
      if (updateData.dateTerminated && updateData.dateTerminated.trim() !== "") {
        values.dateTerminated = new Date(updateData.dateTerminated);
      } else {
        values.dateTerminated = null;
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

  async getAllCustomers(companyId?: string): Promise<Customer[]> {
    if (companyId) {
      return await db.select().from(customers).where(sql`${customers}.company_id = ${companyId}`);
    }
    return await db.select().from(customers);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer, companyId?: string): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(insertCustomer)
      .returning();
    if (companyId) {
      await db.execute(sql`UPDATE customers SET company_id = ${companyId} WHERE id = ${customer.id}`);
    }
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
  async getAllInvoices(companyId?: string): Promise<Invoice[]> {
    if (companyId) {
      return await db.select().from(invoices).where(sql`${invoices}.company_id = ${companyId}`).orderBy(desc(invoices.invoiceDate));
    }
    return await db.select().from(invoices).orderBy(desc(invoices.invoiceDate));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice, companyId?: string): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...insertInvoice,
        invoiceDate: new Date(insertInvoice.invoiceDate),
        dueDate: new Date(insertInvoice.dueDate),
      })
      .returning();
    if (companyId) {
      await db.execute(sql`UPDATE invoices SET company_id = ${companyId} WHERE id = ${invoice.id}`);
    }
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
    
    // Preserve existing attachment fields if not explicitly provided in update
    const existingInvoice = await this.getInvoice(id);
    if (existingInvoice) {
      if (values.attachments === undefined) {
        values.attachments = existingInvoice.attachments;
      }
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
    // Exclude large attachment fields to prevent exceeding response size limits
    // Attachments are fetched separately via getInspection(id)
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
      attachments: sql`null`.as('attachments'),
    }).from(inspections).orderBy(desc(inspections.inspectionDate));
    return results as Inspection[];
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
    
    // Preserve existing attachment fields if not explicitly provided in update
    const existingInspection = await this.getInspection(id);
    if (existingInspection) {
      if (values.attachments === undefined) {
        values.attachments = existingInspection.attachments;
      }
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
    // Exclude large attachment fields to prevent exceeding response size limits
    // Attachments are fetched separately via getAccident(id)
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
      attachments: sql`null`.as('attachments'),
    }).from(accidents).orderBy(desc(accidents.accidentDate));
    return results as Accident[];
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
        estimatedCost: insertAccident.estimatedCost && insertAccident.estimatedCost !== "" ? insertAccident.estimatedCost : null,
        truckId: insertAccident.truckId || null,
        loadId: insertAccident.loadId || null,
        policeReportNumber: insertAccident.policeReportNumber || null,
        insuranceClaimNumber: insertAccident.insuranceClaimNumber || null,
        injuriesReported: insertAccident.injuriesReported ?? 0,
      })
      .returning();
    return accident;
  }

  async updateAccident(id: string, updateData: Partial<InsertAccident>): Promise<Accident | undefined> {
    const values: any = { ...updateData };
    if (updateData.accidentDate) {
      values.accidentDate = new Date(updateData.accidentDate);
    }
    if ("estimatedCost" in values) values.estimatedCost = values.estimatedCost && values.estimatedCost !== "" ? values.estimatedCost : null;
    if ("truckId" in values) values.truckId = values.truckId || null;
    if ("loadId" in values) values.loadId = values.loadId || null;
    if ("policeReportNumber" in values) values.policeReportNumber = values.policeReportNumber || null;
    if ("insuranceClaimNumber" in values) values.insuranceClaimNumber = values.insuranceClaimNumber || null;
    
    // Preserve existing attachment fields if not explicitly provided in update
    const existingAccident = await this.getAccident(id);
    if (existingAccident) {
      if (values.attachments === undefined) {
        values.attachments = existingAccident.attachments;
      }
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
    // Exclude large attachment fields to prevent exceeding response size limits
    // Attachments are fetched separately via getViolation(id)
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
      attachments: sql`null`.as('attachments'),
    }).from(violations).orderBy(desc(violations.violationDate));
    return results as Violation[];
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
        dueDate: insertViolation.dueDate && insertViolation.dueDate !== "" ? new Date(insertViolation.dueDate) : null,
        fineAmount: insertViolation.fineAmount && insertViolation.fineAmount !== "" ? insertViolation.fineAmount : null,
        points: insertViolation.points ?? null,
        truckId: insertViolation.truckId || null,
        citationNumber: insertViolation.citationNumber || null,
      })
      .returning();
    return violation;
  }

  async updateViolation(id: string, updateData: Partial<InsertViolation>): Promise<Violation | undefined> {
    const values: any = { ...updateData };
    if (updateData.violationDate) {
      values.violationDate = new Date(updateData.violationDate);
    }
    if ("dueDate" in values) values.dueDate = values.dueDate && values.dueDate !== "" ? new Date(values.dueDate) : null;
    if ("fineAmount" in values) values.fineAmount = values.fineAmount && values.fineAmount !== "" ? values.fineAmount : null;
    if ("truckId" in values) values.truckId = values.truckId || null;
    if ("citationNumber" in values) values.citationNumber = values.citationNumber || null;
    
    // Preserve existing attachment fields if not explicitly provided in update
    const existingViolation = await this.getViolation(id);
    if (existingViolation) {
      if (values.attachments === undefined) {
        values.attachments = existingViolation.attachments;
      }
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
  async getAllSettlements(companyId?: string): Promise<Settlement[]> {
    if (companyId) {
      return await db.select().from(settlements).where(sql`${settlements}.company_id = ${companyId}`).orderBy(desc(settlements.periodEnd));
    }
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
    const values: any = {
      ...insertSettlement,
      periodStart: new Date(insertSettlement.periodStart),
      periodEnd: new Date(insertSettlement.periodEnd),
      paidDate: insertSettlement.paidDate ? new Date(insertSettlement.paidDate) : undefined,
      advanceDate: insertSettlement.advanceDate ? new Date(insertSettlement.advanceDate) : undefined,
    };
    const [settlement] = await db
      .insert(settlements)
      .values(values)
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
    if (updateData.advanceDate) {
      values.advanceDate = new Date(updateData.advanceDate);
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
    // Exclude large attachment fields to prevent exceeding response size limits
    // Attachments are fetched separately via getMaintenance(id)
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
      attachments: sql`null`.as('attachments'),
    }).from(maintenance).orderBy(desc(maintenance.serviceDate));
    return results as Maintenance[];
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
    
    // Preserve existing attachment fields if not explicitly provided in update
    const existingMaintenance = await this.getMaintenance(id);
    if (existingMaintenance) {
      if (values.attachments === undefined) {
        values.attachments = existingMaintenance.attachments;
      }
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

  // Automation Settings
  async getAllAutomationSettings(): Promise<AutomationSetting[]> {
    return await db.select().from(automationSettings).orderBy(automationSettings.name);
  }

  async getAutomationSetting(name: string): Promise<AutomationSetting | undefined> {
    const [setting] = await db.select().from(automationSettings).where(eq(automationSettings.name, name));
    return setting || undefined;
  }

  async createAutomationSetting(insertSetting: InsertAutomationSetting): Promise<AutomationSetting> {
    const [setting] = await db
      .insert(automationSettings)
      .values(insertSetting)
      .returning();
    return setting;
  }

  async updateAutomationSetting(name: string, updateData: Partial<InsertAutomationSetting>): Promise<AutomationSetting | undefined> {
    const [setting] = await db
      .update(automationSettings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(automationSettings.name, name))
      .returning();
    return setting || undefined;
  }

  // Notifications
  async getAllNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.isRead, "false")).orderBy(desc(notifications.createdAt));
  }

  async getNotificationsByCategory(category: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.category, category)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: "true" })
      .where(eq(notifications.id, id))
      .returning();
    return !!notification;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  // Activity Log
  async getAllActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    return await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
  }

  async getActivityLogsByEntity(entityType: string, entityId: string): Promise<ActivityLog[]> {
    return await db.select().from(activityLog)
      .where(and(
        eq(activityLog.entityType, entityType),
        eq(activityLog.entityId, entityId)
      ))
      .orderBy(desc(activityLog.createdAt));
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLog)
      .values(insertLog)
      .returning();
    return log;
  }
  
  // Short Pays Implementation
  async getAllShortPays(): Promise<ShortPay[]> {
    return await db.select().from(shortPays).orderBy(desc(shortPays.createdAt));
  }

  async getShortPay(id: string): Promise<ShortPay | undefined> {
    const [shortPay] = await db.select().from(shortPays).where(eq(shortPays.id, id));
    return shortPay || undefined;
  }

  async getShortPaysByCustomer(customerId: string): Promise<ShortPay[]> {
    return await db.select().from(shortPays)
      .where(eq(shortPays.customerId, customerId))
      .orderBy(desc(shortPays.createdAt));
  }

  async getShortPaysByStatus(status: string): Promise<ShortPay[]> {
    return await db.select().from(shortPays)
      .where(eq(shortPays.status, status))
      .orderBy(desc(shortPays.createdAt));
  }

  async createShortPay(insertShortPay: InsertShortPay): Promise<ShortPay> {
    const [shortPay] = await db
      .insert(shortPays)
      .values(insertShortPay)
      .returning();
    return shortPay;
  }

  async updateShortPay(id: string, updateData: Partial<InsertShortPay>): Promise<ShortPay | undefined> {
    const [shortPay] = await db
      .update(shortPays)
      .set(updateData)
      .where(eq(shortPays.id, id))
      .returning();
    return shortPay || undefined;
  }

  async deleteShortPay(id: string): Promise<boolean> {
    const result = await db.delete(shortPays).where(eq(shortPays.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Charge Backs Implementation
  async getAllChargeBacks(): Promise<ChargeBack[]> {
    return await db.select().from(chargeBacks).orderBy(desc(chargeBacks.createdAt));
  }

  async getChargeBack(id: string): Promise<ChargeBack | undefined> {
    const [chargeBack] = await db.select().from(chargeBacks).where(eq(chargeBacks.id, id));
    return chargeBack || undefined;
  }

  async getChargeBacksByCustomer(customerId: string): Promise<ChargeBack[]> {
    return await db.select().from(chargeBacks)
      .where(eq(chargeBacks.customerId, customerId))
      .orderBy(desc(chargeBacks.createdAt));
  }

  async getChargeBacksByStatus(status: string): Promise<ChargeBack[]> {
    return await db.select().from(chargeBacks)
      .where(eq(chargeBacks.status, status))
      .orderBy(desc(chargeBacks.createdAt));
  }

  async createChargeBack(insertChargeBack: InsertChargeBack): Promise<ChargeBack> {
    const [chargeBack] = await db
      .insert(chargeBacks)
      .values({
        ...insertChargeBack,
        submittedDate: new Date(insertChargeBack.submittedDate),
        resolvedDate: insertChargeBack.resolvedDate ? new Date(insertChargeBack.resolvedDate) : undefined,
      })
      .returning();
    return chargeBack;
  }

  async updateChargeBack(id: string, updateData: Partial<InsertChargeBack>): Promise<ChargeBack | undefined> {
    const dataToUpdate: any = { ...updateData };
    if (updateData.submittedDate) {
      dataToUpdate.submittedDate = new Date(updateData.submittedDate);
    }
    if (updateData.resolvedDate) {
      dataToUpdate.resolvedDate = new Date(updateData.resolvedDate);
    }
    
    const [chargeBack] = await db
      .update(chargeBacks)
      .set(dataToUpdate)
      .where(eq(chargeBacks.id, id))
      .returning();
    return chargeBack || undefined;
  }

  async deleteChargeBack(id: string): Promise<boolean> {
    const result = await db.delete(chargeBacks).where(eq(chargeBacks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Tasks Implementation
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.status, status))
      .orderBy(desc(tasks.dueDate));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...insertTask,
        dueDate: new Date(insertTask.dueDate),
        completedAt: insertTask.completedAt ? new Date(insertTask.completedAt) : undefined,
      })
      .returning();
    return task;
  }

  async updateTask(id: string, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const values: any = { ...updateData };
    if (updateData.dueDate) {
      values.dueDate = new Date(updateData.dueDate);
    }
    if (updateData.completedAt) {
      values.completedAt = new Date(updateData.completedAt);
    }
    const [task] = await db
      .update(tasks)
      .set(values)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Company Settings Implementation
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings || undefined;
  }

  async updateCompanySettings(updateData: Partial<InsertCompanySettings>): Promise<CompanySettings | undefined> {
    const existingSettings = await this.getCompanySettings();
    
    if (existingSettings) {
      const [updated] = await db
        .update(companySettings)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(companySettings.id, existingSettings.id))
        .returning();
      return updated || undefined;
    } else {
      const [created] = await db
        .insert(companySettings)
        .values(updateData as InsertCompanySettings)
        .returning();
      return created;
    }
  }

  // Divisions Implementation
  async getAllDivisions(): Promise<Division[]> {
    return await db.select().from(divisions).orderBy(desc(divisions.isPrimary), divisions.companyName);
  }

  async getDivision(id: string): Promise<Division | undefined> {
    const [division] = await db.select().from(divisions).where(eq(divisions.id, id));
    return division || undefined;
  }

  async createDivision(division: InsertDivision): Promise<Division> {
    if (division.isPrimary) {
      await db.update(divisions).set({ isPrimary: false });
    }
    const [created] = await db.insert(divisions).values(division).returning();
    return created;
  }

  async updateDivision(id: string, updateData: Partial<InsertDivision>): Promise<Division | undefined> {
    if (updateData.isPrimary) {
      await db.update(divisions).set({ isPrimary: false });
    }
    const [updated] = await db
      .update(divisions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(divisions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDivision(id: string): Promise<boolean> {
    const result = await db.delete(divisions).where(eq(divisions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createDivisionInvitation(invitation: InsertDivisionInvitation): Promise<DivisionInvitation> {
    const [created] = await db.insert(divisionInvitations).values(invitation).returning();
    return created;
  }

  async getDivisionInvitationByToken(token: string): Promise<DivisionInvitation | undefined> {
    const [invitation] = await db.select().from(divisionInvitations).where(eq(divisionInvitations.token, token));
    return invitation || undefined;
  }

  async updateDivisionInvitation(id: string, data: Partial<InsertDivisionInvitation>): Promise<DivisionInvitation | undefined> {
    const [updated] = await db.update(divisionInvitations).set(data).where(eq(divisionInvitations.id, id)).returning();
    return updated || undefined;
  }

  async getDivisionInvitations(divisionId: string): Promise<DivisionInvitation[]> {
    return await db.select().from(divisionInvitations).where(eq(divisionInvitations.divisionId, divisionId)).orderBy(desc(divisionInvitations.createdAt));
  }

  async getPendingUsersByDivision(divisionId: string): Promise<User[]> {
    return await db.select().from(users).where(and(eq(users.divisionId, divisionId), eq(users.approved, "false")));
  }

  async getAllFeedbacks(): Promise<Feedback[]> {
    return await db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const [created] = await db.insert(feedbacks).values(feedback).returning();
    return created;
  }

  async deleteFeedback(id: string): Promise<boolean> {
    const deleted = await db.delete(feedbacks).where(eq(feedbacks.id, id)).returning();
    return deleted.length > 0;
  }

  async updateFeedbackStatus(id: string, status: string): Promise<Feedback | undefined> {
    const [updated] = await db
      .update(feedbacks)
      .set({ status })
      .where(eq(feedbacks.id, id))
      .returning();
    return updated || undefined;
  }

  async createSentEmail(data: InsertSentEmail): Promise<SentEmail> {
    const [created] = await db.insert(sentEmails).values(data).returning();
    return created;
  }

  async getAllSentEmails(): Promise<SentEmail[]> {
    return await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
  }
}

export const storage = new DatabaseStorage();
