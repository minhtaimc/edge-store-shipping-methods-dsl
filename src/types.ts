// shipping-dsl.v3.ts

export type LocalizedString = string | Record<string, string>;

export interface RangeNumber {
  min?: number;
  max?: number;
}

export interface EstimatedDays {
  min: number;
  max: number;
}

export interface GeoCountry {
  include?: string[]; // ISO 3166-1 alpha-2
  exclude?: string[];
}

export interface OrderConditions {
  value?: RangeNumber;
  items?: RangeNumber;
  weight?: RangeNumber;
}

export interface Conditions {
  geo?: { country?: GeoCountry };
  order?: OrderConditions;
}

export interface Availability {
  mode?: "hide" | "show_disabled" | "show_hint";
  when?: Array<"order.value.min" | "order.items.min" | "order.weight.min">;
  message?: LocalizedString;
  showProgress?: boolean;
}

export interface Rule {
  id: string;
  label?: LocalizedString;
  criteria: {
    order?: OrderConditions;
    geo?: { country?: GeoCountry };
  };
  price: number;
  estimatedDays?: EstimatedDays;
  promoText?: LocalizedString;
  upgradeMessage?: LocalizedString;
  availability?: Availability; // Tier-level availability for upgrade hints
}

export type Pricing =
  | { type: "flat"; amount: number }
  | { type: "item_based"; firstItemPrice: number; additionalItemPrice: number }
  | { type: "value_based"; percentage: number; minAmount?: number; maxAmount?: number }
  | { type: "tiered"; rules: Rule[] }
  | { type: "custom"; plugin: string; config: Record<string, unknown> };

export interface Display {
  badge?: string;
  priority?: number;
  hint?: LocalizedString;
  promoText?: LocalizedString;
}

export interface ShippingMethod {
  id: string;
  enabled: boolean;
  name: LocalizedString;
  description?: LocalizedString;
  icon?: string;
  display?: Display;
  conditions?: Conditions;
  pricing: Pricing;
  availability?: Availability; // For non-tiered: how to show when conditions not met
  estimatedDays?: EstimatedDays;
  meta?: Record<string, unknown>;
}

export interface ShippingConfig {
  $schema?: string;
  version: "1.0";
  currency?: string; // ISO-4217, e.g., "USD"
  methods: ShippingMethod[];
}

// Context for evaluating shipping methods
export interface EvaluationContext {
  orderValue: number;
  itemCount: number;
  weight?: number;
  country: string; // ISO 3166-1 alpha-2
  currency?: string;
  locale?: string;
}

// Result of calculating shipping price
export interface ShippingCalculationResult {
  id: string; // Full ID: for tiered "method_id:tier_id", otherwise just "method_id"
  methodId: string; // Base method ID
  tierId?: string; // Tier ID if tiered pricing was used
  price: number;
  available: boolean; // Can be selected (user can choose this method)
  availabilityMode?: "hide" | "show_disabled" | "show_hint"; // Display mode for unavailable methods or upgrade hints
  message?: string; // Unavailability or informational message
  estimatedDays?: EstimatedDays;
  promoText?: string; // Promotional text when tier is unlocked
  upgradeMessage?: string; // Message about how to upgrade to better tier
  progress?: {
    // Progress towards unlocking next tier
    current: number;
    required: number;
    remaining: number;
    percentage: number;
  };
}

// Custom plugin interface for extensibility
export type CustomPricingPlugin = (
  config: Record<string, unknown>,
  context: EvaluationContext
) => number;

// Detailed shipping method information (evaluated result)
export interface ShippingMethodDetail {
  id: string; // For tiered: "method_id:tier_id", otherwise just "method_id"
  methodId: string; // Original method ID
  tierId?: string; // Tier rule ID if applicable
  name: string; // Localized name
  description?: string; // Localized description
  icon?: string;
  badge?: string;
  price: number; // Calculated price for current context
  available: boolean; // Whether this method is available (conditions met)
  enabled: boolean; // Whether method is enabled in config
  estimatedDays?: EstimatedDays;
  message?: string; // Unavailability message or hint
  promoText?: string; // Localized promo text
  upgradeMessage?: string; // Localized upgrade message
  progress?: {
    current: number;
    required: number;
    remaining: number;
    percentage: number;
  };
  meta?: Record<string, unknown>;
}
