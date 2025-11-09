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
  availability?: Availability;
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
  methodId: string;
  price: number;
  available: boolean;
  message?: string;
  estimatedDays?: EstimatedDays;
  promoText?: string;
  upgradeMessage?: string;
  progress?: {
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
