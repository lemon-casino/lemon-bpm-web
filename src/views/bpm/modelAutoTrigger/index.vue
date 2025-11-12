<template>
  <doc-alert title="模型联动触发规则" url="https://doc.iocoder.cn/bpm/model-auto-trigger/" />
  
  <div class="auto-trigger-container">
    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="trigger-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="规则配置" name="config">
        <!-- 规则配置内容 -->
        <div class="config-container">
          <!-- 顶部工具栏 -->
          <div class="trigger-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="ruleName"
          placeholder="规则名称"
          style="width: 300px"
          clearable
        >
          <template #prefix>
            <Icon icon="ep:document" />
          </template>
        </el-input>
        
        <el-switch
          v-model="ruleStatus"
          :active-value="0"
          :inactive-value="1"
          active-text="启用"
          inactive-text="停用"
        />
      </div>
      
      <div class="toolbar-right">
        <el-button @click="handleReset">
          <Icon icon="ep:refresh" class="mr-5px" />
          重置
        </el-button>
        <el-button type="warning" @click="handleImport">
          <Icon icon="ep:upload" class="mr-5px" />
          导入JSON
        </el-button>
        <el-button type="info" @click="handlePreview">
          <Icon icon="ep:view" class="mr-5px" />
          预览JSON
        </el-button>
        <el-button type="success" @click="handleSave">
          <Icon icon="ep:check" class="mr-5px" />
          {{ currentRuleId ? '更新规则' : '保存规则' }}
        </el-button>
        <el-button type="primary" @click="handleEvaluate">
          <Icon icon="ep:promotion" class="mr-5px" />
          立即触发
        </el-button>
      </div>
    </div>
    
    <!-- 三栏布局 -->
    <div class="trigger-content">
      <!-- 左侧：模型库 -->
      <div class="trigger-left">
        <ModelLibrary
          :models="modelList"
          :loading="modelLoading"
          @add-model="handleAddModel"
        />
      </div>
      
      <!-- 中间：匹配条件画布 -->
      <div class="trigger-center">
        <MatchCanvas
          :selected-models="selectedModels"
          :field-matches="fieldMatches"
          :model-details="modelDetailsMap"
          @remove-model="handleRemoveModel"
          @add-match="handleAddMatch"
          @remove-match="handleRemoveMatch"
          @update-model-status="handleUpdateModelStatus"
          @update-field-alias="handleUpdateFieldAlias"
          @add-condition="handleAddCondition"
          @update-condition="handleUpdateCondition"
          @remove-condition="handleRemoveCondition"
        />
      </div>
      
      <!-- 右侧：目标流程映射 -->
      <div class="trigger-right">
        <TargetMapping
          :target-model-key="targetModelKey"
          :target-start-user-id="targetStartUserId"
          :target-field-mappings="targetFieldMappings"
          :target-fixed-variables="targetFixedVariables"
          :model-list="modelList"
          :selected-models="selectedModels"
          :field-matches="fieldMatches"
          :model-details="modelDetailsMap"
          @update-target-model="handleUpdateTargetModel"
          @update-start-user="handleUpdateStartUser"
          @add-field-mapping="handleAddFieldMapping"
          @remove-field-mapping="handleRemoveFieldMapping"
          @update-field-mapping="handleUpdateFieldMapping"
          @update-fixed-variables="handleUpdateFixedVariables"
        />
      </div>
    </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="规则列表" name="list">
        <RuleList ref="ruleListRef" @edit-rule="handleEditRule" />
      </el-tab-pane>
      
      <el-tab-pane label="全部触发记录" name="records">
        <TriggerRecords ref="allRecordsRef" />
      </el-tab-pane>
    </el-tabs>
  </div>
  
  <!-- 导入JSON对话框 -->
  <el-dialog v-model="importDialogVisible" title="导入规则JSON" width="60%">
    <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
      <template #title>
        请粘贴完整的规则JSON配置，系统将自动解析并填充到页面中
      </template>
    </el-alert>
    <el-input
      v-model="importJson"
      type="textarea"
      :rows="20"
      placeholder="请粘贴JSON内容..."
      style="font-family: monospace; font-size: 12px;"
    />
    <template #footer>
      <el-button @click="importDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirmImport">
        <Icon icon="ep:check" class="mr-5px" />
        确认导入
      </el-button>
    </template>
  </el-dialog>
  
  <!-- JSON预览对话框 -->
  <el-dialog v-model="previewDialogVisible" title="规则JSON预览" width="60%">
    <el-input
      v-model="previewJson"
      type="textarea"
      :rows="20"
      readonly
      style="font-family: monospace; font-size: 12px;"
    />
    <template #footer>
      <el-button @click="previewDialogVisible = false">关闭</el-button>
      <el-button type="primary" @click="handleCopyJson">复制JSON</el-button>
    </template>
  </el-dialog>
  
  <!-- 保存规则对话框 -->
  <el-dialog v-model="saveDialogVisible" :title="currentRuleId ? '更新规则' : '保存规则'" width="500px">
    <el-form :model="saveForm" label-width="100px">
      <el-form-item label="规则名称" required>
        <el-input
          v-model="saveForm.name"
          placeholder="请输入规则名称"
          clearable
        />
      </el-form-item>
      <el-form-item label="备注信息">
        <el-input
          v-model="saveForm.remark"
          type="textarea"
          :rows="4"
          placeholder="请输入备注信息（可选）"
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="saveDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirmSave">
        <Icon icon="ep:check" class="mr-5px" />
        {{ currentRuleId ? '确认更新' : '确认保存' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ModelLibrary from './components/ModelLibrary.vue'
import MatchCanvas from './components/MatchCanvas.vue'
import TargetMapping from './components/TargetMapping.vue'
import RuleList from './components/RuleList.vue'
import TriggerRecords from './components/TriggerRecords.vue'
import * as ModelFormMatchApi from '@/api/bpm/modelFormMatch'
import * as AutoTriggerApi from '@/api/bpm/modelAutoTrigger'

defineOptions({ name: 'BpmModelAutoTrigger' })

// Tab 切换
const activeTab = ref('config')
const ruleListRef = ref()
const allRecordsRef = ref()

// 当前编辑的规则ID
const currentRuleId = ref<number | undefined>(undefined)

// 规则基本信息
const ruleName = ref('')
const ruleStatus = ref(0)
const ruleRemark = ref('')

// 模型列表
const modelList = ref<ModelFormMatchApi.ModelBasicInfo[]>([])
const modelLoading = ref(false)

// 已选择的模型（用于中间画布）
const selectedModels = ref<AutoTriggerApi.ModelConfig[]>([])

// 模型详情缓存
const modelDetailsMap = ref<Record<string, ModelFormMatchApi.ModelDetailResponse>>({})

// 字段匹配条件
const fieldMatches = ref<AutoTriggerApi.FieldMatch[]>([])

// 目标流程配置
const targetModelKey = ref('')
const targetStartUserId = ref<number>()
const targetFieldMappings = ref<AutoTriggerApi.TargetFieldMapping[]>([])
const targetFixedVariables = ref<Record<string, any>>({})

// JSON预览
const previewDialogVisible = ref(false)
const previewJson = ref('')

// JSON导入
const importDialogVisible = ref(false)
const importJson = ref('')

// 保存规则对话框
const saveDialogVisible = ref(false)
const saveForm = reactive({
  name: '',
  remark: ''
})

// 获取模型列表
const getModelList = async () => {
  modelLoading.value = true
  try {
    const data = await ModelFormMatchApi.getModelList()
    modelList.value = data || []
  } catch (error) {
    console.error('获取模型列表失败:', error)
    ElMessage.error('获取模型列表失败')
  } finally {
    modelLoading.value = false
  }
}

// 获取模型详情
const getModelDetail = async (modelKey: string) => {
  console.log(`getModelDetail 被调用: ${modelKey}`)
  console.log('当前缓存:', Object.keys(modelDetailsMap.value))
  
  if (modelDetailsMap.value[modelKey]) {
    console.log(`使用缓存的模型详情: ${modelKey}`)
    return modelDetailsMap.value[modelKey]
  }
  
  try {
    console.log(`开始请求API获取模型详情: ${modelKey}`)
    const data = await ModelFormMatchApi.getModelDetail(modelKey)
    console.log(`API返回的模型详情:`, data)
    modelDetailsMap.value[modelKey] = data
    console.log(`已保存到缓存: ${modelKey}`)
    return data
  } catch (error) {
    console.error('获取模型详情失败:', error)
    ElMessage.error(`获取模型 ${modelKey} 详情失败`)
    return null
  }
}

// 添加模型到画布
const handleAddModel = async (model: ModelFormMatchApi.ModelBasicInfo) => {
  console.log('handleAddModel 被调用:', model)
  console.log('当前已选择的模型:', selectedModels.value)
  
  // 检查是否已存在
  if (selectedModels.value.some(m => m.modelKey === model.modelKey)) {
    console.log('模型已存在，取消添加')
    ElMessage.warning('该模型已添加')
    return
  }
  
  console.log('开始获取模型详情...')
  // 获取模型详情
  const detail = await getModelDetail(model.modelKey)
  console.log('模型详情获取结果:', detail)
  
  if (!detail) {
    console.error('模型详情获取失败，取消添加')
    ElMessage.error('获取模型详情失败，无法添加')
    return
  }
  
  // 添加到已选择列表
  const newModel = {
    modelKey: model.modelKey,
    statuses: undefined,
    fieldAliases: {},
    conditions: []
  }
  console.log('准备添加新模型:', newModel)
  selectedModels.value.push(newModel)
  console.log('添加后的模型列表:', selectedModels.value)
  console.log('模型详情Map:', modelDetailsMap.value)
  
  ElMessage.success(`已添加模型: ${model.modelName}`)
}

// 移除模型
const handleRemoveModel = (modelKey: string) => {
  const index = selectedModels.value.findIndex(m => m.modelKey === modelKey)
  if (index > -1) {
    const modelName = modelDetailsMap.value[modelKey]?.modelName || modelKey
    selectedModels.value.splice(index, 1)
    
    // 清理相关的字段匹配和映射
    fieldMatches.value = fieldMatches.value.filter(fm => {
      const model = selectedModels.value.find(m => 
        m.fieldAliases && Object.values(m.fieldAliases).includes(fm.field)
      )
      return model !== undefined
    })
    
    targetFieldMappings.value = targetFieldMappings.value.filter(
      tfm => tfm.sourceModelKey !== modelKey
    )
    
    ElMessage.success(`已移除模型: ${modelName}`)
  }
}

// 添加字段匹配
const handleAddMatch = (match: AutoTriggerApi.FieldMatch) => {
  fieldMatches.value.push(match)
}

// 移除字段匹配
const handleRemoveMatch = (index: number) => {
  console.log('主页面: 删除匹配条件', index, '当前数量:', fieldMatches.value.length)
  if (index >= 0 && index < fieldMatches.value.length) {
    const removed = fieldMatches.value[index]
    fieldMatches.value.splice(index, 1)
    console.log('删除成功:', removed, '剩余数量:', fieldMatches.value.length)
    ElMessage.success('已删除匹配条件')
  } else {
    console.error('删除失败: 索引越界', index)
    ElMessage.error('删除失败')
  }
}

// 更新模型状态
const handleUpdateModelStatus = (modelKey: string, statuses: number[]) => {
  const model = selectedModels.value.find(m => m.modelKey === modelKey)
  if (model) {
    model.statuses = statuses.length > 0 ? statuses : undefined
  }
}

// 更新字段别名
const handleUpdateFieldAlias = (modelKey: string, alias: string, field: string) => {
  const model = selectedModels.value.find(m => m.modelKey === modelKey)
  if (model) {
    if (!model.fieldAliases) {
      model.fieldAliases = {}
    }
    model.fieldAliases[alias] = field
  }
}

// ==================== 字段条件相关 ====================

// 添加条件
const handleAddCondition = (modelKey: string, condition: AutoTriggerApi.FieldCondition) => {
  const model = selectedModels.value.find(m => m.modelKey === modelKey)
  if (model) {
    if (!model.conditions) {
      model.conditions = []
    }
    model.conditions.push(condition)
    console.log(`已为模型 ${modelKey} 添加条件:`, condition)
  }
}

// 更新条件
const handleUpdateCondition = (modelKey: string, index: number, condition: AutoTriggerApi.FieldCondition) => {
  const model = selectedModels.value.find(m => m.modelKey === modelKey)
  if (model && model.conditions && model.conditions[index]) {
    model.conditions[index] = condition
    console.log(`已更新模型 ${modelKey} 的条件 ${index}:`, condition)
  }
}

// 删除条件
const handleRemoveCondition = (modelKey: string, index: number) => {
  const model = selectedModels.value.find(m => m.modelKey === modelKey)
  if (model && model.conditions) {
    model.conditions.splice(index, 1)
    console.log(`已删除模型 ${modelKey} 的条件 ${index}`)
  }
}

// 更新目标模型
const handleUpdateTargetModel = (modelKey: string) => {
  targetModelKey.value = modelKey
}

// 更新发起人
const handleUpdateStartUser = (userId: number) => {
  targetStartUserId.value = userId
}

// 添加字段映射
const handleAddFieldMapping = (mapping: AutoTriggerApi.TargetFieldMapping) => {
  targetFieldMappings.value.push(mapping)
}

// 移除字段映射
const handleRemoveFieldMapping = (index: number) => {
  targetFieldMappings.value.splice(index, 1)
}

// 更新字段映射
const handleUpdateFieldMapping = (index: number, field: string, value: string) => {
  if (targetFieldMappings.value[index]) {
    targetFieldMappings.value[index][field] = value
  }
}

// 更新固定变量
const handleUpdateFixedVariables = (variables: Record<string, any>) => {
  targetFixedVariables.value = variables
}

// 构建规则对象
const buildRuleObject = (): AutoTriggerApi.AutoTriggerRule => {
  return {
    name: ruleName.value,
    status: ruleStatus.value,
    models: selectedModels.value.map(m => ({
      modelKey: m.modelKey,
      statuses: m.statuses,
      fieldAliases: m.fieldAliases && Object.keys(m.fieldAliases).length > 0 ? m.fieldAliases : undefined,
      conditions: m.conditions && m.conditions.length > 0 ? m.conditions : undefined
    })),
    fieldMatches: fieldMatches.value,
    targetProcessDefinitionKey: targetModelKey.value,
    targetStartUserId: targetStartUserId.value!,
    targetFixedVariables: Object.keys(targetFixedVariables.value).length > 0 ? targetFixedVariables.value : undefined,
    targetFieldMappings: targetFieldMappings.value,
    remark: ruleRemark.value || undefined
  }
}

// 验证规则
const validateRule = (): boolean => {
  if (!ruleName.value) {
    ElMessage.warning('请输入规则名称')
    return false
  }
  
/*  if (selectedModels.value.length < 2) {
    ElMessage.warning('至少需要选择2个模型')
    return false
  }*/
  
/*  if (fieldMatches.value.length === 0) {
    ElMessage.warning('请至少添加一个字段匹配条件')
    return false
  }*/
  
  if (!targetModelKey.value) {
    ElMessage.warning('请选择目标流程模型')
    return false
  }
  
  if (!targetStartUserId.value) {
    ElMessage.warning('请选择发起人')
    return false
  }
  
  return true
}

// 保存规则
const handleSave = () => {
  // 先显示对话框，让用户输入/修改规则名称和备注
  saveForm.name = ruleName.value
  saveForm.remark = ruleRemark.value
  saveDialogVisible.value = true
}

// 确认保存
const handleConfirmSave = async () => {
  // 更新规则名称和备注
  ruleName.value = saveForm.name.trim()
  ruleRemark.value = saveForm.remark.trim()
  
  // 关闭对话框
  saveDialogVisible.value = false
  
  // 进行校验
  if (!validateRule()) {
    return
  }
  
  try {
    const rule = buildRuleObject()
    const isUpdate = !!currentRuleId.value
    
    // 根据是否有 currentRuleId 判断是新增还是更新
    if (isUpdate) {
      rule.id = currentRuleId.value
      await AutoTriggerApi.updateAutoTriggerRule(rule)
      ElMessage.success('规则更新成功')
      
      // 更新完成后自动重置，防止用户误以为是新增规则
      await resetConfig()
    } else {
      await AutoTriggerApi.createAutoTriggerRule(rule)
      ElMessage.success('规则保存成功')
    }
    
    // 刷新列表（如果在列表页）
    if (ruleListRef.value) {
      ruleListRef.value.handleQuery()
    }
    
    // 切换到列表页
    activeTab.value = 'list'
  } catch (error) {
    console.error('保存规则失败:', error)
    ElMessage.error('保存规则失败')
  }
}

// 导入JSON
const handleImport = () => {
  importJson.value = ''
  importDialogVisible.value = true
}

// 确认导入JSON
const handleConfirmImport = async () => {
  if (!importJson.value.trim()) {
    ElMessage.warning('请输入JSON内容')
    return
  }
  
  try {
    console.log('开始解析导入的JSON...')
    const rule = JSON.parse(importJson.value) as AutoTriggerApi.AutoTriggerRule
    console.log('解析成功:', rule)
    
    // 验证必要字段
    if (!rule.name || !rule.models || !rule.targetProcessDefinitionKey || !rule.targetStartUserId) {
      ElMessage.error('JSON格式不完整，缺少必要字段')
      return
    }
    
    // 确认导入
    await ElMessageBox.confirm(
      `确认导入规则"${rule.name}"吗？这将覆盖当前配置。`,
      '确认导入',
      {
        type: 'warning',
        confirmButtonText: '确认导入',
        cancelButtonText: '取消'
      }
    )
    
    console.log('用户确认导入，开始填充数据...')
    
    // 先重置配置（确保清空 currentRuleId，导入的规则应该是新增）
    resetConfig()
    
    // 填充基本信息
    ruleName.value = rule.name || ''
    ruleStatus.value = rule.status ?? 0
    ruleRemark.value = rule.remark || ''
    
    console.log('基本信息填充完成')
    
    // 填充模型列表（需要异步加载模型详情）
    selectedModels.value = []
    modelDetailsMap.value = {}
    
    for (const modelConfig of rule.models) {
      console.log(`加载模型: ${modelConfig.modelKey}`)
      const detail = await getModelDetail(modelConfig.modelKey)
      if (detail) {
        selectedModels.value.push({
          modelKey: modelConfig.modelKey,
          statuses: modelConfig.statuses,
          fieldAliases: modelConfig.fieldAliases || {},
          conditions: modelConfig.conditions || []
        })
        console.log(`模型 ${modelConfig.modelKey} 加载成功`)
      } else {
        console.warn(`模型 ${modelConfig.modelKey} 加载失败，跳过`)
      }
    }
    
    console.log('模型列表填充完成:', selectedModels.value)
    
    // 填充字段匹配
    fieldMatches.value = rule.fieldMatches || []
    console.log('字段匹配填充完成:', fieldMatches.value)
    
    // 填充目标流程配置
    targetModelKey.value = rule.targetProcessDefinitionKey
    targetStartUserId.value = rule.targetStartUserId
    targetFieldMappings.value = rule.targetFieldMappings || []
    targetFixedVariables.value = rule.targetFixedVariables || {}
    
    console.log('目标流程配置填充完成')
    
    importDialogVisible.value = false
    ElMessage.success('导入成功！')
    
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    console.error('导入失败:', error)
    if (error instanceof SyntaxError) {
      ElMessage.error('JSON格式错误，请检查格式是否正确')
    } else {
      ElMessage.error('导入失败: ' + (error.message || '未知错误'))
    }
  }
}

// 预览JSON
const handlePreview = () => {
  const rule = buildRuleObject()
  previewJson.value = JSON.stringify(rule, null, 2)
  previewDialogVisible.value = true
}

// 复制JSON
const handleCopyJson = async () => {
  try {
    // 使用 Clipboard API
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(previewJson.value)
      ElMessage.success('已复制到剪贴板')
    } else {
      // 降级方案：使用 execCommand
      const textArea = document.createElement('textarea')
      textArea.value = previewJson.value
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        ElMessage.success('已复制到剪贴板')
      } else {
        ElMessage.error('复制失败')
      }
    }
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

// 手动触发检测（根据当前模式决定触发单个规则还是所有规则）
const handleEvaluate = async () => {
  const isEditMode = !!currentRuleId.value
  const confirmMessage = isEditMode 
    ? `确认立即触发当前编辑的规则（ID: ${currentRuleId.value}）吗？` 
    : '确认立即触发所有启用的规则吗？'
  
  try {
    await ElMessageBox.confirm(confirmMessage, '提示', {
      type: 'warning',
      confirmButtonText: '确认触发',
      cancelButtonText: '取消'
    })
    
    // 根据是否在编辑模式决定传入 id 参数
    await AutoTriggerApi.evaluateAutoTriggerRule(isEditMode ? currentRuleId.value : undefined)
    
    const successMessage = isEditMode 
      ? '当前规则触发成功，请稍后查看触发记录' 
      : '触发检测成功，请稍后查看触发记录'
    ElMessage.success(successMessage)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('触发检测失败:', error)
      ElMessage.error('触发检测失败')
    }
  }
}

// 重置配置（核心逻辑，供多处调用）
const resetConfig = () => {
  console.log('开始重置，当前状态:', {
    selectedModels: selectedModels.value.length,
    fieldMatches: fieldMatches.value.length,
    targetFieldMappings: targetFieldMappings.value.length
  })
  
  // 清空编辑状态
  currentRuleId.value = undefined
  ruleName.value = ''
  ruleStatus.value = 0
  ruleRemark.value = ''
  selectedModels.value = []
  modelDetailsMap.value = {} // 清空模型详情缓存
  fieldMatches.value = []
  targetModelKey.value = ''
  targetStartUserId.value = undefined
  targetFieldMappings.value = []
  targetFixedVariables.value = {}
  
  console.log('重置完成，当前状态:', {
    selectedModels: selectedModels.value.length,
    fieldMatches: fieldMatches.value.length,
    targetFieldMappings: targetFieldMappings.value.length
  })
}

// 重置按钮处理（带确认）
const handleReset = async () => {
  try {
    await ElMessageBox.confirm('确认重置所有配置吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确认重置',
      cancelButtonText: '取消'
    })
    
    resetConfig()
    ElMessage.success('已重置所有配置')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置失败:', error)
    }
  }
}

