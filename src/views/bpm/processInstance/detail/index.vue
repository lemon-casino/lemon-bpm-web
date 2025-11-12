<template>
  <ContentWrap 
    :bodyStyle="{ 
      padding: isMobile ? '8px 12px 0' : '10px 20px 0' 
    }" 
    class="position-relative mobile-optimized"
  >
    <div class="processInstance-wrap-main">
      <el-scrollbar class="main-scrollbar" :class="{ 'full-height': shouldHideButtonContainer && isMobile }">
        <img
          class="position-absolute right-20px status-icon"
          width="150"
          :src="auditIconsMap[processInstance.status]"
          alt=""
        />
        <div class="text-#878c93 process-id" :class="isMobile ? 'h-auto' : 'h-15px'">
          <span class="process-id-text">
            编号：{{ id }}
            <span class="version-tag" v-if="processDefinition?.version">
              <span class="px-2 py-1 rounded-full font-bold" :class="isMobile ? 'text-xs' : 'text-sm'">
                版本：{{ processDefinition.version }}
              </span>
            </span>
          </span>
        </div>
        <el-divider class="divider" :class="isMobile ? '!my-6px' : '!my-8px'" />
        <div class="title-status-container">
          <div class="font-bold mb-5px process-title" :class="isMobile ? 'text-20px' : 'text-26px'">
            {{ processInstance.name }}
          </div>
          <div class="status-container">
            <dict-tag
              v-if="processInstance.status"
              :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS"
              :value="processInstance.status"
              class="status-tag"
            />
            <img
              class="status-icon-mini ml-2"
              width="24"
              :src="auditIconsMap[processInstance.status]"
              alt=""
            />
            <el-button
              type="primary"
              link
              class="share-button"
              title="分享"
              @click="handleShare"
            >
              <el-icon class="mr-5px"><Share /></el-icon>
              <span>分享</span>
            </el-button>
            
            <el-button
              type="success"
              link
              class="browser-button"
              title="在浏览器中打开"
              @click="openInBrowser"
            >
              <el-icon class="mr-5px"><Link /></el-icon>
              <span>在浏览器打开</span>
            </el-button>
          </div>
        </div>

        <div 
          class="flex items-center mb-10px user-info-container" 
          :class="isMobile ? 'gap-3 text-12px h-auto flex-col items-start' : 'gap-5 text-13px h-35px'"
        >
          <div
            class="bg-gray-100 rounded-3xl flex items-center gap-2 dark:color-gray-600 user-avatar-container"
            :class="isMobile ? 'h-32px p-6px' : 'h-35px p-8px'"
          >
            <el-avatar
              v-if="processInstance?.startUser?.avatar"
              :src="processInstance?.startUser?.avatar"
              class="user-avatar"
              :size="isMobile ? 24 : 28"
            />
            <el-avatar 
              v-else-if="processInstance?.startUser?.nickname" 
              class="user-avatar"
              :size="isMobile ? 24 : 28"
            >
              {{ processInstance?.startUser?.nickname.substring(0, 1) }}
            </el-avatar>
            <span class="user-nickname">{{ processInstance?.startUser?.nickname }}</span>
          </div>
          <div class="text-#878c93 submit-time"> 
            {{ formatDate(processInstance.startTime) }} 提交 
          </div>
        </div>

        <el-tabs v-model="activeTab" class="process-tabs">
          <!-- 表单信息 -->
          <el-tab-pane label="审批详情" name="form">
            <div class="form-scroll-area">
              <el-scrollbar>
                <el-row :gutter="isMobile ? 0 : 10">
                  <!-- 表单信息 - 响应式布局：在小屏幕下占满宽度 -->
                  <el-col :xs="24" :sm="24" :md="17" :lg="17" :xl="17" class="!flex !flex-col formCol" :class="isMobile ? 'mobile-form-col' : ''">
                    <!-- 表单信息 -->
                    <div
                      v-loading="processInstanceLoading"
                      class="form-box flex flex-col mb-30px flex-1"
                    >
                      <!-- 情况一：流程表单 -->
                      <el-col v-if="processDefinition?.formType === BpmModelFormType.NORMAL">
                        <form-create
                          v-model="detailForm.value"
                          v-model:api="fApi"
                          :option="detailForm.option"
                          :rule="detailForm.rule"
                          class="form-component"
                        />
                      </el-col>
                      <!-- 情况二：业务表单 -->
                      <div v-if="processDefinition?.formType === BpmModelFormType.CUSTOM">
                        <BusinessFormComponent :id="processInstance.businessKey" />
                      </div>
                    </div>
                  </el-col>
                  <!-- 审批记录时间线 - 响应式布局 -->
                  <el-col :xs="24" :sm="24" :md="7" :lg="7" :xl="7" class="timeline-col" :class="isMobile ? 'mobile-timeline-col' : ''">
                    <!-- 审批记录时间线 -->
                    <ProcessInstanceTimeline 
                      :activity-nodes="activityNodes" 
                      @select-user-confirm="selectUserConfirm"
                    />
                    
                    <!-- 评论列表 -->
                    <div class="comments-section" :class="isMobile ? 'mt-15px' : 'mt-20px'">
                      <div class="comments-header flex justify-between items-center" :class="isMobile ? 'mb-8px' : 'mb-10px'">
                        <h3 class="font-bold" :class="isMobile ? 'text-14px' : 'text-16px'">流程评论</h3>
                        <el-button 
                          type="primary" 
                          :size="isMobile ? 'small' : 'small'" 
                          @click="openCommentDialog"
                          :class="isMobile ? 'mobile-add-comment-btn' : ''"
                        >
                          <el-icon :class="isMobile ? 'mr-3px' : 'mr-5px'"><Plus /></el-icon>
                          <span v-if="!isMobile">添加评论</span>
                          <span v-else>评论</span>
                        </el-button>
                      </div>
                      <div 
                        class="comments-list" 
                        v-loading="commentsLoading" 
                        element-loading-text="评论加载中..."
                      >
                        <div v-if="!commentsLoading && commentList.length === 0" class="comments-empty">
                          <el-empty description="暂无评论" />
                        </div>
                        <div v-else class="comments-items">
                          <div v-for="(item, index) in commentList" :key="index" class="comment-item" :class="isMobile ? 'mobile-comment-item' : ''">
                            <div class="comment-header">
                              <div class="comment-user">
                                <el-avatar :size="isMobile ? 28 : 32" :src="item.userAvatar">
                                  {{ item.userNickname?.substring(0, 1) }}
                                </el-avatar>
                                <div class="comment-user-info">
                                  <div class="comment-user-name" :class="isMobile ? 'text-13px' : 'text-14px'">{{ item.userNickname }}</div>
                                  <div class="comment-time" :class="isMobile ? 'text-11px' : 'text-12px'">{{ formatDate(item.createTime) }}</div>
                                </div>
                              </div>
                            </div>
                            <div class="comment-content">
                              <!-- 根据内容类型选择不同的渲染方式 -->
                              <template v-if="isHtmlContent(item.content)">
                                <!-- HTML内容直接使用v-html渲染 -->
                                <div v-html="item.content" class="html-content"></div>
                              </template>
                              <template v-else>
                                <!-- Markdown内容使用MarkdownView组件 -->
                                <MarkdownView :content="item.content" />
                              </template>

                              <!-- 如果有图片，展示图片列表 -->
                              <div v-if="item.picUrls && item.picUrls.length > 0" class="comment-images">
                                <div class="images-container">
                                  <div v-for="(img, imgIndex) in item.picUrls" :key="imgIndex" class="image-card">
                                    <el-image
                                      :src="img"
                                      :preview-src-list="item.picUrls"
                                      :initial-index="imgIndex"
                                      fit="cover"
                                      class="comment-image"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </el-col>

                </el-row>
              </el-scrollbar>
            </div>
          </el-tab-pane>

          <!-- 流程图 -->
          <el-tab-pane label="流程图" name="diagram">
            <div class="form-scroll-area">
              <!-- 流程图容器，直接使用组件，避免多余嵌套 -->
              <ProcessInstanceSimpleViewer
                v-show="
                  processDefinition.modelType && processDefinition.modelType === BpmModelType.SIMPLE
                "
                :loading="diagramLoading"
                :model-view="processModelView"
                class="process-viewer-component"
              />
              <ProcessInstanceBpmnViewer
                v-show="
                  processDefinition.modelType && processDefinition.modelType === BpmModelType.BPMN
                "
                :loading="diagramLoading"
                :model-view="processModelView"
                class="process-viewer-component"
              />
            </div>
          </el-tab-pane>

          <!-- 流转记录 -->
          <el-tab-pane label="流转记录" name="record">
            <div class="form-scroll-area">
              <el-scrollbar>
                <ProcessInstanceTaskList
                  ref="taskListRef"
                  :loading="recordLoading"
                  :id="id"
                />
              </el-scrollbar>
            </div>
          </el-tab-pane>

          <!-- 流转评论-->
          <el-tab-pane label="流转评论" name="comment" v-if="false">
            <div class="form-scroll-area">
              <el-scrollbar> 流转评论 </el-scrollbar>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-scrollbar>
      
      <!-- 操作按钮区域 - 移出滚动区域，放在主容器内 -->
      <div 
        class="fixed-button-container" 
        :class="{ 'mobile-hidden': shouldHideButtonContainer && isMobile }"
        v-show="!shouldHideButtonContainer || !isMobile"
      >
        <ProcessInstanceOperationButton
          ref="operationButtonRef"
          :process-instance="processInstance"
          :process-definition="processDefinition"
          :userOptions="userOptions"
          :normal-form="detailForm"
          :normal-form-api="fApi"
          :writable-fields="writableFields"
          :is-admin="isAdmin"
          @success="refresh"
          @button-area-visibility-change="handleButtonAreaVisibilityChange"
          @approval-completed="handleApprovalCompleted"
          class="operation-button"
        />
      </div>
    </div>
  </ContentWrap>
  
  <!-- 添加评论对话框组件 -->
  <CommentDialog ref="commentDialogRef" @success="loadComments" />
