import request from '@/config/axios'

/**
 * 模型基础信息
 */
export interface ModelBasicInfo {
  modelKey: string
  modelName: string
  processDefinitionId: string
  version: number
}

/**
 * 模型字段信息
 */
export interface ModelFieldInfo {
  type: string
  field: string
  title: string
}

/**
 * 模型版本字段详情
 */
export interface ModelVersionField {
  version: number
  title: string
  type: string
  latest: boolean
  sameAsLatest: boolean
}

/**
 * 模型字段详情（聚合）
 */
export interface ModelFieldDetail {
  field: string
  title: string
  type: string
  latestVersion: number
  consistent: boolean
  versions: ModelVersionField[]
}

/**
 * 模型版本信息
 */
export interface ModelVersionInfo {
  processDefinitionId: string
  version: number
  fields: ModelFieldInfo[]
}

/**
 * 模型详情响应
 */
export interface ModelDetailResponse {
  modelKey: string
  modelName: string
  updateTime: string
  versions: ModelVersionInfo[]
  fields: ModelFieldDetail[]
}

/**
 * 获取模型基础列表
 */
export const getModelList = () => {
  return request.get<ModelBasicInfo[]>({
    url: '/bpm/model-form-match/list'
  })
}

/**
 * 获取模型详情（包含所有版本和字段信息）
 */
export const getModelDetail = (modelKey: string) => {
  return request.get<ModelDetailResponse>({
    url: '/bpm/model-form-match/detail',
    params: { modelKey }
  })
}

