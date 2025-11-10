# shipping-methods-dsl

[![npm version](https://img.shields.io/npm/v/shipping-methods-dsl.svg)](https://www.npmjs.com/package/shipping-methods-dsl)
![npm bundle size](https://img.shields.io/bundlephobia/min/shipping-methods-dsl)
[![npm downloads](https://img.shields.io/npm/dm/shipping-methods-dsl.svg)](https://www.npmjs.com/package/shipping-methods-dsl)
[![license](https://img.shields.io/npm/l/shipping-methods-dsl.svg)](https://github.com/minhtaimc/edge-store-shipping-methods-dsl/blob/main/LICENSE)

A powerful, type-safe DSL (Domain Specific Language) for defining and evaluating shipping methods across edge workers, frontend, and admin panels.

## Features

- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Validated**: Runtime validation using ArkType 2.1
- **Flexible pricing**: Support for flat, item-based, value-based, tiered, and custom pricing
- **Conditional logic**: Geo-based and order-based conditions
- **Localization**: Built-in i18n support for all user-facing strings
- **Edge-ready**: Works seamlessly in Cloudflare Workers and other edge environments
- **Framework agnostic**: Use in React, Vue, Svelte, or vanilla JS
- **Progressive unlock**: Show disabled methods with unlock hints and progress bars
- **Zero dependencies**: Only requires ArkType for runtime validation

## Installation

```bash
npm install shipping-methods-dsl
```

## Quick Start

### 1. Define your shipping configuration

```json
{
  "$schema": "https://cdn.jsdelivr.net/npm/shipping-methods-dsl@1/schema/shipping-methods.v1.schema.json",
  "version": "1.0",
  "currency": "USD",
  "methods": [
    {
      "id": "shipping.us.standard",
      "enabled": true,
      "name": "Standard Shipping",
      "pricing": { "type": "flat", "amount": 5.99 },
      "conditions": {
        "geo": { "country": { "include": ["US"] } }
      }
    }
  ]
}
```

### 2. Validate and use in your application

```typescript
import {
  validateShippingConfig,
  getAvailableShippingMethods,
  type EvaluationContext,
} from "shipping-methods-dsl";

// Load and validate config
const config = validateShippingConfig(configJson);

// Create evaluation context from cart/order data
const context: EvaluationContext = {
  orderValue: 100.0,
  itemCount: 3,
  country: "US",
  locale: "en",
};

// Get available shipping methods
const methods = getAvailableShippingMethods(config, context);
console.log(methods);
```

## Pricing Types

### Flat Rate

Fixed price regardless of order details.

```json
{
  "pricing": {
    "type": "flat",
    "amount": 5.99
  }
}
```

### Item-Based

Price based on number of items: `firstItemPrice + additionalItemPrice × (count - 1)`

```json
{
  "pricing": {
    "type": "item_based",
    "firstItemPrice": 12.99,
    "additionalItemPrice": 2.5
  }
}
```

### Value-Based

Percentage of order value with optional min/max clamps.

```json
{
  "pricing": {
    "type": "value_based",
    "percentage": 15,
    "minAmount": 15,
    "maxAmount": 50
  }
}
```

### Tiered

Different pricing based on matching criteria (first match wins).

```json
{
  "pricing": {
    "type": "tiered",
    "rules": [
      {
        "id": "standard",
        "criteria": { "order": { "value": { "min": 50, "max": 99.99 } } },
        "price": 0,
        "estimatedDays": { "min": 7, "max": 10 }
      },
      {
        "id": "express",
        "criteria": { "order": { "value": { "min": 100 } } },
        "price": 0,
        "estimatedDays": { "min": 2, "max": 3 }
      }
    ]
  }
}
```

### Custom

Extensible plugin system for custom logic (e.g., weight-based).

```json
{
  "pricing": {
    "type": "custom",
    "plugin": "weight_based",
    "config": {
      "ratePerKg": 12000,
      "minCharge": 15000
    }
  }
}
```

## Conditions

### Geographic Conditions

```json
{
  "conditions": {
    "geo": {
      "country": {
        "include": ["US", "CA"],
        "exclude": ["AK", "HI"]
      }
    }
  }
}
```

### Order Conditions

```json
{
  "conditions": {
    "order": {
      "value": { "min": 50, "max": 500 },
      "items": { "min": 1, "max": 10 },
      "weight": { "min": 0, "max": 50 }
    }
  }
}
```

## Availability & Upselling

### Tier-Level Availability (for Tiered Pricing)

Control how tier upgrade hints appear when users are in a lower tier:

```json
{
  "pricing": {
    "type": "tiered",
    "rules": [
      {
        "id": "tier_paid",
        "price": 4.97,
        "criteria": { "order": { "value": { "max": 99.99 } } }
      },
      {
        "id": "tier_free",
        "price": 0,
        "criteria": { "order": { "value": { "min": 100 } } },
        "availability": {
          "mode": "show_hint",
          "when": ["order.value.min"],
          "message": "Add ${remaining} more to unlock free shipping",
          "showProgress": true
        }
      }
    ]
  }
}
```

**When to use:** Show progress hints when user is in paid tier but can upgrade to free tier.

### Method-Level Availability (for Non-Tiered Pricing)

Control how methods appear when conditions aren't met:

```json
{
  "id": "shipping.promo.free",
  "enabled": true,
  "name": "Promotional Free Shipping",
  "conditions": {
    "order": { "value": { "min": 50 } }
  },
  "pricing": {
    "type": "flat",
    "amount": 0
  },
  "availability": {
    "mode": "show_hint",
    "when": ["order.value.min"],
    "message": "Add ${remaining} more to unlock promotional free shipping",
    "showProgress": true
  }
}
```

**When to use:** Show hints for flat/item-based/value-based pricing methods that aren't available yet.

### Availability Modes

- `hide` - Don't show the method/hint (default)
- `show_disabled` - Show as disabled with message (full card UI)
- `show_hint` - Show small hint/banner about how to unlock

### Key Differences

**Tier-level availability:**
- Configured on individual tiers (rules)
- Shows hints when user is in a lower tier
- Example: "You're using paid shipping, add $25 more for free"

**Method-level availability:**
- Configured on the shipping method itself
- Shows hints when method conditions aren't met
- Only for non-tiered pricing (flat, item_based, value_based)
- Example: "Add $20 more to unlock promotional free shipping"

## Localization

All user-facing strings support localization:

```json
{
  "name": {
    "en": "Free Shipping",
    "vi": "Miễn phí vận chuyển",
    "es": "Envío gratis"
  }
}
```

## API Reference

### Result Types

#### `ShippingCalculationResult`
Returned by `getAvailableShippingMethods()` and `calculateAllShippingMethods()`.

```typescript
interface ShippingCalculationResult {
  id: string;           // Full ID - use this for backend validation
  methodId: string;     // Base method ID
  tierId?: string;      // Tier ID if tiered pricing
  price: number;
  available: boolean;
  // ... other fields
}
```

**Field usage:**
- **`id`**: Full identifier ready to send to backend. For tiered: `"method_id:tier_id"`, non-tiered: `"method_id"`
- **`methodId`**: Base method ID from config
- **`tierId`**: Only populated for tiered pricing, indicates which tier matched

**Example values:**
```typescript
// Tiered pricing result
{
  id: "shipping.us.free:tier_express",
  methodId: "shipping.us.free",
  tierId: "tier_express",
  price: 0
}

// Non-tiered pricing result
{
  id: "shipping.us.standard",
  methodId: "shipping.us.standard",
  tierId: undefined,
  price: 4.97
}
```

#### `ShippingMethodDetail`
Returned by `getShippingMethodById()` and `getTieredMethodOptions()`.

Similar structure to `ShippingCalculationResult` but includes additional display fields like `name`, `description`, `enabled`, etc.

### Main Functions

#### `validateShippingConfig(data: unknown): ShippingConfig`
Validates and returns a shipping configuration. Throws if invalid.

#### `calculateAllShippingMethods(config, context): ShippingCalculationResult[]`
Calculates all shipping methods (available and unavailable).

#### `getAvailableShippingMethods(config, context): ShippingCalculationResult[]`
Returns only available shipping methods. **Use `result.id` to send to backend.**

#### `getCheapestShippingMethod(config, context): ShippingCalculationResult | undefined`
Returns the cheapest available method.

#### `getShippingMethodsForDisplay(config, context)`
Returns methods suitable for UI display, including disabled methods with unlock hints.

#### `getShippingMethodById(config, id, context): ShippingMethodDetail | undefined`
Get detailed information for a specific shipping method by ID. Supports both simple IDs (`"shipping.express"`) and tiered IDs (`"shipping.express:tier_premium"`).

**Primary use case**: Backend validation when receiving shipping method ID from frontend during checkout.

#### `getTieredMethodOptions(config, methodId, context): ShippingMethodDetail[]`
Get all tier options for a tiered pricing method. Each tier is returned with its own ID in the format `"method_id:tier_id"`.

### Custom Plugins

Register custom pricing logic:

```typescript
import { registerPricingPlugin } from "shipping-methods-dsl";

registerPricingPlugin("my_plugin", (config, context) => {
  // Your custom pricing logic
  return calculatedPrice;
});
```

## Usage Examples

### Backend: Validate Shipping Method from Frontend

When your frontend sends a selected shipping method ID during checkout, use `getShippingMethodById` to validate and calculate the actual price:

```typescript
import {
  type ShippingConfig,
  getShippingMethodById,
  validateShippingConfig,
} from "shipping-methods-dsl";

// Load your config (from KV, R2, or environment)
const config = validateShippingConfig(configJson);

export default {
  async fetch(request: Request): Promise<Response> {
    const body = await request.json();
    const { shippingMethodId, orderValue, itemCount, country } = body;

    // Create context from order data
    const context = {
      orderValue,
      itemCount,
      country,
      locale: request.headers.get("Accept-Language") || "en",
    };

    // Validate the shipping method ID from frontend
    const shippingMethod = getShippingMethodById(config, shippingMethodId, context);

    if (!shippingMethod) {
      return Response.json({ error: "Invalid shipping method" }, { status: 400 });
    }

    if (!shippingMethod.available) {
      return Response.json({
        error: "Shipping method not available",
        message: shippingMethod.message
      }, { status: 400 });
    }

    // Use the validated shipping price
    const shippingCost = shippingMethod.price;
    const total = orderValue + shippingCost;

    return Response.json({
      shippingCost,
      shippingMethod: {
        id: shippingMethod.id,
        name: shippingMethod.name,
        estimatedDays: shippingMethod.estimatedDays,
      },
      total,
    });
  }
};
```

### Frontend: Get Available Methods

```typescript
import { getAvailableShippingMethods } from "shipping-methods-dsl";

// Frontend gets available methods and displays to user
const methods = getAvailableShippingMethods(config, {
  orderValue: cart.total,
  itemCount: cart.items.length,
  country: user.country,
  locale: "en",
});

// Display methods to user
methods.forEach(method => {
  console.log(`${method.id}: $${method.price}`);
  // For tiered pricing: id is "method_id:tier_id"
  // For non-tiered: id is just "method_id"
  if (method.tierId) {
    console.log(`  (Tiered: ${method.methodId}:${method.tierId})`);
  }
});

// User selects a method - use the id directly (no need to construct)
const selectedMethod = methods[0]; // User's selection

await fetch("/api/checkout", {
  method: "POST",
  body: JSON.stringify({
    shippingMethodId: selectedMethod.id, // Use id directly
    orderValue: cart.total,
    itemCount: cart.items.length,
    country: user.country,
  }),
});
```

### Working with Tiered Pricing

```typescript
import { getTieredMethodOptions, getShippingMethodById } from "shipping-methods-dsl";

// Get all tier options for a tiered method
const tiers = getTieredMethodOptions(config, "shipping.express", context);
// Returns:
// [
//   { id: "shipping.express:standard", price: 8.99, available: true, ... },
//   { id: "shipping.express:premium", price: 12.99, available: true, ... }
// ]

// Validate a specific tier selection
const selected = getShippingMethodById(config, "shipping.express:premium", context);
if (selected?.available) {
  console.log(`${selected.name}: $${selected.price}`);
}
```

See [examples/](./examples/) for more detailed examples including:
- Full Cloudflare Worker implementation
- Backend validation example
- React frontend component
- Custom plugin usage

## Cloudflare Worker Compatibility

This package is **100% compatible** with Cloudflare Workers and other edge runtimes:

- ✅ Zero Node.js dependencies
- ✅ Pure JavaScript/TypeScript
- ✅ ES Modules only
- ✅ Bundle size: ~115KB
- ✅ Works on: Workers, Node.js 18+, Deno, Browsers, Bun

See [CLOUDFLARE_WORKER_COMPATIBILITY.md](./CLOUDFLARE_WORKER_COMPATIBILITY.md) for details.

## JSON Schema

Use the JSON Schema for IDE autocomplete and validation:

```json
{
  "$schema": "https://cdn.jsdelivr.net/npm/shipping-methods-dsl@1/schema/shipping-methods.v1.schema.json"
}
```

## Type Definitions

Full TypeScript type definitions are included:

```typescript
import type {
  ShippingConfig,
  ShippingMethod,
  Pricing,
  EvaluationContext,
  ShippingCalculationResult,
} from "shipping-methods-dsl";
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check

# Watch mode
npm run dev
```

## Contributing

Contributions are welcome! Please ensure:
- All code passes type checking
- Follow existing patterns and conventions
- Add tests for new features

## License

MIT - See [LICENSE](./LICENSE)

## Advanced Features

### Estimated Delivery Days

Configure estimated delivery timeframes for shipping methods:

```json
{
  "id": "shipping.us.express",
  "name": "Express Shipping",
  "pricing": { "type": "flat", "amount": 9.99 },
  "estimatedDays": { "min": 2, "max": 3 }
}
```

For tiered pricing, each tier can have its own delivery estimate:

```json
{
  "pricing": {
    "type": "tiered",
    "rules": [
      {
        "id": "tier_standard",
        "price": 0,
        "estimatedDays": { "min": 5, "max": 7 }
      },
      {
        "id": "tier_express",
        "price": 0,
        "estimatedDays": { "min": 2, "max": 3 }
      }
    ]
  }
}
```

### Display Configuration

Control how shipping methods appear in your UI:

```json
{
  "display": {
    "priority": 1,
    "badge": "Popular",
    "promoText": {
      "en": "Save $5 on orders over $50",
      "vi": "Tiết kiệm $5 cho đơn hàng trên $50"
    }
  }
}
```

**Fields:**
- `priority`: Sort order (lower numbers appear first)
- `badge`: Display badge like "Popular", "Fastest", etc.
- `promoText`: Promotional message (localized)

### Progress Tracking

Show users how close they are to unlocking better shipping options.

**For tiered pricing:** Add `availability` config to the target tier:

```json
{
  "pricing": {
    "type": "tiered",
    "rules": [
      {
        "id": "tier_paid",
        "price": 4.97,
        "criteria": { "order": { "value": { "max": 99.99 } } }
      },
      {
        "id": "tier_free",
        "price": 0,
        "criteria": { "order": { "value": { "min": 100 } } },
        "availability": {
          "mode": "show_hint",
          "when": ["order.value.min"],
          "message": "Add ${remaining} more to unlock free shipping",
          "showProgress": true
        }
      }
    ]
  }
}
```

Access progress information in your UI:

**For non-tiered pricing:** Add `availability` config to the method:

```json
{
  "id": "shipping.promo.free",
  "name": "Promotional Free Shipping",
  "conditions": {
    "order": { "value": { "min": 50 } }
  },
  "pricing": { "type": "flat", "amount": 0 },
  "availability": {
    "mode": "show_hint",
    "when": ["order.value.min"],
    "message": "Add ${remaining} more to unlock promotional free shipping",
    "showProgress": true
  }
}
```

**Access progress information in your UI:**

```typescript
const methods = getShippingMethodsForDisplay(config, context);
methods.forEach(method => {
  // Progress is shown when:
  // - Tiered: user is in lower tier, better tier has availability config
  // - Non-tiered: method conditions not met, has availability config
  if (method.progress) {
    const { current, required, remaining, percentage } = method.progress;
    console.log(`Progress: ${percentage.toFixed(0)}%`);
    console.log(`${method.upgradeMessage}`); // e.g., "Add $25 more to unlock free shipping"
  }
});
```

### Metadata

Attach custom metadata to shipping methods:

```json
{
  "id": "shipping.us.express",
  "name": "Express Shipping",
  "meta": {
    "carrier": "FedEx",
    "serviceCode": "FEDEX_2_DAY",
    "trackingEnabled": true,
    "insurance": true
  }
}
```

Access metadata in your application:

```typescript
const method = getShippingMethodById(config, "shipping.us.express", context);
console.log(method?.meta?.carrier); // "FedEx"
```

## Complete Configuration Example

See [examples/us-international-shipping.json](./examples/us-international-shipping.json) for a complete real-world configuration including:

- **US Standard Shipping** (tiered pricing with 2 tiers):
  - Paid: $4.97 (orders < $100, 5-7 days)
  - Free: $0 (orders ≥ $100, 5-7 days)
  - Progress tracking: "Add $X more to unlock free standard shipping"
- **US Express Shipping** (tiered pricing with 2 tiers):
  - Paid: $9.97 (orders < $500, 2-3 days)
  - Free: $0 (orders ≥ $500, 2-3 days)
  - Progress tracking: "Add $X more to unlock free express shipping"
- **US Overnight Shipping**: Item-based pricing ($29.97 + $10.97/item, next day)
- **International Standard**: Item-based pricing ($9.97 + $3.97/item, 10-15 days)
- Localized strings (English & Vietnamese)
- Display priorities and badges

## TypeScript Types Reference

### Core Types

```typescript
// Configuration context for evaluation
interface EvaluationContext {
  orderValue: number;
  itemCount: number;
  weight?: number;
  country: string;        // ISO 3166-1 alpha-2 (e.g., "US", "CA")
  currency?: string;      // ISO 4217 (e.g., "USD")
  locale?: string;        // Language code (e.g., "en", "vi")
}

// Localized string (single string or locale map)
type LocalizedString = string | Record<string, string>;

// Numeric range
interface RangeNumber {
  min?: number;
  max?: number;
}

// Estimated delivery days
interface EstimatedDays {
  min: number;
  max: number;
}

// Geographic conditions
interface GeoCountry {
  include?: string[];     // Country codes to include
  exclude?: string[];     // Country codes to exclude
}

// Order-based conditions
interface OrderConditions {
  value?: RangeNumber;    // Order value range
  items?: RangeNumber;    // Item count range
  weight?: RangeNumber;   // Weight range
}

// Pricing types
type Pricing =
  | { type: "flat"; amount: number }
  | { type: "item_based"; firstItemPrice: number; additionalItemPrice: number }
  | { type: "value_based"; percentage: number; minAmount?: number; maxAmount?: number }
  | { type: "tiered"; rules: Rule[] }
  | { type: "custom"; plugin: string; config: Record<string, unknown> };

// Tiered pricing rule
interface Rule {
  id: string;
  label?: LocalizedString;
  criteria: {
    geo?: { country?: GeoCountry };
    order?: OrderConditions;
  };
  price: number;
  estimatedDays?: EstimatedDays;
  promoText?: LocalizedString;
  upgradeMessage?: LocalizedString;
  availability?: Availability; // Tier-level availability for upgrade hints
}

// Availability configuration
interface Availability {
  mode: "hide" | "show_disabled" | "show_hint";
  when?: Array<"order.value.min" | "order.items.min" | "order.weight.min">;
  message?: LocalizedString;
  showProgress?: boolean;
}

// Display configuration
interface Display {
  priority?: number;
  badge?: string;
  promoText?: LocalizedString;
}

// Shipping method definition
interface ShippingMethod {
  id: string;
  enabled: boolean;
  name: LocalizedString;
  description?: LocalizedString;
  icon?: string;
  display?: Display;
  conditions?: {
    geo?: { country?: GeoCountry };
    order?: OrderConditions;
  };
  pricing: Pricing;
  availability?: Availability; // Method-level availability for non-tiered pricing
  estimatedDays?: EstimatedDays;
  meta?: Record<string, unknown>;
}

// Root configuration
interface ShippingConfig {
  $schema?: string;
  version: "1.0";
  currency?: string;
  methods: ShippingMethod[];
}

// Calculation result
interface ShippingCalculationResult {
  id: string;              // Full ID: "method_id" or "method_id:tier_id"
  methodId: string;        // Base method ID
  tierId?: string;         // Tier ID (for tiered pricing)
  price: number;
  available: boolean;
  availabilityMode?: "hide" | "show_disabled" | "show_hint"; // How to display when not available/showing hints
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

// Detailed method information
interface ShippingMethodDetail extends ShippingCalculationResult {
  name: string;            // Localized name
  description?: string;    // Localized description
  icon?: string;
  badge?: string;
  enabled: boolean;
  meta?: Record<string, unknown>;
}

// Custom pricing plugin function
type CustomPricingPlugin = (
  config: Record<string, unknown>,
  context: EvaluationContext
) => number;
```

## API Functions

### Validation

```typescript
function validateShippingConfig(data: unknown): ShippingConfig
```

Validates a shipping configuration against the schema. Throws an error if validation fails.

**Example:**
```typescript
try {
  const config = validateShippingConfig(configJson);
  console.log("Config is valid");
} catch (error) {
  console.error("Invalid config:", error.message);
}
```

### Calculation Functions

```typescript
function calculateShippingMethod(
  method: ShippingMethod,
  context: EvaluationContext
): ShippingCalculationResult
```

Calculate a single shipping method for the given context.

```typescript
function calculateAllShippingMethods(
  config: ShippingConfig,
  context: EvaluationContext
): ShippingCalculationResult[]
```

Calculate all shipping methods (both available and unavailable). Results are sorted by priority and price.

```typescript
function getAvailableShippingMethods(
  config: ShippingConfig,
  context: EvaluationContext
): ShippingCalculationResult[]
```

Get only available shipping methods for the current context. **This is the main function to use in your frontend.**

```typescript
function getCheapestShippingMethod(
  config: ShippingConfig,
  context: EvaluationContext
): ShippingCalculationResult | undefined
```

Get the cheapest available shipping method.

```typescript
function getShippingMethodsForDisplay(
  config: ShippingConfig,
  context: EvaluationContext
): Array<ShippingCalculationResult & {
  name: string;
  description?: string;
  icon?: string;
  badge?: string;
}>
```

Get shipping methods suitable for UI display. Includes disabled methods with unlock hints, but excludes hidden methods.

### Method Lookup Functions

```typescript
function getShippingMethodById(
  config: ShippingConfig,
  id: string,
  context: EvaluationContext
): ShippingMethodDetail | undefined
```

Get detailed information for a specific shipping method by ID. **Use this in your backend to validate shipping method selection from frontend.**

Supports both formats:
- Simple: `"shipping.express"`
- Tiered: `"shipping.express:tier_premium"`

```typescript
function getTieredMethodOptions(
  config: ShippingConfig,
  methodId: string,
  context: EvaluationContext
): ShippingMethodDetail[]
```

Get all tier options for a tiered pricing method. Returns an array of tiers, each with its own ID in the format `"method_id:tier_id"`.

### Plugin System

```typescript
function registerPricingPlugin(
  name: string,
  handler: CustomPricingPlugin
): void
```

Register a custom pricing plugin.

**Example:**
```typescript
import { registerPricingPlugin } from "shipping-methods-dsl";

registerPricingPlugin("weight_based", (config, context) => {
  const ratePerKg = config.ratePerKg as number;
  const minCharge = config.minCharge as number;
  const weight = context.weight || 0;
  return Math.max(weight * ratePerKg, minCharge);
});
```

```typescript
function getPricingPlugin(name: string): CustomPricingPlugin | undefined
```

Get a registered pricing plugin by name.

### Condition Evaluation

```typescript
function evaluateConditions(
  conditions: Conditions | undefined,
  context: EvaluationContext
): boolean
```

Evaluate if conditions are met for the given context.

```typescript
function calculateRemaining(
  condition: string,
  conditions: Conditions | undefined,
  context: EvaluationContext
): number
```

Calculate how much is remaining to meet a specific condition.

```typescript
function getMinimumRequired(
  condition: string,
  conditions: Conditions | undefined
): number | undefined
```

Get the minimum value required for a specific condition.

## Best Practices

### 1. Configuration Management

Store your shipping configuration in a centralized location:

- **Cloudflare Workers**: Use KV or R2 storage
- **Node.js**: Use environment variables or config files
- **Frontend**: Fetch from API endpoint

Always validate configuration at load time:

```typescript
import { validateShippingConfig } from "shipping-methods-dsl";

// In your app initialization
const config = validateShippingConfig(await loadConfig());
```

### 2. Caching

Cache the validated configuration to avoid repeated validation:

```typescript
let cachedConfig: ShippingConfig | null = null;

export function getConfig(): ShippingConfig {
  if (!cachedConfig) {
    cachedConfig = validateShippingConfig(rawConfig);
  }
  return cachedConfig;
}
```

### 3. Backend Validation

**Always validate shipping selection on the backend**, even if you validate on the frontend:

```typescript
// Frontend sends: { shippingMethodId: "shipping.express:tier_premium", ... }

// Backend validates:
const method = getShippingMethodById(config, shippingMethodId, context);

if (!method || !method.available) {
  throw new Error("Invalid shipping method");
}

// Use method.price for final calculation
const total = orderValue + method.price;
```

### 4. Error Handling

Always handle cases where no shipping methods are available:

```typescript
const methods = getAvailableShippingMethods(config, context);

if (methods.length === 0) {
  // Show message: "No shipping methods available for your location"
  // Or suggest changes: "Reduce order weight" or "Change delivery country"
}
```

### 5. Localization

Provide localized strings for all user-facing text:

```json
{
  "name": {
    "en": "Free Shipping",
    "vi": "Miễn phí vận chuyển",
    "es": "Envío gratis",
    "fr": "Livraison gratuite"
  }
}
```

Always pass the user's locale in the context:

```typescript
const context: EvaluationContext = {
  orderValue: cart.total,
  itemCount: cart.items.length,
  country: user.country,
  locale: user.preferredLanguage || "en",
};
```

### 6. Testing

Test your shipping configuration with various contexts:

```typescript
// Test different countries
const usContext = { ...baseContext, country: "US" };
const caContext = { ...baseContext, country: "CA" };

// Test different order values
const smallOrder = { ...baseContext, orderValue: 25 };
const largeOrder = { ...baseContext, orderValue: 500 };

// Test item counts
const singleItem = { ...baseContext, itemCount: 1 };
const bulkOrder = { ...baseContext, itemCount: 50 };
```

## Troubleshooting

### Configuration Validation Errors

If you get validation errors, check:

1. **Required fields**: All methods must have `id`, `enabled`, `name`, and `pricing`
2. **Version**: Must be exactly `"1.0"`
3. **Country codes**: Must be valid ISO 3166-1 alpha-2 codes
4. **Pricing rules**: Each tiered rule must have `id`, `criteria`, and `price`

### No Shipping Methods Available

If no methods are returned:

1. **Check geo conditions**: Does the user's country match `include` list?
2. **Check order conditions**: Does order value/items/weight meet requirements?
3. **Check enabled flag**: Are methods enabled in config?
4. **Use calculateAllShippingMethods**: See all methods with their availability status

### Tiered Pricing Not Working

Common issues:

1. **Base conditions not met**: Tiered pricing checks base conditions first, then tier criteria
2. **Tier order matters**: First matching tier wins (order matters!)
3. **No matching tier**: Make sure at least one tier's criteria matches the context

### TypeScript Errors

Make sure you're importing types correctly:

```typescript
import type {
  ShippingConfig,
  EvaluationContext,
  ShippingCalculationResult,
  ShippingMethodDetail,
} from "shipping-methods-dsl";
```

## Version

Current version: **1.4.0**

### Changelog

**v1.4.0**
- **BREAKING**: Moved `availability` from method-level to tier-level for tiered pricing
- Kept method-level `availability` for non-tiered pricing (flat, item_based, value_based)
- Added `availabilityMode` field to `ShippingCalculationResult` ("hide" | "show_disabled" | "show_hint")
- Tier-level availability enables better upgrade hints and progress tracking
- Simplified availability logic: `conditions` = hard requirements, `availability` = upgrade hints
- Added vitest v4.0.8 for testing with comprehensive test suite
- Added MIGRATION-v1.4.0.md with detailed upgrade guide
- Updated examples and documentation

**v1.3.0**
- Added `id` field to `ShippingCalculationResult` for easier frontend-backend integration
- ID format: `"method_id:tier_id"` for tiered pricing, `"method_id"` for non-tiered

**v1.2.0**
- Added `estimatedDays` field to `ShippingMethod`
- Added `getShippingMethodById()` and `getTieredMethodOptions()` functions
- Improved tiered pricing to check base conditions first

**v1.1.0**
- Initial public release
- Full TypeScript support
- Cloudflare Workers compatibility

**v1.0.0**
- Internal beta release

## Links

- [npm](https://www.npmjs.com/package/shipping-methods-dsl)
- [GitHub](https://github.com/minhtaimc/edge-store-shipping-methods-dsl)
- [Examples](./examples/)
- [Cloudflare Worker Compatibility](./CLOUDFLARE_WORKER_COMPATIBILITY.md)

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/minhtaimc/edge-store-shipping-methods-dsl/issues).
