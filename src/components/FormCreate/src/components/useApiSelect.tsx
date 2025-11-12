import request from '@/config/axios'
import { isEmpty } from '@/utils/is'
import { ApiSelectProps } from '@/components/FormCreate/src/type'
import { jsonParse } from '@/utils'
import { Fragment, computed, defineComponent, onMounted, ref, useAttrs, watch } from 'vue'

const LABEL_CACHE_PREFIX = 'api_select_label_cache__'

const labelCache = (() => {
  const getStorage = () => {
    if (typeof window === 'undefined') {
      return null
    }
    try {
      return window.localStorage
    } catch (error) {
      console.warn('访问本地缓存失败:', error)
      return null
    }
  }

  const sanitize = (key: string) => key.replace(/[^a-zA-Z0-9_\-]/g, '_')

  const getKey = (url: string, value: string) => `${LABEL_CACHE_PREFIX}${sanitize(url)}_${value}`

  return {
    get(url: string, value: string): string | null {
      const storage = getStorage()
      if (!storage || !url || !value) {
        return null
      }
      try {
        return storage.getItem(getKey(url, value))
      } catch (error) {
        console.warn('读取标签缓存失败:', error)
        return null
      }
    },
    save(url: string, value: string, label: string) {
      const storage = getStorage()
      if (!storage || !url || !value || !label) {
        return
      }
      try {
        storage.setItem(getKey(url, value), label)
      } catch (error) {
        console.warn('写入标签缓存失败:', error)
      }
    },
    saveMany(url: string, items: { value: string; label: string }[]) {
      if (!items || items.length === 0) {
        return
      }
      items.forEach(item => {
        if (item.value !== undefined && item.value !== null && item.label) {
          this.save(url, item.value, item.label)
        }
      })
    }
  }
})()

if (typeof window !== 'undefined') {
  ;(window as any).labelCache = labelCache
}

const responseCache = new Map<string, any>()
const pendingCache = new Map<string, Promise<any>>()

type CacheContext = {
  method: string
  url: string
  data: string
  remote: boolean
  remoteField: string
  query: string
}

type SelectOption = {
  label: string
  value: any
  raw?: any
}

const toKey = (value: any): string => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, Object.keys(value).sort())
    } catch (error) {
      return String(value)
    }
  }
  return String(value)
}

const stableStringify = (data: Record<string, any>) => {
  return JSON.stringify(data, Object.keys(data).sort())
}

