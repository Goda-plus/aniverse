const mysql = require('mysql')
const db = {
  host: 'localhost', //本地都是localhost
  user: 'root', //账户名
  password: '123456', //密码
  port: '3306', //端口号
  database: 'aniverse', //数据库的名称
  charset: 'utf8mb4' //支持emoji等4字节UTF-8字符
}

function conMysql (sql, params) {
  //创建数据库连接
  let Myconnect = mysql.createConnection(db)
  //如果有参数传入，则使用params替换sql中的占位符
  if (params && params.length > 0) {
    sql = mysql.format(sql, params)
  }
  //因为query查询是一个异步操作，所以用promise来操作
  return new Promise((resolve, reject) => {
    //开始连接数据库
    Myconnect.connect(function (err) {
      if (err) {
        closeMysql(Myconnect)
        reject(err)
        return
      }
      // 显式设置连接字符集为 utf8mb4
      Myconnect.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci', (err) => {
        if (err) {
          closeMysql(Myconnect)
          reject(err)
          return
        }
        //query() 函数用于mysql语句查询
        Myconnect.query(sql, (err, result) => {
          if (err) {
            closeMysql(Myconnect)
            reject(err)
          } else {
            let res = JSON.parse(JSON.stringify(result))
            closeMysql(Myconnect)  //调用函数关闭mysql连接
            resolve(res)
          }
        })
      })
    })
  })

}

//关闭mysql数据库的函数
function closeMysql (Myconnect) {
  Myconnect.end((err) => {
    if (err) {
      console.log(`mysql关闭失败:${err}!`)
    } 
  })
}

//导出conMysql函数
exports.conMysql = conMysql
