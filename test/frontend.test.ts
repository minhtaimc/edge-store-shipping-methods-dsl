/**
 * Frontend API Tests
 * Tests for getShippingMethodsForDisplay() - checkout UI use case
 *
 * Features tested:
 * - DisplayShippingMethod type with complete UI information
 * - Tier-level availability and upgrade hints
 * - Method-level availability for non-tiered methods
 * - Progress tracking and next tier information
 * - availabilityMode field for UI rendering
 */

import { describe, it, expect } from "vitest";
import {
  validateShippingConfig,
  getShippingMethodsForDisplay,
  type ShippingConfig,
  type EvaluationContext,
} from "../src/index";

// Helper to test individual shipping methods
function calculateShippingMethod(method: any, context: EvaluationContext) {
  const tempConfig = { version: "1.0", methods: [method] };
  const results = getShippingMethodsForDisplay(tempConfig as any, context);
  return results[0];
}

// Test configuration with tier-level availability
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
            promoText: "You've unlocked free standard shipping!",
            availability: {
              mode: "show_hint",
              when: ["order.value.min"],
              message: "Add $${remaining} more to unlock free standard shipping",
              showProgress: true,
            },
          },
        ],
      },
    },
    {
      id: "shipping.promo.free",
      enabled: true,
      name: "Promotional Free Shipping",
      conditions: {
        order: { value: { min: 50 } },
      },
      pricing: {
        type: "flat",
        amount: 0,
      },
      availability: {
        mode: "show_hint",
        when: ["order.value.min"],
        message: "Add $${remaining} more to unlock promotional free shipping",
        showProgress: true,
      },
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
        amount: 9.99,
      },
    },
  ],
};

describe("v1.4.0 - Tier-level availability", () => {
  it("should show upgrade hint when in paid tier", () => {
    const context: EvaluationContext = {
      orderValue: 75,
      itemCount: 2,
      country: "US",
      locale: "en",
    };

    const result = calculateShippingMethod(testConfig.methods[0], context);

    expect(result.available).toBe(true);
    expect(result.price).toBe(4.97);
    expect(result.tierId).toBe("tier_paid");
    expect(result.availabilityMode).toBe("show_hint");
    expect(result.upgradeMessage).toContain("25");
    expect(result.progress).toBeDefined();
    expect(result.progress?.percentage).toBe(75);
    expect(result.progress?.remaining).toBe(25);

    // Check next tier information
    expect(result.nextTier).toBeDefined();
    expect(result.nextTier?.id).toBe("tier_free");
    expect(result.nextTier?.label).toBe("Free Standard Shipping");
    expect(result.nextTier?.price).toBe(0);
    expect(result.nextTier?.estimatedDays).toEqual({ min: 5, max: 7 });
  });

  it("should show promo text when free tier unlocked", () => {
    const context: EvaluationContext = {
      orderValue: 150,
      itemCount: 3,
      country: "US",
      locale: "en",
    };

    const result = calculateShippingMethod(testConfig.methods[0], context);

    expect(result.available).toBe(true);
    expect(result.price).toBe(0);
    expect(result.tierId).toBe("tier_free");
    expect(result.promoText).toContain("unlocked");
    expect(result.availabilityMode).toBeUndefined();
    expect(result.upgradeMessage).toBeUndefined();
  });

  it("should hide when hard requirements not met", () => {
    const context: EvaluationContext = {
      orderValue: 75,
      itemCount: 2,
      country: "CA",
      locale: "en",
    };

    const result = calculateShippingMethod(testConfig.methods[0], context);

    expect(result.available).toBe(false);
    expect(result.availabilityMode).toBeUndefined();
    expect(result.message).toBe("Conditions not met");
  });
});

