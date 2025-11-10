/**
 * US and International Shipping Example
 *
 * This example demonstrates a real-world shipping configuration with:
 * - US domestic shipping (standard, express, overnight)
 * - Tiered free shipping (free standard at $100+, free express at $500+)
 * - International shipping
 */

import {
  validateShippingConfig,
  getAvailableShippingMethods,
  getShippingMethodById,
  type ShippingConfig,
  type EvaluationContext,
} from "../src/index.js";
import configJson from "./us-international-shipping.json" assert { type: "json" };

// Validate the configuration
const config = validateShippingConfig(configJson as ShippingConfig);

console.log("=== US & International Shipping Examples ===\n");

// Example 1: Small US order ($25)
console.log("Example 1: US order - $25, 1 item");
const context1: EvaluationContext = {
  orderValue: 25.0,
  itemCount: 1,
  country: "US",
  locale: "en",
};
const methods1 = getAvailableShippingMethods(config, context1);
console.log("Available methods:");
methods1.forEach((m) => {
  const method = config.methods.find((method) => method.id === m.methodId);
  console.log(`  - ${method?.name}: $${m.price.toFixed(2)} (${m.estimatedDays?.min}-${m.estimatedDays?.max} days)`);
});
console.log();

// Example 2: Medium US order ($150) - unlocks free standard shipping
console.log("Example 2: US order - $150, 3 items");
const context2: EvaluationContext = {
  orderValue: 150.0,
  itemCount: 3,
  country: "US",
  locale: "en",
};
const methods2 = getAvailableShippingMethods(config, context2);
console.log("Available methods:");
methods2.forEach((m) => {
  const method = config.methods.find((method) => method.id === m.methodId);
  console.log(`  - ${method?.name}: $${m.price.toFixed(2)} (${m.estimatedDays?.min}-${m.estimatedDays?.max} days)`);
  if (m.promoText) console.log(`    ${m.promoText}`);
});
console.log();

// Example 3: Large US order ($600) - unlocks free express shipping
console.log("Example 3: US order - $600, 5 items");
const context3: EvaluationContext = {
  orderValue: 600.0,
  itemCount: 5,
  country: "US",
  locale: "en",
};
const methods3 = getAvailableShippingMethods(config, context3);
console.log("Available methods:");
methods3.forEach((m) => {
  const method = config.methods.find((method) => method.id === m.methodId);
  console.log(`  - ${method?.name}: $${m.price.toFixed(2)} (${m.estimatedDays?.min}-${m.estimatedDays?.max} days)`);
  if (m.promoText) console.log(`    ${m.promoText}`);
  if (m.upgradeMessage) console.log(`    ⭐ ${m.upgradeMessage}`);
});
console.log();

// Example 4: International order (Canada) - $100, 2 items
console.log("Example 4: International order (CA) - $100, 2 items");
const context4: EvaluationContext = {
  orderValue: 100.0,
  itemCount: 2,
  country: "CA",
  locale: "en",
};
const methods4 = getAvailableShippingMethods(config, context4);
console.log("Available methods:");
methods4.forEach((m) => {
  const method = config.methods.find((method) => method.id === m.methodId);
  console.log(`  - ${method?.name}: $${m.price.toFixed(2)} (${m.estimatedDays?.min}-${m.estimatedDays?.max} days)`);
});
console.log();

// Example 5: Validate specific shipping method from frontend
console.log("Example 5: Backend validation - User selected free express shipping");
const selectedId = "shipping.us.free:tier_express";
const context5: EvaluationContext = {
  orderValue: 550.0,
  itemCount: 4,
  country: "US",
  locale: "en",
};

const selectedMethod = getShippingMethodById(config, selectedId, context5);
if (selectedMethod) {
  console.log(`✅ Valid: ${selectedMethod.name}`);
  console.log(`   Price: $${selectedMethod.price.toFixed(2)}`);
  console.log(`   Available: ${selectedMethod.available}`);
  console.log(`   Estimated delivery: ${selectedMethod.estimatedDays?.min}-${selectedMethod.estimatedDays?.max} days`);
  if (selectedMethod.promoText) {
    console.log(`   Promo: ${selectedMethod.promoText}`);
  }
} else {
  console.log("❌ Invalid shipping method");
}
console.log();

// Example 6: Show progress for free shipping unlock
console.log("Example 6: Progress towards free shipping - $75 order");
const context6: EvaluationContext = {
  orderValue: 75.0,
  itemCount: 2,
  country: "US",
  locale: "en",
};

// Use calculateShippingMethod to see the overall free shipping status
const allMethods6 = getAvailableShippingMethods(config, context6);
console.log(`Available methods: ${allMethods6.length}`);
allMethods6.forEach((m) => {
  const method = config.methods.find((method) => method.id === m.methodId);
  console.log(`  - ${method?.name}: $${m.price.toFixed(2)}`);
});

// Also check via getShippingMethodById - should show progress
const freeMethod = getShippingMethodById(config, "shipping.us.free", context6);
console.log(`\nFree Shipping status:`);
console.log(`  Available: ${freeMethod?.available}`);
console.log(`  Message: ${freeMethod?.message}`);
if (freeMethod?.progress) {
  const { current, required, remaining, percentage } = freeMethod.progress;
  console.log(`  Progress: $${current.toFixed(2)} / $${required.toFixed(2)} (${percentage.toFixed(0)}%)`);
  console.log(`  Remaining: $${remaining.toFixed(2)}`);
}
console.log();

// Example 7: Compare shipping costs for different quantities
console.log("Example 7: Compare shipping costs - Express vs Overnight (1-5 items)");
console.log("Order value: $50");
for (let items = 1; items <= 5; items++) {
  const ctx: EvaluationContext = {
    orderValue: 50.0,
    itemCount: items,
    country: "US",
    locale: "en",
  };

  const express = getShippingMethodById(config, "shipping.us.express", ctx);
  const overnight = getShippingMethodById(config, "shipping.us.overnight", ctx);

  console.log(`  ${items} item(s): Express $${express?.price.toFixed(2)} | Overnight $${overnight?.price.toFixed(2)}`);
}
console.log();

// Example 8: International shipping cost for different quantities
console.log("Example 8: International shipping costs (1-5 items)");
console.log("Order value: $100, Country: GB");
for (let items = 1; items <= 5; items++) {
  const ctx: EvaluationContext = {
    orderValue: 100.0,
    itemCount: items,
    country: "GB",
    locale: "en",
  };

  const intl = getShippingMethodById(config, "shipping.international.standard", ctx);
  console.log(`  ${items} item(s): $${intl?.price.toFixed(2)}`);
}
