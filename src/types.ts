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

// Custom plugin interface for extensibility
export type CustomPricingPlugin = (
  config: Record<string, unknown>,
  context: EvaluationContext
) => number;

// ============================================
// FRONTEND TYPES - For UI display
// ============================================

export interface DisplayShippingMethod {
  // Identity
  id: string; // Full ID to send to backend: "method_id:tier_id" or "method_id"
  methodId: string;
  tierId?: string;

  // Display Information
  name: string; // Localized
  description?: string; // Localized
  icon?: string;
  badge?: string;

  // Pricing & Availability
  price: number;
  available: boolean;
  enabled: boolean;
  estimatedDays?: EstimatedDays;

  // Availability Mode (how to display in UI)
  availabilityMode?: "hide" | "show_disabled" | "show_hint";
  message?: string;
  promoText?: string; // Localized
  upgradeMessage?: string; // Localized

  // Progress Tracking
  progress?: {
    current: number;
    required: number;
    remaining: number;
    percentage: number;
  };

  // Next Tier Information (for upgrade hints)
  nextTier?: {
    id: string;
    label?: string; // Localized
    price: number;
    estimatedDays?: EstimatedDays;
  };

  // Custom Metadata
  meta?: Record<string, unknown>;
}

// ============================================
// BACKEND TYPES - For order validation
// ============================================

export interface ValidatedShippingMethod {
  // Identity
  id: string; // Full ID that was validated
  methodId: string;
  tierId?: string;

  // Validation Result
  available: boolean;
  enabled: boolean;

  // Pricing (what matters for checkout)
  price: number;
  estimatedDays?: EstimatedDays;

  // Display info (for order confirmation)
  name: string; // Localized
  description?: string; // Localized

  // Custom Metadata
  meta?: Record<string, unknown>;
}
