export const DEFAULT_POLICIES_VERSION = '2025-01-01';
// year month day
export const CURRENT_POLICIES_VERSION =
  import.meta.env.VITE_POLICIES_VERSION?.trim() || DEFAULT_POLICIES_VERSION;

export const PRIVACY_ROUTE = '/privacy';
export const TERMS_ROUTE = '/terms';
