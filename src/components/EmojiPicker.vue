<template>
  <div
    v-if="visible"
    class="emoji-picker"
    tabindex="0"
    @click.stop
    @keydown="handleKeydown"
  >
    <div class="emoji-grid">
      <span
        v-for="(emoji, index) in emojiList"
        :key="emoji"
        :class="['emoji-item', { selected: index === selectedIndex }]"
        @click="selectEmoji(emoji)"
        @mouseenter="selectedIndex = index"
      >
        {{ emoji }}
      </span>
    </div>
  </div>
</template>

<script setup>
  import { ref, defineEmits, defineProps, defineExpose } from 'vue'

  // eslint-disable-next-line no-undef
  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    }
  })

  // eslint-disable-next-line no-undef
  const emit = defineEmits(['select', 'close'])

  // 表情符列表
  const emojiList = [
    // 面部表情 - 第一行
    '😀', '😂', '🥰', '😍', '🤔', '😉', '😎', '😢', '😭', '😤',
    // 面部表情 - 第二行
    '😴', '😪', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵',
    // 面部表情 - 第三行
    '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😏', '😒', '😞', '😔',
    // 面部表情 - 第四行
    '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢',
    // 面部表情 - 第五行
    '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱',

    // 手势和动作 - 第六行
    '👍', '👎', '👌', '✌️', '🤞', '👏', '🙏', '🤝', '👋', '🤚',
    // 手势和动作 - 第七行
    '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
    // 手势和动作 - 第八行
    '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋',

    // 爱心和情感 - 第九行
    '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥',
    // 爱心和情感 - 第十行
    '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',

    // 动物 - 第十一行
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    // 动物 - 第十二行
    '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
    // 动物 - 第十三行
    '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',

    // 食物 - 第十四行
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
    // 食物 - 第十五行
    '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
    // 食物 - 第十六行
    '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠',

    // 饮料 - 第十七行
    '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🥤',
    // 饮料 - 第十八行
    '🧋', '🧃', '🥢', '🍽️', '🍴', '🥄', '🔪', '🫙', '🍶', '🍵',

    // 活动和体育 - 第十九行
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀',
    // 活动和体育 - 第二十行
    '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁',
    // 活动和体育 - 第二十一行
    '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌',

    // 交通工具 - 第二十二行
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
    // 交通工具 - 第二十三行
    '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🚁', '🚟', '🚠',

    // 天空和天气 - 第二十四行
    '☀️', '🌤️', '⛅', '☁️', '🌧️', '⛈️', '🌩️', '🌨️', '☃️', '⛄',
    // 天空和天气 - 第二十五行
    '🌬️', '💨', '🌪️', '🌫️', '🌈', '☂️', '🪂', '⚡', '❄️', '🔥',

    // 符号和物体 - 第二十六行
    '💯', '🔥', '⭐', '✨', '💫', '🌟', '🎉', '🎊', '🎈', '🎁',
    // 符号和物体 - 第二十七行
    '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎀', '🎞️',
    // 符号和物体 - 第二十八行
    '🎪', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁'
  ]

  const selectedIndex = ref(-1)

  // 选择表情符
  function selectEmoji (emoji) {
    emit('select', emoji)
  }

  // 处理键盘事件
  function handleKeydown (event) {
    const cols = 10 // 每行10个表情符
    const total = emojiList.length

    switch (event.key) {
      case 'ArrowRight':
        selectedIndex.value = Math.min(selectedIndex.value + 1, total - 1)
        event.preventDefault()
        break
      case 'ArrowLeft':
        selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
        event.preventDefault()
        break
      case 'ArrowDown':
        selectedIndex.value = Math.min(selectedIndex.value + cols, total - 1)
        event.preventDefault()
        break
      case 'ArrowUp':
        selectedIndex.value = Math.max(selectedIndex.value - cols, 0)
        event.preventDefault()
        break
      case 'Enter':
        if (selectedIndex.value >= 0) {
          selectEmoji(emojiList[selectedIndex.value])
        }
        event.preventDefault()
        break
      case 'Escape':
        emit('close')
        event.preventDefault()
        break
    }
  }

  // 重置选中状态
  function resetSelection () {
    selectedIndex.value = -1
  }

  // 暴露方法给父组件
  defineExpose({
    resetSelection
  })
</script>

<style scoped>
.emoji-picker {
  position: absolute;
  bottom: 100%;
  right: 0;
  background: var(--bg-secondary, #1a1a1b);
  border: 1px solid var(--border-color, #343536);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  padding: 12px;
}

.emoji-item {
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.emoji-item:hover,
.emoji-item.selected {
  background: var(--bg-hover, #272729);
  outline: 2px solid var(--primary-color, #ff4500);
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .emoji-picker {
    width: 280px;
    right: -10px;
  }

  .emoji-grid {
    grid-template-columns: repeat(9, 1fr);
    gap: 2px;
    padding: 8px;
  }

  .emoji-item {
    font-size: 18px;
    padding: 2px;
  }
}
</style>