</template>

<script lang="ts" setup>
import { formatDate } from '@/utils/formatTime'
import { DICT_TYPE } from '@/utils/dict'
import { BpmModelType, BpmModelFormType } from '@/utils/constants'
import { setConfAndFields2 } from '@/utils/formCreate'
import { registerComponent } from '@/utils/routerHelper'
import type { ApiAttrs } from '@form-create/element-ui/types/config'
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import * as UserApi from '@/api/system/user'
import * as ModelApi from '@/api/bpm/model'
import * as CommentApi from '@/api/bpm/comment'
import ProcessInstanceBpmnViewer from './ProcessInstanceBpmnViewer.vue'
import ProcessInstanceSimpleViewer from './ProcessInstanceSimpleViewer.vue'
import ProcessInstanceTaskList from './ProcessInstanceTaskList.vue'
import ProcessInstanceOperationButton from './ProcessInstanceOperationButton.vue'
import ProcessInstanceTimeline from './ProcessInstanceTimeline.vue'
import CommentDialog from './CommentDialog.vue'
import MarkdownView from '@/components/MarkdownView/index.vue'
import { FieldPermissionType } from '@/components/SimpleProcessDesignerV2/src/consts'
import { TaskStatusEnum } from '@/api/bpm/task'
import runningSvg from '@/assets/svgs/bpm/running.svg'
import approveSvg from '@/assets/svgs/bpm/approve.svg'
import rejectSvg from '@/assets/svgs/bpm/reject.svg'
import cancelSvg from '@/assets/svgs/bpm/cancel.svg'
import { useEventBus } from '@/hooks/web/useEventBus'
import { useWebSocketMessage } from '@/hooks/web/useWebSocketMessage'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Share, Link, Plus } from '@element-plus/icons-vue'
import { ContentWrap } from '@/components/ContentWrap'
import { useUserStore } from '@/store/modules/user'
import * as TaskApi from '@/api/bpm/task'

defineOptions({ name: 'BpmProcessInstanceDetail' })
const props = defineProps<{
  id: string // 流程实例的编号
  taskId?: string // 任务编号
  activityId?: string //流程活动编号，用于抄送查看
}>()
const message = useMessage() // 消息弹窗
const processInstanceLoading = ref(false) // 流程实例的加载中
const processInstance = ref<any>({}) // 流程实例
const processDefinition = ref<any>({}) // 流程定义
const processModelView = ref<any>({}) // 流程模型视图
const operationButtonRef = ref() // 操作按钮组件 ref
const taskListRef = ref()
const diagramLoading = ref(false)
const recordLoading = ref(false)
const hasLoadedDiagram = ref(false)
const hasLoadedRecords = ref(false)
const auditIconsMap = {
  [TaskStatusEnum.RUNNING]: runningSvg,
  [TaskStatusEnum.APPROVE]: approveSvg,
  [TaskStatusEnum.REJECT]: rejectSvg,
  [TaskStatusEnum.CANCEL]: cancelSvg
}

// ========== 申请信息 ==========
const fApi = ref<ApiAttrs>() //
const detailForm = ref({
  rule: [],
  option: {},
  value: {}
}) // 流程实例的表单详情

const writableFields: Array<string> = [] // 表单可以编辑的字段

const { emit } = useEventBus('processInstance')

// 使用 WebSocket 消息
const { sendMessage, sendBroadcast, onMessage } = useWebSocketMessage()

// 管理员相关属性
const isAdmin = ref(false) // 是否为管理员

// 移动端按钮区域控制
const isMobile = ref(false) // 是否为移动端
const shouldHideButtonContainer = ref(false) // 是否应该隐藏按钮容器

/** 获得详情 */
const getDetail = async (isFromRefresh = false) => {
  await getApprovalDetail(isFromRefresh)
  void loadProcessModelView(true)
  void loadTaskRecords(true)
}

