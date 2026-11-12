// Pricing remains available for local design work. Production preview/account
// switches must never expose the withdrawn public pricing page or its links.
export function pricingAvailable() {
  return process.env.NODE_ENV === "development";
}
