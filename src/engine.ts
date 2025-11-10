import type {
  ShippingConfig,
  ShippingMethod,
  EvaluationContext,
  ShippingCalculationResult,
  LocalizedString,
  Rule,
  ShippingMethodDetail,
} from "./types.js";
import { evaluateConditions, calculateRemaining, getMinimumRequired } from "./conditions.js";
import { calculatePrice } from "./pricing.js";

/**
 * Resolve localized string to the appropriate locale
 */
function resolveLocalizedString(
  str: LocalizedString | undefined,
  locale?: string
): string | undefined {
  if (!str) return undefined;
  if (typeof str === "string") return str;

  // Try exact locale match
  if (locale && str[locale]) {
    return str[locale];
  }

  // Try language-only match (e.g., "en" for "en-US")
  if (locale) {
    const lang = locale.split("-")[0];
    if (str[lang]) {
      return str[lang];
    }
  }

  // Try English as fallback
  if (str.en) return str.en;

  // Return first available
  const keys = Object.keys(str);
  return keys.length > 0 ? str[keys[0]] : undefined;
}

/**
 * Interpolate variables in message string
 */
function interpolateMessage(
  message: string | undefined,
  variables: Record<string, string | number>
): string | undefined {
  if (!message) return undefined;

  let result = message;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), String(value));
  }

  return result;
}

/**
 * Evaluate a tiered pricing rule
 */
function evaluateTieredRule(rule: Rule, context: EvaluationContext): boolean {
  return evaluateConditions(
    {
      geo: rule.criteria.geo,
      order: rule.criteria.order,
    },
    context
  );
}

/**
 * Find the matching rule in tiered pricing
 */
function findMatchingRule(rules: Rule[], context: EvaluationContext): Rule | undefined {
  // Rules are evaluated in order, return the first match
  return rules.find((rule) => evaluateTieredRule(rule, context));
}

/**
 * Calculate shipping for a single method
 */
export function calculateShippingMethod(
  method: ShippingMethod,
  context: EvaluationContext
): ShippingCalculationResult {
  const locale = context.locale;

  // Check if method is enabled
  if (!method.enabled) {
    return {
      methodId: method.id,
      price: 0,
      available: false,
      message: "Method disabled",
    };
  }

  // Evaluate base conditions
  const conditionsMet = evaluateConditions(method.conditions, context);

  // Handle tiered pricing
  if (method.pricing.type === "tiered") {
    const matchingRule = findMatchingRule(method.pricing.rules, context);

    if (matchingRule) {
      return {
        methodId: method.id,
        price: matchingRule.price,
        available: true,
        estimatedDays: matchingRule.estimatedDays,
        promoText: resolveLocalizedString(matchingRule.promoText, locale),
        upgradeMessage: resolveLocalizedString(matchingRule.upgradeMessage, locale),
      };
    }

    // No matching rule
    return {
      methodId: method.id,
      price: 0,
      available: false,
      message: "No matching tier",
    };
  }

  // For non-tiered pricing
  if (!conditionsMet) {
    // Handle availability display modes
    if (method.availability) {
      const { mode, when, message, showProgress } = method.availability;

      if (mode === "hide") {
        return {
          methodId: method.id,
          price: 0,
          available: false,
          message: "Hidden",
        };
      }

      if (mode === "show_disabled" || mode === "show_hint") {
        // Calculate remaining value to unlock
        const firstCondition = when?.[0];
        let remaining = 0;
        let required = 0;

        if (firstCondition) {
          remaining = calculateRemaining(firstCondition, method.conditions, context);
          required = getMinimumRequired(firstCondition, method.conditions) ?? 0;
        }

        const resolvedMessage = interpolateMessage(
          resolveLocalizedString(message, locale),
          { remaining: remaining.toFixed(2) }
        );

        const result: ShippingCalculationResult = {
          methodId: method.id,
          price: 0,
          available: false,
          message: resolvedMessage,
        };

        // Add progress info
        if (showProgress && firstCondition) {
          const current = required - remaining;
          result.progress = {
            current,
            required,
            remaining,
            percentage: required > 0 ? (current / required) * 100 : 0,
          };
        }

        return result;
      }
    }

    // Default: just return unavailable
    return {
      methodId: method.id,
      price: 0,
      available: false,
      message: "Conditions not met",
    };
  }

  // Conditions met, calculate price
  const price = calculatePrice(method.pricing, context);

  return {
    methodId: method.id,
    price,
    available: true,
    promoText: resolveLocalizedString(method.display?.promoText, locale),
  };
}

/**
 * Calculate all shipping methods from config
 */
export function calculateAllShippingMethods(
  config: ShippingConfig,
  context: EvaluationContext
): ShippingCalculationResult[] {
  const results = config.methods.map((method) =>
    calculateShippingMethod(method, context)
  );

  // Sort by priority (if defined) and then by price
  return results.sort((a, b) => {
    const methodA = config.methods.find((m) => m.id === a.methodId);
    const methodB = config.methods.find((m) => m.id === b.methodId);

    const priorityA = methodA?.display?.priority ?? 999;
    const priorityB = methodB?.display?.priority ?? 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.price - b.price;
  });
}