// Tab 切换处理
const handleTabChange = (tabName: string) => {
  console.log('切换到 Tab:', tabName)
  if (tabName === 'list' && ruleListRef.value) {
    // 切换到列表页时刷新列表
    nextTick(() => {
      ruleListRef.value.handleQuery()
    })
  } else if (tabName === 'records' && allRecordsRef.value) {
    // 切换到全部触发记录页时刷新记录
    nextTick(() => {
      allRecordsRef.value.loadRecords()
    })
  }
}

// 编辑规则
const handleEditRule = async (ruleId: number) => {
  try {
    console.log('加载规则:', ruleId)
    const rule = await AutoTriggerApi.getAutoTriggerRule(ruleId)
    console.log('规则详情:', rule)
    
    // 设置当前编辑的规则ID
    currentRuleId.value = ruleId
    
    // 填充基本信息
    ruleName.value = rule.name || ''
    ruleStatus.value = rule.status ?? 0
    ruleRemark.value = rule.remark || ''
    
    console.log('基本信息填充完成')
    
    // 填充模型列表（需要异步加载模型详情）
    selectedModels.value = []
    modelDetailsMap.value = {}
    
    for (const modelConfig of rule.models) {
      console.log(`加载模型: ${modelConfig.modelKey}`)
      const detail = await getModelDetail(modelConfig.modelKey)
      if (detail) {
        selectedModels.value.push({
          modelKey: modelConfig.modelKey,
          statuses: modelConfig.statuses,
          fieldAliases: modelConfig.fieldAliases || {},
          conditions: modelConfig.conditions || []
        })
        console.log(`模型 ${modelConfig.modelKey} 加载成功`)
      } else {
        console.warn(`模型 ${modelConfig.modelKey} 加载失败，跳过`)
      }
    }
    
    console.log('模型列表填充完成:', selectedModels.value)
    
    // 填充字段匹配
    fieldMatches.value = rule.fieldMatches || []
    console.log('字段匹配填充完成:', fieldMatches.value)
    
    // 填充目标流程配置
    targetModelKey.value = rule.targetProcessDefinitionKey
    targetStartUserId.value = rule.targetStartUserId
    targetFieldMappings.value = rule.targetFieldMappings || []
    targetFixedVariables.value = rule.targetFixedVariables || {}
    
    console.log('目标流程配置填充完成')
    
    // 切换到配置页
    activeTab.value = 'config'
    
    ElMessage.success('规则加载成功，可以开始编辑')
  } catch (error) {
    console.error('加载规则失败:', error)
    ElMessage.error('加载规则失败')
  }
}

