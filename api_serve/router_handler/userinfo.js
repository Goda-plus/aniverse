const { conMysql } = require("../db/index");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");

// 获取用户信息
exports.getUserInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const sql = `SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE id = ?`;
    const result = await conMysql(sql, [userId]);

    if (result.length === 0) {
      return res.cc(false, "用户不存在", 404);
    }

    res.cc(true, "获取用户信息成功", 200, result[0]);
  } catch (err) {
    next(err);
  }
};

// 更新用户信息
exports.updateUserInfo = async (req, res, next) => {
  try {
    const { email, avatar_url, bio } = req.query;
    const userId = req.user.id;

    const sql = `UPDATE users SET email = ?, avatar_url = ?, bio = ? WHERE id = ?`;
    const result = await conMysql(sql, [email, avatar_url, bio, userId]);

    if (result.affectedRows !== 1) {
      return res.cc(false, "更新用户信息失败", 400);
    }

    // 更新成功后重新签发 token
    const [newUser] = await conMysql(`SELECT * FROM users WHERE id = ?`, [userId]);
    const { password_hash, ...userInfo } = newUser;

    const tokenStr = "Bearer " + jwt.sign(userInfo, config.jwtSecretKey, {
      expiresIn: config.expiresIn,
    });

    res.cc(true, "更新用户信息成功", 200, userInfo, tokenStr);
  } catch (error) {
    next(error);
  }
};

// 更新密码
exports.updatePassword = async (req, res, next) => {
  try {
    const { oldPwd, newPwd } = req.query;
    const userId = req.user.id;

    // 查询用户信息
    const sql = `SELECT * FROM users WHERE id = ?`;
    const result = await conMysql(sql, [userId]);

    if (result.length === 0) {
      return res.cc(false, "用户不存在", 404);
    }

    const user = result[0];
    const isPasswordValid = bcrypt.compareSync(oldPwd, user.password_hash);

    if (!isPasswordValid) {
      return res.cc(false, "旧密码错误", 401);
    }

    // 加密新密码并更新
    const newHash = bcrypt.hashSync(newPwd, 10);
    const updateSql = `UPDATE users SET password_hash = ? WHERE id = ?`;
    const updateResult = await conMysql(updateSql, [newHash, userId]);

    if (updateResult.affectedRows !== 1) {
      return res.cc(false, "更新密码失败", 400);
    }

    res.cc(true, "更新密码成功", 200);
  } catch (error) {
    next(error);
  }
};

// 新增：只更新用户头像
exports.updateAvatar = async (req, res, next) => {
  try {
    const { avatar_url } = req.body;
    const userId = req.user.id;
    if (!avatar_url) {
      return res.cc(false, "头像链接不能为空", 400);
    }
    const sql = `UPDATE users SET avatar_url = ? WHERE id = ?`;
    const result = await conMysql(sql, [avatar_url, userId]);
    if (result.affectedRows !== 1) {
      return res.cc(false, "更新头像失败", 400);
    }
    // 查询新头像
    const [user] = await conMysql(`SELECT avatar_url FROM users WHERE id = ?`, [userId]);
    res.cc(true, "头像更新成功", 200, { avatar_url: user.avatar_url });
  } catch (error) {
    next(error);
  }
};
