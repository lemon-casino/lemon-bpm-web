<template>
  <div class="target-mapping">
    <div class="mapping-header">
      <div class="header-title">
        <Icon icon="ep:aim" class="title-icon" />
        <span>目标流程配置</span>
      </div>
    </div>
    
    <div class="mapping-content">
      <el-scrollbar class="mapping-scrollbar">
        <!-- 目标流程选择 -->
        <div class="mapping-section">
          <div class="section-title">目标流程模型</div>
          <el-select
            :model-value="targetModelKey"
            placeholder="选择目标流程模型"
            filterable
            clearable
            @change="handleTargetModelChange"
            class="w-full"
          >
            <el-option
              v-for="model in modelList"
              :key="model.modelKey"
              :label="model.modelName"
              :value="model.modelKey"
            >
              <div class="flex items-center justify-between">
                <span>{{ model.modelName }}</span>
                <el-tag size="small" type="info">{{ model.modelKey }}</el-tag>
              </div>
            </el-option>
          </el-select>
        </div>
        
        <!-- 发起人选择 -->
        <div class="mapping-section">
          <div class="section-title">流程发起人</div>
          <el-select
            :model-value="targetStartUserId"
            clearable
            filterable
            placeholder="请选择发起人"
            class="w-full"
            @change="handleStartUserChange"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.nickname"
              :value="user.id"
            />
          </el-select>
          <div class="section-hint">
            <Icon icon="ep:info-filled" class="mr-5px" />
            触发时使用该用户身份发起流程
          </div>
        </div>
        
        <!-- 字段映射 -->
        <div class="mapping-section">
          <div class="section-title">
            <span>字段映射</span>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleAddMapping"
            >
              <Icon icon="ep:plus" class="mr-5px" />
              添加
            </el-button>
          </div>
          
          <div
            class="drop-zone"
            :class="{ 'is-dragging': isDragging }"
            @drop="handleFieldDrop"
            @dragover.prevent
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
          >
            <div v-if="targetFieldMappings.length === 0" class="drop-hint">
              <Icon icon="ep:download" style="font-size: 32px; color: var(--el-color-info);" />
              <p>拖拽字段到此处或点击添加按钮</p>
            </div>
            
            <div v-else class="mapping-list">
              <div
                v-for="(mapping, index) in targetFieldMappings"
                :key="index"
                class="mapping-item"
              >
                <div class="mapping-source">
                  <el-tag v-if="mapping.alias" type="success" size="small">
                    别名: {{ mapping.alias }}
                  </el-tag>
                  <el-tag v-else type="primary" size="small">
                    {{ mapping.sourceModelKey }}
                  </el-tag>
                  <span v-if="mapping.sourceField" class="source-field">
                    .{{ mapping.sourceField }}
                  </span>
                </div>
                
                <Icon icon="ep:right" class="mapping-arrow" />
                
                <div class="mapping-target">
                  <el-input
                    :model-value="mapping.targetField"
                    @input="(val) => handleUpdateMappingField(index, 'targetField', val)"
                    placeholder="目标字段"
                    size="small"
                  />
                </div>
                
                <el-button
                  type="danger"
                  link
                  size="small"
                  @click="handleRemoveMapping(index)"
                >
                  <Icon icon="ep:delete" />
                </el-button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 固定变量 -->
        <div class="mapping-section">
          <div class="section-title">
            <span>固定变量</span>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleAddVariable"
            >
              <Icon icon="ep:plus" class="mr-5px" />
              添加
            </el-button>
          </div>
          
          <div v-if="variableList.length === 0" class="empty-hint">
            暂无固定变量，可选配置
          </div>
          
          <div v-else class="variable-list">
            <div
              v-for="(variable, index) in variableList"
              :key="index"
              class="variable-item"
            >
              <el-input
                v-model="variable.key"
                placeholder="变量名"
                size="small"
                class="variable-key"
              />
              <span class="variable-separator">=</span>
              <el-input
                v-model="variable.value"
                placeholder="变量值"
                size="small"
                class="variable-value"
              />
              <el-button
                type="danger"
                link
                size="small"
                @click="handleRemoveVariable(index)"
              >
                <Icon icon="ep:delete" />
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- 目标模型字段预览 -->
        <div v-if="targetModelDetail" class="mapping-section">
          <div class="section-title">目标模型字段预览</div>
          <div class="target-fields">
            <div
              v-for="field in targetModelDetail.fields"
              :key="field.field"
              :class="['target-field-item', { 'field-deprecated': !getFieldVersionDisplay(field).isActive }]"
            >
              <Icon :icon="getFieldIcon(field.type)" class="field-icon" />
              <div class="field-content">
                <div class="field-name">{{ field.title }}</div>
                <div class="field-code">{{ field.field }}</div>
              </div>
              <el-tag
                v-if="getFieldVersionDisplay(field).versionText"
                size="small"
                :type="getFieldVersionDisplay(field).tagType"
                class="field-version-tag"
              >
                {{ getFieldVersionDisplay(field).versionText }}
              </el-tag>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    
    <!-- 添加映射对话框 -->
    <el-dialog v-model="mappingDialogVisible" title="添加字段映射" width="500px">
      <el-form :model="mappingForm" label-width="100px">
        <el-form-item label="来源类型">
          <el-radio-group v-model="mappingForm.sourceType">
            <el-radio label="alias">匹配别名</el-radio>
            <el-radio label="model">模型字段</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item v-if="mappingForm.sourceType === 'alias'" label="匹配别名">
          <el-select v-model="mappingForm.alias" placeholder="选择匹配别名" class="w-full">
            <el-option
              v-for="match in fieldMatches"
              :key="match.alias || match.field"
              :label="match.alias || match.field"
              :value="match.alias || match.field"
            />
          </el-select>
        </el-form-item>
        
        <template v-else>
          <el-form-item label="来源模型">
            <el-select v-model="mappingForm.sourceModelKey" placeholder="选择模型" class="w-full">
              <el-option
                v-for="model in selectedModels"
                :key="model.modelKey"
                :label="getModelName(model.modelKey)"
                :value="model.modelKey"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="来源字段">
            <el-select
              v-model="mappingForm.sourceField"
              placeholder="选择字段"
              filterable
              class="w-full"
            >
              <el-option
                v-for="field in getModelFields(mappingForm.sourceModelKey)"
                :key="field.field"
                :label="`${field.title} (${field.field})`"
                :value="field.field"
              />
            </el-select>
          </el-form-item>
        </template>
        
        <el-form-item label="目标字段">
          <el-input v-model="mappingForm.targetField" placeholder="输入目标字段编码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mappingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAddMapping">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import type { ModelConfig, FieldMatch, TargetFieldMapping } from '@/api/bpm/modelAutoTrigger'
