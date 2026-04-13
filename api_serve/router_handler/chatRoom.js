const {conMysql} = require('../db')
const SHOP_SERVICE_PREFIX = '__SHOP_SERVICE__:'
const CROWDFUNDING_SUPPORT_PREFIX = '__CROWDFUNDING_SUPPORT__:'

function normalizeScene (scene) {
  if (scene === 'shop_service') return 'shop_service'
  if (scene === 'crowdfunding_support') return 'crowdfunding_support'
  return 'friend'
}

function normalizeShopId (shopId) {
  const id = Number(shopId)
  return Number.isFinite(id) && id > 0 ? id : null
}

function normalizeProjectId (projectId) {
  const id = Number(projectId)
  return Number.isFinite(id) && id > 0 ? id : null
}

function buildShopServiceName (shopId, shopName) {
  const suffix = (shopName || '店铺客服').trim() || '店铺客服'
  return `${SHOP_SERVICE_PREFIX}${shopId}:${suffix}`
}

function buildCrowdfundingSupportRoomName (projectId, userIdA, userIdB) {
  const a = Number(userIdA)
  const b = Number(userIdB)
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return `${CROWDFUNDING_SUPPORT_PREFIX}${projectId}:${lo}:${hi}`
}

// 仅当“对方仍把我视为好友”时，允许我创建私聊
async function isAcceptedByPeer (userId, peerId) {
  const rows = await conMysql(
    `SELECT COUNT(*) AS count
     FROM friends
     WHERE user_id = ? AND friend_id = ? AND status = 'accepted'`,
    [peerId, userId]
  )
  return Number(rows?.[0]?.count || 0) > 0
}

// 创建私聊或群聊
exports.createRoom = async (req, res, next) => {
  const { memberIds = [], name, scene, shopId, shopName, projectId } = req.body        // memberIds: [id1,id2...]
  const userId = req.user.id
  const isGroup = memberIds.length > 1
  const roomScene = normalizeScene(scene)
  const normalizedShopId = normalizeShopId(shopId)
  const normalizedProjectId = normalizeProjectId(projectId)
  try {
    // 普通私聊必须是好友关系
    if (!isGroup && roomScene === 'friend') {
      const peerId = Number(memberIds[0])
      if (!Number.isFinite(peerId) || peerId <= 0) {
        return res.cc(false, 'memberIds 无效', 400)
      }
      if (peerId === Number(userId)) {
        return res.cc(false, '不能与自己创建私聊', 400)
      }
      const accepted = await isAcceptedByPeer(userId, peerId)
      if (!accepted) {
        return res.cc(false, '你已被对方删除，无法创建私聊', 403)
      }
    }

    // 私聊：检查是否已有
    if (!isGroup) {
      let room = null
      if (roomScene === 'shop_service') {
        if (!normalizedShopId) {
          return res.cc(false, 'shopId 不能为空', 400)
        }
        const [foundRoom] = await conMysql(
          `SELECT r.id
           FROM chat_rooms r
           JOIN chat_room_members m1 ON m1.room_id = r.id AND m1.user_id = ?
           JOIN chat_room_members m2 ON m2.room_id = r.id AND m2.user_id = ?
           WHERE r.is_group = 0
             AND r.name LIKE ?
           LIMIT 1`, [userId, memberIds[0], `${SHOP_SERVICE_PREFIX}${normalizedShopId}:%`]
        )
        room = foundRoom
      } else if (roomScene === 'crowdfunding_support') {
        if (!normalizedProjectId) {
          return res.cc(false, 'projectId 不能为空', 400)
        }
        const peerId = memberIds[0]
        const expectedName = buildCrowdfundingSupportRoomName(normalizedProjectId, userId, peerId)
        const [foundRoom] = await conMysql(
          `SELECT r.id
           FROM chat_rooms r
           JOIN chat_room_members m1 ON m1.room_id = r.id AND m1.user_id = ?
           JOIN chat_room_members m2 ON m2.room_id = r.id AND m2.user_id = ?
           WHERE r.is_group = 0 AND r.name = ?
           LIMIT 1`, [userId, peerId, expectedName]
        )
        room = foundRoom
      } else {
        const [foundRoom] = await conMysql(
          `SELECT r.id
           FROM chat_rooms r
           JOIN chat_room_members m1 ON m1.room_id = r.id AND m1.user_id = ?
           JOIN chat_room_members m2 ON m2.room_id = r.id AND m2.user_id = ?
           WHERE r.is_group = 0
             AND (r.name IS NULL OR (r.name NOT LIKE ? AND r.name NOT LIKE ?))
           LIMIT 1`, [userId, memberIds[0], `${SHOP_SERVICE_PREFIX}%`, `${CROWDFUNDING_SUPPORT_PREFIX}%`]
        )
        room = foundRoom
      }
      if (room) return res.cc(true, '已存在', 200, { roomId: room.id })
    }

    let roomName = name || null
    if (!isGroup && roomScene === 'shop_service') {
      if (!normalizedShopId) {
        return res.cc(false, 'shopId 不能为空', 400)
      }
      roomName = buildShopServiceName(normalizedShopId, shopName)
    }
    if (!isGroup && roomScene === 'crowdfunding_support') {
      if (!normalizedProjectId) {
        return res.cc(false, 'projectId 不能为空', 400)
      }
      roomName = buildCrowdfundingSupportRoomName(normalizedProjectId, userId, memberIds[0])
    }

    // 1. 新建房间
    const result = await conMysql(
      `INSERT INTO chat_rooms (is_group, name, created_by)
       VALUES (?,?,?)`, [isGroup, roomName, userId]
    )
    const roomId = result.insertId
    // 2. 插入成员（去重，避免当前用户在 memberIds 中重复导致 unique_member 冲突）
    const uid = Number(userId)
    const numericOthers = memberIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
    const memberUserIds = [
      ...new Set(
        [
          ...(Number.isFinite(uid) && uid > 0 ? [uid] : []),
          ...numericOthers
        ]
      )
    ]
    if (!memberUserIds.length) {
      return res.cc(false, '成员无效', 400)
    }
    await conMysql(
      `INSERT INTO chat_room_members (room_id, user_id)
       VALUES ${memberUserIds.map(() => '(?,?)').join(',')}`,
      memberUserIds.flatMap((id) => [roomId, id])
    )
    res.cc(true, '创建成功', 200, { roomId })
  } catch (e) { next(e) }
}

