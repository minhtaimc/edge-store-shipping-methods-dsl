/**
 * Backend API Tests
 * Tests for getShippingMethodById() - order validation use case
 *
 * Features tested:
 * - ValidatedShippingMethod type with minimal validation data
 * - ID validation (simple and tiered IDs)
 * - Availability checking
 * - Price validation
 * - Invalid ID handling
 */

import { describe, it, expect } from "vitest";
import {
  validateShippingConfig,
  getShippingMethodById,
  type ShippingConfig,
  type EvaluationContext,
  type ValidatedShippingMethod,
} from "../src/index";

// Test configuration
const testConfig: ShippingConfig = {
  version: "1.0",
  currency: "USD",
  methods: [
    {
      id: "shipping.us.standard",
      enabled: true,
      name: "Standard Shipping",
      conditions: {
        geo: { country: { include: ["US"] } },
      },
      pricing: {
        type: "tiered",
        rules: [
          {
            id: "tier_paid",
            label: "Standard Shipping",
            criteria: {
              order: { value: { max: 99.99 } },
            },
            price: 4.97,
            estimatedDays: { min: 5, max: 7 },
          },
          {
            id: "tier_free",
            label: "Free Standard Shipping",
            criteria: {
              order: { value: { min: 100 } },
            },
            price: 0,
            estimatedDays: { min: 5, max: 7 },
          },
        ],
      },
    },
    {
      id: "shipping.us.express",
      enabled: true,
      name: "Express Shipping",
      conditions: {
        geo: { country: { include: ["US"] } },
      },
      pricing: {
        type: "flat",
        amount: 9.97,
      },
      estimatedDays: { min: 2, max: 3 },
    },
    {
      id: "shipping.ca.standard",
      enabled: true,
      name: "Canada Shipping",
      conditions: {
        geo: { country: { include: ["CA"] } },
      },
      pricing: {
        type: "flat",
        amount: 12.97,
      },
    },
  ],
};

const baseContext: EvaluationContext = {
  orderValue: 75,
  itemCount: 2,
  country: "US",
  locale: "en",
};

