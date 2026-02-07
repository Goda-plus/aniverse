<template>
  <div class="demo-image__custom-toolbar">
    <el-image
      style="width: 100px; height: 100px"
      :src="url"
      :preview-src-list="srcList"
      fit="cover"
      show-progress
    >
      <template
        #toolbar="{ actions, prev, next, reset, activeIndex, setActiveItem }"
      >
        <el-icon @click="prev"><Back /></el-icon>
        <el-icon @click="next"><Right /></el-icon>
        <el-icon @click="setActiveItem(srcList.length - 1)">
          <DArrowRight />
        </el-icon>
        <el-icon @click="actions('zoomOut')"><ZoomOut /></el-icon>
        <el-icon
          @click="actions('zoomIn', { enableTransition: false, zoomRate: 2 })"
        >
          <ZoomIn />
        </el-icon>
        <el-icon
          @click="
            actions('clockwise', { rotateDeg: 180, enableTransition: false })
          "
        >
          <RefreshRight />
        </el-icon>
        <el-icon @click="actions('anticlockwise')"><RefreshLeft /></el-icon>
        <el-icon @click="reset"><Refresh /></el-icon>
        <el-icon @click="download(activeIndex)"><Download /></el-icon>
      </template>
    </el-image>
  </div>
</template>

<script lang="ts" setup>
import { ElIcon } from 'element-plus'
import {
  Back,
  DArrowRight,
  Download,
  Refresh,
  RefreshLeft,
  RefreshRight,
  Right,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue'

interface Props {
  url: string
  srcList: string[]
}

const props = withDefaults(defineProps<Props>(), {
  url: '',
  srcList: () => []
})

const download = (index: number) => {
  const url = props.srcList[index]
  const suffix = url.slice(url.lastIndexOf('.'))
  const filename = Date.now() + suffix

  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      URL.revokeObjectURL(blobUrl)
      link.remove()
    })
}
</script>

<style scoped>
.demo-image__custom-toolbar {
  display: inline-block;
}
</style>