/**
 * Get available shipping methods only
 */
export function getAvailableShippingMethods(
  config: ShippingConfig,
  context: EvaluationContext
): ShippingCalculationResult[] {
  const all = calculateAllShippingMethods(config, context);
  return all.filter((result) => result.available);
}

/**
 * Get the cheapest available shipping method
 */
export function getCheapestShippingMethod(
  config: ShippingConfig,
  context: EvaluationContext
): ShippingCalculationResult | undefined {
  const available = getAvailableShippingMethods(config, context);
  return available.length > 0 ? available[0] : undefined;
}

/**
 * Get shipping method details for display (including disabled/hint modes)
 */
export function getShippingMethodsForDisplay(
  config: ShippingConfig,
  context: EvaluationContext
): Array<
  ShippingCalculationResult & {
    name: string;
    description?: string;
    icon?: string;
    badge?: string;
  }
> {
  const results = calculateAllShippingMethods(config, context);

  return results
    .map((result) => {
      const method = config.methods.find((m) => m.id === result.methodId);
      if (!method) return null;

      // Filter out hidden methods
      if (!result.available && method.availability?.mode === "hide") {
        return null;
      }

      return {
        ...result,
        name: resolveLocalizedString(method.name, context.locale) ?? "",
        description: resolveLocalizedString(method.description, context.locale),
        icon: method.icon,
        badge: method.display?.badge,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

/**
 * Get detailed information for a specific shipping method by ID
 * Supports both simple IDs and tiered IDs (format: "method_id:tier_id")
 */
export function getShippingMethodById(
  config: ShippingConfig,
  id: string,
  context: EvaluationContext
): ShippingMethodDetail | undefined {
  const locale = context.locale;

  // Parse ID - check if it's a tiered ID
  const parts = id.split(":");
  const methodId = parts[0];
  const tierId = parts.length > 1 ? parts[1] : undefined;

  // Find the method
  const method = config.methods.find((m) => m.id === methodId);
  if (!method) {
    return undefined;
  }

  // For tiered pricing with tier ID
  if (tierId && method.pricing.type === "tiered") {
    const tier = method.pricing.rules.find((r) => r.id === tierId);
    if (!tier) {
      return undefined;
    }

    // Check if this tier is valid for the current context
    const tierValid = evaluateTieredRule(tier, context);

    return {
      id: `${methodId}:${tierId}`,
      methodId,
      tierId,
      name: resolveLocalizedString(tier.label || method.name, locale) ?? "",
      description: resolveLocalizedString(method.description, locale),
      icon: method.icon,
      badge: method.display?.badge,
      price: tier.price,
      available: method.enabled && tierValid,
      enabled: method.enabled,
      estimatedDays: tier.estimatedDays,
      message: tierValid ? undefined : "Tier criteria not met",
      promoText: resolveLocalizedString(tier.promoText, locale),
      upgradeMessage: resolveLocalizedString(tier.upgradeMessage, locale),
      meta: method.meta,
    };
  }

  // For non-tiered or when no tier ID specified
  const result = calculateShippingMethod(method, context);

  return {
    id: methodId,
    methodId,
    name: resolveLocalizedString(method.name, locale) ?? "",
    description: resolveLocalizedString(method.description, locale),
    icon: method.icon,
    badge: method.display?.badge,
    price: result.price,
    available: result.available,
    enabled: method.enabled,
    estimatedDays: result.estimatedDays,
    message: result.message,
    promoText: result.promoText,
    upgradeMessage: result.upgradeMessage,
    progress: result.progress,
    meta: method.meta,
  };
}

/**
 * Get all available tiers for a tiered shipping method
 * Returns array of detailed tier information
 */
export function getTieredMethodOptions(
  config: ShippingConfig,
  methodId: string,
  context: EvaluationContext
): ShippingMethodDetail[] {
  const method = config.methods.find((m) => m.id === methodId);
  if (!method || method.pricing.type !== "tiered") {
    return [];
  }

  const locale = context.locale;

  return method.pricing.rules.map((tier) => {
    const tierValid = evaluateTieredRule(tier, context);

    return {
      id: `${methodId}:${tier.id}`,
      methodId,
      tierId: tier.id,
      name: resolveLocalizedString(tier.label || method.name, locale) ?? "",
      description: resolveLocalizedString(method.description, locale),
      icon: method.icon,
      badge: method.display?.badge,
      price: tier.price,
      available: method.enabled && tierValid,
      enabled: method.enabled,
      estimatedDays: tier.estimatedDays,
      message: tierValid ? undefined : "Tier criteria not met",
      promoText: resolveLocalizedString(tier.promoText, locale),
      upgradeMessage: resolveLocalizedString(tier.upgradeMessage, locale),
      meta: method.meta,
    };
  });
}
