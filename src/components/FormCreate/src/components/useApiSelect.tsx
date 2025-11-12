import { defineComponent, onMounted, ref, useAttrs } from 'vue'
import request from '@/config/axios'
import { isEmpty } from '@/utils/is'
import { ApiSelectProps } from '@/components/FormCreate/src/type'
import { jsonParse } from '@/utils'

/**
 * 全局选项缓存，避免相同配置的 ApiSelect 重复发起请求
 */
const optionsCache = new Map<string, any[]>()
const pendingOptionsCache = new Map<string, Promise<any[]>>()

function buildCacheKey(params: {
  method: string
  url: string
  data?: string
  remote?: boolean
  remoteField?: string
  query?: any
  labelField?: string
  valueField?: string
  parseFunc?: string
}) {
  const {
    method,
    url,
    data = '',
    remote = false,
    remoteField = 'label',
    query = '',
    labelField = 'label',
    valueField = 'value',
    parseFunc = ''
  } = params

  return JSON.stringify({
    method: method.toUpperCase(),
    url,
    data,
    remote,
    remoteField,
    query,
    labelField,
    valueField,
    parseFunc
  })
}

export const useApiSelect = (option: ApiSelectProps) => {
  return defineComponent({
    name: option.name,
    props: {
      // 选项标签
      labelField: {
        type: String,
        default: () => option.labelField ?? 'label'
      },
      // 选项的值
      valueField: {
        type: String,
        default: () => option.valueField ?? 'value'
      },
      // api 接口
      url: {
        type: String,
        default: () => option.url ?? ''
      },
      // 请求类型
      method: {
        type: String,
        default: 'GET'
      },
      // 选项解析函数
      parseFunc: {
        type: String,
        default: ''
      },
      // 请求参数
      data: {
        type: String,
        default: ''
      },
      // 选择器类型，下拉框 select、多选框 checkbox、单选框 radio
      selectType: {
        type: String,
        default: 'select'
      },
      // 是否多选
      multiple: {
        type: Boolean,
        default: false
      },
      // 是否远程搜索
      remote: {
        type: Boolean,
        default: false
      },
      // 远程搜索时携带的参数
      remoteField: {
        type: String,
        default: 'label'
      }
    },
    setup(props) {
      const attrs = useAttrs()
      const options = ref<any[]>([])
      const loading = ref(false)
      const queryParam = ref<any>()

      const parseFunc = () => {
        if (!props.parseFunc) return null
        try {
          return new Function(`return ${props.parseFunc}`)()
        } catch (error) {
          console.warn(`接口选择器解析函数执行失败:`, error)
          return null
        }
      }

      const parseExpression = (data: any, template: string) => {
        if (template.indexOf('${') === -1) {
          return data?.[template]
        }
        const pattern = /\$\{([^}]*)}/g
        return template.replace(pattern, (_, expr) => {
          const key = expr.trim()
          const result = data?.[key]
          if (result === undefined) {
            console.warn(
              `接口选择器选项模版[${template}] 中的字段 [${key}] 未能从接口响应中解析到值`
            )
          }
          return result
        })
      }

      const parseOptionsFromResponse = (data: any): any[] => {
        if (!isEmpty(props.parseFunc)) {
          const customParser = parseFunc()
          const parsed = customParser ? customParser(data) : []
          return Array.isArray(parsed) ? parsed : []
        }

        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            label: parseExpression(item, props.labelField),
            value: parseExpression(item, props.valueField)
          }))
        }

        const list = data?.list
        if (Array.isArray(list)) {
          return list.map((item: any) => ({
            label: parseExpression(item, props.labelField),
            value: parseExpression(item, props.valueField)
          }))
        }

        console.warn(
          `接口[${props.url}] 返回结果不是 yudao-vue-pro 标准返回，建议采用自定义解析函数处理`
        )
        return []
      }

      const fetchOptions = async (): Promise<any[]> => {
        if (isEmpty(props.url)) {
          return []
        }

        const method = (props.method || 'GET').toUpperCase()
        const cacheKey = buildCacheKey({
          method,
          url: props.url,
          data: method === 'POST' ? props.data || '' : '',
          remote: props.remote,
          remoteField: props.remoteField,
          query: props.remote ? queryParam.value ?? '' : '',
          labelField: props.labelField,
          valueField: props.valueField,
          parseFunc: props.parseFunc
        })

        if (optionsCache.has(cacheKey)) {
          return optionsCache.get(cacheKey) || []
        }

        let pending = pendingOptionsCache.get(cacheKey)
        if (!pending) {
          pending = (async () => {
            let response: any
            if (method === 'GET') {
              let url = props.url
              if (props.remote) {
                const query = queryParam.value ?? ''
                const connector = url.includes('?') ? '&' : '?'
                url = `${url}${connector}${props.remoteField}=${encodeURIComponent(query)}`
              }
              response = await request.get({ url })
            } else {
              const payload = jsonParse(props.data) || {}
              if (props.remote) {
                payload[props.remoteField] = queryParam.value
              }
              response = await request.post({ url: props.url, data: payload })
            }
            const parsed = parseOptionsFromResponse(response)
            optionsCache.set(cacheKey, parsed)
            return parsed
          })()
          pendingOptionsCache.set(cacheKey, pending)
        }

        try {
          loading.value = true
          const result = await pending
          return result
        } finally {
          loading.value = false
          pendingOptionsCache.delete(cacheKey)
        }
      }

      const getOptions = async () => {
        try {
          const result = await fetchOptions()
          options.value = Array.isArray(result) ? result : []
        } catch (error) {
          console.error(`获取接口[${props.url}] 选项失败:`, error)
        }
      }

      const remoteMethod = async (query: any) => {
        if (!query) return
        queryParam.value = query
        await getOptions()
      }

      onMounted(async () => {
        await getOptions()
      })

      const buildSelect = () => {
        const commonProps = {
          class: 'w-1/1',
          loading: loading.value,
          remote: props.remote,
          ...(props.remote ? { remoteMethod } : {})
        }

        if (props.multiple) {
          return (
            <el-select {...attrs} {...commonProps} multiple>
              {options.value.map((item, index) => (
                <el-option key={index} label={item.label} value={item.value} />
              ))}
            </el-select>
          )
        }

        return (
          <el-select {...attrs} {...commonProps}>
            {options.value.map((item, index) => (
              <el-option key={index} label={item.label} value={item.value} />
            ))}
          </el-select>
        )
      }

      const buildCheckbox = () => {
        const fallback = [
          { label: '选项1', value: '选项1' },
          { label: '选项2', value: '选项2' }
        ]
        const source = options.value.length ? options.value : fallback
        return (
          <el-checkbox-group class="w-1/1" {...attrs}>
            {source.map((item, index) => (
              <el-checkbox key={index} label={item.label} value={item.value} />
            ))}
          </el-checkbox-group>
        )
      }

      const buildRadio = () => {
        const fallback = [
          { label: '选项1', value: '选项1' },
          { label: '选项2', value: '选项2' }
        ]
        const source = options.value.length ? options.value : fallback
        return (
          <el-radio-group class="w-1/1" {...attrs}>
            {source.map((item, index) => (
              <el-radio key={index} value={item.value}>
                {item.label}
              </el-radio>
            ))}
          </el-radio-group>
        )
      }

      return () => (
        <>
          {props.selectType === 'select'
            ? buildSelect()
            : props.selectType === 'radio'
              ? buildRadio()
              : props.selectType === 'checkbox'
                ? buildCheckbox()
                : buildSelect()}
        </>
      )
    }
  })
}
