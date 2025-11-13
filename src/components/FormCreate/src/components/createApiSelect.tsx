import request from '@/config/axios'
import { isEmpty } from '@/utils/is'
import { jsonParse } from '@/utils'
import { ApiSelectProps } from '@/components/FormCreate/src/type'
import {
  computed,
  defineComponent,
  onMounted,
  ref,
  useAttrs,
  watch
} from 'vue'

interface OptionItem {
  label: string
  value: any
  raw: Record<string, any>
}

interface CacheRecord {
  expires: number
  options: OptionItem[]
}

const OPTION_CACHE_TTL = 5 * 60 * 1000 // 5分钟
const optionCache = new Map<string, CacheRecord>()
const pendingCache = new Map<string, Promise<OptionItem[]>>()

const cloneOptions = (items: OptionItem[]) => items.map((item) => ({ ...item }))

const buildCacheKey = (url: string, method: string, data?: string) => {
  const normalizedMethod = (method || 'GET').toUpperCase()
  const base = `${normalizedMethod}::${url || ''}`
  const dataKey = normalizedMethod === 'POST' ? `::${data || ''}` : ''
  return `${base}${dataKey}`
}

const parseTemplate = (data: Record<string, any>, template: string) => {
  if (!template) {
    return ''
  }

  if (!template.includes('${')) {
    return data?.[template]
  }

  const pattern = /\$\{([^}]*)}/g
  return template.replace(pattern, (_, expr) => {
    const key = String(expr).trim()
    const value = data?.[key]
    return value !== undefined && value !== null ? value : ''
  })
}

const toOptionItems = (
  source: any,
  labelField: string,
  valueField: string,
  parseFunc?: string
): OptionItem[] => {
  if (parseFunc) {
    try {
      const resolver = new Function(`return ${parseFunc}`)()
      const parsed = resolver?.(source)
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          label: item.label,
          value: item.value,
          raw: item.raw ?? item
        }))
      }
    } catch (error) {
      console.warn('接口选择器解析函数执行失败:', error)
    }
  }

  let payload = source
  if (Array.isArray(payload)) {
    return payload.map((item: any) => ({
      label: parseTemplate(item, labelField),
      value: parseTemplate(item, valueField),
      raw: item
    }))
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.list)) {
      return payload.list.map((item: any) => ({
        label: parseTemplate(item, labelField),
        value: parseTemplate(item, valueField),
        raw: item
      }))
    }
    if (Array.isArray(payload.data)) {
      return payload.data.map((item: any) => ({
        label: parseTemplate(item, labelField),
        value: parseTemplate(item, valueField),
        raw: item
      }))
    }
  }

  return []
}

const resolveActualValue = (attrs: Record<string, any>, fallback: any) => {
  if (Object.prototype.hasOwnProperty.call(attrs, 'modelValue')) {
    return attrs.modelValue
  }
  return fallback
}

const forwardAttrs = (attrs: Record<string, any>) => {
  const result: Record<string, any> = {}
  Object.keys(attrs).forEach((key) => {
    if (key === 'modelValue' || key === 'onUpdate:modelValue' || key === 'onChange') {
      return
    }
    result[key] = attrs[key]
  })
  return result
}

const applyLinkField = (
  linkField: string,
  inject: any,
  raw: any | any[]
) => {
  if (!linkField || !inject) return
  const map = jsonParse(linkField)
  if (!map || typeof map !== 'object') return

  const api = inject.api || inject.fapi
  if (!api || typeof api.setValue !== 'function') return

  Object.entries(map).forEach(([source, target]) => {
    if (Array.isArray(raw)) {
      const values = raw
        .map((item) => (item ? item[source] : undefined))
        .filter((value) => value !== undefined)
      api.setValue(target as string, values)
    } else if (raw && raw[source] !== undefined) {
      api.setValue(target as string, raw[source])
    }
  })
}

const findRaw = (options: OptionItem[], value: any) => {
  return options.find((item) => String(item.value) === String(value))?.raw
}

