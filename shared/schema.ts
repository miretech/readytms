import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
});

export const insertTruckSchema = createInsertSchema(trucks).omit({
  id: true,
});

export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucks.$inferSelect;

export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  licenseNumber: text("license_number").notNull().unique(),
  status: text("status").notNull(),
  assignedTruckId: varchar("assigned_truck_id"),
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
});

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const loads = pgTable("loads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadNumber: text("load_number").notNull().unique(),
  customerId: varchar("customer_id").notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoadSchema = createInsertSchema(loads).omit({
  id: true,
  createdAt: true,
}).extend({
  pickupDate: z.string(),
  deliveryDate: z.string(),
  rate: z.string(),
  expenses: z.string().optional(),
});

export type InsertLoad = z.infer<typeof insertLoadSchema>;
export type Load = typeof loads.$inferSelect;
