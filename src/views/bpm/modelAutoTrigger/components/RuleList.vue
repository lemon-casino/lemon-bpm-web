<template>
  <div class="rule-list-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="queryParams" class="query-form">
        <el-form-item label="规则名称">
          <el-input
            v-model="queryParams.name"
            placeholder="请输入规则名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <el-option label="启用" :value="0" />
            <el-option label="停用" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <Icon icon="ep:search" class="mr-5px" />
            搜索
          </el-button>
          <el-button @click="handleReset">
            <Icon icon="ep:refresh" class="mr-5px" />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 表格 -->
    <div class="table-container">
      <el-table
        v-loading="loading"
        :data="ruleList"
        stripe
        border
        style="width: 100%"
        height="100%"
      >
        <el-table-column prop="id" label="规则ID" width="80" align="center" />
        <el-table-column prop="name" label="规则名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status"
              :active-value="0"
              :inactive-value="1"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="参与模型" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ row.models?.length || 0 }} 个
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetProcessDefinitionKey" label="目标流程" min-width="150" show-overflow-tooltip />
        <el-table-column label="字段映射" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small">
              {{ row.targetFieldMappings?.length || 0 }} 条
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="160" align="center">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
            >
              <Icon icon="ep:edit" class="mr-5px" />
              编辑
            </el-button>
            <el-button
              type="success"
              link
              size="small"
              @click="handleViewRecords(row)"
            >
              <Icon icon="ep:document" class="mr-5px" />
              触发记录
            </el-button>
            <el-button
              type="warning"
              link
              size="small"
              @click="handleEvaluate(row)"
            >
              <Icon icon="ep:promotion" class="mr-5px" />
              立即触发
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
            >
              <Icon icon="ep:delete" class="mr-5px" />
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="queryParams.pageNo"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleQuery"
        @current-change="handleQuery"
      />
    </div>
    
    <!-- 触发记录对话框 -->
    <el-dialog
      v-model="recordDialogVisible"
      :title="`触发记录 - ${currentRuleName}`"
      width="80%"
      top="5vh"
    >
      <TriggerRecords
        v-if="recordDialogVisible"
        :rule-id="currentRuleId"
      />
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate } from '@/utils/formatTime'
import * as AutoTriggerApi from '@/api/bpm/modelAutoTrigger'
import TriggerRecords from './TriggerRecords.vue'

interface Emits {
  (e: 'edit-rule', ruleId: number): void
}

const emit = defineEmits<Emits>()

// 查询参数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 20,
  name: '',
  status: undefined as number | undefined
})

// 列表数据
const loading = ref(false)
const ruleList = ref<AutoTriggerApi.AutoTriggerRule[]>([])
const total = ref(0)

// 触发记录对话框
const recordDialogVisible = ref(false)
const currentRuleId = ref<number>(0)
const currentRuleName = ref('')

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '-'
  return formatDate(new Date(time), 'YYYY-MM-DD HH:mm:ss')
}

// 查询列表
const handleQuery = async () => {
  loading.value = true
  try {
    const res = await AutoTriggerApi.getAutoTriggerRulePage(queryParams)
    ruleList.value = res.list || []
    total.value = res.total || 0
  } catch (error) {
    console.error('查询规则列表失败:', error)
    ElMessage.error('查询规则列表失败')
  } finally {
    loading.value = false
  }
}

// 重置查询
const handleReset = () => {
  queryParams.pageNo = 1
  queryParams.pageSize = 20
  queryParams.name = ''
  queryParams.status = undefined
  handleQuery()
}

// 状态切换
const handleStatusChange = async (row: AutoTriggerApi.AutoTriggerRule) => {
  const newStatus = row.status === 0 ? 1 : 0
  const statusText = newStatus === 0 ? '启用' : '停用'
  
  try {
    await ElMessageBox.confirm(`确认${statusText}规则"${row.name}"吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    
    await AutoTriggerApi.updateAutoTriggerRuleStatus(row.id!, newStatus)
    row.status = newStatus
    ElMessage.success(`${statusText}成功`)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新状态失败:', error)
      ElMessage.error('更新状态失败')
    }
  }
}

// 编辑规则
const handleEdit = (row: AutoTriggerApi.AutoTriggerRule) => {
  emit('edit-rule', row.id!)
}

// 查看触发记录
const handleViewRecords = (row: AutoTriggerApi.AutoTriggerRule) => {
  currentRuleId.value = row.id!
  currentRuleName.value = row.name
  recordDialogVisible.value = true
}

// 立即触发
const handleEvaluate = async (row: AutoTriggerApi.AutoTriggerRule) => {
  try {
    await ElMessageBox.confirm(`确认立即触发规则"${row.name}"吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    
    await AutoTriggerApi.evaluateAutoTriggerRule(row.id!)
    ElMessage.success('触发成功，请稍后查看触发记录')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('触发失败:', error)
      ElMessage.error('触发失败')
    }
  }
}

// 删除规则
const handleDelete = async (row: AutoTriggerApi.AutoTriggerRule) => {
  try {
    await ElMessageBox.confirm(
      `确认删除规则"${row.name}"吗？删除后无法恢复！`,
      '警告',
      {
        type: 'error',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    )
    
    await AutoTriggerApi.deleteAutoTriggerRule(row.id!)
    ElMessage.success('删除成功')
    handleQuery()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 初始化
onMounted(() => {
  handleQuery()
})

// 暴露刷新方法供父组件调用
defineExpose({
  handleQuery
})
</script>

<style lang="scss" scoped>
.rule-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color);
  
  .search-bar {
    padding: 16px;
    background-color: var(--el-bg-color-overlay);
    border-bottom: 1px solid var(--el-border-color-light);
    
    .query-form {
      margin: 0;
      
      :deep(.el-form-item) {
        margin-bottom: 0;
      }
    }
  }
  
  .table-container {
    flex: 1;
    padding: 16px;
    overflow: hidden;
  }
  
  .pagination-container {
    padding: 16px;
    background-color: var(--el-bg-color-overlay);
    border-top: 1px solid var(--el-border-color-light);
    display: flex;
    justify-content: flex-end;
  }
}
</style>

