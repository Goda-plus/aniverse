<template>
  <div class="page">
    <div class="section-title">
      同好匹配
    </div>
    <p class="meta-text">
      基于兴趣标签与行为相似度的推荐示例，点击可一键关注（前端演示）。
    </p>

    <el-row :gutter="16">
      <el-col :md="16" :xs="24">
        <div class="card list">
          <div v-for="item in store.matches" :key="item.id" class="match">
            <div class="left">
              <el-avatar :src="item.avatar" size="large" />
              <div>
                <div class="name">
                  {{ item.name }}
                </div>
                <div class="meta-text">
                  {{ item.reason }}
                </div>
              </div>
            </div>
            <div class="right">
              <el-tag type="success">
                {{ (item.similarity * 100).toFixed(0) }}%
              </el-tag>
              <el-button type="primary" round size="small">
                关注
              </el-button>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :md="8" :xs="24">
        <div class="card side">
          <div class="section-title">
            我的兴趣画像
          </div>
          <el-tag v-for="tag in store.user.interests" :key="tag" class="tag" type="info">
            {{ tag }}
          </el-tag>
          <el-divider />
          <p class="meta-text">
            匹配逻辑：静态标签 + 浏览/收藏/点赞等动态行为加权，示例为固定数据。
          </p>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
  import { useDataStore } from '@/stores/data'

  const store = useDataStore()
</script>

<style scoped>
.page {
  padding: 12px 18px 32px;
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.list {
  padding: 14px;
}

.match {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 10px;
  transition: border-color 0.3s ease;
}

.left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.name {
  font-weight: 700;
}

.right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.side {
  padding: 14px;
}

.tag {
  margin: 4px 4px 0 0;
}
</style>



