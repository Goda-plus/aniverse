<template>
  <MainContentLayout>
    <template #content>
      <CreatePost @success="handleSuccess" @cancel="handleCancel" />
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { useRouter } from 'vue-router'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import CreatePost from '@/components/CreatePost.vue'

  const router = useRouter()

  const handleSuccess = (post) => {
    // 帖子创建成功后，可以跳转到帖子详情页或返回列表页
    if (post && post.id) {
      router.push(`/post/${post.id}`)
    } else {
      router.push('/all')
    }
  }

  const handleCancel = () => {
    router.back()
  }
</script>

<style scoped>
/* 样式已在 CreatePost 组件中定义 */
</style>