import type { ModelBasicInfo, ModelDetailResponse, ModelFieldDetail } from '@/api/bpm/modelFormMatch'
import * as ModelFormMatchApi from '@/api/bpm/modelFormMatch'
import { getSimpleUserList } from '@/api/system/user'

interface Props {
  targetModelKey: string
  targetStartUserId?: number
  targetFieldMappings: TargetFieldMapping[]
  targetFixedVariables: Record<string, any>
  modelList: ModelBasicInfo[]
  selectedModels: ModelConfig[]
  fieldMatches: FieldMatch[]
  modelDetails: Record<string, ModelDetailResponse>
}

interface Emits {
  (e: 'update-target-model', modelKey: string): void
  (e: 'update-start-user', userId: number): void
  (e: 'add-field-mapping', mapping: TargetFieldMapping): void
  (e: 'remove-field-mapping', index: number): void
  (e: 'update-field-mapping', index: number, field: string, value: string): void
  (e: 'update-fixed-variables', variables: Record<string, any>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 目标模型详情
const targetModelDetail = ref<ModelDetailResponse | null>(null)

// 用户列表
const userList = ref<any[]>([])

// 映射对话框
const mappingDialogVisible = ref(false)
const mappingForm = ref({
  sourceType: 'alias' as 'alias' | 'model',
  alias: '',
  sourceModelKey: '',
  sourceField: '',
  targetField: ''
})

// 固定变量列表
const variableList = ref<Array<{ key: string; value: any }>>([])
// 标志位，防止递归更新
const isUpdatingFromProps = ref(false)

// 监听固定变量变化
watch(() => props.targetFixedVariables, (newVal) => {
  isUpdatingFromProps.value = true
  variableList.value = Object.entries(newVal).map(([key, value]) => ({ key, value }))
  nextTick(() => {
    isUpdatingFromProps.value = false
  })
}, { immediate: true, deep: true })

// 监听变量列表变化，同步到父组件（避免递归）
watch(variableList, (newVal) => {
  if (isUpdatingFromProps.value) {
    return // 如果是从 props 更新的，不要再触发 emit
  }
  
  const variables: Record<string, any> = {}
  newVal.forEach(v => {
    if (v.key) {
      variables[v.key] = v.value
    }
  })
  emit('update-fixed-variables', variables)
}, { deep: true })

// 监听目标模型变化，加载详情
watch(() => props.targetModelKey, async (newKey) => {
  if (newKey) {
    try {
      targetModelDetail.value = await ModelFormMatchApi.getModelDetail(newKey)
      // 清空版本缓存
      maxVersionCache.value = {}
    } catch (error) {
      console.error('获取目标模型详情失败:', error)
    }
  } else {
    targetModelDetail.value = null
  }
}, { immediate: true })

// 获取字段图标
const getFieldIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    input: 'ep:edit',
    textarea: 'ep:document',
    number: 'ep:sort',
    select: 'ep:select',
    radio: 'ep:circle-check',
    checkbox: 'ep:check',
    date: 'ep:calendar',
    time: 'ep:clock',
    datetime: 'ep:timer',
    upload: 'ep:upload',
    default: 'ep:document'
  }
  return iconMap[type] || iconMap.default
}

