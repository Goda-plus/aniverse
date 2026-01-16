<template>
  <div class="characters-section">
    <h2 class="section-title">
      Characters
    </h2>

    <div v-if="media && media.characters && media.characters.length" class="characters-list">
      <div
        v-for="ch in media.characters"
        :key="`${ch.id}-${ch.voice_actor_id || 'na'}`"
        class="character-row"
      >
        <div class="character-main">
          <div class="character-avatar">
            <img
              :src="ch.image_medium || ch.image_large || '/placeholder.jpg'"
              :alt="ch.name_native || ch.name_alternative || 'Character'"
            >
          </div>
          <div class="character-info">
            <div class="character-name">
              {{ ch.name_native || ch.name_alternative || 'Unknown' }}
            </div>
            <div class="character-role">
              {{ formatCharacterRole(ch.role) }}
            </div>
          </div>
        </div>

        <div
          v-if="ch.voice_actor_id"
          class="character-voice-actor"
        >
          <div class="voice-avatar">
            <img
              :src="ch.voice_actor_image || '/placeholder.jpg'"
              :alt="ch.voice_actor_name || 'Voice Actor'"
            >
          </div>
          <div class="voice-info">
            <div class="voice-name">
              {{ ch.voice_actor_name || 'Unknown' }}
            </div>
            <div class="voice-meta">
              Japanese
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-else class="empty-text">
      暂无角色数据。
    </p>
  </div>
</template>

<script setup>
  import { inject, computed } from 'vue'

  const injected = inject('mediaDetail', null)
  const media = computed(() => injected?.value ?? injected ?? null)

  const formatCharacterRole = (role) => {
    if (!role) return ''
    const map = {
      MAIN: 'Main',
      SUPPORTING: 'Supporting',
      BACKGROUND: 'Background'
    }
    return map[role] || role
  }
</script>

<style scoped>
.characters-section {
  background: transparent;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.characters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.character-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(31, 41, 55, 0.9);
  width: calc(50% - 6px);
}

.character-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.character-avatar {
  width: 54px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.character-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.character-name {
  font-size: 14px;
  font-weight: 600;
  color: #f9fafb;
}

.character-role {
  font-size: 12px;
  color: rgba(156, 163, 175, 0.95);
}

.character-voice-actor {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.voice-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.voice-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.voice-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.voice-name {
  font-size: 13px;
  font-weight: 600;
  color: #f9fafb;
}

.voice-meta {
  font-size: 11px;
  color: rgba(156, 163, 175, 0.95);
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .character-row {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }

  .character-voice-actor {
    align-self: stretch;
  }
}
</style>
