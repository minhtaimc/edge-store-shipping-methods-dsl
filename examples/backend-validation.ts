/**
 * Backend Validation Example
 *
 * This example shows how to validate shipping method IDs sent from the frontend
 * during checkout. This is the primary use case for getShippingMethodById().
 *
 * Flow:
 * 1. Frontend displays available shipping methods
 * 2. User selects a method and proceeds to checkout
 * 3. Frontend sends the method ID to backend
 * 4. Backend validates the ID and calculates actual price
 * 5. Backend ensures the method is still available and price hasn't changed
 */

import {
  validateShippingConfig,
  getShippingMethodById,
  type ShippingConfig,
  type ShippingMethodDetail,
  type EvaluationContext,
} from "../src/index.js";

// Sample shipping configuration
const configJson: ShippingConfig = {
  version: "1.0",
  currency: "USD",
  methods: [
    {
      id: "shipping.standard",
      enabled: true,
      name: "Standard Shipping",
      pricing: { type: "flat", amount: 5.99 },
      conditions: {
        order: { value: { min: 0 } }
      }
    },
    {
      id: "shipping.express",
      enabled: true,
      name: "Express Shipping",
      pricing: {
        type: "tiered",
        rules: [
          {
            id: "tier_standard",
            label: "Express Standard",
            criteria: { order: { value: { min: 0, max: 100 } } },
            price: 12.99,
            estimatedDays: { min: 2, max: 3 }
          },
          {
            id: "tier_premium",
            label: "Express Premium",
            criteria: { order: { value: { min: 100 } } },
            price: 9.99,
            estimatedDays: { min: 1, max: 2 },
            promoText: "Premium rate for orders over $100"
          }
        ]
      }
    },
    {
      id: "shipping.free",
      enabled: true,
      name: "Free Shipping",
      pricing: { type: "flat", amount: 0 },
      conditions: {
        order: { value: { min: 50 } }
      },
      availability: {
        mode: "show_hint",
        when: ["order.value.min"],
        message: "Add ${remaining} more for free shipping"
      }
    }
  ]
};

// Validate config at startup
const config = validateShippingConfig(configJson);

/**
 * Simulated checkout endpoint handler
 */
function handleCheckout(requestBody: {
  shippingMethodId: string;
  orderValue: number;
  itemCount: number;
  country: string;
}): { success: boolean; data?: any; error?: string; message?: string } {
  const { shippingMethodId, orderValue, itemCount, country } = requestBody;

  // Create evaluation context from order data
  const context: EvaluationContext = {
    orderValue,
    itemCount,
    country,
    locale: "en",
  };

  // Validate the shipping method ID
  const shippingMethod = getShippingMethodById(config, shippingMethodId, context);

  // Case 1: Invalid ID (method doesn't exist)
  if (!shippingMethod) {
    return {
      success: false,
      error: "INVALID_SHIPPING_METHOD",
      message: "The selected shipping method does not exist",
    };
  }

  // Case 2: Method not enabled
  if (!shippingMethod.enabled) {
    return {
      success: false,
      error: "SHIPPING_METHOD_DISABLED",
      message: "The selected shipping method is currently disabled",
    };
  }

  // Case 3: Method not available (conditions not met)
  if (!shippingMethod.available) {
    return {
      success: false,
      error: "SHIPPING_METHOD_UNAVAILABLE",
      message: shippingMethod.message || "Shipping method not available for this order",
    };
  }

  // Case 4: Success - method is valid and available
  const shippingCost = shippingMethod.price;
  const total = orderValue + shippingCost;

  return {
    success: true,
    data: {
      shippingCost,
      shippingMethod: {
        id: shippingMethod.id,
        name: shippingMethod.name,
        description: shippingMethod.description,
        estimatedDays: shippingMethod.estimatedDays,
        promoText: shippingMethod.promoText,
      },
      orderValue,
      total,
    },
  };
}

// Test cases
console.log("=== Backend Validation Examples ===\n");

// Test 1: Valid standard shipping
console.log("Test 1: Valid standard shipping");
const result1 = handleCheckout({
  shippingMethodId: "shipping.standard",
  orderValue: 25.00,
  itemCount: 2,
  country: "US",
});
console.log(JSON.stringify(result1, null, 2));
console.log();

// Test 2: Valid tiered shipping (standard tier)
console.log("Test 2: Valid tiered shipping (standard tier)");
const result2 = handleCheckout({
  shippingMethodId: "shipping.express:tier_standard",
  orderValue: 75.00,
  itemCount: 3,
  country: "US",
});
console.log(JSON.stringify(result2, null, 2));
console.log();

// Test 3: Valid tiered shipping (premium tier)
console.log("Test 3: Valid tiered shipping (premium tier)");
const result3 = handleCheckout({
  shippingMethodId: "shipping.express:tier_premium",
  orderValue: 150.00,
  itemCount: 5,
  country: "US",
});
console.log(JSON.stringify(result3, null, 2));
console.log();

// Test 4: Free shipping (available)
console.log("Test 4: Free shipping (available)");
const result4 = handleCheckout({
  shippingMethodId: "shipping.free",
  orderValue: 75.00,
  itemCount: 3,
  country: "US",
});
console.log(JSON.stringify(result4, null, 2));
console.log();

// Test 5: Free shipping (unavailable - order too small)
console.log("Test 5: Free shipping (unavailable - order too small)");
const result5 = handleCheckout({
  shippingMethodId: "shipping.free",
  orderValue: 25.00,
  itemCount: 1,
  country: "US",
});
console.log(JSON.stringify(result5, null, 2));
console.log();

// Test 6: Invalid method ID
console.log("Test 6: Invalid method ID");
const result6 = handleCheckout({
  shippingMethodId: "shipping.nonexistent",
  orderValue: 50.00,
  itemCount: 2,
  country: "US",
});
console.log(JSON.stringify(result6, null, 2));
console.log();

// Test 7: Invalid tier ID
console.log("Test 7: Invalid tier ID");
const result7 = handleCheckout({
  shippingMethodId: "shipping.express:tier_invalid",
  orderValue: 100.00,
  itemCount: 3,
  country: "US",
});
console.log(JSON.stringify(result7, null, 2));
console.log();

// Test 8: Tier criteria not met
console.log("Test 8: Tier criteria not met (premium tier with low order value)");
const result8 = handleCheckout({
  shippingMethodId: "shipping.express:tier_premium",
  orderValue: 50.00,
  itemCount: 2,
  country: "US",
});
console.log(JSON.stringify(result8, null, 2));