export const createApiSelectComponent = (option: ApiSelectProps) => {
  return defineComponent({
    name: option.name,
    props: {
      modelValue: {
        type: [String, Number, Object, Array] as any,
        default: undefined
      },
      labelField: {
        type: String,
        default: () => option.labelField ?? 'label'
      },
      valueField: {
        type: String,
        default: () => option.valueField ?? 'value'
      },
      url: {
        type: String,
        default: () => option.url ?? ''
      },
      method: {
        type: String,
        default: () => option.method ?? 'GET'
      },
      parseFunc: {
        type: String,
        default: ''
      },
      data: {
        type: String,
        default: ''
      },
      params: {
        type: Object as () => Record<string, any>,
        default: () => option.params ?? {}
      },
      selectType: {
        type: String,
        default: 'select'
      },
      multiple: {
        type: Boolean,
        default: false
      },
      remote: {
        type: Boolean,
        default: false
      },
      remoteField: {
        type: String,
        default: 'label'
      },
      linkField: {
        type: String,
        default: ''
      },
      formCreateInject: {
        type: Object,
        default: null
      }
    },
    emits: ['update:modelValue', 'change'],
    setup(props, { emit }) {
      const attrs = useAttrs() as Record<string, any>
      const options = ref<OptionItem[]>([])
      const loading = ref(false)
      const forwarded = computed(() => forwardAttrs(attrs))
      const currentValue = computed(() => resolveActualValue(attrs, props.modelValue))

      const shouldCache = computed(() => !props.remote && !isEmpty(props.url))
      const currentCacheKey = computed(() =>
        buildCacheKey(props.url || '', props.method || 'GET', props.data || '')
      )

      const loadOptions = async (query?: string) => {
        if (isEmpty(props.url)) {
          options.value = []
          return
        }

        const method = (props.method || 'GET').toUpperCase()
        const useCache = shouldCache.value && !query
        const cacheKey = currentCacheKey.value

        if (useCache) {
          const record = optionCache.get(cacheKey)
          if (record && record.expires > Date.now()) {
            options.value = cloneOptions(record.options)
            return
          }
          const pending = pendingCache.get(cacheKey)
          if (pending) {
            options.value = cloneOptions(await pending)
            return
          }
        }

        const runner = async () => {
          loading.value = true
          try {
            let response: any
            if (method === 'GET') {
              const params: Record<string, any> = { ...(props.params || {}) }
              if (props.remote && query !== undefined && query !== '') {
                params[props.remoteField] = query
              }

              const url = props.url || ''
              response = await request.get({ url, params })
            } else {
              const payload = jsonParse(props.data) || {}
              Object.assign(payload, props.params || {})
              if (props.remote && query !== undefined && query !== '') {
                payload[props.remoteField] = query
              }
              response = await request.post({ url: props.url, data: payload })
            }

            const parsed = toOptionItems(
              response,
              props.labelField,
              props.valueField,
              props.parseFunc
            )
            options.value = parsed

            if (useCache) {
              optionCache.set(cacheKey, {
                expires: Date.now() + OPTION_CACHE_TTL,
                options: cloneOptions(parsed)
              })
            }
            return parsed
          } finally {
            loading.value = false
          }
        }

        if (useCache) {
          const pending = runner().finally(() => pendingCache.delete(cacheKey))
          pendingCache.set(cacheKey, pending)
          options.value = cloneOptions(await pending)
        } else {
          await runner()
        }
      }

      const emitChange = (value: any) => {
        const changeHandler = attrs.onChange
        if (!changeHandler && !props.linkField && !props.formCreateInject) {
          return
        }

        if (props.multiple) {
          const arrayValue = Array.isArray(value) ? value : value ? [value] : []
          const rows = arrayValue
            .map((item) => findRaw(options.value, item))
            .filter((raw) => raw !== undefined)
          applyLinkField(props.linkField, props.formCreateInject, rows)
          if (typeof changeHandler === 'function') {
            changeHandler(value, rows)
          }
        } else {
          const row = findRaw(options.value, value)
          applyLinkField(props.linkField, props.formCreateInject, row)
          if (typeof changeHandler === 'function') {
            changeHandler(value, row)
          }
        }
      }

      const updateValue = (value: any) => {
        emit('update:modelValue', value)
        const handler = attrs['onUpdate:modelValue']
        if (typeof handler === 'function') {
          handler(value)
        }
        emitChange(value)
      }

      const remoteMethod = async (query: string) => {
        if (!props.remote) return
        await loadOptions(query)
      }

      onMounted(async () => {
        await loadOptions()
      })

      watch(
        () => [props.url, props.method, props.data],
        async (_newVal, oldVal) => {
          if (oldVal) {
            const [oldUrl, oldMethod, oldData] = oldVal as [string?, string?, string?]
            const oldKey = buildCacheKey(
              oldUrl || '',
              (oldMethod || 'GET').toString().toUpperCase(),
              oldData || ''
            )
            optionCache.delete(oldKey)
          }
          await loadOptions()
        }
      )

      watch(
        () => [props.labelField, props.valueField, props.parseFunc],
        async () => {
          await loadOptions()
        }
      )

      watch(
        () => props.params,
        async () => {
          await loadOptions()
        },
        { deep: true }
      )

      return () => {
        const value = currentValue.value
        const sharedAttrs = forwarded.value

        if (props.selectType === 'radio') {
          return (
            <el-radio-group
              class="w-full"
              modelValue={value}
              onUpdate:modelValue={updateValue}
              {...sharedAttrs}
            >
              {options.value.map((item, index) => (
                <el-radio key={index} label={item.value}>
                  {item.label}
                </el-radio>
              ))}
            </el-radio-group>
          )
        }

        if (props.selectType === 'checkbox') {
          return (
            <el-checkbox-group
              class="w-full"
              modelValue={value}
              onUpdate:modelValue={updateValue}
              {...sharedAttrs}
            >
              {options.value.map((item, index) => (
                <el-checkbox key={index} label={item.value}>
                  {item.label}
                </el-checkbox>
              ))}
            </el-checkbox-group>
          )
        }

        return (
          <el-select
            class="w-full"
            modelValue={value}
            loading={loading.value}
            multiple={props.multiple}
            remote={props.remote}
            onUpdate:modelValue={updateValue}
            {...(props.remote ? { remoteMethod } : {})}
            {...sharedAttrs}
          >
            {options.value.map((item, index) => (
              <el-option key={index} label={item.label} value={item.value} />
            ))}
          </el-select>
        )
      }
    }
  })
}

export default createApiSelectComponent