// 初始化
onMounted(() => {
  getModelList()
})
</script>

<style lang="scss" scoped>
.auto-trigger-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  background-color: var(--el-bg-color);
  border-radius: 8px;
  overflow: hidden;
  
  .trigger-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
    
    :deep(.el-tabs__header) {
      margin: 0;
      background-color: var(--el-bg-color-overlay);
      padding: 0 20px;
      border-bottom: 1px solid var(--el-border-color-light);
    }
    
    :deep(.el-tabs__content) {
      flex: 1;
      overflow: hidden;
      
      .el-tab-pane {
        height: 100%;
        overflow: hidden;
      }
    }
  }
  
  .config-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  
  .trigger-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color-overlay);
    
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .toolbar-right {
      display: flex;
      gap: 12px;
    }
  }
  
  .trigger-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    
    .trigger-left {
      width: 280px;
      border-right: 1px solid var(--el-border-color-light);
      background-color: var(--el-bg-color-overlay);
      overflow: hidden;
    }
    
    .trigger-center {
      flex: 1;
      background-color: var(--el-fill-color-extra-light);
      overflow: hidden;
    }
    
    .trigger-right {
      width: 420px;
      border-left: 1px solid var(--el-border-color-light);
      background-color: var(--el-bg-color-overlay);
      overflow: hidden;
    }
  }
  }
}
</style>

