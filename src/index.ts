// ============================================
// TYPE EXPORTS
// ============================================
export type {
  // Configuration types
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
  CustomPricingPlugin,
  // Frontend types
  DisplayShippingMethod,
  // Backend types
  ValidatedShippingMethod,
} from "./types.js";

// ============================================
// CONFIGURATION API
// ============================================
export { validateShippingConfig } from "./validator.js";

// ============================================
// FRONTEND API - For checkout UI
// ============================================
export { getShippingMethodsForDisplay } from "./frontend.js";

// ============================================
// BACKEND API - For order validation
// ============================================
export { getShippingMethodById } from "./backend.js";

// ============================================
// CUSTOM PRICING PLUGINS
// ============================================
export { registerPricingPlugin, weightBasedPlugin } from "./pricing.js";

// ============================================
// VERSION
// ============================================
export const VERSION = "2.0.0";
