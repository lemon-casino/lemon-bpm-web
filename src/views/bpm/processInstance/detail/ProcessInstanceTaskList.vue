<template>
  <div class="task-list-container">
    <!-- 桌面端表格视图 -->
    <el-table :data="tasks" border header-cell-class-name="table-header-gray" class="desktop-table">
      <el-table-column label="审批节点" prop="name" min-width="120" align="center" />
      <el-table-column label="审批人" min-width="100" align="center">
        <template #default="scope">
          {{ scope.row.assigneeUser?.nickname || scope.row.ownerUser?.nickname }}
        </template>
      </el-table-column>
      <el-table-column
        :formatter="dateFormatter"
        align="center"
        label="开始时间"
        prop="createTime"
        min-width="140"
      />
      <el-table-column
        :formatter="dateFormatter"
        align="center"
        label="结束时间"
        prop="endTime"
        min-width="140"
      />
      <el-table-column align="center" label="审批状态" prop="status" min-width="90">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.BPM_TASK_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column align="center" label="审批建议" prop="reason" min-width="200">
        <template #default="scope">
          {{ scope.row.reason }}
          <el-button
            class="ml-10px"
            size="small"
            v-if="scope.row.formId > 0"
            @click="handleFormDetail(scope.row)"
          >
            <Icon icon="ep:document" /> 查看表单
          </el-button>
        </template>
      </el-table-column>
      <el-table-column align="center" label="耗时" prop="durationInMillis" min-width="100">
        <template #default="scope">
          {{ formatPast2(scope.row.durationInMillis) }}
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 移动端卡片视图 -->
    <div class="mobile-card-view" style="margin-bottom: 80px">
      <div v-for="(task, index) in tasks" :key="index" class="task-card">
        <!-- 卡片头部 -->
        <div class="task-card-header">
          <div class="task-node-name">
            <Icon icon="ep:user" class="task-icon" />
            <span class="node-name-text">{{ task.name }}</span>
          </div>
          <dict-tag :type="DICT_TYPE.BPM_TASK_STATUS" :value="task.status" />
        </div>
        
        <!-- 卡片内容 -->
        <div class="task-card-content">
          <!-- 审批人信息 -->
          <div class="info-row">
            <span class="info-label">审批人:</span>
            <span class="info-value">{{ task.assigneeUser?.nickname || task.ownerUser?.nickname || '未指定' }}</span>
          </div>
          
          <!-- 时间信息 -->
          <div class="info-row">
            <span class="info-label">开始时间:</span>
            <span class="info-value">{{ dateFormatter(null, null, task.createTime) }}</span>
          </div>
          
          <div v-if="task.endTime" class="info-row">
            <span class="info-label">结束时间:</span>
            <span class="info-value">{{ dateFormatter(null, null, task.endTime) }}</span>
          </div>
          
          <!-- 耗时信息 -->
          <div class="info-row">
            <span class="info-label">耗时:</span>
            <span class="info-value">{{ formatPast2(task.durationInMillis) }}</span>
          </div>
          
          <!-- 审批建议 -->
          <div v-if="task.reason" class="info-row reason-row">
            <span class="info-label">审批建议:</span>
            <span class="info-value reason-text">{{ task.reason }}</span>
          </div>
        </div>
        
        <!-- 卡片操作 -->
        <div v-if="task.formId > 0" class="task-card-actions">
          <el-button
            size="small"
            type="primary"
            @click="handleFormDetail(task)"
          >
            <Icon icon="ep:document" class="mr-5px" />
            查看表单
          </el-button>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="tasks.length === 0" class="empty-state">
        <el-empty description="暂无流转记录" />
      </div>
    </div>
  </div>

  <!-- 弹窗：表单 -->
  <Dialog title="表单详情" v-model="taskFormVisible" width="600">
    <form-create
      ref="fApi"
      v-model="taskForm.value"
      :option="taskForm.option"
      :rule="taskForm.rule"
    />
  </Dialog>
</template>
<script lang="ts" setup>
import { dateFormatter, formatPast2 } from '@/utils/formatTime'
import { propTypes } from '@/utils/propTypes'
import { DICT_TYPE } from '@/utils/dict'
import type { ApiAttrs } from '@form-create/element-ui/types/config'
import { setConfAndFields2 } from '@/utils/formCreate'
import * as TaskApi from '@/api/bpm/task'

defineOptions({ name: 'BpmProcessInstanceTaskList' })

const props = defineProps({
  loading: propTypes.bool.def(false), // 是否加载中
  id: propTypes.string // 流程实例的编号
})
const tasks = ref([]) // 流程任务的数组

