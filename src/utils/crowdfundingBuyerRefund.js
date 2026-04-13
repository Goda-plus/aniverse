/** 与 api_serve/router_handler/crowdfunding.js 中 canonicalBackingShippingStatus 对齐 */

export function normalizeBackingShip (raw) {
  if (raw == null || raw === '') return 'pending'
  const t = String(raw).trim().toLowerCase()
  if (t === 'not_shipped') return 'pending'
  return t
}

/** 已支付或待支付均可发起售后；已取消/已退款不可 */
export function backingAllowsBuyerRefundUi (b) {
  const st = b?.status
  if (st == null || st === '') return true
  const s = String(st).toLowerCase()
  if (s === 'cancelled' || s === 'refunded') return false
  return s === 'paid' || s === 'pending'
}

export function buyerRefundCode (b) {
  const r = b?.buyer_refund_request
  if (r == null || r === '' || r === 'none') return null
  return String(r).trim()
}

export function canBuyerRefundOnly (b) {
  return (
    backingAllowsBuyerRefundUi(b) &&
    !buyerRefundCode(b) &&
    normalizeBackingShip(b?.shipping_status) === 'pending'
  )
}

export function canBuyerRefundReturn (b) {
  return (
    backingAllowsBuyerRefundUi(b) &&
    !buyerRefundCode(b) &&
    ['shipped', 'delivered', 'completed'].includes(normalizeBackingShip(b?.shipping_status))
  )
}
