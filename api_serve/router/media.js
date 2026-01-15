const express = require('express')
const router = express.Router()
const mediaHandler = require('../router_handler/media')

// 获取媒体列表（支持分页、筛选、排序）
router.get('/list', mediaHandler.getMediaList)

// 获取媒体详情（包含关联信息）
router.get('/detail/:id', mediaHandler.getMediaDetail)

// 创建媒体
router.post('/create', mediaHandler.createMedia)

// 更新媒体
router.put('/update/:id', mediaHandler.updateMedia)

// 删除媒体
router.delete('/delete/:id', mediaHandler.deleteMedia)

// 搜索媒体
router.get('/search', mediaHandler.searchMedia)

// 获取媒体标签
router.get('/:id/tags', mediaHandler.getMediaTags)

// 添加媒体标签
router.post('/:id/tags', mediaHandler.addMediaTag)

// 删除媒体标签
router.delete('/:id/tags/:tagId', mediaHandler.removeMediaTag)

// 获取媒体类型
router.get('/:id/genres', mediaHandler.getMediaGenres)

// 添加媒体类型
router.post('/:id/genres', mediaHandler.addMediaGenre)

// 删除媒体类型
router.delete('/:id/genres/:genreId', mediaHandler.removeMediaGenre)

// 获取媒体角色
router.get('/:id/characters', mediaHandler.getMediaCharacters)

// 添加媒体角色
router.post('/:id/characters', mediaHandler.addMediaCharacter)

// 删除媒体角色
router.delete('/:id/characters/:characterId', mediaHandler.removeMediaCharacter)

// 获取媒体关系
router.get('/:id/relations', mediaHandler.getMediaRelations)

// 添加媒体关系
router.post('/:id/relations', mediaHandler.addMediaRelation)

// 删除媒体关系
router.delete('/:id/relations/:relationId', mediaHandler.removeMediaRelation)

// 获取媒体趋势
router.get('/:id/trends', mediaHandler.getMediaTrends)

// 获取媒体排名
router.get('/:id/rankings', mediaHandler.getMediaRankings)

// 获取同义词
router.get('/:id/synonyms', mediaHandler.getMediaSynonyms)

// 添加同义词
router.post('/:id/synonyms', mediaHandler.addMediaSynonym)

// 删除同义词
router.delete('/:id/synonyms/:synonymId', mediaHandler.removeMediaSynonym)

module.exports = router