/** 加载流程实例 */
const BusinessFormComponent = ref<any>(null) // 异步组件
/** 获取审批详情 */
const getApprovalDetail = async (isFromRefresh = false) => {
  processInstanceLoading.value = true
  try {
    // 从 URL 获取最新的 taskId
    const currentUrl = new URL(window.location.href)
    const urlTaskId = currentUrl.searchParams.get('taskId')
    
    const param = {
      processInstanceId: props.id,
      activityId: props.activityId,
      taskId: urlTaskId || props.taskId // 优先使用 URL 中的 taskId
    }
    
    // 请求详情数据
    console.log("请求详情，参数:", JSON.stringify(param))
    let data = await ProcessInstanceApi.getApprovalDetail(param)
    
    if (!data) {
      message.error('查询不到审批详情信息！')
      return
    }
    if (!data.processDefinition || !data.processInstance) {
      message.error('查询不到流程信息！')
      return
    }
    
    // 如果是从refresh方法调用，且todoTask存在，使用todoTask.id重新获取详情
    if (isFromRefresh && data.todoTask && data.todoTask.id && data.todoTask.id !== props.taskId) {
      console.log("发现新的待办任务，ID:", data.todoTask.id, "，当前taskId:", props.taskId)
      
      // 构建新的参数
      const newParam = {
        processInstanceId: props.id,
        activityId: props.activityId,
        taskId: data.todoTask.id
      }
      
      // 更新URL中的taskId
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('taskId', data.todoTask.id)
      window.history.replaceState(null, '', currentUrl.toString())
      console.log("已更新URL taskId为:", data.todoTask.id)
      
      // 重新请求详情
      console.log("使用新taskId重新获取详情，参数:", JSON.stringify(newParam))
      data = await ProcessInstanceApi.getApprovalDetail(newParam)
      
      if (!data) {
        message.error('使用新任务ID查询不到审批详情！')
        return
      }
      
      // 显示提示
      message.success('已自动加载您的下一个待办任务')
      
      // 强制更新operationButton组件，确保它能获取新任务信息
      nextTick(() => {
        if (operationButtonRef.value && data.todoTask) {
          console.log('更新操作按钮组件的任务信息')
          operationButtonRef.value.loadTodoTask(data.todoTask)
          //更新审核详情内容
          console.log('开始更新表单内容')
          
          // 刷新表单内容
          if (processDefinition.value.formType === BpmModelFormType.NORMAL && fApi.value) {
            // 直接更新表单值
            detailForm.value.value = processInstance.value.formVariables
            // 刷新表单
            fApi.value.refresh()
            console.log('表单内容已更新')
            
            // 获取表单字段权限并重新设置
            const formFieldsPermission = data.formFieldsPermission
            if (formFieldsPermission) {
              // 清空可编辑字段列表
              writableFields.splice(0)
              
              // 重置所有字段为只读
              fApi.value?.btn.show(false)
              fApi.value?.resetBtn.show(false)
              //@ts-ignore
              fApi.value?.disabled(true)
              
              // 先将所有字段设为可见，解决字段隐藏后无法重新显示的问题
              if (detailForm.value.rule && detailForm.value.rule.length > 0) {
                detailForm.value.rule.forEach(rule => {
                  if (rule.field) {
                    //@ts-ignore
                    fApi.value?.hidden(false, rule.field)
                  }
                })
              }
              
              // 设置字段权限
              if (isAdmin.value) {
                enableAllFieldsForAdmin()
              } else {
                Object.keys(formFieldsPermission).forEach((item) => {
                  setFieldPermission(item, formFieldsPermission[item])
                })
              }
              
              // 打印表单权限信息（刷新后）
              console.log('刷新后的表单权限信息:')
              printFormFieldsPermission(formFieldsPermission)
            }
          }
          
          // 更新流程图
          console.log('开始更新流程图')
          loadProcessModelView(true).then(() => {
            console.log('流程图已更新')
          }).catch(error => {
            console.error('流程图更新失败:', error)
          })
        }
      })
    }
    
    processInstance.value = data.processInstance
    processDefinition.value = data.processDefinition
    hasLoadedDiagram.value = false
    hasLoadedRecords.value = false

    // 设置表单信息
    if (processDefinition.value.formType === BpmModelFormType.NORMAL) {
      // 获取表单字段权限
      const formFieldsPermission = data.formFieldsPermission
      // 清空可编辑字段为空
      writableFields.splice(0)
      if (detailForm.value.rule?.length > 0) {
        // 避免刷新 form-create 显示不了
        detailForm.value.value = processInstance.value.formVariables
      } else {
        setConfAndFields2(
          detailForm,
          processDefinition.value.formConf,
          processDefinition.value.formFields,
          processInstance.value.formVariables
        )
      }
      nextTick().then(() => {
        fApi.value?.btn.show(false)
        fApi.value?.resetBtn.show(false)
        //@ts-ignore
        fApi.value?.disabled(true)
        
        // 判断是否是管理员，如果是管理员，允许所有表单字段可编辑
        if (isAdmin.value) {
          enableAllFieldsForAdmin()
        } 
        // 否则正常设置表单字段权限
        else if (formFieldsPermission) {
          Object.keys(data.formFieldsPermission).forEach((item) => {
            setFieldPermission(item, formFieldsPermission[item])
          })
        }
        
        // 打印表单字段权限信息
        printFormFieldsPermission(formFieldsPermission)
      })
    } else {
      // 注意：data.processDefinition.formCustomViewPath 是组件的全路径，例如说：/crm/contract/detail/index.vue
      BusinessFormComponent.value = registerComponent(data.processDefinition.formCustomViewPath)
    }

    // 获取审批节点，显示 Timeline 的数据
    activityNodes.value = data.activityNodes

    // 获取待办任务显示操作按钮
    await operationButtonRef.value?.loadTodoTask(data.todoTask)
    
  } finally {
    processInstanceLoading.value = false
  }
}

/** 获取流程模型视图*/
const loadProcessModelView = async (force = false) => {
  if (!props.id) {
    return
  }
  if (diagramLoading.value) {
    return
  }
  if (!force && hasLoadedDiagram.value) {
    return
  }
  diagramLoading.value = true
  try {
    console.log('开始获取流程模型视图')
    if (BpmModelType.BPMN === processDefinition.value?.modelType) {
      // 重置，解决 BPMN 流程图刷新不会重新渲染问题
      processModelView.value = {
        bpmnXml: ''
      }
      console.log('重置 BPMN 流程图')
    }
    // 请求BPMN模型视图数据
    // 注：如果出现"failed to import <bpmn:SequenceFlow /> Error: targetRef not specified"错误
    // 已在ProcessViewer组件中添加自动修复处理，会自动移除无效的连线并继续显示流程图
    console.log('请求流程实例 BPMN 模型视图，ID:', props.id)
    const data = await ProcessInstanceApi.getProcessInstanceBpmnModelView(props.id)
    if (data) {
      processModelView.value = data
      hasLoadedDiagram.value = true
      console.log('流程模型视图数据已更新')
    } else {
      console.log('未获取到流程模型视图数据')
    }
  } finally {
    diagramLoading.value = false
  }
}

const loadTaskRecords = async (force = false) => {
  if (!props.id) {
    return
  }
  if (!taskListRef.value) {
    await nextTick()
  }
  if (!taskListRef.value) {
    return
  }
  if (recordLoading.value) {
    return
  }
  if (!force && hasLoadedRecords.value) {
    return
  }
  recordLoading.value = true
  try {
    await taskListRef.value.reload()
    hasLoadedRecords.value = true
  } catch (error) {
    console.error('加载流转记录失败:', error)
  } finally {
    recordLoading.value = false
  }
}

// 审批节点信息
const activityNodes = ref<ProcessInstanceApi.ApprovalNodeInfo[]>([])
/**
 * 设置表单权限
 */
const setFieldPermission = (field: string, permission: string) => {
  if (permission === FieldPermissionType.READ) {
    //@ts-ignore
    fApi.value?.disabled(true, field)
  }
  if (permission === FieldPermissionType.WRITE) {
    //@ts-ignore
    fApi.value?.disabled(false, field)
    // 加入可以编辑的字段
    writableFields.push(field)
  }
  if (permission === FieldPermissionType.NONE) {
    //@ts-ignore
    fApi.value?.hidden(true, field)
  }
}

/**
 * 打印表单字段权限信息
 */
const printFormFieldsPermission = (formFieldsPermission: Record<string, string>) => {
  if (!formFieldsPermission) {
    console.log('表单字段权限为空')
    return
  }
  
  console.log('======== 表单字段权限信息 ========')
  const permissionTypeMap = {
    [FieldPermissionType.READ]: '只读',
    [FieldPermissionType.WRITE]: '可编辑',
    [FieldPermissionType.NONE]: '隐藏'
  }
  
  // 按权限类型分组显示
  const groupedPermissions = {
    '可编辑': [] as string[],
    '只读': [] as string[],
    '隐藏': [] as string[]
  }
  
  Object.entries(formFieldsPermission).forEach(([field, permission]) => {
    const permissionName = permissionTypeMap[permission] || '未知权限'
    groupedPermissions[permissionName].push(field)
    console.log(`字段: ${field}, 权限: ${permissionName} (${permission})`)
  })
  
  console.log('\n按权限类型分组:')
  console.log('可编辑字段:', groupedPermissions['可编辑'].join(', ') || '无')
  console.log('只读字段:', groupedPermissions['只读'].join(', ') || '无')
  console.log('隐藏字段:', groupedPermissions['隐藏'].join(', ') || '无')
  console.log('================================')
}

