<template>
  <div class="match-canvas">
    <div class="canvas-header">
      <div class="header-title">
        <Icon icon="ep:connection" class="title-icon" />
        <span>匹配条件画布</span>
      </div>
      <el-button size="small" type="primary" @click="handleAddMatchCondition">
        <Icon icon="ep:plus" class="mr-5px" />
        添加匹配条件
      </el-button>
    </div>
    
    <div
      class="canvas-content"
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent
    >
      <el-scrollbar class="canvas-scrollbar">
        <!-- 空状态 -->
        <div v-if="selectedModels.length === 0" class="empty-canvas">
          <el-empty description="从左侧拖拽模型到此处开始配置" :image-size="120">
            <Icon icon="ep:mouse" style="font-size: 60px; color: var(--el-color-info);" />
          </el-empty>
        </div>
        
        <!-- 模型卡片列表 -->
        <div v-else class="canvas-body">
          <!-- 已选择的模型卡片 -->
          <div class="model-cards">
            <div
              v-for="modelConfig in selectedModels"
              :key="modelConfig.modelKey"
              class="model-card"
            >
              <div class="card-header" @click="toggleCardCollapse(modelConfig.modelKey)">
                <div class="card-title">
                  <el-button
                    type="primary"
                    text
                    circle
                    size="small"
                    class="collapse-btn"
                    @click.stop="toggleCardCollapse(modelConfig.modelKey)"
                  >
                    <Icon :icon="isCardCollapsed(modelConfig.modelKey) ? 'ep:arrow-right' : 'ep:arrow-down'" />
                  </el-button>
                  <Icon icon="ep:document" class="mr-5px" />
                  <span>{{ getModelName(modelConfig.modelKey) }}</span>
                  <el-tag size="small" type="primary" class="ml-8px">
                    {{ modelConfig.modelKey }}
                  </el-tag>
                </div>
                <el-button
                  type="danger"
                  link
                  size="small"
                  @click.stop="handleRemoveModel(modelConfig.modelKey)"
                >
                  <Icon icon="ep:close" />
                </el-button>
              </div>
              
              <!-- 卡片内容（可折叠） -->
              <transition name="card-collapse">
                <div v-show="!isCardCollapsed(modelConfig.modelKey)" class="card-body">
                  <!-- 状态筛选 -->
                  <div class="card-section">
                    <div class="section-label">流程状态限制：</div>
                    <el-checkbox-group
                      :model-value="modelConfig.statuses || []"
                      @change="handleStatusChange(modelConfig.modelKey, $event)"
                      size="small"
                    >
                      <el-checkbox :label="1">审批中</el-checkbox>
                      <el-checkbox :label="2">审批通过</el-checkbox>
                      <el-checkbox :label="3">审批拒绝</el-checkbox>
                      <el-checkbox :label="4">已取消</el-checkbox>
                    </el-checkbox-group>
                    <div class="section-hint">不选择表示不限制状态</div>
                  </div>
                  
                  <!-- 字段条件 -->
                  <div class="card-section">
                    <div class="section-label">
                      <span>字段条件：</span>
                      <el-button
                        type="primary"
                        link
                        size="small"
                        @click.stop="handleAddCondition(modelConfig.modelKey)"
                      >
                        <Icon icon="ep:plus" class="mr-5px" />
                        添加条件
                      </el-button>
                    </div>
                    
                    <div v-if="!modelConfig.conditions || modelConfig.conditions.length === 0" class="section-hint">
                      <Icon icon="ep:info-filled" class="mr-5px" />
                      暂无字段条件，可选配置
                    </div>
                    
                    <div v-else class="conditions-list">
                      <div
                        v-for="(condition, condIndex) in modelConfig.conditions"
                        :key="condIndex"
                        class="condition-card"
                      >
                        <div class="condition-info">
                          <el-tag size="small" type="warning" class="condition-tag">
                            {{ getConditionOperatorLabel(condition.operator) }}
                          </el-tag>
                          <span class="condition-field">
                            {{ condition.alias ? `别名: ${condition.alias}` : (condition.field || '未指定字段') }}
                          </span>
                          <span v-if="needsValue(condition.operator)" class="condition-value">
                            = {{ condition.value }}
                          </span>
                        </div>
                        <div class="condition-actions">
                          <el-button
                            type="primary"
                            link
                            size="small"
                            @click.stop="handleEditCondition(modelConfig.modelKey, condIndex)"
                          >
                            <Icon icon="ep:edit" />
                          </el-button>
                          <el-button
                            type="danger"
                            link
                            size="small"
                            @click.stop="handleRemoveCondition(modelConfig.modelKey, condIndex)"
                          >
                            <Icon icon="ep:delete" />
                          </el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 字段列表 -->
                  <div class="card-section">
                    <div class="section-label">表单字段：</div>
                    <div v-if="modelDetails[modelConfig.modelKey]" class="field-list">
                      <div
                        v-for="field in getModelFields(modelConfig.modelKey)"
                        :key="field.field"
                        :class="['field-item', { 'field-deprecated': !getFieldVersionDisplay(modelConfig.modelKey, field).isActive }]"
                        :draggable="getFieldVersionDisplay(modelConfig.modelKey, field).isActive"
                        @dragstart="handleFieldDragStart($event, modelConfig.modelKey, field)"
                      >
                        <div class="field-icon">
                          <Icon :icon="getFieldIcon(field.type)" />
                        </div>
                        <div class="field-info">
                          <div class="field-title">{{ field.title }}</div>
                          <div class="field-code">{{ field.field }}</div>
                        </div>
                        <el-tag
                          v-if="getFieldVersionDisplay(modelConfig.modelKey, field).versionText"
                          size="small"
                          :type="getFieldVersionDisplay(modelConfig.modelKey, field).tagType"
                          class="field-tag"
                        >
                          {{ getFieldVersionDisplay(modelConfig.modelKey, field).versionText }}
                        </el-tag>
                      </div>
                    </div>
                    <el-skeleton v-else :rows="3" animated />
                  </div>
                </div>
              </transition>
            </div>
          </div>
          
          <!-- 匹配条件区域 -->
          <div v-if="fieldMatches.length > 0" class="match-conditions">
            <div class="conditions-header">
              <Icon icon="ep:link" class="mr-5px" />
              <span>匹配条件</span>
            </div>
            
            <div class="conditions-list">
              <div
                v-for="(match, index) in fieldMatches"
                :key="index"
                class="condition-item"
              >
                <div class="condition-content" @click="handleEditMatch(match, index)">
                  <div class="match-info">
                    <el-tag type="primary" size="small">
                      {{ match.alias || 'match_' + index }}
                    </el-tag>
                    <div class="match-detail">
                      <span class="field-text">{{ match.field }}</span>
                      <div class="match-models" v-if="getMatchModels(match).length > 0">
                        <el-tag 
                          v-for="modelKey in getMatchModels(match)" 
                          :key="modelKey" 
                          size="small" 
                          type="success"
                          class="model-tag"
                        >
                          {{ getModelName(modelKey) }}
                        </el-tag>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="condition-actions">
                  <el-button
                    type="primary"
                    link
                    size="small"
                    @click.stop="handleEditMatch(match, index)"
                  >
                    <Icon icon="ep:edit" />
                  </el-button>
                  <el-button
                    type="danger"
                    link
                    size="small"
                    @click.stop="handleRemoveMatch(index)"
                  >
                    <Icon icon="ep:delete" />
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    
    <!-- 添加/编辑匹配条件对话框（支持多模型） -->
    <el-dialog 
      v-model="matchDialogVisible" 
      :title="editingIndex !== null ? '编辑字段匹配条件' : '添加字段匹配条件'"
      width="800px"
      :close-on-click-modal="false"
      class="match-dialog"
    >
      <template #header>
        <div class="dialog-header">
          <div class="header-icon">
            <Icon icon="ep:link" style="font-size: 24px;" />
          </div>
          <div class="header-content">
            <h3>{{ editingIndex !== null ? '编辑字段匹配条件' : '添加字段匹配条件' }}</h3>
            <p>配置多个流程的字段进行联动匹配</p>
          </div>
        </div>
      </template>
      
      <div class="dialog-body">
        <el-alert type="info" :closable="false" class="info-alert">
          <template #title>
            <div class="flex items-center">
              <Icon icon="ep:info-filled" class="mr-5px" />
              <span>配置说明</span>
            </div>
          </template>
          <div class="alert-content">
            • 至少需要添加<strong>2个流程</strong>参与匹配<br />
            • <strong>第一个流程</strong>的字段作为基准字段<br />
            • 系统将在<strong>所有字段值相同</strong>时触发联动
          </div>
        </el-alert>
        
        <el-form :model="matchForm" label-position="top" class="match-form">
          <!-- 动态流程列表 -->
          <div class="form-section">
            <div class="section-title">
              <Icon icon="ep:document" class="mr-5px" />
              <span>参与匹配的流程</span>
              <el-badge :value="matchForm.modelFields.length" type="primary" class="ml-8px" />
            </div>
            
            <div class="model-field-list">
              <div 
                v-for="(item, index) in matchForm.modelFields" 
                :key="index"
                class="model-field-item"
              >
                <div class="item-header">
                  <div class="header-left">
                    <div class="item-number">{{ index + 1 }}</div>
                    <el-tag :type="index === 0 ? 'primary' : 'success'" size="small" effect="dark">
                      {{ index === 0 ? '基准流程' : `流程 ${String.fromCharCode(65 + index)}` }}
                    </el-tag>
                  </div>
                  <el-button
                    v-if="matchForm.modelFields.length > 2"
                    type="danger"
                    circle
                    size="small"
                    @click="removeModelField(index)"
                  >
                    <Icon icon="ep:close" />
                  </el-button>
                </div>
                
                <div class="item-content">
                  <el-form-item label="选择流程" class="form-item-no-margin">
                    <el-select 
                      v-model="item.modelKey" 
                      placeholder="请选择流程模型" 
                      @change="handleModelFieldChange(index)"
                      size="large"
                      class="w-full"
                    >
                      <el-option
                        v-for="model in selectedModels"
                        :key="model.modelKey"
                        :label="getModelName(model.modelKey)"
                        :value="model.modelKey"
                      >
                        <div class="flex items-center justify-between">
                          <span class="option-label">{{ getModelName(model.modelKey) }}</span>
                          <el-tag size="small" type="info">{{ model.modelKey }}</el-tag>
                        </div>
                      </el-option>
                    </el-select>
                  </el-form-item>
                  
                  <el-form-item label="选择字段" class="form-item-no-margin">
                    <el-select 
                      v-model="item.field" 
                      placeholder="请选择字段（仅显示最新版本字段）" 
                      filterable
                      :disabled="!item.modelKey"
                      size="large"
                      class="w-full"
                    >
                      <el-option
                        v-for="field in getActiveModelFields(item.modelKey)"
                        :key="field.field"
                        :label="`${field.title} (${field.field})`"
                        :value="field.field"
                      >
                        <div class="field-option">
                          <div class="field-option-title">{{ field.title }}</div>
                          <div class="field-option-code">{{ field.field }}</div>
                        </div>
                      </el-option>
                    </el-select>
                  </el-form-item>
                </div>
              </div>
            </div>
            
            <!-- 添加更多流程按钮 -->
            <el-button 
              type="primary" 
              plain 
              @click="addModelField" 
              class="add-model-btn"
              size="large"
            >
              <Icon icon="ep:plus" class="mr-5px" />
              添加更多流程参与匹配
            </el-button>
          </div>
          
          <el-divider class="section-divider" />
          
          <!-- 匹配配置 -->
          <div class="form-section">
            <div class="section-title">
              <Icon icon="ep:setting" class="mr-5px" />
              <span>匹配配置</span>
            </div>
            
            <el-form-item label="匹配别名" class="alias-form-item">
              <el-input 
                v-model="matchForm.alias" 
                placeholder="可选，用于在目标映射中引用（默认自动生成）"
                size="large"
              >
                <template #prefix>
                  <Icon icon="ep:collection-tag" />
                </template>
                <template #append>
                  <el-button @click="generateAlias" :icon="'Refresh'">
                    自动生成
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </div>
          
          <el-divider class="section-divider" />
          
          <!-- 预览 -->
          <div class="form-section">
            <div class="section-title">
              <Icon icon="ep:view" class="mr-5px" />
              <span>匹配预览</span>
            </div>
            
            <div class="match-preview-container">
              <div 
                v-if="matchForm.modelFields.filter(i => i.modelKey && i.field).length === 0"
                class="preview-empty"
              >
                <Icon icon="ep:warning" style="font-size: 32px; color: var(--el-color-info);" />
                <p>请先配置流程和字段</p>
              </div>
              <div v-else class="match-preview">
                <div 
                  v-for="(item, index) in matchForm.modelFields.filter(i => i.modelKey && i.field)" 
                  :key="index"
                  class="preview-item"
                >
                  <el-tag 
                    type="success" 
                    size="large"
                    effect="dark"
                    class="preview-tag"
                  >
                    <Icon icon="ep:connection" class="mr-5px" />
                    {{ getModelName(item.modelKey) }}.{{ item.field }}
                  </el-tag>
                  <Icon 
                    v-if="index < matchForm.modelFields.filter(i => i.modelKey && i.field).length - 1"
                    icon="ep:right" 
                    class="preview-arrow"
                  />
                </div>
              </div>
            </div>
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="handleCancelEdit">取消</el-button>
        <el-button type="primary" @click="handleConfirmAddMatch">
          <Icon icon="ep:check" class="mr-5px" />
          {{ editingIndex !== null ? '确认修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 添加/编辑字段条件对话框 -->
    <el-dialog
      v-model="conditionDialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="condition-dialog-header">
          <div class="header-icon">
            <Icon icon="ep:filter" style="font-size: 20px;" />
          </div>
          <div class="header-content">
            <h3>{{ currentConditionIndex !== null ? '编辑字段条件' : '添加字段条件' }}</h3>
            <p>
              <Icon icon="ep:document" style="margin-right: 4px;" />
              <span>当前模型：</span>
              <el-tag type="primary" size="small" effect="dark">
                {{ getModelName(currentConditionModelKey) }}
              </el-tag>
            </p>
          </div>
        </div>
      </template>
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        <template #title>
          <div style="line-height: 1.6;">
            <div style="margin-bottom: 8px; font-weight: 600;">为流程模型添加字段值过滤条件，满足条件时才触发联动</div>
            <div style="font-size: 13px; font-weight: 400; color: var(--el-text-color-regular);">
              <strong>• 使用匹配别名：</strong>复用已配置的字段匹配别名，用于跨模型统一判断同一个匹配值<br/>
              <strong>• 指定模型字段：</strong>单独指定当前模型的某个字段进行判断，不依赖其他模型
            </div>
          </div>
        </template>
      </el-alert>
      
      <el-form :model="conditionForm" label-width="100px">
        <el-form-item label="字段来源">
          <el-radio-group v-model="conditionForm.sourceType">
            <el-radio label="alias">
              <span>使用匹配别名</span>
              <el-tooltip
                content="复用已配置的字段匹配别名，适合需要对多个模型的相同匹配字段进行统一条件判断的场景"
                placement="top"
              >
                <el-icon style="margin-left: 4px; color: var(--el-color-info);"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-radio>
            <el-radio label="field">
              <span>指定模型字段</span>
              <el-tooltip
                content="单独指定当前模型的某个字段，适合只需要对该模型特定字段进行条件判断的场景"
                placement="top"
              >
                <el-icon style="margin-left: 4px; color: var(--el-color-info);"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item v-if="conditionForm.sourceType === 'alias'" label="匹配别名">
          <el-select v-model="conditionForm.alias" placeholder="选择匹配别名" class="w-full">
            <el-option
              v-for="alias in getAvailableAliases"
              :key="alias"
              :label="alias"
              :value="alias"
            />
          </el-select>
          <div class="form-hint">
            <Icon icon="ep:info-filled" style="margin-right: 4px; color: var(--el-color-primary);" />
            复用已配置的字段匹配别名。<strong>示例：</strong>如果多个流程都匹配了"commonValue"这个别名，可以统一要求其值等于"xx"
          </div>
        </el-form-item>
        
        <el-form-item v-else label="模型字段">
          <el-select
            v-model="conditionForm.field"
            placeholder="选择字段"
            filterable
            class="w-full"
          >
            <el-option
              v-for="field in getActiveModelFields(currentConditionModelKey)"
              :key="field.field"
              :label="`${field.title} (${field.field})`"
              :value="field.field"
            >
              <div class="field-option">
                <div class="field-option-title">{{ field.title }}</div>
                <div class="field-option-code">{{ field.field }}</div>
              </div>
            </el-option>
          </el-select>
          <div class="form-hint">
            <Icon icon="ep:info-filled" style="margin-right: 4px; color: var(--el-color-primary);" />
            指定该模型的具体字段。<strong>示例：</strong>可以要求流程 A 的某个数值字段大于 100，或某个状态字段等于"已通过"
          </div>
        </el-form-item>
        
        <el-form-item label="条件操作符">
          <el-select v-model="conditionForm.operator" placeholder="选择操作符" class="w-full">
            <el-option
              v-for="op in operatorOptions"
              :key="op.value"
              :label="op.label"
              :value="op.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="needsValue(conditionForm.operator)" label="比对值">
          <el-input
            v-model="conditionForm.value"
            placeholder="请输入比对值"
            clearable
          >
            <template #prefix>
              <Icon icon="ep:edit" />
            </template>
          </el-input>
          <div class="form-hint">
            支持数值、字符串比较，系统会自动判断类型
          </div>
        </el-form-item>
        
        <!-- 预览 -->
        <el-form-item label="条件预览">
          <div class="condition-preview">
            <el-tag type="primary" effect="dark">
              {{ conditionForm.sourceType === 'alias' ? `别名: ${conditionForm.alias || '?'}` : `字段: ${conditionForm.field || '?'}` }}
            </el-tag>
            <Icon icon="ep:right" style="margin: 0 8px;" />
            <el-tag type="warning" effect="dark">
              {{ getConditionOperatorLabel(conditionForm.operator) }}
            </el-tag>
            <template v-if="needsValue(conditionForm.operator)">
              <Icon icon="ep:right" style="margin: 0 8px;" />
              <el-tag type="success" effect="dark">
                {{ conditionForm.value || '?' }}
              </el-tag>
            </template>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="conditionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmCondition">
          <Icon icon="ep:check" class="mr-5px" />
          {{ currentConditionIndex !== null ? '确认修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import type { ModelConfig, FieldMatch, FieldCondition, ConditionOperator } from '@/api/bpm/modelAutoTrigger'
import type { ModelDetailResponse, ModelFieldDetail } from '@/api/bpm/modelFormMatch'

interface Props {
  selectedModels: ModelConfig[]
  fieldMatches: FieldMatch[]
  modelDetails: Record<string, ModelDetailResponse>
}

interface Emits {
  (e: 'remove-model', modelKey: string): void
  (e: 'add-match', match: FieldMatch): void
  (e: 'remove-match', index: number): void
  (e: 'update-model-status', modelKey: string, statuses: number[]): void
  (e: 'update-field-alias', modelKey: string, alias: string, field: string): void
  (e: 'add-condition', modelKey: string, condition: FieldCondition): void
  (e: 'update-condition', modelKey: string, index: number, condition: FieldCondition): void
  (e: 'remove-condition', modelKey: string, index: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 匹配条件对话框
const matchDialogVisible = ref(false)
const editingIndex = ref<number | null>(null)

interface ModelFieldItem {
  modelKey: string
  field: string
}

const matchForm = ref<{
  modelFields: ModelFieldItem[]
  alias: string
}>({
  modelFields: [
    { modelKey: '', field: '' },
    { modelKey: '', field: '' }
  ],
  alias: ''
})

// 卡片折叠状态（使用 Map 存储每个模型的折叠状态）
const collapsedCards = ref<Map<string, boolean>>(new Map())

// 检查卡片是否折叠
const isCardCollapsed = (modelKey: string) => {
  return collapsedCards.value.get(modelKey) || false
}

// 切换卡片折叠状态
const toggleCardCollapse = (modelKey: string) => {
  const currentState = collapsedCards.value.get(modelKey) || false
  collapsedCards.value.set(modelKey, !currentState)
}

// 获取模型名称
const getModelName = (modelKey: string) => {
  const detail = props.modelDetails[modelKey]
  return detail?.modelName || modelKey
}

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

// 缓存最高版本号，避免重复计算（性能优化）
const maxVersionCache = ref<Record<string, number>>({})

// 获取模型的最高版本号
const getMaxVersion = (modelKey: string): number => {
  if (maxVersionCache.value[modelKey]) {
    return maxVersionCache.value[modelKey]
  }
  
  const detail = props.modelDetails[modelKey]
  if (!detail || !detail.versions || detail.versions.length === 0) {
    return 0
  }
  
  const maxVer = Math.max(...detail.versions.map(v => v.version))
  maxVersionCache.value[modelKey] = maxVer
  return maxVer
}

// 获取模型字段列表（返回所有字段，用于卡片显示）
const getModelFields = (modelKey: string) => {
  if (!modelKey || !props.modelDetails[modelKey]) {
    return []
  }
  return props.modelDetails[modelKey].fields || []
}

// 获取模型的活跃字段列表（只返回最新版本的字段，用于弹框选择）
const getActiveModelFields = (modelKey: string) => {
  if (!modelKey || !props.modelDetails[modelKey]) {
    return []
  }
  
  const detail = props.modelDetails[modelKey]
  const maxVersion = getMaxVersion(modelKey)
  
  // 如果没有版本信息，返回所有字段
  if (maxVersion === 0) {
    return detail.fields || []
  }
  
  // 只返回存在于最高版本的字段
  return (detail.fields || []).filter(field => {
    return field.latestVersion === maxVersion
  })
}

// 获取字段的版本显示信息（性能优化：缓存结果）
const getFieldVersionDisplay = (modelKey: string, field: any) => {
  const maxVersion = getMaxVersion(modelKey)
  
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

// 模型字段变化处理
const handleModelFieldChange = (index: number) => {
  matchForm.value.modelFields[index].field = ''
}

// 添加模型字段
const addModelField = () => {
  matchForm.value.modelFields.push({
    modelKey: '',
    field: ''
  })
}

// 移除模型字段
const removeModelField = (index: number) => {
  if (matchForm.value.modelFields.length <= 2) {
    ElMessage.warning('至少需要保留2个流程')
    return
  }
  matchForm.value.modelFields.splice(index, 1)
}

// 自动生成别名
const generateAlias = () => {
  const timestamp = Date.now().toString().slice(-6)
  matchForm.value.alias = `match_${timestamp}`
}

// 获取匹配条件涉及的模型
const getMatchModels = (match: FieldMatch) => {
  const models: string[] = []
  
  // 查找使用了该别名或字段的模型
  props.selectedModels.forEach(model => {
    // 检查是否在 fieldAliases 中使用了该别名
    if (model.fieldAliases && match.alias) {
      if (model.fieldAliases[match.alias]) {
        models.push(model.modelKey)
      }
    }
    
    // 检查是否有该字段
    const modelFields = getModelFields(model.modelKey)
    if (modelFields.some(f => f.field === match.field)) {
      if (!models.includes(model.modelKey)) {
        models.push(model.modelKey)
      }
    }
  })
  
  return models
}

// 处理放置
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  
  const data = event.dataTransfer?.getData('application/json')
  if (!data) return
  
  try {
    const dragData = JSON.parse(data)
    if (dragData.type === 'model') {
      // 触发添加模型事件（由父组件处理）
      console.log('拖放模型:', dragData.data)
    }
  } catch (error) {
    console.error('解析拖拽数据失败:', error)
  }
}

// 字段拖拽开始
const handleFieldDragStart = (
  event: DragEvent,
  modelKey: string,
  field: ModelFieldDetail
) => {
  // 检查字段是否为废弃字段，如果是则阻止拖动
  const versionDisplay = getFieldVersionDisplay(modelKey, field)
  if (!versionDisplay.isActive) {
    event.preventDefault()
    return
  }
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'field',
      modelKey,
      field: field.field,
      title: field.title,
      fieldType: field.type
    }))
  }
}

// 移除模型
const handleRemoveModel = (modelKey: string) => {
  emit('remove-model', modelKey)
}

// 状态变化
const handleStatusChange = (modelKey: string, statuses: any) => {
  emit('update-model-status', modelKey, statuses)
}

// 添加匹配条件
const handleAddMatchCondition = () => {
  editingIndex.value = null
  matchForm.value = {
    modelFields: [
      { modelKey: '', field: '' },
      { modelKey: '', field: '' }
    ],
    alias: ''
  }
  matchDialogVisible.value = true
}

// 编辑匹配条件
const handleEditMatch = (match: FieldMatch, index: number) => {
  console.log('编辑匹配条件:', match, index)
  editingIndex.value = index
  
  const modelFields: ModelFieldItem[] = []
  
  // 找到第一个模型（基准字段所在的模型）
  const baseModel = props.selectedModels.find(m => {
    const fields = getModelFields(m.modelKey)
    return fields.some(f => f.field === match.field)
  })
  
  if (baseModel) {
    modelFields.push({
      modelKey: baseModel.modelKey,
      field: match.field
    })
  }
  
  // 找到所有使用别名的模型
  if (match.alias) {
    props.selectedModels.forEach(m => {
      if (m.fieldAliases && m.fieldAliases[match.alias!]) {
        // 跳过基准模型
        if (m.modelKey !== baseModel?.modelKey) {
          modelFields.push({
            modelKey: m.modelKey,
            field: m.fieldAliases[match.alias!]
          })
        }
      }
    })
  }
  
  // 如果少于2个，补充空项
  while (modelFields.length < 2) {
    modelFields.push({ modelKey: '', field: '' })
  }
  
  matchForm.value = {
    modelFields: modelFields,
    alias: match.alias || ''
  }
  
  matchDialogVisible.value = true
}

// 取消编辑
const handleCancelEdit = () => {
  editingIndex.value = null
  matchDialogVisible.value = false
}

// 确认添加/更新匹配条件
const handleConfirmAddMatch = () => {
  // 过滤有效的模型字段配置
  const validFields = matchForm.value.modelFields.filter(item => item.modelKey && item.field)
  
  // 验证
  if (validFields.length < 2) {
    ElMessage.warning('至少需要选择2个流程的字段进行匹配')
    return
  }
  
  // 检查是否有重复的模型+字段组合
  const fieldSet = new Set<string>()
  for (const item of validFields) {
    const key = `${item.modelKey}:${item.field}`
    if (fieldSet.has(key)) {
      ElMessage.warning(`流程"${getModelName(item.modelKey)}"的字段"${item.field}"重复`)
      return
    }
    fieldSet.add(key)
  }
  
  // 生成别名（如果没有提供）
  let alias = matchForm.value.alias
  if (!alias) {
    alias = `match_${Date.now().toString().slice(-6)}`
  }
  
  const isEditing = editingIndex.value !== null
  
  console.log(isEditing ? '更新匹配条件:' : '添加匹配条件:', {
    modelFields: validFields,
    alias,
    index: editingIndex.value
  })
  
  // 使用第一个流程的字段作为基准字段
  const baseField = validFields[0].field
  const baseModelKey = validFields[0].modelKey
  
  if (isEditing) {
    // 更新模式：先删除旧的，再添加新的
    emit('remove-match', editingIndex.value!)
  }
  
  // 添加匹配条件
  emit('add-match', {
    alias: alias,
    field: baseField
  })
  
  // 为其他流程更新字段别名映射
  for (let i = 1; i < validFields.length; i++) {
    const item = validFields[i]
    if (item.field !== baseField || item.modelKey !== baseModelKey) {
      console.log('添加字段别名映射:', item.modelKey, alias, item.field)
      emit('update-field-alias', item.modelKey, alias, item.field)
    }
  }
  
  // 生成成功提示
  const modelNames = validFields.map(item => `${getModelName(item.modelKey)}.${item.field}`)
  const message = isEditing ? '已更新匹配' : '已添加匹配'
  ElMessage.success(`${message}: ${modelNames.join(' ⇄ ')}`)
  
  editingIndex.value = null
  matchDialogVisible.value = false
}

// 移除匹配条件
const handleRemoveMatch = (index: number) => {
  console.log('MatchCanvas: 删除匹配条件', index, props.fieldMatches[index])
  emit('remove-match', index)
}

// ==================== 字段条件相关 ====================

// 条件对话框
const conditionDialogVisible = ref(false)
const currentConditionModelKey = ref('')
const currentConditionIndex = ref<number | null>(null)

const conditionForm = ref<{
  sourceType: 'alias' | 'field'
  alias: string
  field: string
  operator: string
  value: any
}>({
  sourceType: 'field',
  alias: '',
  field: '',
  operator: 'EQ',
  value: ''
})

// 操作符选项
const operatorOptions = [
  { label: '等于 (EQ)', value: 'EQ' },
  { label: '不等于 (NE)', value: 'NE' },
  { label: '大于 (GT)', value: 'GT' },
  { label: '大于等于 (GE)', value: 'GE' },
  { label: '小于 (LT)', value: 'LT' },
  { label: '小于等于 (LE)', value: 'LE' },
  { label: '包含 (CONTAINS)', value: 'CONTAINS' },
  { label: '不包含 (NOT_CONTAINS)', value: 'NOT_CONTAINS' },
  { label: '为空 (EMPTY)', value: 'EMPTY' },
  { label: '非空 (NOT_EMPTY)', value: 'NOT_EMPTY' }
]

// 获取操作符标签
const getConditionOperatorLabel = (operator: string) => {
  const option = operatorOptions.find(o => o.value === operator)
  return option ? option.label : operator
}

// 判断操作符是否需要value
const needsValue = (operator: string) => {
  return !['EMPTY', 'NOT_EMPTY'].includes(operator)
}

// 添加条件
const handleAddCondition = (modelKey: string) => {
  currentConditionModelKey.value = modelKey
  currentConditionIndex.value = null
  conditionForm.value = {
    sourceType: 'field',
    alias: '',
    field: '',
    operator: 'EQ',
    value: ''
  }
  conditionDialogVisible.value = true
}

// 编辑条件
const handleEditCondition = (modelKey: string, index: number) => {
  const model = props.selectedModels.find(m => m.modelKey === modelKey)
  if (!model || !model.conditions || !model.conditions[index]) {
    return
  }
  
  const condition = model.conditions[index]
  currentConditionModelKey.value = modelKey
  currentConditionIndex.value = index
  
  conditionForm.value = {
    sourceType: condition.alias ? 'alias' : 'field',
    alias: condition.alias || '',
    field: condition.field || '',
    operator: condition.operator as string,
    value: condition.value || ''
  }
  
  conditionDialogVisible.value = true
}

// 确认添加/更新条件
const handleConfirmCondition = () => {
  // 验证
  if (conditionForm.value.sourceType === 'alias' && !conditionForm.value.alias) {
    ElMessage.warning('请选择匹配别名')
    return
  }
  
  if (conditionForm.value.sourceType === 'field' && !conditionForm.value.field) {
    ElMessage.warning('请选择字段')
    return
  }
  
  if (!conditionForm.value.operator) {
    ElMessage.warning('请选择操作符')
    return
  }
  
  if (needsValue(conditionForm.value.operator) && !conditionForm.value.value && conditionForm.value.value !== 0) {
    ElMessage.warning('请输入比对值')
    return
  }
  
  // 构建条件对象
  const condition: FieldCondition = {
    operator: conditionForm.value.operator as any
  }
  
  if (conditionForm.value.sourceType === 'alias') {
    condition.alias = conditionForm.value.alias
  } else {
    condition.field = conditionForm.value.field
  }
  
  if (needsValue(conditionForm.value.operator)) {
    condition.value = conditionForm.value.value
  }
  
  // 添加或更新
  if (currentConditionIndex.value !== null) {
    emit('update-condition', currentConditionModelKey.value, currentConditionIndex.value, condition)
    ElMessage.success('条件已更新')
  } else {
    emit('add-condition', currentConditionModelKey.value, condition)
    ElMessage.success('条件已添加')
  }
  
  conditionDialogVisible.value = false
}

// 移除条件
const handleRemoveCondition = (modelKey: string, index: number) => {
  emit('remove-condition', modelKey, index)
  ElMessage.success('已删除条件')
}

// 获取可用的别名列表
const getAvailableAliases = computed(() => {
  return props.fieldMatches.map(m => m.alias || m.field).filter(Boolean)
})

// 监听模型详情变化，清空版本缓存（性能优化）
watch(
  () => props.modelDetails,
  () => {
    maxVersionCache.value = {}
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.match-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .canvas-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
  
  .canvas-content {
    flex: 1;
    overflow: hidden;
    
    .canvas-scrollbar {
      height: 100%;
    }
    
    .empty-canvas {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
    }
    
    .canvas-body {
      padding: 16px;
      
      .model-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
        
        .model-card {
          background-color: var(--el-bg-color);
          border: 1px solid var(--el-border-color-light);
          border-radius: 8px;
          overflow: hidden;
          
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: linear-gradient(to right, var(--el-color-primary-light-9), var(--el-bg-color));
            border-bottom: 1px solid var(--el-border-color-lighter);
            cursor: pointer;
            transition: all 0.3s;
            
            &:hover {
              background: linear-gradient(to right, var(--el-color-primary-light-8), var(--el-bg-color));
            }
            
            .card-title {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              font-weight: 600;
              color: var(--el-text-color-primary);
              
              .collapse-btn {
                padding: 0;
                width: 24px;
                height: 24px;
                transition: transform 0.3s;
                
                &:hover {
                  transform: scale(1.1);
                }
              }
            }
          }
          
          .card-body {
            transition: all 0.3s ease;
          }
          
          .card-section {
            padding: 12px 16px;
            border-bottom: 1px solid var(--el-border-color-lighter);
            
            &:last-child {
              border-bottom: none;
            }
            
            .section-label {
              font-size: 13px;
              font-weight: 500;
              color: var(--el-text-color-secondary);
              margin-bottom: 8px;
            }
            
            .section-hint {
              font-size: 12px;
              color: var(--el-text-color-placeholder);
              margin-top: 4px;
            }
            
            .conditions-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
              
              .condition-card {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background-color: var(--el-color-warning-light-9);
                border: 1px solid var(--el-color-warning-light-7);
                border-radius: 4px;
                transition: all 0.2s;
                
                &:hover {
                  border-color: var(--el-color-warning);
                  box-shadow: 0 2px 6px rgba(230, 162, 60, 0.2);
                }
                
                .condition-info {
                  flex: 1;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  
                  .condition-tag {
                    flex-shrink: 0;
                  }
                  
                  .condition-field {
                    font-size: 12px;
                    color: var(--el-text-color-regular);
                    font-family: monospace;
                  }
                  
                  .condition-value {
                    font-size: 12px;
                    color: var(--el-color-success);
                    font-weight: 600;
                    font-family: monospace;
                  }
                }
                
                .condition-actions {
                  display: flex;
                  gap: 4px;
                  opacity: 0;
                  transition: opacity 0.2s;
                }
                
                &:hover .condition-actions {
                  opacity: 1;
                }
              }
            }
            
            .field-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
              max-height: 300px;
              overflow-y: auto;
              
              .field-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                background-color: var(--el-fill-color-light);
                border: 1px solid var(--el-border-color-lighter);
                border-radius: 4px;
                cursor: move;
                transition: all 0.2s;
                
                &:hover {
                  border-color: var(--el-color-primary);
                  background-color: var(--el-color-primary-light-9);
                }
                
                // 已废弃字段样式
                &.field-deprecated {
                  opacity: 0.6;
                  background-color: var(--el-fill-color-lighter);
                  cursor: not-allowed;
                  
                  &:hover {
                    opacity: 0.8;
                    border-color: var(--el-color-warning);
                    background-color: var(--el-color-warning-light-9);
                  }
                  
                  .field-icon {
                    color: var(--el-color-warning) !important;
                  }
                  
                  .field-title {
                    color: var(--el-text-color-secondary) !important;
                    text-decoration: line-through;
                  }
                  
                  .field-code {
                    color: var(--el-text-color-placeholder) !important;
                  }
                }
                
                .field-icon {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 24px;
                  height: 24px;
                  margin-right: 8px;
                  color: var(--el-color-primary);
                  font-size: 16px;
                }
                
                .field-info {
                  flex: 1;
                  
                  .field-title {
                    font-size: 13px;
                    color: var(--el-text-color-primary);
                    margin-bottom: 2px;
                  }
                  
                  .field-code {
                    font-size: 11px;
                    color: var(--el-text-color-secondary);
                    font-family: monospace;
                  }
                }
                
                .field-tag {
                  margin-left: 8px;
                }
              }
            }
          }
        }
      }
      
      .match-conditions {
        padding: 16px;
        background-color: var(--el-color-success-light-9);
        border: 1px solid var(--el-color-success-light-7);
        border-radius: 8px;
        
        .conditions-header {
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: var(--el-color-success);
          margin-bottom: 12px;
        }
        
        .conditions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          
            .condition-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background-color: var(--el-bg-color);
            border: 1px solid var(--el-border-color-light);
            border-radius: 4px;
            transition: all 0.2s;
            
            &:hover {
              border-color: var(--el-color-primary);
              box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
            }
            
            .condition-content {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 12px;
              cursor: pointer;
              
              .match-info {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 12px;
                
                .match-detail {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                  
                  .field-text {
                    font-family: monospace;
                    font-size: 12px;
                    color: var(--el-text-color-regular);
                    font-weight: 500;
                  }
                  
                  .match-models {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    
                    .model-tag {
                      font-size: 11px;
                    }
                  }
                }
              }
            }
            
            .condition-actions {
              display: flex;
              gap: 4px;
              opacity: 0;
              transition: opacity 0.2s;
            }
            
            &:hover .condition-actions {
              opacity: 1;
            }
          }
        }
      }
    }
  }
}