/** 查看表单 */
const fApi = ref<ApiAttrs>() // form-create 的 API 操作类
const taskForm = ref({
  rule: [],
  option: {},
  value: {}
}) // 流程任务的表单详情
const taskFormVisible = ref(false)
const handleFormDetail = async (row: any) => {
  // 设置表单
  setConfAndFields2(taskForm, row.formConf, row.formFields, row.formVariables)
  // 弹窗打开
  taskFormVisible.value = true
  // 隐藏提交、重置按钮，设置禁用只读
  await nextTick()
  fApi.value.fapi.btn.show(false)
  fApi.value?.fapi?.resetBtn.show(false)
  fApi.value?.fapi?.disabled(true)
}

/** 只有 loading 完成时，才去加载流程列表 */
watch(
  () => props.loading,
  async (value) => {
    if (value) {
      tasks.value = await TaskApi.getTaskListByProcessInstanceId(props.id)
    }
  }
)
</script>

<style lang="scss" scoped>
.task-list-container {
  width: 100%;
  
  /* 桌面端表格显示，移动端隐藏 */
  .desktop-table {
    display: table;
  }
  
  /* 移动端卡片视图隐藏，桌面端显示 */
  .mobile-card-view {
    display: none;
  }
  
  /* 移动端适配 */
  @media (max-width: 768px) {
    .desktop-table {
      display: none;
    }
    
    .mobile-card-view {
      display: block;
      padding: 0 4px;

    }
  }
}

/* 移动端任务卡片样式 */
.task-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
}

/* 任务卡片头部 */
.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
  
  .task-node-name {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0; // 允许文字截断
    
    .task-icon {
      color: var(--el-color-primary);
      margin-right: 8px;
      font-size: 16px;
      flex-shrink: 0;
    }
    
    .node-name-text {
      font-weight: 500;
      font-size: 14px;
      color: var(--el-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  :deep(.el-tag) {
    flex-shrink: 0;
    margin-left: 8px;
  }
}

/* 任务卡片内容 */
.task-card-content {
  padding: 12px 16px;
  
  .info-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 8px;
    font-size: 13px;
    line-height: 1.4;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .info-label {
      color: var(--el-text-color-secondary);
      font-weight: 500;
      min-width: 70px;
      flex-shrink: 0;
      margin-right: 8px;
    }
    
    .info-value {
      color: var(--el-text-color-primary);
      flex: 1;
      word-break: break-word;
    }
    
    &.reason-row {
      align-items: flex-start;
      
      .reason-text {
        background: var(--el-fill-color-light);
        padding: 6px 8px;
        border-radius: 4px;
        font-size: 12px;
        line-height: 1.3;
        border-left: 3px solid var(--el-color-primary);
      }
    }
  }
}

/* 任务卡片操作区域 */
.task-card-actions {
  padding: 8px 16px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
  
  .el-button {
    width: 100%;
    
    .mr-5px {
      margin-right: 5px;
    }
  }
}

/* 空状态样式 */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

/* 移动端触摸优化 */
@media (max-width: 768px) {
  .task-card {
    margin-bottom: 10px;
    border-radius: 6px;
    
    /* 触摸反馈 */
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  .task-card-header {
    padding: 10px 12px;
    
    .node-name-text {
      font-size: 13px;
    }
    
    .task-icon {
      font-size: 14px;
    }
  }
  
  .task-card-content {
    padding: 10px 12px;
    
    .info-row {
      font-size: 12px;
      margin-bottom: 6px;
      
      .info-label {
        min-width: 60px;
        font-size: 12px;
      }
      
      &.reason-row .reason-text {
        font-size: 11px;
        padding: 4px 6px;
      }
    }
  }
  
  .task-card-actions {
    padding: 6px 12px 8px;
    
    .el-button {
      font-size: 12px;
      padding: 6px 12px;
      min-height: 28px;
    }
  }
  
  .empty-state {
    padding: 30px 15px;
  }
}

/* 极小屏幕适配 */
@media (max-width: 480px) {
  .task-card {
    margin-bottom: 8px;
    border-radius: 4px;
  }
  
  .task-card-header {
    padding: 8px 10px;
    
    .node-name-text {
      font-size: 12px;
    }
  }
  
  .task-card-content {
    padding: 8px 10px;
    
    .info-row {
      font-size: 11px;
      margin-bottom: 5px;
      
      .info-label {
        min-width: 55px;
        font-size: 11px;
      }
      
      &.reason-row .reason-text {
        font-size: 10px;
        padding: 3px 5px;
      }
    }
  }
  
  .task-card-actions {
    padding: 5px 10px 6px;
    
    .el-button {
      font-size: 11px;
      padding: 4px 8px;
      min-height: 24px;
    }
  }
}

/* 暗黑模式适配 */
:deep(.dark) {
  .task-card {
    background: var(--el-bg-color-overlay);
    border-color: var(--el-border-color-darker);
    
    .task-card-header {
      background: var(--el-fill-color-darker);
      border-bottom-color: var(--el-border-color-darker);
    }
    
    .task-card-actions {
      background: var(--el-fill-color-darker);
      border-top-color: var(--el-border-color-darker);
    }
    
    .reason-text {
      background: var(--el-fill-color-darker) !important;
    }
  }
}
</style>