describe("Backend API - getShippingMethodById()", () => {
  describe("Tiered pricing validation", () => {
    it("should validate tiered ID format and return correct tier", () => {
      const method = getShippingMethodById(
        testConfig,
        "shipping.us.standard:tier_paid",
        baseContext
      );

      expect(method).toBeDefined();
      expect(method?.id).toBe("shipping.us.standard:tier_paid");
      expect(method?.methodId).toBe("shipping.us.standard");
      expect(method?.tierId).toBe("tier_paid");
      expect(method?.price).toBe(4.97);
      expect(method?.available).toBe(true);
    });

    it("should validate free tier when order value meets criteria", () => {
      const context: EvaluationContext = {
        ...baseContext,
        orderValue: 150,
      };

      const method = getShippingMethodById(
        testConfig,
        "shipping.us.standard:tier_free",
        context
      );

      expect(method).toBeDefined();
      expect(method?.tierId).toBe("tier_free");
      expect(method?.price).toBe(0);
      expect(method?.available).toBe(true);
    });

    it("should return unavailable when tier criteria not met", () => {
      const context: EvaluationContext = {
        ...baseContext,
        orderValue: 50, // Less than tier_free min (100)
      };

      const method = getShippingMethodById(
        testConfig,
        "shipping.us.standard:tier_free",
        context
      );

      expect(method).toBeDefined();
      expect(method?.available).toBe(false);
    });

    it("should use tier label as name for tiered pricing", () => {
      // Test paid tier
      const methodPaid = getShippingMethodById(
        testConfig,
        "shipping.us.standard:tier_paid",
        baseContext
      );

      expect(methodPaid?.name).toBe("Standard Shipping");
      expect(methodPaid?.tierId).toBe("tier_paid");

      // Test free tier
      const methodFree = getShippingMethodById(
        testConfig,
        "shipping.us.standard:tier_free",
        {
          ...baseContext,
          orderValue: 150,
        }
      );

      expect(methodFree?.name).toBe("Free Standard Shipping");
      expect(methodFree?.tierId).toBe("tier_free");
    });

    it("should return undefined for invalid tier ID", () => {
      const method = getShippingMethodById(
        testConfig,
        "shipping.us.standard:tier_invalid",
        baseContext
      );

      expect(method).toBeUndefined();
    });
  });

  describe("Non-tiered pricing validation", () => {
    it("should validate simple ID and return price", () => {
      const method = getShippingMethodById(testConfig, "shipping.us.express", baseContext);

      expect(method).toBeDefined();
      expect(method?.id).toBe("shipping.us.express");
      expect(method?.methodId).toBe("shipping.us.express");
      expect(method?.tierId).toBeUndefined();
      expect(method?.price).toBe(9.97);
      expect(method?.available).toBe(true);
      expect(method?.estimatedDays).toEqual({ min: 2, max: 3 });
    });

    it("should return unavailable when conditions not met", () => {
      const context: EvaluationContext = {
        ...baseContext,
        country: "CA", // Express is US only
      };

      const method = getShippingMethodById(testConfig, "shipping.us.express", context);

      expect(method).toBeDefined();
      expect(method?.available).toBe(false);
      expect(method?.price).toBe(0);
    });
  });

  describe("Invalid ID handling", () => {
    it("should return undefined for non-existent method ID", () => {
      const method = getShippingMethodById(testConfig, "shipping.invalid", baseContext);

      expect(method).toBeUndefined();
    });

    it("should ignore tier ID for non-tiered method and validate method", () => {
      // Behavior: When tier ID is provided but method is not tiered,
      // the backend validates the method itself (ignores tier ID)
      // This is forgiving behavior for backward compatibility
      const method = getShippingMethodById(
        testConfig,
        "shipping.us.express:tier_something",
        baseContext
      );

      expect(method).toBeDefined();
      expect(method?.id).toBe("shipping.us.express"); // Note: tier part is ignored
      expect(method?.methodId).toBe("shipping.us.express");
      expect(method?.tierId).toBeUndefined();
      expect(method?.available).toBe(true);
    });
  });

  describe("ValidatedShippingMethod type structure", () => {
    it("should return only validation-relevant fields (not UI fields)", () => {
      const method = getShippingMethodById(
        testConfig,
        "shipping.us.standard:tier_paid",
        baseContext
      ) as any;

      // Should have validation fields
      expect(method.id).toBeDefined();
      expect(method.methodId).toBeDefined();
      expect(method.tierId).toBeDefined();
      expect(method.name).toBeDefined();
      expect(method.price).toBeDefined();
      expect(method.available).toBeDefined();
      expect(method.enabled).toBeDefined();

      // Should NOT have UI-only fields
      expect(method.icon).toBeUndefined();
      expect(method.badge).toBeUndefined();
      expect(method.availabilityMode).toBeUndefined();
      expect(method.upgradeMessage).toBeUndefined();
      expect(method.progress).toBeUndefined();
      expect(method.nextTier).toBeUndefined();
    });
  });

  describe("Geo-based validation", () => {
    it("should validate country restrictions", () => {
      const usMethod = getShippingMethodById(testConfig, "shipping.us.express", {
        ...baseContext,
        country: "US",
      });
      expect(usMethod?.available).toBe(true);

      const caMethod = getShippingMethodById(testConfig, "shipping.us.express", {
        ...baseContext,
        country: "CA",
      });
      expect(caMethod?.available).toBe(false);
    });
  });

  describe("Configuration validation", () => {
    it("should work with validated config", () => {
      expect(() => validateShippingConfig(testConfig)).not.toThrow();

      const validated = validateShippingConfig(testConfig);
      const method = getShippingMethodById(validated, "shipping.us.express", baseContext);

      expect(method).toBeDefined();
      expect(method?.available).toBe(true);
    });
  });
});
