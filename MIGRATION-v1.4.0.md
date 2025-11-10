# Migration Guide: v1.3.0 → v1.4.0

## Overview

Version 1.4.0 introduces **tier-level availability** configuration, providing better control over upgrade hints and progress tracking.

## Breaking Changes

### 1. Moved `availability` from Method Level to Tier Level

**Before (v1.3.0):**
```json
{
  "id": "shipping.us.standard",
  "pricing": {
    "type": "tiered",
    "rules": [...]
  },
  "availability": {
    "mode": "show_hint",
    "when": ["order.value.min"],
    "message": "Add ${remaining} more...",
    "showProgress": true
  }
}
```

**After (v1.4.0):**
```json
{
  "id": "shipping.us.standard",
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
          "message": "Add ${remaining} more...",
          "showProgress": true
        }
      }
    ]
  }
}
```

### 2. Method-level `availability` Now Only for Non-tiered Methods

Method-level `availability` is now only used for non-tiered pricing methods (flat, item_based, value_based):

```json
{
  "id": "shipping.promo.free",
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
    "message": "Add ${remaining} more...",
    "showProgress": true
  }
}
```

## New Features

### 1. `availabilityMode` Field in `ShippingCalculationResult`

```typescript
interface ShippingCalculationResult {
  // ... existing fields
  availabilityMode?: "hide" | "show_disabled" | "show_hint";
}
```

**Usage:**
```typescript
const methods = getShippingMethodsForDisplay(config, context);

methods.forEach(method => {
  if (method.availabilityMode === "hide") {
    return null; // Don't render
  }

  if (method.availabilityMode === "show_hint") {
    return <HintBanner message={method.upgradeMessage} progress={method.progress} />;
  }

  if (method.availabilityMode === "show_disabled") {
    return <DisabledCard message={method.upgradeMessage} progress={method.progress} />;
  }

  // Available method
  return <ShippingCard {...method} />;
});
```

### 2. Better Separation of Concerns

- **Hard requirements** (`conditions`): Country, weight, etc. → HIDE if not met
- **Upgrade hints** (`availability`): Show progress towards better tier

## Migration Steps

### Step 1: Update Tiered Pricing Methods

For each tiered pricing method with `availability`:

1. Remove `availability` from method level
2. Add `availability` to the target tier (usually the free/cheapest tier)

### Step 2: Update Frontend Logic

Add handling for `availabilityMode`:

```typescript
// Before
if (!method.available) {
  return null; // Always hide unavailable methods
}

// After
if (method.availabilityMode === "hide") {
  return null;
}

if (!method.available && method.availabilityMode === "show_hint") {
  return <HintBanner {...method} />;
}

if (!method.available && method.availabilityMode === "show_disabled") {
  return <DisabledCard {...method} />;
}

if (method.available && method.availabilityMode) {
  return <ShippingCard {...method} upgradeHint={method.upgradeMessage} />;
}

return <ShippingCard {...method} />;
```

### Step 3: Test Your Configuration

Run validation:

```typescript
import { validateShippingConfig } from "shipping-methods-dsl";

const config = validateShippingConfig(yourConfig);
// Will throw if invalid
```

## Examples

### Example 1: Tiered Pricing with Upgrade Hints

```json
{
  "methods": [
    {
      "id": "shipping.us.standard",
      "enabled": true,
      "name": "Standard Shipping",
      "conditions": {
        "geo": { "country": { "include": ["US"] } }
      },
      "pricing": {
        "type": "tiered",
        "rules": [
          {
            "id": "tier_paid",
            "price": 4.97,
            "criteria": { "order": { "value": { "max": 99.99 } } },
            "estimatedDays": { "min": 5, "max": 7 }
          },
          {
            "id": "tier_free",
            "price": 0,
            "criteria": { "order": { "value": { "min": 100 } } },
            "estimatedDays": { "min": 5, "max": 7 },
            "promoText": "You've unlocked free standard shipping!",
            "availability": {
              "mode": "show_hint",
              "when": ["order.value.min"],
              "message": "Add $${remaining} more to unlock free standard shipping",
              "showProgress": true
            }
          }
        ]
      }
    }
  ]
}
```

**Result when orderValue = $75:**
```json
{
  "id": "shipping.us.standard:tier_paid",
  "methodId": "shipping.us.standard",
  "tierId": "tier_paid",
  "price": 4.97,
  "available": true,
  "availabilityMode": "show_hint",
  "upgradeMessage": "Add $25.00 more to unlock free standard shipping",
  "progress": {
    "current": 75,
    "required": 100,
    "remaining": 25,
    "percentage": 75
  }
}
```

### Example 2: Non-tiered with Availability Hint

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
    "message": "Add $${remaining} more to unlock promotional free shipping",
    "showProgress": true
  }
}
```

**Result when orderValue = $30:**
```json
{
  "id": "shipping.promo.free",
  "methodId": "shipping.promo.free",
  "price": 0,
  "available": false,
  "availabilityMode": "show_hint",
  "message": "Add $20.00 more to unlock promotional free shipping",
  "progress": {
    "current": 30,
    "required": 50,
    "remaining": 20,
    "percentage": 60
  }
}
```

## TypeScript Changes

### Updated Types

```typescript
// Rule interface (tier)
interface Rule {
  id: string;
  label?: LocalizedString;
  criteria: {...};
  price: number;
  estimatedDays?: EstimatedDays;
  promoText?: LocalizedString;
  upgradeMessage?: LocalizedString;
  availability?: Availability; // ← NEW
}

// ShippingMethod interface
interface ShippingMethod {
  id: string;
  enabled: boolean;
  name: LocalizedString;
  // ...
  pricing: Pricing;
  availability?: Availability; // ← For non-tiered only
  // ...
}

// ShippingCalculationResult interface
interface ShippingCalculationResult {
  // ...
  available: boolean;
  availabilityMode?: "hide" | "show_disabled" | "show_hint"; // ← NEW
  upgradeMessage?: string;
  progress?: {...};
}
```

## FAQ

### Q: Do I need to update all my configurations immediately?

**A:** Yes, if you were using method-level `availability` with tiered pricing in v1.3.0, you need to move it to the tier level. The validator will catch this error.

### Q: What if I don't specify `availability` for any tier?

**A:** That's fine! The method will work normally without upgrade hints. Progress tracking is opt-in.

### Q: Can I have different `availability` configs for different tiers?

**A:** Yes! Each tier can have its own `availability` configuration, allowing fine-grained control over upgrade hints.

### Q: What's the difference between `show_disabled` and `show_hint`?

**A:**
- `show_disabled`: Render as a full disabled shipping option card
- `show_hint`: Render as a small hint banner/notification

The frontend decides the exact UI treatment.

## Support

For issues or questions:
- [GitHub Issues](https://github.com/minhtaimc/edge-store-shipping-methods-dsl/issues)
- [npm Package](https://www.npmjs.com/package/shipping-methods-dsl)
