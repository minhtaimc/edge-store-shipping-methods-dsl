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

  it("should use tier label as name instead of method name", () => {
    const context: EvaluationContext = {
      orderValue: 75,
      itemCount: 2,
      country: "US",
      locale: "en",
    };

    const result = calculateShippingMethod(testConfig.methods[0], context);

    // Should use tier label "Standard Shipping" not method name
    expect(result.name).toBe("Standard Shipping");
    expect(result.tierId).toBe("tier_paid");

    // When free tier is unlocked
    const contextFree: EvaluationContext = {
      orderValue: 150,
      itemCount: 3,
      country: "US",
      locale: "en",
    };

    const resultFree = calculateShippingMethod(testConfig.methods[0], contextFree);

    // Should use tier label "Free Standard Shipping"
    expect(resultFree.name).toBe("Free Standard Shipping");
    expect(resultFree.tierId).toBe("tier_free");
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

describe("Date-based criteria for seasonal/holiday pricing", () => {
  describe("Tier-level date criteria", () => {
    const seasonalConfig = {
      version: "1.0",
      methods: [
        {
          id: "shipping.seasonal.express",
          enabled: true,
          name: "Express Shipping",
          conditions: {
            geo: { country: { include: ["US"] } },
          },
          pricing: {
            type: "tiered",
            rules: [
              {
                id: "christmas_rush",
                label: "Christmas Express (Order by Dec 20)",
                criteria: {
                  date: { after: "2024-12-10", before: "2024-12-20" },
                },
                price: 14.99,
                estimatedDays: { min: 2, max: 3 },
              },
              {
                id: "post_christmas",
                label: "Express Shipping (After Christmas)",
                criteria: {
                  date: { after: "2024-12-20", before: "2024-12-27" },
                },
                price: 12.99,
                estimatedDays: { min: 7, max: 10 },
              },
              {
                id: "normal",
                label: "Express Shipping",
                criteria: {},
                price: 9.99,
                estimatedDays: { min: 2, max: 3 },
              },
            ],
          },
        },
      ],
    } as any;

    it("should match tier with 'after' and 'before' criteria (date range)", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-12-15"),
      };

      const methods = getShippingMethodsForDisplay(seasonalConfig, context);
      const method = methods[0];

      expect(method.tierId).toBe("christmas_rush");
      expect(method.name).toBe("Christmas Express (Order by Dec 20)");
      expect(method.price).toBe(14.99);
      expect(method.estimatedDays).toEqual({ min: 2, max: 3 });
    });

    it("should match tier after Christmas deadline", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-12-22"),
      };

      const methods = getShippingMethodsForDisplay(seasonalConfig, context);
      const method = methods[0];

      expect(method.tierId).toBe("post_christmas");
      expect(method.name).toBe("Express Shipping (After Christmas)");
      expect(method.price).toBe(12.99);
      expect(method.estimatedDays).toEqual({ min: 7, max: 10 });
    });

    it("should match fallback tier with no date criteria", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-11-15"),
      };

      const methods = getShippingMethodsForDisplay(seasonalConfig, context);
      const method = methods[0];

      expect(method.tierId).toBe("normal");
      expect(method.name).toBe("Express Shipping");
      expect(method.price).toBe(9.99);
      expect(method.estimatedDays).toEqual({ min: 2, max: 3 });
    });

    it("should respect boundary - exact match on 'before' date (excluded)", () => {
      // before: "2024-12-20" means orderDate must be < 2024-12-20
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-12-20T00:00:00Z"),
      };

      const methods = getShippingMethodsForDisplay(seasonalConfig, context);
      const method = methods[0];

      // Should NOT match christmas_rush (before is exclusive)
      // Should match post_christmas (after: "2024-12-20", meaning >= 2024-12-20)
      expect(method.tierId).toBe("post_christmas");
    });

    it("should respect boundary - exact match on 'after' date (included)", () => {
      // after: "2024-12-10" means orderDate must be >= 2024-12-10
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-12-10T00:00:00Z"),
      };

      const methods = getShippingMethodsForDisplay(seasonalConfig, context);
      const method = methods[0];

      // Should match christmas_rush (after is inclusive)
      expect(method.tierId).toBe("christmas_rush");
    });

    it("should default to first matching tier when orderDate not provided (backward compatibility)", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        // No orderDate provided
      };

      const methods = getShippingMethodsForDisplay(seasonalConfig, context);
      const method = methods[0];

      // When orderDate is not provided, date criteria defaults to true (backward compatibility)
      // So first tier with date criteria will match (christmas_rush in this case)
      expect(method.tierId).toBe("christmas_rush");
      expect(method.price).toBe(14.99);
    });
  });

  describe("Method-level date criteria", () => {
    const methodLevelConfig = {
      version: "1.0",
      methods: [
        {
          id: "shipping.overnight",
          enabled: true,
          name: "Overnight Shipping",
          conditions: {
            geo: { country: { include: ["US"] } },
            date: { after: "2024-12-30T23:59:59Z" },
          },
          pricing: {
            type: "flat",
            amount: 29.97,
          },
          estimatedDays: { min: 1, max: 1 },
        },
      ],
    } as any;

    it("should hide method when date condition not met (before threshold)", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-12-20"),
      };

      const methods = getShippingMethodsForDisplay(methodLevelConfig, context);

      // Method should be filtered out (availabilityMode: "hide")
      expect(methods).toHaveLength(0);
    });

    it("should show method when date condition met (after threshold)", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-12-31"),
      };

      const methods = getShippingMethodsForDisplay(methodLevelConfig, context);

      expect(methods).toHaveLength(1);
      expect(methods[0].methodId).toBe("shipping.overnight");
      expect(methods[0].available).toBe(true);
      expect(methods[0].price).toBe(29.97);
    });

    it("should show method when orderDate not provided (backward compatibility)", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        // No orderDate provided
      };

      const methods = getShippingMethodsForDisplay(methodLevelConfig, context);

      // Backward compatibility: date criteria defaults to true
      expect(methods).toHaveLength(1);
      expect(methods[0].methodId).toBe("shipping.overnight");
    });
  });

  describe("OR logic with tiered pricing (hide in date range)", () => {
    const orLogicConfig = {
      version: "1.0",
      methods: [
        {
          id: "shipping.overnight.seasonal",
          enabled: true,
          name: "Overnight Shipping",
          conditions: {
            geo: { country: { include: ["US"] } },
          },
          pricing: {
            type: "tiered",
            rules: [
              {
                id: "tier_before_holiday",
                label: "Overnight Shipping",
                criteria: {
                  date: { before: "2024-12-15T00:00:00Z" },
                },
                price: 29.97,
                estimatedDays: { min: 1, max: 1 },
              },
              {
                id: "tier_after_holiday",
                label: "Overnight Shipping",
                criteria: {
                  date: { after: "2024-12-30T23:59:59Z" },
                },
                price: 29.97,
                estimatedDays: { min: 1, max: 1 },
              },
            ],
          },
        },
      ],
    } as any;

    it("should show method before holiday blackout period", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-12-10"),
      };

      const methods = getShippingMethodsForDisplay(orLogicConfig, context);

      expect(methods).toHaveLength(1);
      expect(methods[0].methodId).toBe("shipping.overnight.seasonal");
      expect(methods[0].tierId).toBe("tier_before_holiday");
      expect(methods[0].available).toBe(true);
    });

    it("should hide method during holiday blackout period (no matching tier)", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2024-12-20"),
      };

      const methods = getShippingMethodsForDisplay(orLogicConfig, context);

      // No tier matches, so method should be filtered out
      expect(methods).toHaveLength(0);
    });

    it("should show method after holiday blackout period", () => {
      const context: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        locale: "en",
        orderDate: new Date("2025-01-02"),
      };

      const methods = getShippingMethodsForDisplay(orLogicConfig, context);

      expect(methods).toHaveLength(1);
      expect(methods[0].methodId).toBe("shipping.overnight.seasonal");
      expect(methods[0].tierId).toBe("tier_after_holiday");
      expect(methods[0].available).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle tier with only 'after' criteria", () => {
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
                  label: "After Dec 15",
                  criteria: {
                    date: { after: "2024-12-15" },
                  },
                  price: 10,
                },
              ],
            },
          },
        ],
      } as any;

      const beforeContext: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-10"),
      };

      const beforeMethods = getShippingMethodsForDisplay(config, beforeContext);
      expect(beforeMethods).toHaveLength(0);

      const afterContext: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-20"),
      };

      const afterMethods = getShippingMethodsForDisplay(config, afterContext);
      expect(afterMethods).toHaveLength(1);
      expect(afterMethods[0].tierId).toBe("tier1");
    });

    it("should handle tier with only 'before' criteria", () => {
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
                  label: "Before Dec 15",
                  criteria: {
                    date: { before: "2024-12-15" },
                  },
                  price: 10,
                },
              ],
            },
          },
        ],
      } as any;

      const beforeContext: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-10"),
      };

      const beforeMethods = getShippingMethodsForDisplay(config, beforeContext);
      expect(beforeMethods).toHaveLength(1);
      expect(beforeMethods[0].tierId).toBe("tier1");

      const afterContext: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-20"),
      };

      const afterMethods = getShippingMethodsForDisplay(config, afterContext);
      expect(afterMethods).toHaveLength(0);
    });

    it("should respect time component in date comparisons", () => {
      const config = {
        version: "1.0",
        methods: [
          {
            id: "test",
            enabled: true,
            name: "Test",
            conditions: {
              date: { after: "2024-12-15T14:00:00Z" },
            },
            pricing: {
              type: "flat",
              amount: 10,
            },
          },
        ],
      } as any;

      // Before the exact time - should not match
      const beforeContext: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T13:59:59Z"),
      };
      const beforeMethods = getShippingMethodsForDisplay(config, beforeContext);
      expect(beforeMethods).toHaveLength(0);

      // Exact time - should match (inclusive)
      const exactContext: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T14:00:00Z"),
      };
      const exactMethods = getShippingMethodsForDisplay(config, exactContext);
      expect(exactMethods).toHaveLength(1);

      // After the time - should match
      const afterContext: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T14:00:01Z"),
      };
      const afterMethods = getShippingMethodsForDisplay(config, afterContext);
      expect(afterMethods).toHaveLength(1);
    });
  });

  describe("Time and timezone support", () => {
    it("should compare times correctly with 'after' criteria", () => {
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
                  label: "After 2pm UTC",
                  criteria: {
                    date: { after: "2024-12-15T14:00:00Z" },
                  },
                  price: 10,
                },
              ],
            },
          },
        ],
      } as any;

      // 1:59 PM UTC - should not match
      const before: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T13:59:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, before)).toHaveLength(0);

      // 2:00 PM UTC - should match (inclusive)
      const exact: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T14:00:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, exact)).toHaveLength(1);

      // 2:01 PM UTC - should match
      const after: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T14:01:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, after)).toHaveLength(1);
    });

    it("should compare times correctly with 'before' criteria", () => {
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
                  label: "Before 5pm UTC",
                  criteria: {
                    date: { before: "2024-12-15T17:00:00Z" },
                  },
                  price: 10,
                },
              ],
            },
          },
        ],
      } as any;

      // 4:59 PM UTC - should match
      const before: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T16:59:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, before)).toHaveLength(1);

      // 5:00 PM UTC - should NOT match (exclusive)
      const exact: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T17:00:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, exact)).toHaveLength(0);

      // 5:01 PM UTC - should not match
      const after: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T17:01:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, after)).toHaveLength(0);
    });

    it("should handle timezone conversions correctly", () => {
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
                  label: "After 10am EST on Dec 15",
                  criteria: {
                    // 10:00 AM EST = 3:00 PM UTC (EST is UTC-5)
                    date: { after: "2024-12-15T15:00:00Z" },
                  },
                  price: 10,
                },
              ],
            },
          },
        ],
      } as any;

      // 9:59 AM EST = 2:59 PM UTC - should not match
      const before: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T14:59:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, before)).toHaveLength(0);

      // 10:00 AM EST = 3:00 PM UTC - should match
      const exact: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T15:00:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, exact)).toHaveLength(1);
    });

    it("should handle time ranges (after and before)", () => {
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
                  id: "business_hours",
                  label: "Business Hours (9am-5pm UTC)",
                  criteria: {
                    date: {
                      after: "2024-12-15T09:00:00Z",
                      before: "2024-12-15T17:00:00Z",
                    },
                  },
                  price: 10,
                },
              ],
            },
          },
        ],
      } as any;

      // 8:59 AM - before range
      const tooEarly: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T08:59:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, tooEarly)).toHaveLength(0);

      // 9:00 AM - start of range (inclusive)
      const start: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T09:00:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, start)).toHaveLength(1);

      // 12:00 PM - middle of range
      const middle: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T12:00:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, middle)).toHaveLength(1);

      // 4:59 PM - just before end
      const almostEnd: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T16:59:59Z"),
      };
      expect(getShippingMethodsForDisplay(config, almostEnd)).toHaveLength(1);

      // 5:00 PM - end of range (exclusive)
      const end: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T17:00:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, end)).toHaveLength(0);

      // 5:01 PM - after range
      const tooLate: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T17:01:00Z"),
      };
      expect(getShippingMethodsForDisplay(config, tooLate)).toHaveLength(0);
    });

    it("should handle different timezone offsets in ISO strings", () => {
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
                  label: "After midnight UTC on Dec 16",
                  criteria: {
                    date: { after: "2024-12-16T00:00:00Z" },
                  },
                  price: 10,
                },
              ],
            },
          },
        ],
      } as any;

      // 7:00 PM EST on Dec 15 = 12:00 AM UTC on Dec 16 (EST is UTC-5)
      const estMidnight: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T19:00:00-05:00"),
      };
      expect(getShippingMethodsForDisplay(config, estMidnight)).toHaveLength(1);

      // 6:59 PM EST on Dec 15 = 11:59 PM UTC on Dec 15 (before threshold)
      const estBeforeMidnight: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T18:59:00-05:00"),
      };
      expect(getShippingMethodsForDisplay(config, estBeforeMidnight)).toHaveLength(0);
    });

    it("should support millisecond precision", () => {
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
                  label: "After cutoff",
                  criteria: {
                    date: { after: "2024-12-15T14:00:00.500Z" },
                  },
                  price: 10,
                },
              ],
            },
          },
        ],
      } as any;

      // 499ms - before
      const before: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T14:00:00.499Z"),
      };
      expect(getShippingMethodsForDisplay(config, before)).toHaveLength(0);

      // 500ms - exact match (inclusive)
      const exact: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T14:00:00.500Z"),
      };
      expect(getShippingMethodsForDisplay(config, exact)).toHaveLength(1);

      // 501ms - after
      const after: EvaluationContext = {
        orderValue: 100,
        itemCount: 2,
        country: "US",
        orderDate: new Date("2024-12-15T14:00:00.501Z"),
      };
      expect(getShippingMethodsForDisplay(config, after)).toHaveLength(1);
    });
  });
});
