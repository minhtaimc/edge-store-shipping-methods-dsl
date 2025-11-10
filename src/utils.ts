/**
 * Internal utilities
 * Shared by frontend and backend modules
 */

import type { LocalizedString } from "./types.js";

/**
 * Resolve localized string to user's language
 */
export function resolveLocalizedString(
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
export function interpolateMessage(
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
