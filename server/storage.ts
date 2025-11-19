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
  type PasswordResetToken,
  users,
  loads,
  trucks,
  trailers,
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
  passwordResetTokens
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
  
  getAllTrailers(): Promise<Trailer[]>;
  getTrailer(id: string): Promise<Trailer | undefined>;
  createTrailer(trailer: InsertTrailer): Promise<Trailer>;
  updateTrailer(id: string, trailer: Partial<InsertTrailer>): Promise<Trailer | undefined>;
  deleteTrailer(id: string): Promise<boolean>;
  
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
        from: 'Ready TMS <noreply@resend.dev>',
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

  async getAllTrailers(): Promise<Trailer[]> {
    return await db.select().from(trailers);
  }

  async getTrailer(id: string): Promise<Trailer | undefined> {
    const [trailer] = await db.select().from(trailers).where(eq(trailers.id, id));
    return trailer || undefined;
  }

  async createTrailer(insertTrailer: InsertTrailer): Promise<Trailer> {
    const [trailer] = await db
      .insert(trailers)
      .values(insertTrailer)
      .returning();
    return trailer;
  }

  async updateTrailer(id: string, updateData: Partial<InsertTrailer>): Promise<Trailer | undefined> {
    const [trailer] = await db
      .update(trailers)
      .set(updateData)
      .where(eq(trailers.id, id))
      .returning();
    return trailer || undefined;
  }

  async deleteTrailer(id: string): Promise<boolean> {
    const result = await db.delete(trailers).where(eq(trailers.id, id)).returning();
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
      // Create new settings if none exist
      const [created] = await db
        .insert(companySettings)
        .values(updateData as InsertCompanySettings)
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
