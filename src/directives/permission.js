import { useAdminStore } from '@/stores/back/admin'

/**
 * 将指令取值规范为字符串数组
 * @param {string|string[]|{ permissions: string|string[], mode?: 'any'|'all' }} value
 */
function normalizePermissionInput (value) {
  if (value == null) {
    return { list: [], mode: 'any' }
  }
  if (typeof value === 'object' && !Array.isArray(value) && 'permissions' in value) {
    const raw = value.permissions
    const list = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : []
    const mode = value.mode === 'all' ? 'all' : 'any'
    return { list, mode }
  }
  const list = Array.isArray(value) ? value : value !== '' ? [value] : []
  return { list, mode: 'any' }
}

function normalizeRoleInput (value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function setAllowed (el, allowed) {
  if (allowed) {
    if (el.__permHidden) {
      el.style.display = el.__permPrevDisplay ?? ''
      delete el.__permPrevDisplay
      el.__permHidden = false
    }
  } else {
    if (!el.__permHidden) {
      el.__permPrevDisplay = el.style.display
      el.style.display = 'none'
      el.__permHidden = true
    }
  }
}

/**
 * 权限码：与 admin_roles.permissions 中的字符串一致（如 user.read、post.review）。
 * - 字符串：v-permission="'order.read'"
 * - 数组（任一满足即可）：v-permission="['order.read','order.ship']"
 * - 全部满足：v-permission="{ permissions: ['a','b'], mode: 'all' }"
 */
function checkPermission (binding) {
  const { list, mode } = normalizePermissionInput(binding.value)

  if (list.length === 0) {
    return true
  }

  const adminStore = useAdminStore()

  if (mode === 'all') {
    return list.every((p) => adminStore.hasPermission(p))
  }
  return list.some((p) => adminStore.hasPermission(p))
}

/**
 * 角色名：与 admin_roles.name 一致（如 超级管理员、内容运营管理员）。
 * - v-role="'超级管理员'"
 * - v-role="['超级管理员','电商运营管理员']"
 */
function checkRole (binding) {
  const names = normalizeRoleInput(binding.value)
  if (names.length === 0) {
    return true
  }
  const adminStore = useAdminStore()
  const current = adminStore.roleName
  return names.some((n) => n === current)
}

export const permissionDirective = {
  mounted (el, binding) {
    setAllowed(el, checkPermission(binding))
  },
  updated (el, binding) {
    setAllowed(el, checkPermission(binding))
  }
}

export const roleDirective = {
  mounted (el, binding) {
    setAllowed(el, checkRole(binding))
  },
  updated (el, binding) {
    setAllowed(el, checkRole(binding))
  }
}

export function installPermissionDirectives (app) {
  app.directive('permission', permissionDirective)
  app.directive('role', roleDirective)
}
