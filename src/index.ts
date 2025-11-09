// Type exports from types.ts
export type {
  LocalizedString,
  RangeNumber,
  EstimatedDays,
  GeoCountry,
  OrderConditions,
  Conditions,
  Availability,
  Rule,
  Pricing,
  Display,
  ShippingMethod,
  ShippingConfig,
  EvaluationContext,
  ShippingCalculationResult,
  CustomPricingPlugin,
} from "./types.js";

// Validator exports
export { validateShippingConfig } from "./validator.js";

// Pricing exports
export {
  registerPricingPlugin,
  getPricingPlugin,
  calculatePrice,
  weightBasedPlugin,
} from "./pricing.js";

// Conditions exports
export {
  evaluateConditions,
  calculateRemaining,
  getMinimumRequired,
} from "./conditions.js";

// Engine exports
export {
  calculateShippingMethod,
  calculateAllShippingMethods,
  getAvailableShippingMethods,
  getCheapestShippingMethod,
  getShippingMethodsForDisplay,
} from "./engine.js";

// Version
export const VERSION = "1.0.0";