const buildCacheKey = ({ method, url, data, remote, remoteField, query }: CacheContext) => {
  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === 'GET') {
    if (!remote) {
      return `${normalizedMethod}:${url}`
    }
    return `${normalizedMethod}:${url}?${remoteField}=${query}`
  }
  return `${normalizedMethod}:${url}:${stableStringify(jsonParse(data) || {})}:${remote ? `${remoteField}=${query}` : ''}`
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
      },
      // 联动字段映射
      linkField: {
        type: String,
        default: ''
      },
      // form-create 注入对象
      formCreateInject: {
        type: Object,
        default: null
      }
    },
    setup(props) {
      const attrs = useAttrs()
      const options = ref<SelectOption[]>([])
      const tempOptions = ref<SelectOption[]>([])
      const loading = ref(false)
      const queryParam = ref<any>('')

      const modelValueRef = computed(() => (attrs as any).modelValue)

      const mergedOptions = computed(() => {
        const result: SelectOption[] = []
        const seen = new Set<string>()
        ;[...tempOptions.value, ...options.value].forEach(item => {
          const key = toKey(item.value)
          if (seen.has(key)) {
            return
          }
          seen.add(key)
          result.push(item)
        })
        return result
      })

      const parseExpression = (data: any, template: string) => {
        if (!template.includes('${')) {
          return data?.[template]
        }
        return template.replace(/\$\{([^}]*)}/g, (_, expr) => {
          const value = data?.[expr.trim()]
          return value !== undefined && value !== null ? value : ''
        })
      }

      const normalizeOptionList = (list: any[]): SelectOption[] => {
        return list.map((item: any) => {
          if (item && Object.prototype.hasOwnProperty.call(item, 'label') && Object.prototype.hasOwnProperty.call(item, 'value')) {
            return {
              label: item.label,
              value: item.value,
              raw: item.raw ?? item
            }
          }
          return {
            label: parseExpression(item, props.labelField),
            value: parseExpression(item, props.valueField),
            raw: item
          }
        })
      }

      const resolveOptions = (data: any): SelectOption[] => {
        if (!isEmpty(props.parseFunc)) {
          const fn = (() => {
            try {
              // eslint-disable-next-line no-new-func
              return new Function(`return ${props.parseFunc}`)()
            } catch (error) {
              console.warn('解析自定义函数失败:', error)
              return null
            }
          })()
          if (typeof fn === 'function') {
            const result = fn(data)
            if (Array.isArray(result)) {
              return normalizeOptionList(result)
            }
            if (result && Array.isArray(result.data)) {
              return normalizeOptionList(result.data)
            }
          }
        }

        if (Array.isArray(data)) {
          return normalizeOptionList(data)
        }
        if (Array.isArray(data?.list)) {
          return normalizeOptionList(data.list)
        }
        if (Array.isArray(data?.rows)) {
          return normalizeOptionList(data.rows)
        }
        if (Array.isArray(data?.data)) {
          return normalizeOptionList(data.data)
        }
        return []
      }

      const refreshTempOptions = () => {
        const current = modelValueRef.value
        const values: any[] = []
        if (props.multiple) {
          if (Array.isArray(current)) {
            values.push(...current)
          }
        } else if (current !== undefined && current !== null && current !== '') {
          values.push(current)
        }

        if (!values.length) {
          tempOptions.value = []
          return
        }

        const items: SelectOption[] = []
        const seen = new Set<string>()

        values.forEach(val => {
          const key = toKey(val)
          if (seen.has(key)) {
            return
          }
          seen.add(key)

          const existing = options.value.find(item => toKey(item.value) === key)
          if (existing) {
            items.push({ label: existing.label, value: existing.value, raw: existing.raw })
            return
          }

          const cachedLabel = labelCache.get(props.url, key)
          if (cachedLabel) {
            items.push({ label: cachedLabel, value: val })
          }
        })

        tempOptions.value = items
      }

      const applyResponse = (data: any, fromCache = false) => {
        const parsed = resolveOptions(data)
        options.value = parsed
        if (!fromCache && parsed.length) {
          labelCache.saveMany(
            props.url,
            parsed.map(item => ({ value: toKey(item.value), label: item.label }))
          )
        }
        refreshTempOptions()
      }

      const fetchOptions = async () => {
        if (isEmpty(props.url)) {
          return
        }
        const method = (props.method || 'GET').toUpperCase()
        const remoteField = props.remoteField || 'label'
        const query = props.remote ? toKey(queryParam.value ?? '') : ''
        const cacheKey = buildCacheKey({
          method,
          url: props.url,
          data: props.data,
          remote: props.remote,
          remoteField,
          query
        })

        if (responseCache.has(cacheKey)) {
          applyResponse(responseCache.get(cacheKey), true)
          return
        }

        let pending = pendingCache.get(cacheKey)
        if (!pending) {
          pending = (async () => {
            if (method === 'GET') {
              let url = props.url
              if (props.remote) {
                const separator = url.includes('?') ? '&' : '?'
                url = `${url}${separator}${remoteField}=${query}`
              }
              const response = await request.get({ url })
              return response
            }
            const basePayload = jsonParse(props.data) || {}
            const payload = { ...basePayload }
            if (props.remote) {
              payload[remoteField] = queryParam.value ?? ''
            }
            const response = await request.post({ url: props.url, data: payload })
            return response
          })()
          pendingCache.set(cacheKey, pending)
        }

        loading.value = true
        try {
          const responseData = await pending
          responseCache.set(cacheKey, responseData)
          applyResponse(responseData)
        } finally {
          loading.value = false
          pendingCache.delete(cacheKey)
        }
      }

      const applyLinkField = (raw: any | any[]) => {
        if (!props.linkField || !props.formCreateInject) {
          return
        }
        const mapping = jsonParse(props.linkField)
        const api = (props.formCreateInject as any)?.api || (props.formCreateInject as any)?.fapi
        if (!mapping || typeof mapping !== 'object' || !api) {
          return
        }
        const pairs = Object.entries(mapping)
        if (!pairs.length) {
          return
        }
        if (Array.isArray(raw)) {
          pairs.forEach(([source, target]) => {
            const values = raw
              .map(item => (item ? item[source] : undefined))
              .filter(value => value !== undefined)
            api.setValue && api.setValue(target as string, values)
          })
          return
        }
        if (raw) {
          pairs.forEach(([source, target]) => {
            if (raw[source] !== undefined) {
              api.setValue && api.setValue(target as string, raw[source])
            }
          })
        }
      }

      const emitChange = (value: any) => {
        const handler = (attrs as any).onChange
        const findItem = (val: any) => options.value.find(option => toKey(option.value) === toKey(val))

        if (props.multiple && Array.isArray(value)) {
          const rows = value.map(item => findItem(item)?.raw).filter(Boolean)
          applyLinkField(rows)
          handler && handler(value, rows)
        } else {
          const row = findItem(value)?.raw
          applyLinkField(row)
          handler && handler(value, row)
        }
      }

      const remoteMethod = async (query: any) => {
        if (!props.remote) {
          return
        }
        queryParam.value = query
        await fetchOptions()
      }

      watch(modelValueRef, () => {
        refreshTempOptions()
      }, { deep: true })

      onMounted(() => {
        refreshTempOptions()
        void fetchOptions()
      })

      const mergeClass = (original: any) => {
        if (!original) {
          return 'w-1/1'
        }
        return Array.isArray(original) ? ['w-1/1', ...original] : ['w-1/1', original]
      }

      const buildSelect = () => {
        const opts = mergedOptions.value
        const baseAttrs = { ...(attrs as Record<string, any>) }
        const selectProps = {
          ...baseAttrs,
          class: mergeClass(baseAttrs.class),
          loading: loading.value,
          remote: props.remote,
          ...(props.remote ? { remoteMethod } : {}),
          onChange: emitChange
        }

        if (props.multiple) {
          return (
            <el-select {...selectProps} multiple>
              {opts.map((item, index) => (
                <el-option key={index} label={item.label} value={item.value} />
              ))}
            </el-select>
          )
        }
        return (
          <el-select {...selectProps}>
            {opts.map((item, index) => (
              <el-option key={index} label={item.label} value={item.value} />
            ))}
          </el-select>
        )
      }

      const buildCheckbox = () => {
        const opts = options.value.length ? options.value : [
          { label: '选项1', value: '选项1' },
          { label: '选项2', value: '选项2' }
        ]
        const baseAttrs = { ...(attrs as Record<string, any>) }
        const groupProps = {
          ...baseAttrs,
          class: mergeClass(baseAttrs.class),
          onChange: emitChange
        }
        return (
          <el-checkbox-group {...groupProps}>
            {opts.map((item, index) => (
              <el-checkbox key={index} label={item.label} value={item.value} />
            ))}
          </el-checkbox-group>
        )
      }

      const buildRadio = () => {
        const opts = options.value.length ? options.value : [
          { label: '选项1', value: '选项1' },
          { label: '选项2', value: '选项2' }
        ]
        const baseAttrs = { ...(attrs as Record<string, any>) }
        const groupProps = {
          ...baseAttrs,
          class: mergeClass(baseAttrs.class),
          onChange: emitChange
        }
        return (
          <el-radio-group {...groupProps}>
            {opts.map((item, index) => (
              <el-radio key={index} value={item.value}>
                {item.label}
              </el-radio>
            ))}
          </el-radio-group>
        )
      }

      return () => (
        <Fragment>
          {props.selectType === 'select'
            ? buildSelect()
            : props.selectType === 'radio'
              ? buildRadio()
              : props.selectType === 'checkbox'
                ? buildCheckbox()
                : buildSelect()}
        </Fragment>
      )
    }
  })
}