/**
 * 管理员拥有所有表单字段编辑权限
 */
const enableAllFieldsForAdmin = () => {
  if (!fApi.value || !detailForm.value.rule) return;
  
  // 清空之前的可编辑字段列表
  writableFields.splice(0);
  
  // 创建一个对象来存储管理员权限信息
  const adminPermissions: Record<string, string> = {};
  
  // 遍历所有表单字段，设置为可编辑状态
  detailForm.value.rule.forEach(rule => {
    if (rule.field) {
      //@ts-ignore
      fApi.value.disabled(false, rule.field);
      // 添加到可编辑字段列表中
      writableFields.push(rule.field);
      // 记录权限为"可编辑"
      adminPermissions[rule.field] = FieldPermissionType.WRITE;
    }
  });
  
  // 打印管理员模式下的权限信息
  console.log('管理员模式：所有字段均设为可编辑');
  printFormFieldsPermission(adminPermissions);
}

/**
 * 检查当前用户是否是管理员
 */
const checkAdminStatus = async () => {
  try {
    // 获取URL查询参数
    const processInstanceId = props.id;
    console.log('检查管理员状态 - 流程实例ID:', processInstanceId);

    
    // 调用API检查是否是管理员
    if (processInstanceId) {
      const res = await ModelApi.modelManager(processInstanceId);
      console.log('管理员检查API返回结果:', res);
      
      // 只有API明确返回true时才设置为管理员
      isAdmin.value = res === true;
      console.log('最终管理员状态:', isAdmin.value);
    } else {
      isAdmin.value = false;
    }
  } catch (error) {
    console.error('获取管理员状态出错:', error);
    isAdmin.value = false;
  }
}

/**
 * 操作成功后刷新
 */
const refresh = async () => {
  console.log('开始刷新...')
  // 重新检查管理员状态，确保按钮显示正确
  await checkAdminStatus()
  console.log('刷新时管理员状态检查完成，isAdmin:', isAdmin.value)

  // 获取当前用户信息
  const userStore = useUserStore()
  const currentUser = userStore.getUser
  console.log('当前用户:', currentUser)

  // 用于存储所有需要发送消息的审批人
  const approversToNotify = new Set()

  // 获取运行中的任务列表
  try {
    console.log('获取运行中的任务列表，流程实例ID:', props.id)
    const runningTasks = await TaskApi.getRunningTaskList(props.id)
    console.log('运行中的任务列表:', runningTasks)

    // 检查是否有任务
    if (runningTasks && runningTasks.length > 0) {
      // 遍历每个任务的节点
      let foundUserTask = false
      let userTaskId = null

      for (const task of runningTasks) {
        // 检查每个节点中的用户任务
        if (task.nodes && task.nodes.length > 0) {
          for (const node of task.nodes) {
            if (node.users && node.users.length > 0) {
              for (const userTask of node.users) {
                // 检查是否是当前用户的任务
                if (userTask.user && userTask.user.id === currentUser.id) {
                  console.log('找到当前用户的任务:', userTask)
                  foundUserTask = true
                  userTaskId = userTask.taskId
                }

                // 收集所有审批人信息，用于后续发送消息
                if (userTask.user && userTask.user.id !== currentUser.id) {
                  approversToNotify.add(userTask.user)
                }
              }
            }
            if (foundUserTask) break
          }
        }
        if (foundUserTask) break
      }

      // 更新 URL 中的 taskId
      const currentUrl = new URL(window.location.href)
      if (foundUserTask && userTaskId) {
        console.log('更新 URL 中的 taskId 为:', userTaskId)
        currentUrl.searchParams.set('taskId', userTaskId)
        window.history.replaceState(null, '', currentUrl.toString())
      } else {
        // 如果没有找到当前用户的任务，移除 URL 中的 taskId
        console.log('未找到当前用户的任务，移除 URL 中的 taskId')
        currentUrl.searchParams.delete('taskId')
        window.history.replaceState(null, '', currentUrl.toString())
      }

      // 给所有收集到的审批人发送消息
      if (approversToNotify.size > 0) {
        console.log(`找到 ${approversToNotify.size} 个需要通知的审批人`)
        approversToNotify.forEach(approver => {
          console.log('发送通知给审批人:', approver.nickname)
          sendMessage(
            approver.id,
            `流程 ${processInstance.value.name} 需要您审批`
          )
        })
        
        // 发送广播
        sendBroadcast('process-approve')
      } else {
        console.log('没有找到需要通知的审批人')
      }
    } else {
      // 如果没有运行中的任务，移除 URL 中的 taskId
      console.log('没有运行中的任务，移除 URL 中的 taskId')
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('taskId')
      window.history.replaceState(null, '', currentUrl.toString())
    }
  } catch (error) {
    console.error('获取运行中任务列表失败:', error)
  }

  // 重新获取详情，等待完成，这里传入isFromRefresh=true
  await getDetail(true)
  console.log('详情获取完成')

  // 发送全局刷新事件，通知所有打开的待办和已办页面刷新
  emit('process-approve-success')

  // 备用方案：如果通过 runningTasks 没有找到审批人，则尝试通过 activityNodes 查找
  // 获取当前节点和下一个节点信息
  const currentNodeIndex = activityNodes.value?.findIndex(node => 
    node.tasks?.some(task => task.id?.toString() === props.taskId?.toString())
  )

  // 只有在没有通过 runningTasks 发送消息时，才使用 activityNodes
  if (!approversToNotify || approversToNotify.size === 0) {
    console.log('通过 runningTasks 未找到审批人，尝试通过 activityNodes 查找')
    
    if (currentNodeIndex !== undefined && currentNodeIndex >= 0) {
      // 获取下一个节点
      const nextNode = activityNodes.value[currentNodeIndex + 1]
      console.log('下一个节点:', nextNode)

      // 检查是否有候选审批人
      if (nextNode?.candidateUsers && nextNode.candidateUsers.length > 0) {
        // 给所有候选审批人发送消息
        nextNode.candidateUsers.forEach(approver => {
          console.log('通过 activityNodes 发送通知给审批人:', approver.nickname)

          // 发送消息
          sendMessage(
            approver.id,
            `流程 ${processInstance.value.name} 需要您审批`
          )
        })
        
        // 发送广播
        sendBroadcast('process-approve')
      } 
      // 如果有指定审批人
      else if (nextNode?.tasks?.[0]?.assigneeUser) {
        const assigneeUser = nextNode.tasks[0].assigneeUser
        console.log('通过 activityNodes 发送通知给指定审批人:', assigneeUser.nickname)

        // 发送消息
        sendMessage(
          assigneeUser.id,
          `流程 ${processInstance.value.name} 需要您审批`
        )
        
        // 发送广播
        sendBroadcast('process-approve')
      }
    }
  }
}

/** 当前的Tab */
const activeTab = ref('form')

watch(
  () => activeTab.value,
  (tab) => {
    if (tab === 'diagram') {
      void loadProcessModelView()
    }
    if (tab === 'record') {
      void loadTaskRecords()
    }
  }
)

watch(
  () => taskListRef.value,
  (instance) => {
    if (instance && !hasLoadedRecords.value) {
      void loadTaskRecords()
    }
  }
)

