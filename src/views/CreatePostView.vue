<template>
  <MainContentLayout>
    <template #content>
      <CreatePost ref="createPostRef" @success="handleSuccess" @cancel="handleCancel" />
    </template>
    <template #sidebar>
      <DraftSidebar ref="draftSidebarRef" @load-draft="handleLoadDraft" />
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import CreatePost from '@/components/CreatePost.vue'
  import DraftSidebar from '@/components/DraftSidebar.vue'

  const router = useRouter()
  const createPostRef = ref(null)
  const draftSidebarRef = ref(null)

  const handleSuccess = (post) => {
    // 帖子创建成功后，可以跳转到帖子详情页或返回列表页
    if (post && post.id) {
      router.push(`/post/${post.id}`)
    } else {
      router.push('/all')
    }
    // 刷新草稿列表
    if (draftSidebarRef.value) {
      draftSidebarRef.value.loadDrafts()
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const handleLoadDraft = (draft) => {
    // 将草稿加载事件传递给 CreatePost 组件
    if (createPostRef.value && createPostRef.value.loadDraft) {
      createPostRef.value.loadDraft(draft)
    }
  }
</script>

<style scoped>
/* 样式已在 CreatePost 组件中定义 */
</style>