// 折叠动画
.card-collapse-enter-active,
.card-collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.card-collapse-enter-from,
.card-collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.card-collapse-enter-to,
.card-collapse-leave-from {
  opacity: 1;
  max-height: 1000px;
}

// 对话框样式
:deep(.match-dialog) {
  .el-dialog__header {
    padding: 0;
    margin: 0;
  }
  
  .el-dialog__body {
    padding: 0;
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-bg-color) 100%);
  border-bottom: 1px solid var(--el-border-color-lighter);
  
  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background-color: var(--el-color-primary);
    border-radius: 12px;
    color: white;
  }
  
  .header-content {
    flex: 1;
    
    h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
    
    p {
      margin: 0;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }
}

.dialog-body {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
  
  .info-alert {
    margin-bottom: 24px;
    
    .alert-content {
      font-size: 13px;
      line-height: 1.8;
      
      strong {
        color: var(--el-color-primary);
      }
    }
  }
}

.match-form {
  .form-section {
    margin-bottom: 24px;
    
    .section-title {
      display: flex;
      align-items: center;
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--el-color-primary-light-8);
    }
  }
  
  .section-divider {
    margin: 24px 0;
  }
  
  .form-item-no-margin {
    margin-bottom: 12px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .option-label {
    font-weight: 500;
  }
  
  .field-option {
    display: flex;
    flex-direction: column;
    gap: 2px;
    
    .field-option-title {
      font-size: 14px;
      color: var(--el-text-color-primary);
    }
    
    .field-option-code {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      font-family: monospace;
    }
  }
}