// 获取模型名称
const getModelName = (modelKey: string) => {
  const detail = props.modelDetails[modelKey]
  return detail?.modelName || modelKey
}

// 获取模型字段列表
const getModelFields = (modelKey: string): ModelFieldDetail[] => {
  const detail = props.modelDetails[modelKey]
  return detail?.fields || []
}

// 缓存最高版本号（性能优化）
const maxVersionCache = ref<Record<string, number>>({})

// 获取模型的最高版本号
const getMaxVersion = (detail: ModelDetailResponse | null): number => {
  if (!detail || !detail.versions || detail.versions.length === 0) {
    return 0
  }
  
  const cacheKey = detail.modelKey
  if (maxVersionCache.value[cacheKey]) {
    return maxVersionCache.value[cacheKey]
  }
  
  const maxVer = Math.max(...detail.versions.map(v => v.version))
  maxVersionCache.value[cacheKey] = maxVer
  return maxVer
}

// 获取字段的版本显示信息
const getFieldVersionDisplay = (field: any) => {
  const maxVersion = getMaxVersion(targetModelDetail.value)
  
  // 如果没有版本信息
  if (!field.latestVersion || maxVersion === 0) {
    return {
      isActive: true,
      versionText: '',
      tagType: 'success' as const
    }
  }
  
  // 判断字段是否存在于最新版本
  const isActive = field.latestVersion === maxVersion
  
  return {
    isActive,
    versionText: `v${field.latestVersion}`,
    tagType: (isActive ? 'success' : 'warning') as const
  }
}

// 目标模型变化
const handleTargetModelChange = (modelKey: string) => {
  emit('update-target-model', modelKey)
}

// 发起人变化
const handleStartUserChange = (userId: number) => {
  emit('update-start-user', userId)
}

// 拖拽状态
const isDragging = ref(false)

// 处理拖拽进入
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

// 处理拖拽离开
const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

// 处理字段拖放
const handleFieldDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  
  const data = event.dataTransfer?.getData('application/json')
  if (!data) {
    ElMessage.warning('拖拽数据为空')
    return
  }
  
  try {
    const dragData = JSON.parse(data)
    console.log('拖拽数据:', dragData)
    
    if (dragData.type === 'field') {
      // 自动生成映射
      emit('add-field-mapping', {
        sourceModelKey: dragData.modelKey,
        sourceField: dragData.field,
        targetField: dragData.field // 默认使用相同字段名
      })
      ElMessage.success(`已添加字段映射: ${dragData.title}`)
    } else {
      ElMessage.warning('只能拖拽字段到此处')
    }
  } catch (error) {
    console.error('解析拖拽数据失败:', error)
    ElMessage.error('拖拽失败，数据格式错误')
  }
}

// 添加映射
const handleAddMapping = () => {
  mappingForm.value = {
    sourceType: 'alias',
    alias: '',
    sourceModelKey: '',
    sourceField: '',
    targetField: ''
  }
  mappingDialogVisible.value = true
}

// 确认添加映射
const handleConfirmAddMapping = () => {
  if (!mappingForm.value.targetField) {
    ElMessage.warning('请输入目标字段')
    return
  }
  
  if (mappingForm.value.sourceType === 'alias') {
    if (!mappingForm.value.alias) {
      ElMessage.warning('请选择匹配别名')
      return
    }
    emit('add-field-mapping', {
      alias: mappingForm.value.alias,
      targetField: mappingForm.value.targetField
    })
  } else {
    if (!mappingForm.value.sourceModelKey || !mappingForm.value.sourceField) {
      ElMessage.warning('请选择来源模型和字段')
      return
    }
    emit('add-field-mapping', {
      sourceModelKey: mappingForm.value.sourceModelKey,
      sourceField: mappingForm.value.sourceField,
      targetField: mappingForm.value.targetField
    })
  }
  
  mappingDialogVisible.value = false
  ElMessage.success('添加成功')
}

