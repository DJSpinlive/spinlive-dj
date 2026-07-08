/** RTK Query / Fetch-style errors with a `data` payload */
interface ErrorWithData {
  data?: unknown;
}

export interface GetErrorMessageOptions {
  /** When the error has no `data` (e.g. network failure) */
  networkMessage?: string;
  /** When `data` exists but no message could be parsed */
  fallbackMessage?: string;
}

const DEFAULT_NETWORK_MESSAGE = "Network error. Check your connection.";
const DEFAULT_FALLBACK_MESSAGE = "Something went wrong.";

/**
 * Human-readable message from RTK Query `.unwrap()` errors and similar API errors.
 * Supports `{ message: string }` and FastAPI-style `{ detail: [{ msg: string }] }`.
 */
export function getErrorMessage(
  err: unknown,
  options?: GetErrorMessageOptions
): string {
  const { networkMessage, fallbackMessage } = options ?? {};
  const networkMsg = networkMessage ?? DEFAULT_NETWORK_MESSAGE;
  const fallbackMsg = fallbackMessage ?? DEFAULT_FALLBACK_MESSAGE;

  if (!err || typeof err !== "object" || !("data" in err)) {
    return networkMsg;
  }

  const { data } = err as ErrorWithData;
  if (!data || typeof data !== "object") {
    return fallbackMsg;
  }

  const body = data as { message?: string; detail?: { msg?: string }[] };
  if (typeof body.message === "string" && body.message) {
    return body.message;
  }

  const first = body.detail?.[0];
  if (first && typeof first.msg === "string") {
    return first.msg;
  }

  return fallbackMsg;
}

export const formatPhoneNumber = (prefix: string, number: string): string => {
  if (!number) return "";

  // Remove all non-digit characters
  const digitsOnly = number.replace(/\D/g, "");

  // Format based on common patterns for African countries
  if (prefix === "+234" && digitsOnly.length === 10) {
    // Nigeria format: 0801 234 5678
    return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7)}`;
  }

  if (prefix === "+254" && digitsOnly.length === 9) {
    // Kenya format: 701 234 567
    return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}`;
  }

  if (prefix === "+233" && digitsOnly.length === 9) {
    // Ghana format: 24 123 4567
    return `${digitsOnly.slice(0, 2)} ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5)}`;
  }

  if (prefix === "+27" && digitsOnly.length === 9) {
    // South Africa format: 82 123 4567
    return `${digitsOnly.slice(0, 2)} ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5)}`;
  }

  // For other cases, just return the cleaned number
  return digitsOnly;
};

// Helper function to get full phone number
export const getFullPhoneNumber = (prefix: string, number: string): string => {
  if (!number) return "";
  const digitsOnly = number.replace(/\D/g, "");
  return `${prefix}${digitsOnly}`;
};

export const countryCodeOptions = [
  { value: "+234", label: "NIG (+234)" },
  { value: "+254", label: "KEN (+254)" },
  { value: "+233", label: "GHA (+233)" },
  { value: "+27", label: "RSA (+27)" },
];

// Helper function to extract country code and number from full phone string
export const extractPhoneParts = (
  fullPhone: string | undefined | null
): { prefix: string; number: string } => {
  if (!fullPhone) {
    return { prefix: "+234", number: "" }; // Default to Nigeria
  }

  // Get all country codes, sorted by length (longest first) to avoid partial matches
  const codes = countryCodeOptions
    .map((opt) => opt.value)
    .sort((a, b) => b.length - a.length);

  // Try to match each country code
  const matchedCode = codes.find((code) => fullPhone.startsWith(code));

  if (matchedCode) {
    // Extract the number part (everything after the country code)
    const number = fullPhone.slice(matchedCode.length);
    // Remove any non-digit characters from the number
    const cleanedNumber = number.replace(/\D/g, "");
    return { prefix: matchedCode, number: cleanedNumber };
  }

  // If no country code matches, default to Nigeria and return the full number
  return { prefix: "+234", number: fullPhone.replace(/\D/g, "") };
};

// Currency formatter utility
export const formatCurrency = (
  amount: number | string,
  currency: string = "USD",
  locale: string = "en-US"
): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (Number.isNaN(numAmount)) {
    return "0.00";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

// Number formatter utility (K, M, B format)
export const formatNumber = (num: number | string): string => {
  const number = typeof num === "string" ? parseFloat(num) : num;

  if (Number.isNaN(number)) {
    return "0";
  }

  const absNumber = Math.abs(number);
  const sign = number < 0 ? "-" : "";

  if (absNumber >= 1000000000) {
    // Billions
    const billions = absNumber / 1000000000;
    const formatted =
      billions % 1 === 0 ? billions.toString() : billions.toFixed(1);
    return `${sign}${formatted}B`;
  }

  if (absNumber >= 1000000) {
    // Millions
    const millions = absNumber / 1000000;
    const formatted =
      millions % 1 === 0 ? millions.toString() : millions.toFixed(1);
    return `${sign}${formatted}M`;
  }

  if (absNumber >= 1000) {
    // Thousands
    const thousands = absNumber / 1000;
    const formatted =
      thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(1);
    return `${sign}${formatted}k`;
  }

  // Less than 1000, return as is
  return typeof number === "undefined" || number === null
    ? "0"
    : number.toString();
};

interface RemoveEmptyParamsConfig {
  removeZero?: boolean;
}

export function removeEmptyParams<T>(
  params: T,
  config?: RemoveEmptyParamsConfig
): Partial<T> {
  const data = Object.fromEntries(
    Object.entries(params as Record<string, unknown>).filter(([_, v]) => {
      if (v === undefined || v === "" || Number.isNaN(v)) {
        return false;
      }
      if (config?.removeZero && v === 0) {
        return false;
      }
      return true;
    })
  ) as Partial<T>;

  return data;
}