// 模型字段列表样式
.model-field-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  
  .model-field-item {
    position: relative;
    padding: 20px;
    background: linear-gradient(135deg, var(--el-fill-color-extra-light) 0%, var(--el-bg-color) 100%);
    border: 2px solid var(--el-border-color-lighter);
    border-radius: 12px;
    transition: all 0.3s;
    
    &:hover {
      border-color: var(--el-color-primary-light-5);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
      transform: translateY(-2px);
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .item-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
          color: white;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
        }
      }
    }
    
    .item-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  }
}

.add-model-btn {
  width: 100%;
  height: 48px;
  border: 2px dashed var(--el-color-primary-light-5);
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s;
  
  &:hover {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}

// 匹配预览样式
.match-preview-container {
  min-height: 80px;
  padding: 20px;
  background-color: var(--el-fill-color-extra-light);
  border: 2px solid var(--el-border-color-lighter);
  border-radius: 12px;
  
  .preview-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--el-text-color-secondary);
    
    p {
      margin: 0;
      font-size: 14px;
    }
  }
  
  .match-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: center;
    
    .preview-item {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .preview-tag {
        font-family: monospace;
        font-size: 14px;
        padding: 8px 16px;
        border-radius: 8px;
      }
      
      .preview-arrow {
        font-size: 20px;
        color: var(--el-color-primary);
        font-weight: bold;
      }
    }
  }
}

// 表单提示样式
.form-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

// 条件预览样式
.condition-preview {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--el-fill-color-extra-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

// 条件对话框头部样式
.condition-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--el-color-warning) 0%, var(--el-color-warning-light-3) 100%);
    border-radius: 10px;
    color: white;
    box-shadow: 0 2px 8px rgba(230, 162, 60, 0.3);
  }
  
  .header-content {
    flex: 1;
    
    h3 {
      margin: 0 0 6px 0;
      font-size: 17px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
    
    p {
      margin: 0;
      display: flex;
      align-items: center;
      font-size: 13px;
      color: var(--el-text-color-secondary);
      gap: 4px;
      
      span {
        margin-right: 4px;
      }
    }
  }
}
</style>

