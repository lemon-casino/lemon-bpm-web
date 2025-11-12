<template>
  <div class="model-library">
    <div class="library-header">
      <div class="header-title">
        <Icon icon="ep:files" class="title-icon" />
        <span>流程模型库</span>
      </div>
      
      <el-input
        v-model="searchKeyword"
        placeholder="搜索模型"
        clearable
        size="small"
        class="search-input"
      >
        <template #prefix>
          <Icon icon="ep:search" />
        </template>
      </el-input>
    </div>
    
    <div class="library-content">
      <el-scrollbar class="model-scrollbar">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <el-skeleton :rows="5" animated />
        </div>
        
        <!-- 模型列表 -->
        <div v-else-if="filteredModels.length > 0" class="model-list">
          <div
            v-for="model in filteredModels"
            :key="model.modelKey"
            class="model-item"
            draggable="true"
            @dragstart="handleDragStart($event, model)"
            @dragend="handleDragEnd"
            @click="handleModelClick(model)"
          >
            <div class="model-icon">
              <Icon icon="ep:document" />
            </div>
            <div class="model-info">
              <div class="model-name">{{ model.modelName }}</div>
              <div class="model-meta">
                <span class="model-key">{{ model.modelKey }}</span>
                <el-tag size="small" type="info">v{{ model.version }}</el-tag>
              </div>
            </div>
            <div class="model-actions">
              <el-button
                type="primary"
                link
                size="small"
                @click.stop="handleAddModel(model)"
              >
                <Icon icon="ep:plus" />
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <el-empty
          v-else
          description="暂无模型数据"
          :image-size="80"
        />
      </el-scrollbar>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import type { ModelBasicInfo } from '@/api/bpm/modelFormMatch'

interface Props {
  models: ModelBasicInfo[]
  loading?: boolean
}

interface Emits {
  (e: 'add-model', model: ModelBasicInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const searchKeyword = ref('')

// 过滤后的模型列表
const filteredModels = computed(() => {
  if (!searchKeyword.value) {
    return props.models
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return props.models.filter(model => 
    model.modelName.toLowerCase().includes(keyword) ||
    model.modelKey.toLowerCase().includes(keyword)
  )
})

// 拖拽开始
const handleDragStart = (event: DragEvent, model: ModelBasicInfo) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'model',
      data: model
    }))
  }
}

// 拖拽结束
const handleDragEnd = (event: DragEvent) => {
  // 清理样式
}

// 点击模型
const handleModelClick = (model: ModelBasicInfo) => {
  console.log('点击模型:', model)
}

// 添加模型
const handleAddModel = (model: ModelBasicInfo) => {
  emit('add-model', model)
}
</script>

<style lang="scss" scoped>
.model-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .library-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    
    .header-title {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      
      .title-icon {
        font-size: 18px;
        color: var(--el-color-primary);
        margin-right: 8px;
      }
    }
    
    .search-input {
      width: 100%;
    }
  }
  
  .library-content {
    flex: 1;
    overflow: hidden;
    
    .model-scrollbar {
      height: 100%;
    }
    
    .loading-state {
      padding: 16px;
    }
    
    .model-list {
      padding: 8px;
      
      .model-item {
        display: flex;
        align-items: center;
        padding: 12px;
        margin-bottom: 8px;
        background-color: var(--el-bg-color);
        border: 1px solid var(--el-border-color-light);
        border-radius: 6px;
        cursor: move;
        transition: all 0.3s;
        
        &:hover {
          border-color: var(--el-color-primary);
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
          transform: translateY(-2px);
          
          .model-actions {
            opacity: 1;
          }
        }
        
        &:active {
          cursor: grabbing;
        }
        
        .model-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          margin-right: 12px;
          background-color: var(--el-color-primary-light-9);
          border-radius: 6px;
          color: var(--el-color-primary);
          font-size: 20px;
        }
        
        .model-info {
          flex: 1;
          overflow: hidden;
          
          .model-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--el-text-color-primary);
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .model-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            
            .model-key {
              color: var(--el-text-color-secondary);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
        
        .model-actions {
          opacity: 0;
          transition: opacity 0.3s;
        }
      }
    }
  }
}
</style>

