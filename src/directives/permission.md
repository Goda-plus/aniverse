# 后台权限自定义指令说明

本文说明 Vue 3 后台管理端使用的 `v-permission`（权限码）与 `v-role`（角色名）指令：数据来源、用法、行为约定及注意事项。

## 依赖与注册

- **状态**：`@/stores/back/admin`（Pinia），登录或 `fetchCurrentAdmin` 后包含当前管理员的 `permissions`、`role_name` 等字段。
- **注册**：在 `main.js` 中于 `app.use(pinia)` 之后调用 `installPermissionDirectives(app)`，全局注册 `v-permission` 与 `v-role`。

## 数据从哪来

| 概念 | 说明 |
|------|------|
| 权限码 | 与数据库表 `admin_roles` 中 `permissions` 字段（JSON 数组）里的字符串一致，例如 `user.read`、`post.review`、`order.ship`。 |
| 当前权限列表 | 登录接口将角色权限解析为数组后写入 `admin.permissions`，前端通过 `useAdminStore().permissions` 与 `hasPermission(code)` 使用。 |
| 当前角色名 | `admin.role_name`，与 `admin_roles.name` 一致，例如 `超级管理员`、`内容运营管理员`。 |

## `v-permission`：按权限码控制显示

无权限时通过 `display: none` 隐藏元素，**不**从 DOM 中移除，便于权限更新后 `updated` 钩子能再次显示。

### 写法

| 形式 | 含义 |
|------|------|
| `v-permission="'order.read'"` | 拥有 `order.read` 才显示。 |
| `v-permission="['order.read', 'order.ship']"` | **任一**权限满足即显示（逻辑 OR，默认 `mode: 'any'`）。 |
| `v-permission="{ permissions: ['a', 'b'], mode: 'all' }"` | **全部**权限都满足才显示（逻辑 AND）。 |

### 空值约定

- 若解析后**没有任何权限码**（空字符串、空数组等），视为**不限制**，元素始终显示。

### 示例

```vue
<el-button v-permission="'post.review'">审核</el-button>
<el-button v-permission="['order.read', 'order.ship']">订单相关</el-button>
<el-button v-permission="{ permissions: ['user.read', 'user.manage'], mode: 'all' }">
  需同时具备两项权限
</el-button>
```

## `v-role`：按角色名控制显示

与 `v-permission` 相同的隐藏方式（`display: none`）。

### 写法

| 形式 | 含义 |
|------|------|
| `v-role="'超级管理员'"` | 仅当前 `role_name` 为该值时显示。 |
| `v-role="['超级管理员', '电商运营管理员']"` | 当前角色名为列表中**任意一个**即显示。 |

### 空值约定

- 若未传入有效角色名列表，视为**不限制**，元素始终显示。

### 示例

```vue
<el-button v-role="'超级管理员'">仅超管可见</el-button>
<el-button v-role="['超级管理员', '内容运营管理员']">内容或超管</el-button>
```

## 与脚本逻辑配合

在 `<script setup>` 中如需相同判断，可直接使用 store：

```js
import { useAdminStore } from '@/stores/back/admin'

const adminStore = useAdminStore()
const canReview = () => adminStore.hasPermission('post.review')
```

指令与 `hasPermission` / `roleName` 使用同一套数据，保持一致即可。

## 常见问题

1. **配置了指令仍不显示**  
   检查当前账号的 `permissions` 是否包含对应字符串；若角色在库里 `permissions` 为 `null` 或 `[]`，则所有 `v-permission` 都会判定为无权限。

2. **`v-role` 不生效**  
   确认 `admin.role_name` 与数据库 `admin_roles.name` 完全一致（含中英文、空格）。

3. **权限变更后界面**  
   调用 `fetchCurrentAdmin()` 更新 store 后，指令的 `updated` 会重新计算，无需整页刷新。

4. **与路由守卫**  
   指令只控制**界面元素显隐**，不能替代接口鉴权；后端接口仍需校验 JWT 与权限。

## 相关文件

| 文件 | 作用 |
|------|------|
| `src/directives/permission.js` | 指令实现与 `installPermissionDirectives` |
| `src/main.js` | 注册指令 |
| `src/stores/back/admin.js` | `permissions`、`roleName`、`hasPermission` |
