// The frontend on cdn.<domain> calls the API on api.<domain>, a different
// origin, so the browser only lets it through when CORS allows that origin.
// Unset means no cross-origin access at all.
export function parseCorsOrigins(value: string | undefined): string[] {
  if (value === undefined) return []

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '')
}
