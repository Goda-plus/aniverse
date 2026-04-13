/**
 * 修复仅有订单总额、但缺失 order_items 明细的历史数据（用于单价唯一可推断的单商品订单）。
 * 用法: node repair_order_line_items.js
 */
const { conMysql } = require('./db/index')

async function main() {
  const orphans = await conMysql(`
    SELECT o.id, o.order_number, o.total_amount
    FROM orders o
    WHERE o.total_amount > 0
      AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
  `)
  let fixed = 0
  for (const o of orphans) {
    const total = Number(o.total_amount)
    if (!Number.isFinite(total) || total <= 0) continue
    const match = await conMysql(
      'SELECT id, price FROM products WHERE price = ?',
      [total]
    )
    if (match.length !== 1) {
      console.log(`跳过 ${o.order_number}: 无唯一匹配商品单价 (= ${total})`)
      continue
    }
    const pid = match[0].id
    const price = Number(match[0].price)
    await conMysql(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
       VALUES (?, ?, 1, ?, ?)`,
      [o.id, pid, price, total]
    )
    console.log(`已补全 ${o.order_number} -> product_id=${pid}`)
    fixed++
  }
  console.log(`完成，补全 ${fixed} 条订单明细`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
