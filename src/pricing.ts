import type { Pricing, EvaluationContext, CustomPricingPlugin } from "./types.js";

/**
 * Registry for custom pricing plugins
 */
const customPlugins = new Map<string, CustomPricingPlugin>();

/**
 * Register a custom pricing plugin
 */
export function registerPricingPlugin(name: string, plugin: CustomPricingPlugin): void {
  customPlugins.set(name, plugin);
}

/**
 * Get a custom pricing plugin
 */
export function getPricingPlugin(name: string): CustomPricingPlugin | undefined {
  return customPlugins.get(name);
}

/**
 * Calculate shipping price based on pricing configuration
 */
export function calculatePrice(
  pricing: Pricing,
  context: EvaluationContext
): number {
  switch (pricing.type) {
    case "flat":
      return calculateFlatPrice(pricing.amount);

    case "item_based":
      return calculateItemBasedPrice(
        pricing.firstItemPrice,
        pricing.additionalItemPrice,
        context.itemCount
      );

    case "value_based":
      return calculateValueBasedPrice(
        pricing.percentage,
        context.orderValue,
        pricing.minAmount,
        pricing.maxAmount
      );

    case "tiered":
      // For tiered pricing, this function doesn't handle rule matching
      // The caller (engine) should match the rule first
      return 0;

    case "custom":
      return calculateCustomPrice(pricing.plugin, pricing.config, context);

    default:
      throw new Error(`Unknown pricing type: ${(pricing as any).type}`);
  }
}

/**
 * Calculate flat rate pricing
 */
function calculateFlatPrice(amount: number): number {
  return amount;
}

/**
 * Calculate item-based pricing
 * Formula: first + additional × (n-1)
 */
function calculateItemBasedPrice(
  firstItemPrice: number,
  additionalItemPrice: number,
  itemCount: number
): number {
  if (itemCount <= 0) {
    return 0;
  }
  if (itemCount === 1) {
    return firstItemPrice;
  }
  return firstItemPrice + additionalItemPrice * (itemCount - 1);
}

/**
 * Calculate value-based pricing (percentage of order value)
 * Formula: orderValue × (percentage / 100), clamped to [minAmount, maxAmount]
 */
function calculateValueBasedPrice(
  percentage: number,
  orderValue: number,
  minAmount?: number,
  maxAmount?: number
): number {
  let price = orderValue * (percentage / 100);

  // Apply min clamp
  if (minAmount !== undefined && price < minAmount) {
    price = minAmount;
  }

  // Apply max clamp
  if (maxAmount !== undefined && price > maxAmount) {
    price = maxAmount;
  }

  return price;
}

/**
 * Calculate custom pricing using registered plugin
 */
function calculateCustomPrice(
  pluginName: string,
  config: Record<string, unknown>,
  context: EvaluationContext
): number {
  const plugin = customPlugins.get(pluginName);

  if (!plugin) {
    throw new Error(`Custom pricing plugin not found: ${pluginName}`);
  }

  return plugin(config, context);
}

/**
 * Built-in weight-based pricing plugin
 * Config: { ratePerKg: number, minCharge?: number }
 *
 * @example
 * ```typescript
 * import { registerPricingPlugin, weightBasedPlugin } from "@edge-store/shipping-methods-dsl";
 *
 * // Register the built-in plugin
 * registerPricingPlugin("weight_based", weightBasedPlugin);
 * ```
 */
export const weightBasedPlugin: CustomPricingPlugin = (config, context) => {
  const ratePerKg = config.ratePerKg as number;
  const minCharge = (config.minCharge as number) || 0;
  const weight = context.weight || 0;

  const calculated = weight * ratePerKg;
  return Math.max(calculated, minCharge);
};
