import type { ComponentPropsWithRef } from "react";
import Link from "./page-link";
import { pricingAvailable } from "@/lib/pricing-visibility";

export function PricingLink(props: ComponentPropsWithRef<"a">) {
  return pricingAvailable() ? <Link {...props} /> : null;
}
