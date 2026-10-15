export type AuthView = "login" | "signup" | "recovery";
export type AuthField = "name" | "email" | "password" | "confirmation";
export type AuthValues = Record<AuthField, string>;
export type AuthErrors = Partial<Record<AuthField, string>>;

// Frontend preview only. The eventual auth library must validate again on the server.
export function validateAuthPreview(view: AuthView, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};
  if (view === "signup" && !values.name.trim()) errors.name = "Enter your name.";
  else if (view === "signup" && values.name.trim().length > 80) errors.name = "Use 80 characters or fewer.";
  const email = values.email.trim();
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) errors.email = "Enter a valid email address, such as name@example.com.";
  if (view !== "recovery") {
    if (!values.password) errors.password = "Enter your password.";
    else if (view === "signup" && values.password.length < 12) errors.password = "Use at least 12 characters.";
    else if (values.password.length > 128) errors.password = "Use 128 characters or fewer.";
  }
  if (view === "signup") {
    if (!values.confirmation) errors.confirmation = "Confirm your password.";
    else if (values.password !== values.confirmation) errors.confirmation = "Your passwords don’t match.";
  }
  return errors;
}
