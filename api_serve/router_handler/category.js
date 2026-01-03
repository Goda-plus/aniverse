const { conMysql } = require("../db/index");

// 创建分类
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.query;
    console.log("参数",req.query)
    // 检查名称唯一
    const checkSql = `SELECT * FROM categories WHERE name = ?`;
    const exists = await conMysql(checkSql, [name]);
    if (exists.length > 0) {
      return res.cc(false, "分类名已存在", 409);
    }

    const insertSql = `INSERT INTO categories (name, description) VALUES (?, ?)`;
    const result = await conMysql(insertSql, [name, description || null]);

    if (result.affectedRows !== 1) {
      throw new Error("创建分类失败");
    }

    res.cc(true, "分类创建成功", 201);
  } catch (err) {
    next(err);
  }
};

// 获取所有分类
exports.getAllCategories = async (req, res, next) => {
  try {
    const sql = `SELECT * FROM categories ORDER BY created_at DESC`;
    const categories = await conMysql(sql);
    res.cc(true, "获取分类列表成功", 200, categories);
  } catch (err) {
    next(err);
  }
};
