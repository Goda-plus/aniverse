const { conMysql } = require('./db/index')

async function checkUsers() {
  try {
    console.log('检查用户表...')

    const users = await conMysql('SELECT id, username, nickname FROM users LIMIT 5')
    console.log('现有用户:', users)

    if (users.length > 0) {
      console.log('使用第一个用户ID创建测试数据...')

      // 更新测试数据脚本使用实际的用户ID
      const testDataScript = require('./insert_test_data')
      // 这里可以动态修改脚本中的用户ID
    }

  } catch (error) {
    console.error('检查用户失败:', error)
  }
}

checkUsers()
