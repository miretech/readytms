import { db } from "./db";
import { customers } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  const existingCustomers = await db.select().from(customers);
  
  if (existingCustomers.length === 0) {
    console.log("Adding default customers...");
    await db.insert(customers).values([
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
    ]);
    console.log("Default customers added successfully");
  } else {
    console.log(`Database already has ${existingCustomers.length} customers, skipping seed`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
