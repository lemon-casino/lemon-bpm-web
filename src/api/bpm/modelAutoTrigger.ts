import request from '@/config/axios'

/**
 * 条件操作符
 */
export enum ConditionOperator {
  EQ = 'EQ',                    // 等于
  NE = 'NE',                    // 不等于
  GT = 'GT',                    // 大于
  GE = 'GE',                    // 大于等于
  LT = 'LT',                    // 小于
  LE = 'LE',                    // 小于等于
  CONTAINS = 'CONTAINS',        // 包含
  NOT_CONTAINS = 'NOT_CONTAINS',// 不包含
  EMPTY = 'EMPTY',              // 为空
  NOT_EMPTY = 'NOT_EMPTY'       // 非空
}

/**
 * 字段条件
 */
export interface FieldCondition {
  alias?: string           // 可选，复用 fieldMatches 中的别名
  field?: string           // 可选，指定表单字段编码
  modelFields?: string     // 可选，备用字段名
  operator: ConditionOperator | string  // 必填，条件操作符
  value?: any              // 可选，与操作符组合使用
}

/**
 * 模型配置
 */
export interface ModelConfig {
  modelKey: string
  statuses?: number[]
  fieldAliases?: Record<string, string>
  conditions?: FieldCondition[]  // 新增：字段条件配置
}

/**
 * 字段匹配条件
 */
export interface FieldMatch {
  alias?: string
  field: string
}

/**
 * 目标字段映射
 */
export interface TargetFieldMapping {
  alias?: string
  sourceModelKey?: string
  sourceField?: string
  targetField: string
}

/**
 * 联动触发规则
 */
export interface AutoTriggerRule {
  id?: number
  name: string
  status: number
  models: ModelConfig[]
  fieldMatches: FieldMatch[]
  targetProcessDefinitionKey: string
  targetStartUserId: number
  targetFixedVariables?: Record<string, any>
  targetFieldMappings: TargetFieldMapping[]
  remark?: string
  createTime?: string
  updateTime?: string
}

/**
 * 触发记录
 */
export interface TriggerRecord {
  id: number
  ruleId: number
  matchFingerprint: string
  sourceProcessInstanceIds: string
  targetProcessInstanceId?: string
  resultMessage: string
  createTime: string
}

/**
 * 分页查询参数
 */
export interface PageParam {
  pageNo: number
  pageSize: number
}

/**
 * 分页响应
 */
export interface PageResult<T> {
  list: T[]
  total: number
}

/**
 * 创建联动触发规则
 */
export const createAutoTriggerRule = (data: AutoTriggerRule) => {
  return request.post({
    url: '/bpm/model/auto-trigger/create',
    data
  })
}

/**
 * 更新联动触发规则
 */
export const updateAutoTriggerRule = (data: AutoTriggerRule) => {
  return request.put({
    url: '/bpm/model/auto-trigger/update',
    data
  })
}

/**
 * 删除联动触发规则
 */
export const deleteAutoTriggerRule = (id: number) => {
  return request.delete({
    url: `/bpm/model/auto-trigger/delete?id=${id}`
  })
}

/**
 * 获取联动触发规则详情
 */
export const getAutoTriggerRule = (id: number) => {
  return request.get<AutoTriggerRule>({
    url: `/bpm/model/auto-trigger/get?id=${id}`
  })
}

/**
 * 获取联动触发规则列表（分页）
 */
export const getAutoTriggerRulePage = (params: PageParam & { name?: string; status?: number }) => {
  return request.get<PageResult<AutoTriggerRule>>({
    url: '/bpm/model/auto-trigger/page',
    params
  })
}

/**
 * 手动触发检测
 * @param id 可选，如果传入则触发指定规则，否则触发所有启用的规则
 */
export const evaluateAutoTriggerRule = (id?: number) => {
  return request.post({
    url: '/bpm/model/auto-trigger/evaluate',
    params: id ? { id } : {}
  })
}

/**
 * 获取触发记录
 * @param ruleId 可选，如果传入则查询指定规则的记录，否则查询所有记录
 */
export const getTriggerRecords = (ruleId?: number) => {
  return request.get<TriggerRecord[]>({
    url: '/bpm/model/auto-trigger/records',
    params: ruleId ? { ruleId } : {}
  })
}

/**
 * 更新规则状态
 */
export const updateAutoTriggerRuleStatus = (id: number, status: number) => {
  return request.put({
    url: '/bpm/model/auto-trigger/update-status',
    data: { id, status }
  })
}