describe("v1.4.0 - Non-tiered availability", () => {
  it("should show hint when conditions not met", () => {
    const context: EvaluationContext = {
      orderValue: 30,
      itemCount: 1,
      country: "US",
      locale: "en",
    };

    const result = calculateShippingMethod(testConfig.methods[1], context);

    expect(result.available).toBe(false);
    expect(result.availabilityMode).toBe("show_hint");
    expect(result.message).toContain("20");
    expect(result.progress).toBeDefined();
    expect(result.progress?.percentage).toBe(60);
    expect(result.progress?.remaining).toBe(20);
  });

  it("should be available when conditions met", () => {
    const context: EvaluationContext = {
      orderValue: 60,
      itemCount: 2,
      country: "US",
      locale: "en",
    };

    const result = calculateShippingMethod(testConfig.methods[1], context);

    expect(result.available).toBe(true);
    expect(result.price).toBe(0);
    expect(result.availabilityMode).toBeUndefined();
  });

  it("should filter out methods with hide mode when no availability config", () => {
    const context: EvaluationContext = {
      orderValue: 50,
      itemCount: 2,
      country: "US",
      locale: "en",
    };

    const result = calculateShippingMethod(testConfig.methods[2], context);

    // Method with availabilityMode: "hide" should be filtered out
    expect(result).toBeUndefined();
  });
});

describe("v1.4.0 - Display filtering", () => {
  it("should filter out hidden methods (availabilityMode: hide)", () => {
    const context: EvaluationContext = {
      orderValue: 75,
      itemCount: 2,
      country: "US",
      locale: "en",
    };

    const displayMethods = getShippingMethodsForDisplay(testConfig, context);

    // Should only return 2 methods (Canada Shipping is hidden because country = US)
    expect(displayMethods).toHaveLength(2);

    // Promotional Free Shipping - available (orderValue 75 >= 50)
    const promo = displayMethods.find((m) => m.methodId === "shipping.promo.free");
    expect(promo?.available).toBe(true);
    expect(promo?.availabilityMode).toBeUndefined();

    // Canada Shipping - should be filtered out (availabilityMode: "hide")
    const canada = displayMethods.find((m) => m.methodId === "shipping.ca.standard");
    expect(canada).toBeUndefined();

    // Standard Shipping - available with upgrade hint
    const standard = displayMethods.find((m) => m.methodId === "shipping.us.standard");
    expect(standard?.available).toBe(true);
    expect(standard?.availabilityMode).toBe("show_hint");
    expect(standard?.upgradeMessage).toBeDefined();
  });

  it("should include all display fields (name, icon, badge, enabled, meta)", () => {
    const context: EvaluationContext = {
      orderValue: 75,
      itemCount: 2,
      country: "US",
      locale: "en",
    };

    const displayMethods = getShippingMethodsForDisplay(testConfig, context);

    displayMethods.forEach((method) => {
      // All methods should have name
      expect(method.name).toBeDefined();
      expect(typeof method.name).toBe("string");

      // All methods should have enabled flag
      expect(method.enabled).toBeDefined();
      expect(typeof method.enabled).toBe("boolean");

      // Check that icon, badge, description, meta are preserved if present
      // (some methods may not have these fields)
      if (method.icon !== undefined) {
        expect(typeof method.icon).toBe("string");
      }
      if (method.badge !== undefined) {
        expect(typeof method.badge).toBe("string");
      }
      if (method.description !== undefined) {
        expect(typeof method.description).toBe("string");
      }
    });
  });
});

describe("v1.4.0 - Configuration validation", () => {
  it("should validate configuration successfully", () => {
    expect(() => validateShippingConfig(testConfig)).not.toThrow();

    const validated = validateShippingConfig(testConfig);
    expect(validated.methods).toHaveLength(3);
  });

  it("should validate tier-level availability", () => {
    const config = {
      version: "1.0",
      methods: [
        {
          id: "test",
          enabled: true,
          name: "Test",
          pricing: {
            type: "tiered",
            rules: [
              {
                id: "tier1",
                price: 5,
                criteria: { order: { value: { max: 50 } } },
                availability: {
                  mode: "show_hint",
                  when: ["order.value.min"],
                  message: "Test message",
                  showProgress: true,
                },
              },
            ],
          },
        },
      ],
    };

    expect(() => validateShippingConfig(config)).not.toThrow();
  });
});