// 获取我参与的房间
exports.listRooms = async (req, res, next) => {
  const userId = req.user.id
  const scene = normalizeScene(req.query.scene)
  try {
    const whereSegments = ['m.user_id = ?']
    const params = [userId]

    if (scene === 'shop_service') {
      whereSegments.push('r.name LIKE ?')
      params.push(`${SHOP_SERVICE_PREFIX}%`)
    } else if (scene === 'crowdfunding_support') {
      whereSegments.push('r.name LIKE ?')
      params.push(`${CROWDFUNDING_SUPPORT_PREFIX}%`)
    } else {
      whereSegments.push(
        '(r.name IS NULL OR (r.name NOT LIKE ? AND r.name NOT LIKE ?))'
      )
      params.push(`${SHOP_SERVICE_PREFIX}%`, `${CROWDFUNDING_SUPPORT_PREFIX}%`)
    }

    const rows = await conMysql(
      `SELECT r.id, r.is_group, r.name, r.created_at
       FROM chat_rooms r
       JOIN chat_room_members m ON m.room_id = r.id
       WHERE ${whereSegments.join(' AND ')} ORDER BY r.created_at DESC`, params
    )
    
    const visibleRooms = []

    // 为每个房间获取成员信息和最后一条消息
    for (const room of rows) {
      // 获取房间成员
      const members = await conMysql(
        `SELECT u.id, u.username, u.avatar_url
         FROM chat_room_members m
         JOIN users u ON m.user_id = u.id
         WHERE m.room_id = ? AND u.id != ?`, [room.id, userId]
      )

      // friend 场景下，私聊必须有“对方成员”且对方仍把我视为 accepted；
      // 这样可以过滤掉删除好友后遗留的孤儿会话或不可发送消息的会话。
      if (scene === 'friend' && !room.is_group) {
        if (!members.length) {
          continue
        }
        const peerId = Number(members[0].id)
        const accepted = await isAcceptedByPeer(userId, peerId)
        if (!accepted) {
          continue
        }
      }

      room.members = members
      
      // 获取最后一条消息
      const [lastMsg] = await conMysql(
        `SELECT m.content, u.username, m.created_at, m.content_text
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.room_id = ?
         ORDER BY m.created_at DESC
         LIMIT 1`, [room.id]
      )
      if (lastMsg) {
        room.lastMessage = lastMsg
      }

      visibleRooms.push(room)
    }
    
    res.cc(true, '获取房间成功', 200, visibleRooms)
  } catch (e) { next(e) }
}
