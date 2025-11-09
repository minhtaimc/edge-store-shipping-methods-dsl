// shipping-dsl.v1.arktype.ts
import { type, scope } from "arktype";
import type { ShippingConfig } from "./types.js";

// Create a scope with all types for validation
const types = scope({
  LocalizedString: "string | Record<string, string>",

  RangeNumber: {
    "min?": "number",
    "max?": "number"
  },

  EstimatedDays: {
    min: "number >= 0",
    max: "number >= 0"
  },

  GeoCountry: {
    "include?": "string[]",
    "exclude?": "string[]"
  },

  OrderConditions: {
    "value?": "RangeNumber",
    "items?": "RangeNumber",
    "weight?": "RangeNumber"
  },

  Conditions: {
    "geo?": {
      "country?": "GeoCountry"
    },
    "order?": "OrderConditions"
  },

  Availability: {
    "mode?": "'hide' | 'show_disabled' | 'show_hint'",
    "when?": "('order.value.min' | 'order.items.min' | 'order.weight.min')[]",
    "message?": "LocalizedString",
    "showProgress?": "boolean"
  },

  Rule: {
    id: "string >= 1",
    "label?": "LocalizedString",
    criteria: {
      "order?": "OrderConditions",
      "geo?": {
        "country?": "GeoCountry"
      }
    },
    price: "number >= 0",
    "estimatedDays?": "EstimatedDays",
    "promoText?": "LocalizedString",
    "upgradeMessage?": "LocalizedString"
  },

  PricingFlat: {
    type: "'flat'",
    amount: "number >= 0"
  },

  PricingItemBased: {
    type: "'item_based'",
    firstItemPrice: "number >= 0",
    additionalItemPrice: "number >= 0"
  },

  PricingValueBased: {
    type: "'value_based'",
    percentage: "number > 0",
    "minAmount?": "number >= 0",
    "maxAmount?": "number >= 0"
  },

  PricingTiered: {
    type: "'tiered'",
    rules: "Rule[] >= 1"
  },

  PricingCustom: {
    type: "'custom'",
    plugin: "string >= 1",
    config: "object"
  },

  Pricing: "PricingFlat | PricingItemBased | PricingValueBased | PricingTiered | PricingCustom",

  Display: {
    "badge?": "string",
    "priority?": "number",
    "hint?": "LocalizedString",
    "promoText?": "LocalizedString"
  },

  ShippingMethod: {
    id: "string >= 1",
    enabled: "boolean",
    name: "LocalizedString",
    "description?": "LocalizedString",
    "icon?": "string",
    "display?": "Display",
    "conditions?": "Conditions",
    pricing: "Pricing",
    "availability?": "Availability",
    "meta?": "object"
  },

  ShippingConfig: {
    "$schema?": "string",
    version: "'1.0'",
    "currency?": "string",
    methods: "ShippingMethod[] >= 1"
  }
}).export();

// Internal validator
const ShippingConfigValidator = types.ShippingConfig;

/**
 * Validate shipping configuration at runtime
 * @param data - Unknown data to validate
 * @returns Validated ShippingConfig
 * @throws Error if validation fails
 */
export function validateShippingConfig(data: unknown): ShippingConfig {
  const result = ShippingConfigValidator(data);

  if (result instanceof type.errors) {
    throw new Error(`Invalid shipping configuration: ${result.summary}`);
  }

  return result as ShippingConfig;
}
