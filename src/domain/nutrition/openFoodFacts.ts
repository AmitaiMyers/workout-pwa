/**
 * Open Food Facts (https://world.openfoodfacts.org): crowd-sourced product data under the ODbL.
 * The app must credit it wherever its data is shown and stay within its rate limits.
 */
import type { Food, Macros, Serving } from './foodTypes';

export const OFF_ATTRIBUTION = 'Product data © Open Food Facts contributors (ODbL)';
const BASE_URL = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_en,product_name_he,brands,nutriments,serving_size,serving_quantity';
/** Stay safely under Open Food Facts' published per-minute limits for read requests. */
const MAX_REQUESTS_PER_MINUTE = 10;
const KJ_PER_KCAL = 4.184;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export type OffParseResult =
  | { kind: 'food'; food: Food }
  /** The product exists but lacks calories or a macro, so it can't be logged as-is. */
  | { kind: 'incomplete'; barcode: string; name: string | null; brand: string | null };

/** Convert one Open Food Facts product record into a Food (per 100 g). */
export function parseOffProduct(raw: unknown): OffParseResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Open Food Facts returned a product that is not an object');
  }
  const product = raw as Record<string, unknown>;
  const barcode = text(product.code);
  if (barcode === null) {
    throw new Error('Open Food Facts returned a product without a barcode');
  }
  const name = text(product.product_name) ?? text(product.product_name_en) ?? text(product.product_name_he);
  const brand = text(product.brands)?.split(',')[0]?.trim() ?? null;
  const nutriments = (typeof product.nutriments === 'object' && product.nutriments !== null ? product.nutriments : {}) as Record<string, unknown>;
  const kcalFromKj = number(nutriments['energy_100g']);
  const kcal = number(nutriments['energy-kcal_100g']) ?? (kcalFromKj === null ? null : kcalFromKj / KJ_PER_KCAL);
  const protein = number(nutriments['proteins_100g']);
  const carbs = number(nutriments['carbohydrates_100g']);
  const fat = number(nutriments['fat_100g']);
  if (name === null || kcal === null || protein === null || carbs === null || fat === null) {
    return { kind: 'incomplete', barcode, name, brand };
  }
  const per100: Macros = { kcal, protein, carbs, fat };
  const servingGrams = number(product.serving_quantity);
  const servingLabel = text(product.serving_size);
  const servings: Serving[] = servingGrams !== null && servingGrams > 0 ? [{ label: `1 serving${servingLabel === null ? '' : ` (${servingLabel})`}`, grams: servingGrams }] : [];
  return {
    kind: 'food',
    food: { id: `off:${barcode}`, source: 'off', name, nameHe: text(product.product_name_he), brand, barcode, per100, servings },
  };
}

// ---------- network ----------

export type OffError = { kind: 'offline' } | { kind: 'rate-limited'; retryInSec: number } | { kind: 'failed'; message: string };

const recentRequests: number[] = [];

/** Sliding one-minute window shared by searches and barcode lookups. */
function takeRequestSlot(now: number): OffError | null {
  while (recentRequests.length > 0 && now - (recentRequests[0] ?? 0) > 60_000) {
    recentRequests.shift();
  }
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return { kind: 'rate-limited', retryInSec: Math.ceil((60_000 - (now - (recentRequests[0] ?? now))) / 1000) };
  }
  recentRequests.push(now);
  return null;
}

/**
 * Fetch JSON from Open Food Facts. Network trouble is an expected condition at the gym, so it is
 * returned as a value the UI can show rather than thrown.
 */
async function getJson(url: string): Promise<{ ok: true; body: unknown } | { ok: false; error: OffError }> {
  if (!navigator.onLine) {
    return { ok: false, error: { kind: 'offline' } };
  }
  const blocked = takeRequestSlot(Date.now());
  if (blocked !== null) {
    return { ok: false, error: blocked };
  }
  return fetch(url, { headers: { Accept: 'application/json' } }).then(
    async (response) => {
      if (response.status === 429 || response.status === 503) {
        return { ok: false as const, error: { kind: 'rate-limited' as const, retryInSec: 60 } };
      }
      if (!response.ok) {
        return { ok: false as const, error: { kind: 'failed' as const, message: `Open Food Facts answered ${response.status}` } };
      }
      return { ok: true as const, body: (await response.json()) as unknown };
    },
    (reason: unknown) => ({ ok: false as const, error: { kind: 'failed' as const, message: reason instanceof Error ? reason.message : 'Network error' } }),
  );
}

export type OffSearchResult = { ok: true; foods: Food[] } | { ok: false; error: OffError };

export async function searchOpenFoodFacts(query: string): Promise<OffSearchResult> {
  const params = new URLSearchParams({ search_terms: query, search_simple: '1', action: 'process', json: '1', page_size: '24', fields: FIELDS });
  const result = await getJson(`${BASE_URL}/cgi/search.pl?${params.toString()}`);
  if (!result.ok) {
    return result;
  }
  const products = (result.body as { products?: unknown }).products;
  if (!Array.isArray(products)) {
    return { ok: false, error: { kind: 'failed', message: 'Unexpected search response' } };
  }
  const foods = products
    .filter((product) => typeof product === 'object' && product !== null && text((product as Record<string, unknown>).code) !== null)
    .map(parseOffProduct)
    .flatMap((parsed) => (parsed.kind === 'food' ? [parsed.food] : []));
  return { ok: true, foods };
}

export type OffBarcodeResult =
  | { ok: true; found: OffParseResult }
  | { ok: true; found: null }
  | { ok: false; error: OffError };

export async function lookupBarcode(barcode: string): Promise<OffBarcodeResult> {
  const result = await getJson(`${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`);
  if (!result.ok) {
    return result;
  }
  const body = result.body as { status?: unknown; product?: unknown };
  if (body.status !== 1 || body.product === undefined) {
    return { ok: true, found: null };
  }
  return { ok: true, found: parseOffProduct({ code: barcode, ...(body.product as object) }) };
}

export function describeOffError(error: OffError): string {
  switch (error.kind) {
    case 'offline':
      return "You're offline. Online search needs a connection; built-in and your own foods still work.";
    case 'rate-limited':
      return `Too many online lookups in a minute. Try again in ${error.retryInSec}s.`;
    case 'failed':
      return `Couldn't reach Open Food Facts (${error.message}).`;
  }
}