/** 初始化 */
const userOptions = ref<UserApi.UserVO[]>([]) // 用户列表
onMounted(async () => {
  console.log('index.vue 组件挂载')
  
  // 初始化移动端检测
  checkIsMobile()
  window.addEventListener('resize', handleResize)
  
  await checkAdminStatus() // 检查管理员状态
  console.log('管理员状态检查完成，isAdmin:', isAdmin.value)
  await getDetail()
  // 获得用户列表
  userOptions.value = await UserApi.getSimpleUserList()
  console.log(detailForm.value)
  
  // 加载评论列表
  await loadComments()
  
  // 监听WebSocket消息，处理流程任务节点刷新通知
  onMessage((data) => {
    // 检查消息类型
    if (data && data.type === 'bpm-task-node-refresh') {
      handleTaskNodeRefresh(data)
    }
  })
})

// 组件卸载时清除事件监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

/**
 * 分享流程实例信息到剪贴板
 */
const handleShare = () => {
  // 构建分享内容
  const shareContent = `
流程名称：${processInstance.value.name}
流程编号：${props.id}
提交人：${processInstance.value?.startUser?.nickname || '未知'}
提交时间：${formatDate(processInstance.value.startTime)}
当前状态：${getStatusText(processInstance.value.status)}
查看链接：${window.location.href}
  `.trim()

  // 优先使用document.execCommand方法
  if (copyTextToClipboard(shareContent)) {
    ElMessage.success('已复制分享信息到剪贴板')
    return
  }

  // 如果document.execCommand失败，尝试navigator.clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareContent)
      .then(() => {
        ElMessage.success('已复制分享信息到剪贴板')
      })
      .catch((err) => {
        console.error('剪贴板API失败:', err)
        ElMessage.error('复制失败，请手动复制')
      })
  } else {
    ElMessage.error('您的浏览器不支持自动复制，请手动复制信息')
    console.error('剪贴板API不可用')
  }
}

/**
 * 使用document.execCommand复制文本到剪贴板
 * @returns {boolean} 是否复制成功
 */
const copyTextToClipboard = (text) => {
  try {
    // 创建临时文本区域
    const textArea = document.createElement('textarea')
    
    // 设置文本区域的值和样式
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.width = '2em'
    textArea.style.height = '2em'
    textArea.style.padding = '0'
    textArea.style.border = 'none'
    textArea.style.outline = 'none'
    textArea.style.boxShadow = 'none'
    textArea.style.background = 'transparent'
    textArea.style.opacity = '0'
    
    document.body.appendChild(textArea)
    
    // 选择文本并复制
    textArea.select()
    textArea.setSelectionRange(0, 99999) // 兼容移动设备
    
    const successful = document.execCommand('copy')
    
    // 移除临时元素
    document.body.removeChild(textArea)
    
    return successful
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    [TaskStatusEnum.RUNNING]: '进行中',
    [TaskStatusEnum.APPROVE]: '已通过',
    [TaskStatusEnum.REJECT]: '已拒绝',
    [TaskStatusEnum.CANCEL]: '已取消'
  }
  return statusMap[status] || '未知状态'
}

/**
 * 打开流程实例在浏览器中
 */
const openInBrowser = () => {
  try {
    // 使用当前完整URL，保留所有参数
    const currentUrl = window.location.href
    
    // 检测是否在钉钉环境
    const isDingTalk = /DingTalk/.test(navigator.userAgent)
    
    // 针对不同环境使用不同方法，确保只使用一种方法
    
    // 方法1: 在钉钉环境下，使用钉钉特定API
    if (isDingTalk) {
      console.log('检测到钉钉环境，使用钉钉专用方法打开')
      
      // 创建一个简单的链接并点击，这种方式在钉钉中最可靠
      const link = document.createElement('a')
      link.href = currentUrl
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
      }, 100)
      
      ElMessage.success('正在打开浏览器...')
      return
    }
    
    // 方法2: 使用cordova环境中的InAppBrowser插件
    if (window.cordova && window.cordova.InAppBrowser) {
      window.cordova.InAppBrowser.open(currentUrl, '_system')
      ElMessage.success('已在系统浏览器中打开')
      return
    }
    
    // 方法3: 普通浏览器环境，使用window.open
    const newWindow = window.open(currentUrl, '_blank')
    if (newWindow) {
      newWindow.focus()
      ElMessage.success('已在新标签页中打开')
    } else {
      ElMessage.warning('浏览器可能已阻止弹出窗口，请检查设置')
      
      // 备选方案：只在上面方法失败时使用
      const link = document.createElement('a')
      link.href = currentUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        link.remove()
      }, 100)
    }
  } catch (error) {
    console.error('打开浏览器失败:', error)
    ElMessage.error('无法在系统浏览器中打开')
  }
}

/** 
 * 处理自选审批人选择
 */
const selectUserConfirm = (activityId: string, userList: any[]) => {
  // 传递给操作按钮组件，使其能够将信息传给后端
  if (operationButtonRef.value) {
    operationButtonRef.value.selectUserConfirm(activityId, userList)
  }
}

// 评论相关
const commentDialogRef = ref() // 评论对话框组件引用
const commentList = ref<CommentApi.CommentVO[]>([]) // 评论列表
const commentsLoading = ref(false) // 评论加载中

/**
 * 处理流程任务节点刷新的 WebSocket 消息
 */
const handleTaskNodeRefresh = async (data: any) => {
  console.log('========== 开始处理流程任务节点刷新消息 ==========')
  console.log('收到的原始数据:', JSON.stringify(data, null, 2))
  
  try {
    // 检查数据是否存在
    if (!data) {
      console.error('❌ 数据为空，无法处理')
      return
    }
    
    // 检查是否有 content 字段
    if (!data.content) {
      console.error('❌ 消息缺少 content 字段，无法处理')
      console.error('完整数据:', data)
      return
    }
    
    console.log('✅ 数据检查通过，开始解析 content 字段')
    console.log('content 类型:', typeof data.content)
    console.log('content 内容:', data.content)
    
    // 解析消息内容（content是字符串，需要再次解析）
    let messageContent
    try {
      if (typeof data.content === 'string') {
        console.log('🔄 content 是字符串，尝试 JSON 解析')
        messageContent = JSON.parse(data.content)
        console.log('✅ JSON 解析成功')
      } else {
        console.log('✅ content 已经是对象，直接使用')
        messageContent = data.content
      }
    } catch (e) {
      console.error('❌ 解析 WebSocket 消息 content 失败:', e)
      console.error('原始 content:', data.content)
      return
    }
    
    console.log('✅ 解析后的消息内容:', JSON.stringify(messageContent, null, 2))
    
    // 获取地址栏中的参数
    const currentUrl = new URL(window.location.href)
    const urlId = currentUrl.searchParams.get('id')
    const urlTaskId = currentUrl.searchParams.get('taskId')
    
    console.log('📍 地址栏参数:')
    console.log('  - id:', urlId)
    console.log('  - taskId:', urlTaskId)
    
    console.log('📩 消息参数:')
    console.log('  - processInstanceId:', messageContent.processInstanceId)
    console.log('  - sourceTaskId:', messageContent.sourceTaskId)
    console.log('  - action:', messageContent.action)
    
    // 判断 processInstanceId 和 sourceTaskId 是否与地址栏参数一致
    const isProcessInstanceMatch = messageContent.processInstanceId === urlId
 //   const isTaskMatch = messageContent.sourceTaskId === urlTaskId
    
    console.log('🔍 匹配结果:')
    console.log('  - 流程实例匹配:', isProcessInstanceMatch)
    // console.log('  - 任务匹配:', isTaskMatch)
    
    // 如果都匹配，弹框提示并刷新页面    if (isProcessInstanceMatch && isTaskMatch) {
    if (isProcessInstanceMatch ) {
      console.log('✅ 匹配成功！准备弹框提示用户')
      
      // 获取操作类型的中文描述
      const actionMap = {
        'approve': '通过',
        'reject': '驳回',
        'transfer': '转办',
        'delegate': '委派',
        'back': '退回'
      }
      const actionText = actionMap[messageContent.action] || messageContent.action
      
      console.log('📢 操作类型:', actionText)
      
      try {
        await ElMessageBox.alert(
          `当前流程任务已被${actionText}，数据已发生变化，点击确认后将刷新页面查看最新数据。`,
          '流程状态变更提醒',
          {
            confirmButtonText: '立即刷新',
            type: 'warning',
            showClose: false
          }
        )

        // 用户点击确认，刷新页面
        console.log('✅ 用户确认刷新')
        await refresh()
        ElMessage.success('页面已刷新')
      } catch (action) {
        // 用户关闭了提示框（通过ESC或右上角X）
        console.log('ℹ️ 用户关闭了提示框')
      }
    } else {
      console.log('❌ 参数不匹配，不进行刷新提示')
      console.log('  原因分析:')
      if (!isProcessInstanceMatch) {
        console.log('  - 流程实例ID不匹配')
        console.log(`    期望: ${urlId}`)
        console.log(`    实际: ${messageContent.processInstanceId}`)
      }
/*      if (!isTaskMatch) {
        console.log('  - 任务ID不匹配')
        console.log(`    期望: ${urlTaskId}`)
        console.log(`    实际: ${messageContent.sourceTaskId}`)
      }*/
    }
    
    console.log('========== 流程任务节点刷新消息处理完成 ==========')
  } catch (error) {
    console.error('❌ 处理流程任务节点刷新消息时发生错误:', error)
    console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息')
    console.error('原始数据:', data)
  }
}

