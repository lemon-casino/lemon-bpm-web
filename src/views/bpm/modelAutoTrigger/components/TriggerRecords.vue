<template>
  <div class="trigger-records-container">
    <el-alert
      v-if="!ruleId"
      type="info"
      :closable="false"
      style="margin-bottom: 16px;"
    >
      <template #title>
        <Icon icon="ep:info-filled" class="mr-5px" />
        展示所有规则的触发记录
      </template>
    </el-alert>
    
    <!-- 统计信息 -->
    <div v-if="records.length > 0" class="statistics">
      <el-card shadow="never">
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-label">总触发次数</div>
            <div class="stat-value total">{{ records.length }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">成功次数</div>
            <div class="stat-value success">{{ successCount }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">失败次数</div>
            <div class="stat-value error">{{ failureCount }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">成功率</div>
            <div class="stat-value">{{ successRate }}%</div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 记录列表 -->
    <div class="records-content">
      <el-table
        v-loading="loading"
        :data="records"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <div class="expand-section">
                <div class="section-title">
                  <Icon icon="ep:finger-print" class="mr-5px" />
                  匹配指纹
                </div>
                <div class="section-value fingerprint">{{ row.matchFingerprint }}</div>
              </div>
              
              <div class="expand-section">
                <div class="section-title">
                  <Icon icon="ep:document-copy" class="mr-5px" />
                  源流程实例ID
                </div>
                <div class="section-value">
                  <el-tag
                    v-for="(id, index) in getSourceInstanceIds(row.sourceProcessInstanceIds)"
                    :key="index"
                    size="small"
                    type="info"
                    class="instance-tag"
                  >
                    {{ id }}
                  </el-tag>
                </div>
              </div>
              
              <div v-if="row.targetProcessInstanceId" class="expand-section">
                <div class="section-title">
                  <Icon icon="ep:aim" class="mr-5px" />
                  目标流程实例ID
                </div>
                <div class="section-value">
                  <el-tag type="success" size="small">
                    {{ row.targetProcessInstanceId }}
                  </el-tag>
                </div>
              </div>
              
              <div class="expand-section">
                <div class="section-title">
                  <Icon icon="ep:warning" class="mr-5px" />
                  执行结果
                </div>
                <div class="section-value">
                  <el-tag
                    :type="row.resultMessage === 'SUCCESS' ? 'success' : 'danger'"
                    size="large"
                  >
                    {{ row.resultMessage }}
                  </el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="id" label="记录ID" width="80" align="center" />
        
        <el-table-column v-if="!ruleId" prop="ruleId" label="规则ID" width="90" align="center" />
        
        <el-table-column label="执行结果" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.resultMessage === 'SUCCESS' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.resultMessage === 'SUCCESS' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="源流程数量" width="120" align="center">
          <template #default="{ row }">
            <div class="source-count">
              <Icon icon="ep:document-copy" class="count-icon" />
              <span class="count-number">{{ getSourceInstanceIds(row.sourceProcessInstanceIds).length }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="目标流程" width="180" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.targetProcessInstanceId" type="success" size="small">
              {{ row.targetProcessInstanceId.substring(0, 20) }}...
            </el-tag>
            <span v-else class="text-placeholder">未生成</span>
          </template>
        </el-table-column>
        
        <el-table-column label="匹配指纹" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="fingerprint-code">{{ row.matchFingerprint }}</code>
          </template>
        </el-table-column>
        
        <el-table-column prop="createTime" label="触发时间" width="160" align="center">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 空状态 -->
      <el-empty
        v-if="!loading && records.length === 0"
        description="暂无触发记录"
        :image-size="120"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDate } from '@/utils/formatTime'
import * as AutoTriggerApi from '@/api/bpm/modelAutoTrigger'

interface Props {
  ruleId?: number  // 可选，如果不传则显示所有规则的记录
}

const props = defineProps<Props>()

// 记录列表
const loading = ref(false)
const records = ref<AutoTriggerApi.TriggerRecord[]>([])

// 统计数据
const successCount = computed(() => {
  return records.value.filter(r => r.resultMessage === 'SUCCESS').length
})

const failureCount = computed(() => {
  return records.value.filter(r => r.resultMessage !== 'SUCCESS').length
})

const successRate = computed(() => {
  if (records.value.length === 0) return 0
  return ((successCount.value / records.value.length) * 100).toFixed(1)
})

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '-'
  return formatDate(new Date(time), 'YYYY-MM-DD HH:mm:ss')
}

// 解析源流程实例ID
const getSourceInstanceIds = (ids: string) => {
  if (!ids) return []
  return ids.split(',').filter(id => id.trim())
}

// 加载触发记录
const loadRecords = async () => {
  loading.value = true
  try {
    // 如果 ruleId 为空，则查询所有记录
    records.value = await AutoTriggerApi.getTriggerRecords(props.ruleId)
  } catch (error) {
    console.error('加载触发记录失败:', error)
    ElMessage.error('加载触发记录失败')
    records.value = []
  } finally {
    loading.value = false
  }
}

// 暴露刷新方法供父组件调用
defineExpose({
  loadRecords
})

// 初始化
onMounted(() => {
  loadRecords()
})
</script>

<style lang="scss" scoped>
.trigger-records-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  .statistics {
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      
      .stat-item {
        text-align: center;
        
        .stat-label {
          font-size: 14px;
          color: var(--el-text-color-secondary);
          margin-bottom: 8px;
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: var(--el-color-primary);
          
          &.total {
            color: var(--el-color-info);
          }
          
          &.success {
            color: var(--el-color-success);
          }
          
          &.error {
            color: var(--el-color-danger);
          }
        }
      }
    }
  }
  
  .records-content {
    flex: 1;
    
    .text-placeholder {
      color: var(--el-text-color-placeholder);
      font-size: 12px;
    }
    
    .fingerprint-code {
      font-family: monospace;
      font-size: 12px;
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
      padding: 2px 6px;
      border-radius: 4px;
    }
  }
  
  // 展开内容样式
  .expand-content {
    padding: 16px 24px;
    background-color: var(--el-fill-color-extra-light);
    
    .expand-section {
      margin-bottom: 16px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .section-title {
        display: flex;
        align-items: center;
        font-size: 13px;
        font-weight: 600;
        color: var(--el-text-color-secondary);
        margin-bottom: 8px;
      }
      
      .section-value {
        padding: 8px 12px;
        background-color: var(--el-bg-color);
        border-radius: 4px;
        border: 1px solid var(--el-border-color-lighter);
        
        &.fingerprint {
          font-family: monospace;
          font-size: 12px;
          color: var(--el-text-color-regular);
          word-break: break-all;
        }
        
        .instance-tag {
          margin-right: 8px;
          margin-bottom: 8px;
        }
      }
    }
  }
  
  // 源流程数量样式
  .source-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-color-primary-light-8) 100%);
    border: 1px solid var(--el-color-primary-light-7);
    border-radius: 16px;
    transition: all 0.3s;
    
    &:hover {
      background: linear-gradient(135deg, var(--el-color-primary-light-8) 0%, var(--el-color-primary-light-7) 100%);
      border-color: var(--el-color-primary-light-5);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
    }
    
    .count-icon {
      font-size: 16px;
      color: var(--el-color-primary);
    }
    
    .count-number {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-color-primary);
      min-width: 20px;
      text-align: center;
    }
  }
}
</style>

