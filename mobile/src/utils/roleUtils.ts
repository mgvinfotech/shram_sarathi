/**
 * Helper utilities for role checking across Sarthi Mobile App.
 * Handles primary roles as well as sub-provider roles (labour, karigar, driver, contractor).
 */

export function isProviderRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return ['provider', 'labour', 'karigar', 'driver', 'contractor', 'transport'].includes(r);
}

export function isAgentRole(role?: string | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === 'agent';
}

export function isCustomerRole(role?: string | null): boolean {
  if (!role) return true;
  return role.toLowerCase() === 'customer';
}