/**
 * 打开评论对话框
 */
const openCommentDialog = () => {
  if (commentDialogRef.value) {
    commentDialogRef.value.open(props.id, processInstance.value.name)
  }
}

/**
 * 加载评论列表
 */
const loadComments = async () => {
  if (!props.id) return

  commentsLoading.value = true
  try {
    try {
      console.log('加载评论列表，流程实例ID:', props.id)
      const res = await CommentApi.getCommentList(props.id)
      console.log('API返回评论数据:', res)

      // 处理API返回结果
      let hasComments = false

      // 直接处理API返回结果，跳过中间判断
      if (res && res.id && res.content) {
        // 如果直接返回了单个评论对象
        console.log('收到单个评论对象:', res)
        commentList.value = [res]
        hasComments = true
      } else if (res && res.code === 0) {
        // 标准封装结构
        if (Array.isArray(res.data) && res.data.length > 0) {
          commentList.value = res.data
          hasComments = true
        } else if (res.data && res.data.id) {
          // data是单个对象
          commentList.value = [res.data]
          hasComments = true
        } else {
          // 空数组或null
          console.log('API返回空数据')
          hasComments = false
        }
      } else if (Array.isArray(res) && res.length > 0) {
        // 直接返回数组
        commentList.value = res
        hasComments = true
      } else {
        // 防止意外情况，置为空数组
        console.log('API返回格式不符合预期或为空')
        hasComments = false
      }

      // 如果没有评论数据，使用模拟数据
      if (!hasComments) {
        console.log('没有评论数据，使用模拟数据')
        commentList.value = getSimulatedComments(props.id)
      }

      console.log('处理后的评论列表:', commentList.value)
      console.log('评论条数:', commentList.value.length)

    } catch (error) {
      console.warn('API尚未实现或发生错误，使用模拟数据', error)

      // 使用模拟数据
      commentList.value = getSimulatedComments(props.id)
    }
  } catch (error) {
    console.error('加载评论失败', error)
    message.error('加载评论失败')
  } finally {
    commentsLoading.value = false
  }
}

/**
 * 生成模拟评论数据
 */
const getSimulatedComments = (instanceId: string) => {
  console.log('使用模拟评论数据')
  return [ ]
}

/**
 * 检查内容是否为HTML格式
 */
const isHtmlContent = (content: string) => {
  if (!content) return false
  // 简单判断是否包含HTML标签
  return /<[a-z][\s\S]*>/i.test(content)
}

/**
 * 检测移动端设备
 */
