import { describe, it, expect } from "vitest";
import {
  insertDriverSchema,
  insertTruckSchema,
  insertLoadSchema,
  insertCustomerSchema,
  insertInsuranceTruckSchema,
  insertInsuranceTrailerSchema,
} from "./schema";

describe("insertDriverSchema", () => {
  const validDriver = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "555-1234",
    licenseNumber: "DL-001",
    status: "active",
    driverType: "company-driver" as const,
  };

  it("accepts a valid driver", () => {
    const result = insertDriverSchema.safeParse(validDriver);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid driverType", () => {
    const result = insertDriverSchema.safeParse({
      ...validDriver,
      driverType: "contractor",
    });
    expect(result.success).toBe(false);
  });

  it("requires name, email, phone, and licenseNumber", () => {
    for (const field of ["name", "email", "phone", "licenseNumber"]) {
      const partial = { ...validDriver } as Record<string, unknown>;
      delete partial[field];
      expect(insertDriverSchema.safeParse(partial).success).toBe(false);
    }
  });

  it("transforms empty date strings to undefined", () => {
    const result = insertDriverSchema.parse({
      ...validDriver,
      licenseExpiration: "",
      dateHired: "",
    });
    expect(result.licenseExpiration).toBeUndefined();
    expect(result.dateHired).toBeUndefined();
  });

  it("preserves non-empty date strings", () => {
    const result = insertDriverSchema.parse({
      ...validDriver,
      licenseExpiration: "2027-01-01",
    });
    expect(result.licenseExpiration).toBe("2027-01-01");
  });
});

describe("insertTruckSchema", () => {
  const validTruck = {
    truckNumber: "T-100",
    type: "semi",
    status: "available" as const,
    licensePlate: "ABC-123",
  };

  it("accepts a valid truck", () => {
    expect(insertTruckSchema.safeParse(validTruck).success).toBe(true);
  });

  it("rejects an out-of-range status", () => {
    const result = insertTruckSchema.safeParse({
      ...validTruck,
      status: "exploded",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every allowed status value", () => {
    for (const status of [
      "available",
      "in-use",
      "maintenance",
      "out-of-service",
      "terminated",
    ]) {
      expect(
        insertTruckSchema.safeParse({ ...validTruck, status }).success,
      ).toBe(true);
    }
  });
});

describe("insertLoadSchema", () => {
  const validLoad = {
    loadNumber: "L-001",
    status: "Pending",
    pickupLocation: "Chicago, IL",
    deliveryLocation: "Dallas, TX",
    rate: "1500.00",
  };

  it("accepts a valid load with a string rate", () => {
    expect(insertLoadSchema.safeParse(validLoad).success).toBe(true);
  });

  it("requires rate to be a string", () => {
    const result = insertLoadSchema.safeParse({ ...validLoad, rate: 1500 });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid source enum", () => {
    const result = insertLoadSchema.safeParse({
      ...validLoad,
      source: "imported",
    });
    expect(result.success).toBe(false);
  });

  it("validates podAttachments shape", () => {
    const result = insertLoadSchema.safeParse({
      ...validLoad,
      podAttachments: [{ filename: "pod.pdf" }], // missing data/type/uploadedAt
    });
    expect(result.success).toBe(false);
  });
});

describe("insertCustomerSchema", () => {
  it("requires a name", () => {
    expect(insertCustomerSchema.safeParse({ email: "a@b.com" }).success).toBe(
      false,
    );
  });

  it("accepts a minimal customer", () => {
    expect(insertCustomerSchema.safeParse({ name: "Acme Corp" }).success).toBe(
      true,
    );
  });
});

describe("insertInsuranceTruckSchema", () => {
  it("requires a unitNumber", () => {
    expect(insertInsuranceTruckSchema.safeParse({ make: "Volvo" }).success).toBe(
      false,
    );
  });

  it("accepts a minimal record (status defaults at the DB)", () => {
    const result = insertInsuranceTruckSchema.safeParse({ unitNumber: "450" });
    expect(result.success).toBe(true);
  });

  it("accepts the full truck payload from the insurance route", () => {
    const result = insertInsuranceTruckSchema.safeParse({
      unitNumber: "450",
      year: 2020,
      make: "Freightliner",
      model: "Cascadia",
      vin: "1FUJGLDR0CSBP1234",
      physicalDamage: "100000",
      ownerOperator: "John Smith",
      lossPayeeName: "Bank of Trucking",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-integer year", () => {
    expect(
      insertInsuranceTruckSchema.safeParse({ unitNumber: "450", year: "twenty" })
        .success,
    ).toBe(false);
  });
});

describe("insertInsuranceTrailerSchema", () => {
  it("requires a unitNumber", () => {
    expect(insertInsuranceTrailerSchema.safeParse({ make: "Wabash" }).success).toBe(
      false,
    );
  });

  it("accepts a minimal trailer record", () => {
    expect(
      insertInsuranceTrailerSchema.safeParse({ unitNumber: "T-200" }).success,
    ).toBe(true);
  });
});
