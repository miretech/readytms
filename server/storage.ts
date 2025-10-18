import { 
  type User, 
  type InsertUser,
  type Load,
  type InsertLoad,
  type Truck,
  type InsertTruck,
  type Driver,
  type InsertDriver,
  type Customer,
  type InsertCustomer
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<boolean>;
  
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private loads: Map<string, Load>;
  private trucks: Map<string, Truck>;
  private drivers: Map<string, Driver>;
  private customers: Map<string, Customer>;

  constructor() {
    this.users = new Map();
    this.loads = new Map();
    this.trucks = new Map();
    this.drivers = new Map();
    this.customers = new Map();
    this.seedData();
  }

  private seedData() {
    const defaultCustomers: InsertCustomer[] = [
      {
        name: "ABC Logistics Inc.",
        email: "contact@abclogistics.com",
        phone: "(555) 100-2000",
        address: "1234 Industrial Blvd, Chicago, IL 60601",
        type: "shipper",
      },
      {
        name: "Global Freight Solutions",
        email: "info@globalfreight.com",
        phone: "(555) 200-3000",
        address: "5678 Commerce Dr, Atlanta, GA 30303",
        type: "shipper",
      },
      {
        name: "Midwest Distribution Co.",
        email: "orders@midwestdist.com",
        phone: "(555) 300-4000",
        address: "910 Warehouse Ln, Dallas, TX 75201",
        type: "receiver",
      },
    ];

    defaultCustomers.forEach(customer => {
      const id = randomUUID();
      this.customers.set(id, { ...customer, id });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllLoads(): Promise<Load[]> {
    return Array.from(this.loads.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getLoad(id: string): Promise<Load | undefined> {
    return this.loads.get(id);
  }

  async createLoad(insertLoad: InsertLoad): Promise<Load> {
    const id = randomUUID();
    const load: Load = { 
      ...insertLoad, 
      id,
      createdAt: new Date(),
      pickupDate: new Date(insertLoad.pickupDate),
      deliveryDate: new Date(insertLoad.deliveryDate),
    };
    this.loads.set(id, load);
    return load;
  }

  async updateLoad(id: string, updateData: Partial<InsertLoad>): Promise<Load | undefined> {
    const load = this.loads.get(id);
    if (!load) return undefined;

    const updated: Load = { 
      ...load, 
      ...updateData,
      pickupDate: updateData.pickupDate ? new Date(updateData.pickupDate) : load.pickupDate,
      deliveryDate: updateData.deliveryDate ? new Date(updateData.deliveryDate) : load.deliveryDate,
    };
    this.loads.set(id, updated);
    return updated;
  }

  async deleteLoad(id: string): Promise<boolean> {
    return this.loads.delete(id);
  }

  async getAllTrucks(): Promise<Truck[]> {
    return Array.from(this.trucks.values());
  }

  async getTruck(id: string): Promise<Truck | undefined> {
    return this.trucks.get(id);
  }

  async createTruck(insertTruck: InsertTruck): Promise<Truck> {
    const id = randomUUID();
    const truck: Truck = { ...insertTruck, id };
    this.trucks.set(id, truck);
    return truck;
  }

  async updateTruck(id: string, updateData: Partial<InsertTruck>): Promise<Truck | undefined> {
    const truck = this.trucks.get(id);
    if (!truck) return undefined;

    const updated: Truck = { ...truck, ...updateData };
    this.trucks.set(id, updated);
    return updated;
  }

  async deleteTruck(id: string): Promise<boolean> {
    return this.trucks.delete(id);
  }

  async getAllDrivers(): Promise<Driver[]> {
    return Array.from(this.drivers.values());
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    return this.drivers.get(id);
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const id = randomUUID();
    const driver: Driver = { ...insertDriver, id };
    this.drivers.set(id, driver);
    return driver;
  }

  async updateDriver(id: string, updateData: Partial<InsertDriver>): Promise<Driver | undefined> {
    const driver = this.drivers.get(id);
    if (!driver) return undefined;

    const updated: Driver = { ...driver, ...updateData };
    this.drivers.set(id, updated);
    return updated;
  }

  async deleteDriver(id: string): Promise<boolean> {
    return this.drivers.delete(id);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = { ...insertCustomer, id };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updateData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;

    const updated: Customer = { ...customer, ...updateData };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }
}

export const storage = new MemStorage();