const checkIsMobile = () => {
  isMobile.value = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * 处理按钮区域可见性变化
 */
const handleButtonAreaVisibilityChange = (shouldHide: boolean) => {
  console.log('index.vue 接收到按钮区域可见性变化:', shouldHide)
  shouldHideButtonContainer.value = shouldHide
}

/**
 * 监听窗口大小变化
 */
const handleResize = () => {
  checkIsMobile()
}

/**
 * 处理审核完成事件
 */
const handleApprovalCompleted = async (completionInfo: any) => {
  console.log('收到审核完成事件:', completionInfo)
  
  const { hasUserTask, isFromNewTab, isDingTalk, canCloseWindow } = completionInfo
  
  if (!hasUserTask) {
    if (isFromNewTab) {
      // 如果是从新标签页打开的，需要通知原标签页刷新并关闭当前标签页
      console.log('检测到从新标签页打开，准备关闭当前标签页')
      
      try {
        // 通过 BroadcastChannel 通知原标签页刷新待办列表
        const todoRefreshChannel = new BroadcastChannel('todo-refresh-channel')
        todoRefreshChannel.postMessage({
          type: 'approval-completed',
          message: '审核完成，请刷新待办列表',
          timestamp: Date.now()
        })
        
        // 也通过 localStorage 发送心跳信号，确保原标签页能收到
        localStorage.setItem('todo-refresh-heartbeat', JSON.stringify({
          type: 'approval-completed',
          timestamp: Date.now()
        }))
        
        // 延迟一点时间确保消息发送成功
        setTimeout(() => {
          todoRefreshChannel.close()
        }, 100)
        
        // 显示成功消息
        message.success('审核完成，即将关闭标签页')
        
        // 延迟关闭，让用户看到成功消息并确保消息传递
        setTimeout(() => {
          // 尝试关闭标签页
          if (canCloseWindow) {
            console.log('尝试关闭当前标签页')
            window.close()
          } else {
            // 如果无法关闭，回退到上一页或跳转到待办列表
            console.log('无法关闭标签页，尝试其他方式')
            if (window.history.length > 1) {
              window.history.back()
            } else {
              window.location.href = '/bpm/task/todo'
            }
          }
        }, 1500)
        
      } catch (error) {
        console.error('通知原标签页或关闭当前标签页失败:', error)
        // 如果失败，回退到待办列表
        message.info('审核完成，正在跳转到待办任务列表')
        await router.push({ path: '/bpm/task/todo' })
      }
    } else {
      // 非新标签页打开的情况，按原逻辑处理
      if (!isDingTalk) {
        console.log('非钉钉环境，跳转到待办任务列表')
        await router.push({ path: '/bpm/task/todo' })
      } else {
        console.log('钉钉环境，不进行跳转')
      }
    }
  }
}

</script>

<style lang="scss" scoped>
$wrap-padding-height: 20px;
$wrap-margin-height: 15px;
$button-height: 51px;
$process-header-height: 194px;

// 移动端优化类
.mobile-optimized {
  /* 移动端整体容器优化 */
  @media (max-width: 768px) {
    .el-card {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

.processInstance-wrap-main {
  height: calc(
    100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height) - 35px
  );
  max-height: calc(
    100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height) - 35px
  );
  overflow: hidden;
  background: white;
  border-radius: 8px;
  padding: 0;
  position: relative;
  
  // 主滚动区域
  .main-scrollbar {
    height: calc(100% - 60px); // 默认为底部按钮留出空间
    transition: height 0.3s ease; // 添加平滑过渡
    
    /* 移动设备适配 */
    @media (max-width: 767px) {
      height: calc(100% - 80px); // 移动设备上按钮高度较大
    }
    
    /* 超小屏幕适配 */
    @media (max-width: 480px) {
      height: calc(100% - 100px); // 超小屏幕上按钮高度更大
    }
    
    /* 当按钮区域隐藏时，滚动区域占用全部高度 */
    &.full-height {
      height: 100% !important;
    }
    
    :deep(.el-scrollbar__wrap) {
      overflow-x: hidden;
    }
    
    :deep(.el-scrollbar__bar.is-horizontal) {
      display: none;
    }
    
    /* 确保底部不会有内容被遮挡 */
    :deep(.el-scrollbar__view) {
      padding-bottom: 10px;
    }
  }
  
  /* 表单滚动区域 */
  .form-scroll-area {
    /* 确保内容可以自然流动，不设置固定高度 */
    width: 100%;
    
    /* 确保内部滚动条与主滚动条协调 */
    :deep(.el-scrollbar) {
      max-height: none;
      
      .el-scrollbar__wrap {
        overflow-x: hidden;
      }
      
      .el-scrollbar__bar.is-horizontal {
        display: none;
      }
    }
  }
  
  /* 增强表格滚动能力 */
  :deep(.form-create) {
    width: 100%;
    
    /* 确保表格组件容器不限制溢出 */
    .form-create-designer-form, .form-create-designer-form > .fc-design-form {
      overflow: visible !important;
    }
    
    /* 表格组件需要水平滚动 */
    [data-type="tableForm"] {
      width: auto !important;
      max-width: none !important;
      overflow-x: auto !important;
      
      .fc-component {
        width: auto !important;
        min-width: 100% !important;
        overflow-x: auto !important;
        
        /* 让表格内容完整显示 */
        table {
          width: auto !important;
          min-width: 100% !important;
          table-layout: auto !important;
        }
      }
    }
    
    /* 添加对Element表格的支持 */
    .el-table {
      width: auto !important;
      max-width: none !important;
      overflow-x: auto !important;
      
      .el-table__header-wrapper,
      .el-table__body-wrapper,
      .el-table__inner-wrapper {
        overflow-x: auto !important;
      }
      
      table {
        width: auto !important;
        min-width: 100% !important;
        table-layout: auto !important;
      }
      
      th.el-table__cell, 
      td.el-table__cell {
        min-width: 120px !important;
        white-space: normal !important;
        word-break: break-word !important;
        
        .cell {
          white-space: normal !important;
          word-break: break-word !important;
        }
      }
    }
  }
}

.form-box {
  :deep(.el-card) {
    border: none;
  }
}

// 流程ID号响应式样式
.process-id {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 15px;
  
  .process-id-text {
    display: flex;
    align-items: center;
    max-width: calc(100% - 170px); // 预留足够空间给状态图标
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    
    .version-tag {
      margin-left: 10px;
      display: inline-flex;
      align-items: center;
    }
  }
  
  @media (max-width: 991px) {
    .process-id-text {
      max-width: calc(100% - 140px);
    }
  }
  
  @media (max-width: 767px) {
    .process-id-text {
      max-width: calc(100% - 100px);
    }
  }
  
  @media (max-width: 575px) {
    .process-id-text {
      max-width: calc(100% - 80px);
    }
  }
}

// 分隔线响应式样式
.divider {
  @media (max-width: 575px) {
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }
}

// 标题和状态容器响应式样式
.title-status-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  min-height: 40px;
  width: 100%;
  position: relative;
  padding-right: 100px; // 为右侧状态图标预留空间
  
  @media (max-width: 767px) {
    padding-right: 90px;
  }
  
  @media (max-width: 575px) {
    padding-right: 70px;
    gap: 8px;
  }
  
  @media (max-width: 450px) {
    padding-right: 0; // 因为在极小屏幕上大图标被隐藏，不需要预留空间
  }
}

// 标题响应式样式
.process-title {
  // 允许标题自动换行，不再截断
  overflow: visible;
  white-space: normal;
  word-break: break-word; // 允许在任何字符处换行，避免溢出
  line-height: 1.2; // 减小行高，使多行文字看起来更紧凑
  
  @media (max-width: 991px) {
    font-size: 22px;
  }
  
  @media (max-width: 767px) {
    font-size: 20px;
    margin-right: 10px;
  }
  
  @media (max-width: 575px) {
    font-size: 18px;
    width: 100%; // 在超小屏幕上占满整行
    margin-bottom: 8px;
  }
}

// 状态容器样式
.status-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

// 状态标签响应式样式
.status-tag {
  @media (max-width: 575px) {
    margin-left: 0;
  }
}

// 用户信息容器响应式样式
.user-info-container {
  @media (max-width: 575px) {
    flex-direction: column;
    align-items: flex-start;
    height: auto !important;
    gap: 10px;
  }
}

// 用户头像容器响应式样式
.user-avatar-container {
  @media (max-width: 767px) {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  @media (max-width: 575px) {
    width: auto;
  }
}

// 用户头像响应式样式
.user-avatar {
  @media (max-width: 575px) {
    flex-shrink: 0;
  }
}

// 用户昵称响应式样式
.user-nickname {
  @media (max-width: 575px) {
    max-width: calc(100vw - 80px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// 提交时间响应式样式
.submit-time {
  @media (max-width: 575px) {
    margin-left: 5px;
  }
}

// Tab页响应式样式
.process-tabs {
  @media (max-width: 768px) {
    :deep(.el-tabs__header) {
      margin-bottom: 8px;
      padding: 0 4px;
    }
    
    :deep(.el-tabs__nav-wrap) {
      padding: 0;
    }
    
    :deep(.el-tabs__item) {
      padding: 0 12px;
      font-size: 14px;
      height: 36px;
      line-height: 36px;
    }
    
    :deep(.el-tabs__active-bar) {
      height: 2px;
    }
  }
  
  @media (max-width: 575px) {
    :deep(.el-tabs__header) {
      margin-bottom: 6px;
      padding: 0 2px;
    }
    
    :deep(.el-tabs__item) {
      padding: 0 8px;
      font-size: 13px;
      height: 34px;
      line-height: 34px;
    }
  }
}

// 移动端表单列样式
.mobile-form-col {
  padding: 0 8px;
  margin-bottom: 15px;
}

// 移动端时间线列样式
.mobile-timeline-col {
  padding: 0 8px;
  margin-top: 15px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 15px;
}

// 移动端评论项样式
.mobile-comment-item {
  padding: 8px;
  
  .comment-content {
    padding-left: 36px;
    font-size: 13px;
    line-height: 1.4;
  }
}

// 移动端添加评论按钮样式
.mobile-add-comment-btn {
  padding: 4px 8px;
  font-size: 12px;
  
  .el-icon {
    font-size: 14px;
  }
}

// 表单组件响应式样式
.form-component {
  /* 表单内表格允许水平滚动 */
  :deep(.form-create-designer-form) {
    overflow: visible;
  }

  /* 优化表格在不同屏幕尺寸下的展示 */
  :deep(.el-table-wrapper),
  :deep(.el-table) {
    width: 100%;
    overflow-x: auto;
  }
  
  @media (max-width: 575px) {
    :deep(.form-create .el-form-item) {
      margin-bottom: 12px;
    }
    
    :deep(.form-create .el-form-item__label) {
      padding-bottom: 4px;
    }
  }
}

// 固定底部按钮容器
.fixed-button-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  min-height: 60px;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 8px 8px;
  transition: all 0.3s ease; // 添加平滑过渡
  
  /* 确保底部安全区域适配 */
  padding-bottom: env(safe-area-inset-bottom, 0);
  
  /* 移动设备适配 */
  @media (max-width: 767px) {
    min-height: 80px; /* 在移动设备上增加高度，容纳更多按钮 */
  }
  
  /* 超小屏幕适配 */
  @media (max-width: 480px) {
    min-height: 100px; /* 在超小屏幕上进一步增加高度 */
  }
  
  /* 移动端隐藏按钮容器的样式 */
  &.mobile-hidden {
    opacity: 0 !important;
    transform: translateY(100%) !important;
    pointer-events: none !important;
  }
}

// 暗黑模式下固定底部按钮容器的样式
:deep(.dark) {
  .fixed-button-container {
    background-color: var(--el-bg-color-overlay);
    border-top: 1px solid var(--el-border-color-darker);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.25);
  }
}

// 操作按钮样式增强
.operation-button {
  width: 100%;
  
  @media (max-width: 575px) {
    :deep(.el-button) {
      padding: 6px 12px;
      min-height: 32px;
    }
    
    :deep(.el-button + .el-button) {
      margin-left: 5px;
    }
  }
}

// 审批状态图标响应式样式
.status-icon {
  z-index: 2; // 提高层级，确保图标不会被其他元素覆盖
  
  // 大屏幕 (≥1200px)
  @media (min-width: 1200px) {
    width: 150px;
    right: 20px;
    top: 10px;
  }
  
  // 中等屏幕 (≥992px and <1200px)
  @media (min-width: 992px) and (max-width: 1199px) {
    width: 120px;
    right: 15px;
    top: 15px;
  }
  
  // 小屏幕 (≥768px and <992px)
  @media (min-width: 768px) and (max-width: 991px) {
    width: 100px;
    right: 10px;
    top: 15px;
  }
  
  // 极小屏幕 (≥576px and <768px)
  @media (min-width: 576px) and (max-width: 767px) {
    width: 80px;
    right: 10px;
    top: 15px;
  }
  
  // 手机屏幕 (<576px)
  @media (max-width: 575px) {
    width: 60px;
    right: 10px;
    top: 15px; // 调整位置，避免与标题重叠
  }
  
  // 在极小屏幕上隐藏大图标
  @media (max-width: 450px) {
    display: none;
  }
}

// 小图标样式
.status-icon-mini {
  display: none; // 默认隐藏
  vertical-align: middle;
  
  // 只在极小屏幕上显示
  @media (max-width: 450px) {
    display: inline-block;
  }
}

// 审批记录时间线响应式样式
.timeline-col {
  // 确保时间线和评论列表在同一滚动区域内流动
  display: flex;
  flex-direction: column;
  
  // 评论部分自然流动，不设置固定高度
  .comments-section {
    margin-top: 20px;
    margin-bottom: 80px;
    flex: 1;
  }
  
  // 在中等屏幕及以上显示为右侧栏
  @media (min-width: 992px) {
    padding-left: 15px;
  }
  
  // 在小屏幕上作为独立部分显示
  @media (max-width: 991px) {
    margin-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
    padding-top: 20px;
  }
}

// 适配流程图在小屏幕上的显示
@media (max-width: 767px) {
  .form-scroll-area {
    min-height: 450px; // 确保在小屏幕上有足够的显示空间
    
    .process-viewer-component {
      min-height: 400px;
      
      // 确保内部滚动条容器的大小正确
      :deep(.process-scrollbar) {
        width: 100%;
        height: 100%;
      }
    }
  }
  
  // 调整表单高度以适应移动设备
  .formCol {
    min-height: 350px;
  }
}

// 移动端触摸优化
@media (max-width: 768px) {
  /* 触摸目标大小优化 */
  .el-button {
    min-height: 36px;
    padding: 8px 12px;
    
    &.el-button--small {
      min-height: 32px;
      padding: 6px 10px;
    }
  }
  
  /* 可点击元素的触摸反馈 */
  .el-tabs__item,
  .el-button,
  .comment-item,
  .user-avatar-container {
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  /* 滚动优化 */
  .main-scrollbar {
    -webkit-overflow-scrolling: touch;
    
    :deep(.el-scrollbar__wrap) {
      -webkit-overflow-scrolling: touch;
    }
  }
  
  /* 输入框优化 */
  :deep(.el-input__wrapper) {
    min-height: 36px;
  }
  
  :deep(.el-textarea__inner) {
    font-size: 16px; // 防止iOS自动缩放
    line-height: 1.4;
  }
}

// 极小屏幕额外优化
@media (max-width: 450px) {
  .processInstance-wrap-main {
    padding: 0 5px;
  }
  
  .el-tabs__nav {
    width: 100%;
    display: flex;
    
    .el-tabs__item {
      flex: 1;
      text-align: center;
    }
  }
  
  /* 极小屏幕的按钮优化 */
  .el-button {
    font-size: 13px;
    padding: 6px 8px;
    min-height: 32px;
  }
}

// 分享按钮样式
.share-button {
  margin-left: 10px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  
  @media (max-width: 767px) {
    margin-left: 5px;
  }
  
  @media (max-width: 575px) {
    padding: 2px 5px;
    font-size: 12px;
  }
  
  @media (max-width: 450px) {
    span {
      display: none; // 在非常小的屏幕上只显示图标
    }
  }
}

// 在浏览器中打开按钮样式
.browser-button {
  margin-left: 10px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  
  @media (max-width: 767px) {
    margin-left: 5px;
  }
  
  @media (max-width: 575px) {
    padding: 2px 5px;
    font-size: 12px;
  }
  
  @media (max-width: 450px) {
    span {
      display: none; // 在非常小的屏幕上只显示图标
    }
  }
}

// 评论区样式
.comments-section {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 15px;
  
  .comments-header {
    margin-bottom: 5px;
    margin-right: 15px;
  }
  
  .comments-list {
    // 移除固定高度限制，让评论列表自然流动
    // max-height: 500px;
    // overflow-y: auto;
    
    .comments-empty {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px 0;
    }
    
    .comment-item {
      padding: 10px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      
      &:last-child {
        border-bottom: none;
      }
      
      .comment-header {
        margin-bottom: 8px;
        
        .comment-user {
          display: flex;
          align-items: center;
          
          .comment-user-info {
            margin-left: 10px;
            
            .comment-user-name {
              font-weight: 500;
              font-size: 14px;
              line-height: 1.2;
            }
            
            .comment-time {
              font-size: 12px;
              color: var(--el-text-color-secondary);
            }
          }
        }
      }
      
      .comment-content {
        padding-left: 42px;
        font-size: 14px;
        line-height: 1.5;
        // 确保内容自动换行
        white-space: normal;
        word-break: break-word;
        overflow-wrap: break-word;
        
        // 特别针对HTML内容的样式
        .html-content {
          width: 100%;
          max-width: 100%;
          overflow-wrap: break-word;
          word-break: break-word;
          
          // 确保内部所有元素也都换行
          * {
            white-space: normal;
            word-break: break-word;
            max-width: 100%;
          }
          
          // 针对可能的表格处理
          table {
            max-width: 100%;
            display: block;
            overflow-x: auto;
          }
        }
        
        :deep(p) {
          margin-bottom: 8px;
          // 确保段落内容自动换行
          white-space: normal;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        
        :deep(pre) {
          background-color: var(--el-fill-color-light);
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 8px;
          // 代码块保持水平滚动
          overflow-x: auto;
          // 但确保不会导致整体横向滚动
          max-width: 100%;
        }
        
        // 确保所有内容元素都有适当的换行
        :deep(div), :deep(span), :deep(code), :deep(blockquote) {
          white-space: normal;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        
        .comment-images {
          margin-top: 10px;
          
          .images-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .image-card {
            border: 1px solid var(--el-border-color-lighter);
            border-radius: 4px;
            padding: 2px;
            overflow: hidden;
            
            .comment-image {
              width: 60px;
              height: 60px;
              object-fit: cover;
              cursor: pointer;
            }
          }
        }
      }
    }
  }
  
  /* 移动端适配 */
  @media (max-width: 767px) {
    // 移除固定高度限制
    // .comments-list {
    //   max-height: 300px;
    // }
    
    .comment-content {
      padding-left: 36px !important;
    }
    
    .comment-image {
      width: 50px !important;
      height: 50px !important;
    }
  }
}
</style>
