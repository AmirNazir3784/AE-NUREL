import type { ComponentPropsWithRef } from "react";

// Page changes are normal document requests: browser loading, history and native
// link behavior work immediately, including before hydration. Fragment links and
// downloads keep their native semantics. Dirty editors intercept exits upstream.
export default function PageLink(props: ComponentPropsWithRef<"a">) {
  return <a {...props} />;
}
