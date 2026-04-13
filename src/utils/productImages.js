/**
 * 商品 cover_image：单 URL 字符串，或 JSON 数组字符串如 ["https://a","https://b"]
 */
export function parseProductImageUrls (coverImage) {
  if (coverImage == null || coverImage === '') return []
  if (Array.isArray(coverImage)) {
    return coverImage.filter((u) => typeof u === 'string' && u.trim())
  }
  if (typeof coverImage !== 'string') return []
  const s = coverImage.trim()
  if (!s) return []
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => typeof u === 'string' && u.trim())
      }
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()]
    } catch {
      return []
    }
    return []
  }
  return [s]
}

export function firstProductImageUrl (coverImage, fallback = '/placeholder.png') {
  const urls = parseProductImageUrls(coverImage)
  return urls[0] || fallback
}
