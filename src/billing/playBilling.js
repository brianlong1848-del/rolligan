// Google Play Billing for the Android app (port of gagorder-web/lib/playBilling.ts).
// The Play listing is a Trusted Web Activity (../rolligan-android) around this
// site, and Chrome exposes the Digital Goods API only to pages running inside
// that TWA with Play Billing enabled — so `window.getDigitalGoodsService` is the
// switch: hosting (and the Rolligan Pro purchase) exist only inside the app;
// every ordinary browser stays join-only.
//
// Rolligan has no server, so the entitlement is client-side: a successful
// purchase (or a restore via listPurchases) marks Pro in localStorage.

export const PLAY_PRO_PRODUCT_ID = 'com.clarendonlabs.rolligan.host'
export const PLAY_PRO_NAME = 'Rolligan Pro'
export const PLAY_PRO_FALLBACK_PRICE = '$2.99'
const PLAY_BILLING_METHOD = 'https://play.google.com/billing'

/** True only inside the Android TWA (Chrome exposes the API nowhere else). */
export function isPlayBillingAvailable() {
  return typeof window !== 'undefined'
    && typeof window.getDigitalGoodsService === 'function'
    && typeof PaymentRequest !== 'undefined'
}

async function playService() {
  if (!isPlayBillingAvailable()) throw new Error('Play Billing is not available here')
  return window.getDigitalGoodsService(PLAY_BILLING_METHOD)
}

/** Localized price from the Play listing (e.g. "$2.99"), or null if unknown. */
export async function getPlayProPrice() {
  try {
    const [item] = await (await playService()).getDetails([PLAY_PRO_PRODUCT_ID])
    if (!item) return null
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: item.price.currency })
      .format(Number(item.price.value))
  } catch {
    return null
  }
}

/** Restore: true when this Google account already owns Rolligan Pro. */
export async function restoreProFromPlay() {
  try {
    const owned = (await (await playService()).listPurchases())
      .some((p) => p.itemId === PLAY_PRO_PRODUCT_ID)
    return owned
  } catch {
    return false
  }
}

/**
 * Buy (or silently restore) Rolligan Pro through Google Play.
 * Resolves `{ ok: true, restored }` or `{ ok: false, reason, message }` with
 * reason one of 'unavailable' | 'cancelled' | 'error'.
 */
export async function buyProWithPlay() {
  if (!isPlayBillingAvailable()) return { ok: false, reason: 'unavailable' }

  // Already bought on this Google account (reinstall, new phone, cleared
  // storage)? Restore instead of asking Play to charge again.
  if (await restoreProFromPlay()) return { ok: true, restored: true }

  let response
  try {
    const request = new PaymentRequest(
      [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku: PLAY_PRO_PRODUCT_ID } }],
      // Play takes the price from the Console listing and ignores this total,
      // but the Payment Request API requires one.
      { total: { label: PLAY_PRO_NAME, amount: { currency: 'USD', value: '0' } } },
    )
    response = await request.show()
  } catch (e) {
    return { ok: false, reason: e?.name === 'AbortError' ? 'cancelled' : 'error', message: e?.message }
  }

  const token = response.details?.purchaseToken
  if (!token) {
    await response.complete('fail')
    return { ok: false, reason: 'error', message: 'Play returned no purchase token' }
  }
  // complete('success') lets the TWA's billing bridge acknowledge the
  // non-consumable purchase (unacknowledged purchases are refunded by Play).
  await response.complete('success')
  return { ok: true, restored: false }
}
