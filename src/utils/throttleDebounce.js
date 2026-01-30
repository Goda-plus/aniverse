/**
 * 防抖和节流工具函数
 * @author Aniverse
 */

import { onUnmounted } from 'vue'

/**
 * 防抖函数 - 延迟执行，直到停止触发后 n 毫秒后执行
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行一次
 * @returns {Function} 防抖后的函数
 */
export function debounce (func, wait = 300, immediate = false) {
  let timeout = null
  let result

  const debounced = function (...args) {
    const context = this

    if (timeout) clearTimeout(timeout)

    if (immediate) {
      // 立即执行
      const callNow = !timeout
      timeout = setTimeout(() => {
        timeout = null
      }, wait)
      if (callNow) {
        result = func.apply(context, args)
      }
    } else {
      // 非立即执行
      timeout = setTimeout(() => {
        func.apply(context, args)
      }, wait)
    }

    return result
  }

  debounced.cancel = function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

/**
 * 节流函数 - 在指定时间内只执行一次
 * @param {Function} func - 要节流的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {Object} options - 配置选项
 * @param {boolean} options.leading - 是否在开始时执行一次
 * @param {boolean} options.trailing - 是否在结束时执行一次
 * @returns {Function} 节流后的函数
 */
export function throttle (func, wait = 300, options = {}) {
  let timeout = null
  let previous = 0
  const { leading = true, trailing = true } = options

  const throttled = function (...args) {
    const context = this
    const now = Date.now()

    // 如果不需要前缘执行，且是第一次调用
    if (!leading && previous === 0) {
      previous = now
    }

    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      // 到达执行时间
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(context, args)
    } else if (!timeout && trailing) {
      // 设置延迟执行
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0
        timeout = null
        func.apply(context, args)
      }, remaining)
    }
  }

  throttled.cancel = function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    previous = 0
  }

  return throttled
}

/**
 * Vue 3 组合式 API 版本的防抖
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function useDebounce (func, wait = 300, immediate = false) {
  const debounced = debounce(func, wait, immediate)

  // 在组件卸载时清理
  if (typeof window !== 'undefined') {
    onUnmounted(() => {
      debounced.cancel()
    })
  }

  return debounced
}

/**
 * Vue 3 组合式 API 版本的节流
 * @param {Function} func - 要节流的函数
 * @param {number} wait - 等待时间
 * @param {Object} options - 配置选项
 * @returns {Function} 节流后的函数
 */
export function useThrottle (func, wait = 300, options = {}) {
  const throttled = throttle(func, wait, options)

  // 在组件卸载时清理
  if (typeof window !== 'undefined') {
    onUnmounted(() => {
      throttled.cancel()
    })
  }

  return throttled
}
