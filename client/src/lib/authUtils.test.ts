import { describe, it, expect } from "vitest";
import { isUnauthorizedError } from "./authUtils";

describe("isUnauthorizedError", () => {
  it("returns true for a 401 Unauthorized message", () => {
    expect(isUnauthorizedError(new Error("401: Unauthorized"))).toBe(true);
  });

  it("returns true when extra text follows the status", () => {
    expect(
      isUnauthorizedError(new Error("401: Unauthorized - token expired")),
    ).toBe(true);
  });

  it("returns false for other status codes", () => {
    expect(isUnauthorizedError(new Error("403: Forbidden"))).toBe(false);
    expect(isUnauthorizedError(new Error("500: Server Error"))).toBe(false);
  });

  it("returns false for an unrelated message", () => {
    expect(isUnauthorizedError(new Error("Network request failed"))).toBe(
      false,
    );
  });
});