// 更新映射字段
const handleUpdateMappingField = (index: number, field: string, value: string) => {
  emit('update-field-mapping', index, field, value)
}

// 移除映射
const handleRemoveMapping = (index: number) => {
  emit('remove-field-mapping', index)
}

// 添加变量
const handleAddVariable = () => {
  variableList.value.push({ key: '', value: '' })
}

// 移除变量
const handleRemoveVariable = (index: number) => {
  variableList.value.splice(index, 1)
}

// 获取用户列表
const fetchUserList = async () => {
  try {
    userList.value = await getSimpleUserList()
  } catch (error) {
    console.error('获取用户列表失败:', error)
    userList.value = []
  }
}

// 初始化
onMounted(() => {
  fetchUserList()
})
</script>

<style lang="scss" scoped>
.target-mapping {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .mapping-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-bg-color-overlay);
    
    .header-title {
      display: flex;
      align-items: center;
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      
      .title-icon {
        font-size: 18px;
        color: var(--el-color-primary);
        margin-right: 8px;
      }
    }
  }
  
  .mapping-content {
    flex: 1;
    overflow: hidden;
    
    .mapping-scrollbar {
      height: 100%;
    }
    
    .mapping-section {
      padding: 16px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      
      .section-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 12px;
      }
      
      .section-hint {
        display: flex;
        align-items: center;
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-top: 8px;
      }
      
      .drop-zone {
        min-height: 100px;
        padding: 12px;
        border: 2px dashed var(--el-border-color);
        border-radius: 4px;
        transition: all 0.3s;
        
        &:hover {
          border-color: var(--el-color-primary);
          background-color: var(--el-color-primary-light-9);
        }
        
        &.is-dragging {
          border-color: var(--el-color-success);
          background-color: var(--el-color-success-light-9);
          box-shadow: 0 0 12px rgba(103, 194, 58, 0.3);
        }
        
        .drop-hint {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: var(--el-text-color-secondary);
          
          p {
            margin-top: 8px;
            font-size: 13px;
          }
        }
        
        .mapping-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          
          .mapping-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background-color: var(--el-bg-color);
            border: 1px solid var(--el-border-color-light);
            border-radius: 4px;
            
            .mapping-source {
              display: flex;
              align-items: center;
              gap: 4px;
              
              .source-field {
                font-family: monospace;
                font-size: 12px;
                color: var(--el-text-color-regular);
              }
            }
            
            .mapping-arrow {
              color: var(--el-color-primary);
            }
            
            .mapping-target {
              flex: 1;
            }
          }
        }
      }
      
      .empty-hint {
        padding: 20px;
        text-align: center;
        color: var(--el-text-color-placeholder);
        font-size: 13px;
      }
      
      .variable-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        .variable-item {
          display: flex;
          align-items: center;
          gap: 8px;
          
          .variable-key {
            flex: 1;
          }
          
          .variable-separator {
            color: var(--el-text-color-secondary);
          }
          
          .variable-value {
            flex: 1;
          }
        }
      }
      
      .target-fields {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 300px;
        overflow-y: auto;
        
        .target-field-item {
          display: flex;
          align-items: center;
          padding: 8px;
          background-color: var(--el-fill-color-light);
          border-radius: 4px;
          transition: all 0.2s;
          
          &:hover {
            background-color: var(--el-color-primary-light-9);
          }
          
          // 已废弃字段样式
          &.field-deprecated {
            opacity: 0.6;
            background-color: var(--el-fill-color-lighter);
            
            &:hover {
              opacity: 0.8;
              background-color: var(--el-color-warning-light-9);
            }
            
            .field-icon {
              color: var(--el-color-warning) !important;
            }
            
            .field-name {
              color: var(--el-text-color-secondary) !important;
              text-decoration: line-through;
            }
            
            .field-code {
              color: var(--el-text-color-placeholder) !important;
            }
          }
          
          .field-icon {
            font-size: 16px;
            color: var(--el-color-primary);
            margin-right: 8px;
          }
          
          .field-content {
            flex: 1;
            
            .field-name {
              font-size: 13px;
              color: var(--el-text-color-primary);
            }
            
            .field-code {
              font-size: 11px;
              color: var(--el-text-color-secondary);
              font-family: monospace;
            }
          }
          
          .field-version-tag {
            margin-left: 8px;
          }
        }
      }
    }
  }
}
</style>

