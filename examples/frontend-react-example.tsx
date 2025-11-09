import { useState, useEffect } from "react";
import type {
  ShippingConfig,
  EvaluationContext,
  ShippingCalculationResult,
} from "../src/types.js";
import { getShippingMethodsForDisplay } from "../src/engine.js";

/**
 * Example: React component for displaying shipping methods
 */

interface ShippingMethodCardProps {
  method: ShippingCalculationResult & {
    name: string;
    description?: string;
    icon?: string;
    badge?: string;
  };
  onSelect?: (methodId: string) => void;
  selected?: boolean;
}

function ShippingMethodCard({
  method,
  onSelect,
  selected,
}: ShippingMethodCardProps) {
  const isDisabled = !method.available;

  return (
    <div
      className={`shipping-method-card ${selected ? "selected" : ""} ${
        isDisabled ? "disabled" : ""
      }`}
      onClick={() => !isDisabled && onSelect?.(method.methodId)}
    >
      <div className="method-header">
        {method.icon && <span className="method-icon">{method.icon}</span>}
        <div className="method-info">
          <h3>{method.name}</h3>
          {method.description && <p>{method.description}</p>}
        </div>
        {method.badge && <span className="badge">{method.badge}</span>}
      </div>

      <div className="method-price">
        {method.available ? (
          method.price === 0 ? (
            <span className="free">FREE</span>
          ) : (
            <span>${method.price.toFixed(2)}</span>
          )
        ) : (
          <span className="locked">🔒</span>
        )}
      </div>

      {/* Progress bar for unlock */}
      {!method.available && method.progress && (
        <div className="unlock-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${method.progress.percentage}%` }}
            />
          </div>
          <p className="progress-text">{method.message}</p>
        </div>
      )}

      {/* Promo text */}
      {method.available && method.promoText && (
        <div className="promo-text">{method.promoText}</div>
      )}

      {/* Upgrade message */}
      {method.available && method.upgradeMessage && (
        <div className="upgrade-hint">{method.upgradeMessage}</div>
      )}

      {/* Estimated delivery */}
      {method.available && method.estimatedDays && (
        <div className="delivery-estimate">
          Delivery: {method.estimatedDays.min}-{method.estimatedDays.max} days
        </div>
      )}
    </div>
  );
}

interface ShippingMethodSelectorProps {
  config: ShippingConfig;
  context: EvaluationContext;
  onMethodSelect: (methodId: string) => void;
  selectedMethodId?: string;
}

export function ShippingMethodSelector({
  config,
  context,
  onMethodSelect,
  selectedMethodId,
}: ShippingMethodSelectorProps) {
  const [methods, setMethods] = useState<
    Array<
      ShippingCalculationResult & {
        name: string;
        description?: string;
        icon?: string;
        badge?: string;
      }
    >
  >([]);

  useEffect(() => {
    const displayMethods = getShippingMethodsForDisplay(config, context);
    setMethods(displayMethods);
  }, [config, context]);

  return (
    <div className="shipping-method-selector">
      <h2>Select Shipping Method</h2>

      <div className="methods-list">
        {methods.map((method) => (
          <ShippingMethodCard
            key={method.methodId}
            method={method}
            onSelect={onMethodSelect}
            selected={selectedMethodId === method.methodId}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Example usage in checkout page
 */
export function CheckoutPage() {
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>();
  const [config, setConfig] = useState<ShippingConfig | null>(null);

  // Load config from API
  useEffect(() => {
    fetch("/api/shipping-config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(console.error);
  }, []);

  // Cart state (example)
  const context: EvaluationContext = {
    orderValue: 75.0,
    itemCount: 3,
    country: "US",
    locale: "en",
  };

  if (!config) {
    return <div>Loading...</div>;
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <ShippingMethodSelector
        config={config}
        context={context}
        onMethodSelect={setSelectedMethod}
        selectedMethodId={selectedMethod}
      />

      {selectedMethod && (
        <button onClick={() => console.log("Proceed with:", selectedMethod)}>
          Continue to Payment
        </button>
      )}
    </div>
  );
}
