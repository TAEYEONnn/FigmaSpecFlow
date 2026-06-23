/**
 * Environment utilities — Payload CMS version.
 *
 * Supabase references are kept as stubs so that any leftover imports
 * from copied UI code continue to compile without errors.
 */

type Environment = Record<string, string | undefined>;

export type SupabaseEnvState = "complete" | "none" | "partial";

export class SupabaseConfigurationError extends Error {
  constructor(public readonly missingNames: readonly string[]) {
    super(`Supabase is not used in this project (Payload CMS).`);
    this.name = "SupabaseConfigurationError";
  }
}

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

/** Always returns "none" — Supabase is not used. */
export function getSupabaseEnvState(
  _env: Environment = process.env,
): SupabaseEnvState {
  return "none";
}

export function supabaseConfigurationError() {
  return new SupabaseConfigurationError([]);
}

export function requireCompleteSupabaseEnv() {
  // no-op in Payload mode
}

export const hasSupabaseEnv = false;

/** Demo mode: always false in Payload — auth is handled by Payload. */
export const isDevelopmentDemo = false;

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!hasValue(value)) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }
  return value!;
}
