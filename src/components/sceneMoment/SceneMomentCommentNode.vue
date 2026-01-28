<template>
  <div class="comment">
    <div class="comment-main">
      <div class="comment-author">
        {{ node.username || '匿名' }}
      </div>
      <div class="comment-content">
        {{ node.content }}
      </div>
      <div class="comment-actions">
        <el-button text size="small" @click="replyOpen = !replyOpen">
          回复
        </el-button>
      </div>
    </div>

    <div v-if="replyOpen" class="reply">
      <el-input v-model="replyText" type="textarea" :rows="2" placeholder="回复…" />
      <div class="reply-actions">
        <el-button size="small" @click="replyOpen=false">
          取消
        </el-button>
        <el-button type="primary" size="small" @click="send">
          发送
        </el-button>
      </div>
    </div>

    <div v-if="node.replies && node.replies.length" class="replies">
      <SceneMomentCommentNode
        v-for="r in node.replies"
        :key="r.id"
        :node="r"
        @reply="$emit('reply', $event)"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref ,defineProps, defineEmits,defineOptions} from 'vue'

  defineOptions({ name: 'SceneMomentCommentNode' })

  const props = defineProps({
    node: { type: Object, required: true }
  })
  const emit = defineEmits(['reply'])

  const replyOpen = ref(false)
  const replyText = ref('')

  const send = () => {
    const text = replyText.value.trim()
    if (!text) return
    emit('reply', { content: text, parent_id: props.node.id })
    replyText.value = ''
    replyOpen.value = false
  }
</script>

<style scoped>
.comment {
  padding: 10px 0;
  border-top: 1px solid rgba(31, 41, 55, 0.9);
}

.comment-author {
  font-size: 12px;
  font-weight: 700;
}

.comment-content {
  margin-top: 4px;
  color: rgba(229, 231, 235, 0.9);
  line-height: 1.6;
}

.replies {
  margin-left: 12px;
  padding-left: 12px;
  border-left: 2px solid rgba(31, 41, 55, 0.9);
}

.reply {
  margin-top: 8px;
}

.reply-actions {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>


