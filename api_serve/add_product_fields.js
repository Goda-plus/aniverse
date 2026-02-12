const { conMysql } = require('./db/index')

async function addProductFields() {
  try {
    console.log('开始为products表添加新字段...')

    const fields = [
      'ADD COLUMN shop_id INT COMMENT "所属店铺ID"',
      'ADD COLUMN specifications JSON COMMENT "商品规格信息（JSON格式）"',
      'ADD COLUMN material VARCHAR(200) COMMENT "材质说明"',
      'ADD COLUMN weight DECIMAL(8,3) COMMENT "商品重量（kg）"',
      'ADD COLUMN dimensions VARCHAR(100) COMMENT "商品尺寸"',
      'ADD COLUMN tags VARCHAR(500) COMMENT "商品标签（逗号分隔）"',
      'ADD COLUMN is_featured BOOLEAN DEFAULT FALSE COMMENT "是否推荐商品"'
    ]

    for (const field of fields) {
      try {
        const sql = `ALTER TABLE products ${field}`
        await conMysql(sql)
        console.log(`✅ 添加字段成功: ${field.split(' ')[2]}`)
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  字段已存在: ${field.split(' ')[2]}`)
        } else {
          console.error(`❌ 添加字段失败 ${field.split(' ')[2]}:`, error.message)
        }
      }
    }

    console.log('字段添加完成！')

  } catch (error) {
    console.error('操作失败:', error)
  }
}

addProductFields()
