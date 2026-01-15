import { onMounted, onUnmounted } from 'vue'

/**
 * 简单的窗口滚动分页工具
 * 在页面接近底部时调用 loadMore()
 *
 * @param {Object} options
 * @param {Function} options.loadMore - 触发加载更多的函数
 * @param {Function} options.canLoadMore - 返回布尔值，是否允许继续加载（例如还有下一页、当前不在加载中）
 * @param {number} [options.offset=300] - 距离底部多少像素以内触发加载
 */
export function useScrollPagination ({ loadMore, canLoadMore, offset = 300 }) {
  const handleScroll = () => {
    if (typeof canLoadMore === 'function' && !canLoadMore()) return

    const scrollTop = window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    const clientHeight = document.documentElement.clientHeight || window.innerHeight
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight

    // 接近底部时触发
    if (scrollTop + clientHeight + offset >= scrollHeight) {
      if (typeof loadMore === 'function') {
        loadMore()
      }
    }
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
}


