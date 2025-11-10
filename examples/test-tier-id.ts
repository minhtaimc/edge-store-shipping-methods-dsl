/**
 * Test tierId in ShippingCalculationResult
 */

import {
  validateShippingConfig,
  getAvailableShippingMethods,
  type ShippingConfig,
  type EvaluationContext,
} from "../src/index.js";
import configJson from "./us-international-shipping.json" assert { type: "json" };

const config = validateShippingConfig(configJson as ShippingConfig);

console.log("=== Test tierId in Results ===\n");

// Test 1: Order $150 - should get free standard tier
console.log("Test 1: Order $150 (should match free standard tier)");
const context1: EvaluationContext = {
  orderValue: 150.0,
  itemCount: 3,
  country: "US",
  locale: "en",
};

const methods1 = getAvailableShippingMethods(config, context1);
console.log("Available methods:");
methods1.forEach((m) => {
  const method = config.methods.find((method) => method.id === m.methodId);
  console.log(`  - ${method?.name}:`);
  console.log(`    id: ${m.id}`);
  console.log(`    methodId: ${m.methodId}`);
  console.log(`    tierId: ${m.tierId || "N/A"}`);
  console.log(`    price: $${m.price.toFixed(2)}`);
});
console.log();

// Test 2: Order $600 - should get free express tier
console.log("Test 2: Order $600 (should match free express tier)");
const context2: EvaluationContext = {
  orderValue: 600.0,
  itemCount: 5,
  country: "US",
  locale: "en",
};

const methods2 = getAvailableShippingMethods(config, context2);
const freeShipping = methods2.find((m) => m.methodId === "shipping.us.free");
if (freeShipping) {
  console.log("Free Shipping:");
  console.log(`  id: ${freeShipping.id}`);
  console.log(`  methodId: ${freeShipping.methodId}`);
  console.log(`  tierId: ${freeShipping.tierId}`);
  console.log(`  price: $${freeShipping.price.toFixed(2)}`);
  console.log(`  estimatedDays: ${freeShipping.estimatedDays?.min}-${freeShipping.estimatedDays?.max}`);
}
console.log();

// Test 3: Non-tiered methods should not have tierId
console.log("Test 3: Non-tiered methods (standard shipping)");
const context3: EvaluationContext = {
  orderValue: 25.0,
  itemCount: 1,
  country: "US",
  locale: "en",
};

const methods3 = getAvailableShippingMethods(config, context3);
const standard = methods3.find((m) => m.methodId === "shipping.us.standard");
if (standard) {
  console.log("Standard Shipping:");
  console.log(`  id: ${standard.id}`);
  console.log(`  methodId: ${standard.methodId}`);
  console.log(`  tierId: ${standard.tierId || "N/A (not tiered)"}`);
  console.log(`  price: $${standard.price.toFixed(2)}`);
}
