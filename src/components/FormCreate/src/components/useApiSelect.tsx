import request from '@/config/axios'
import { isEmpty } from '@/utils/is'
import { ApiSelectProps } from '@/components/FormCreate/src/type'
import { jsonParse } from '@/utils'
import { Fragment, computed, defineComponent, onMounted, ref, useAttrs, watch } from 'vue'

const OPTIONS_CACHE_TTL = 5 * 60 * 1000
const optionsCache = new Map<string, { expires: number; data: any }>()
const pendingRequests = new Map<string, Promise<any>>()

type RequestLikeProps = Pick<
  ApiSelectProps,
  'url' | 'method' | 'remote' | 'remoteField' | 'data'
> & { labelField?: string; valueField?: string }

function buildCacheKey(params: {
  url: string
  method: string
  remote: boolean
  remoteField: string
  query: unknown
  data: string
}) {
  const { url, method, remote, remoteField, query, data } = params
  const normalizedUrl = url || ''
  const normalizedData = data || ''
  const queryKey = remote && query !== undefined && query !== null ? `${remoteField}:${query}` : ''
  return `${method}|${normalizedUrl}|${normalizedData}|${queryKey}`
}

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function parseOptions(data: any, props: RequestLikeProps, parseFunc?: (data: any) => any[]) {
  if (parseFunc) {
    try {
      const parsed = parseFunc(data)
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          label: item.label,
          value: item.value,
          raw: item.raw ?? item
        }))
      }
      console.warn('parseFunc 未返回数组，已忽略自定义解析结果')
    } catch (error) {
      console.error('执行 parseFunc 出错:', error)
    }
  }

  let result = data
  if (result && Array.isArray(result.data)) {
    result = result.data
  }
  if (Array.isArray(result)) {
    return result.map((item: any) => ({
      label: parseExpression(item, props.labelField ?? 'label'),
      value: parseExpression(item, props.valueField ?? 'value'),
      raw: item
    }))
  }
  if (result && Array.isArray(result.list)) {
    return result.list.map((item: any) => ({
      label: parseExpression(item, props.labelField ?? 'label'),
      value: parseExpression(item, props.valueField ?? 'value'),
      raw: item
    }))
  }

  console.warn(`接口[${props.url}] 返回结果不是标准数组格式，建议提供 parseFunc 处理`)
  return []
}

function parseExpression(data: any, template: string) {
  if (!template.includes('${')) {
    return data?.[template]
  }
  const pattern = /\$\{([^}]*)}/g
  return template.replace(pattern, (_, expr) => {
    const key = String(expr).trim()
    const value = data?.[key]
    return value ?? ''
  })
}

async function loadRemoteOptions(props: RequestLikeProps, query: unknown) {
  const cacheKey = buildCacheKey({
    url: props.url ?? '',
    method: props.method ?? 'GET',
    remote: props.remote ?? false,
    remoteField: props.remoteField ?? 'label',
    query,
    data: props.data ?? ''
  })

  const cached = optionsCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  const existingRequest = pendingRequests.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  const requestPromise = (async () => {
    let responseData: any
    switch (props.method) {
      case 'POST': {
        const payload = jsonParse(props.data) || {}
        if (props.remote && query !== undefined && query !== null) {
          payload[props.remoteField ?? 'label'] = query
        }
        responseData = await request.post({ url: props.url ?? '', data: payload })
        break
      }
      case 'GET':
      default: {
        let url = props.url ?? ''
        if (props.remote && query !== undefined && query !== null) {
          const searchParam = `${props.remoteField ?? 'label'}=${encodeURIComponent(String(query))}`
          url = url.includes('?') ? `${url}&${searchParam}` : `${url}?${searchParam}`
        }
        responseData = await request.get({ url })
        break
      }
    }
    optionsCache.set(cacheKey, { expires: Date.now() + OPTIONS_CACHE_TTL, data: responseData })
    return responseData
  })()

  pendingRequests.set(cacheKey, requestPromise)
  try {
    return await requestPromise
  } finally {
    pendingRequests.delete(cacheKey)
  }
}

export const useApiSelect = (option: ApiSelectProps) => {
  return defineComponent({
    name: option.name,
    props: {
      labelField: { type: String, default: () => option.labelField ?? 'label' },
      valueField: { type: String, default: () => option.valueField ?? 'value' },
      url: { type: String, default: () => option.url ?? '' },
      method: { type: String, default: 'GET' },
      parseFunc: { type: String, default: '' },
      data: { type: String, default: '' },
      selectType: { type: String, default: 'select' },
      multiple: { type: Boolean, default: false },
      remote: { type: Boolean, default: false },
      remoteField: { type: String, default: 'label' },
      linkField: { type: String, default: '' },
      formCreateInject: { type: Object, default: null }
    },
    setup(props) {
      const attrs = useAttrs()
      const options = ref<any[]>([])
      const loading = ref(false)
      const latestQuery = ref<unknown>(undefined)

      const parseFn = computed<((data: any) => any[]) | undefined>(() => {
        if (!props.parseFunc) return undefined
        try {
          return new Function(`return ${props.parseFunc}`)()
        } catch (error) {
          console.error('解析 parseFunc 失败:', error)
          return undefined
        }
      })

      const loadOptions = async (query?: unknown) => {
        if (isEmpty(props.url)) {
          options.value = []
          return
        }
        latestQuery.value = query
        loading.value = true
        try {
          const response = await loadRemoteOptions(props, query)
          options.value = parseOptions(response, props, parseFn.value)
        } finally {
          loading.value = false
        }
      }

      const ensureInitialOptions = async () => {
        if (options.value.length > 0) return
        if (props.remote && isEmpty((attrs as any).modelValue)) {
          return
        }
        await loadOptions(latestQuery.value)
      }

      watch(
        () => [props.url, props.method, props.data],
        async () => {
          options.value = []
          await ensureInitialOptions()
        }
      )

      watch(
        () => (attrs as any).modelValue,
        async (value) => {
          if (value !== undefined && value !== null) {
            await ensureInitialOptions()
          }
        },
        { immediate: true }
      )

      onMounted(async () => {
        if (!props.remote) {
          await ensureInitialOptions()
        }
      })

      const applyLinkField = (raw: any | any[]) => {
        if (!props.linkField || !props.formCreateInject) return
        const linkMap = jsonParse(props.linkField) || {}
        if (typeof linkMap !== 'object') return
        const api = (props.formCreateInject as any).api || (props.formCreateInject as any).fapi
        if (!api) return
        Object.entries(linkMap).forEach(([source, target]) => {
          if (Array.isArray(raw)) {
            const values = raw.map((item) => item && item[source]).filter((v) => v !== undefined)
            api.setValue && api.setValue(target as string, values)
          } else if (raw && raw[source] !== undefined) {
            api.setValue && api.setValue(target as string, raw[source])
          }
        })
      }

      const renderOptions = computed(() => {
        const map = new Map<string, any>()
        options.value.forEach((item) => {
          const key = String(item.value)
          if (!map.has(key)) {
            map.set(key, item)
          }
        })

        const selected = ensureArray((attrs as any).modelValue)
        selected.forEach((value) => {
          const key = String(value)
          if (!map.has(key)) {
            map.set(key, {
              value,
              label: key,
              raw: { [props.valueField]: value, [props.labelField]: key }
            })
          }
        })

        return Array.from(map.values())
      })

      const findItem = (value: any) =>
        renderOptions.value.find((item) => String(item.value) === String(value))

      const triggerChange = (val: any) => {
        const handler = (attrs as any).onChange

        if (props.multiple && Array.isArray(val)) {
          const rows = val.map((v) => findItem(v)?.raw)
          applyLinkField(rows)
          handler && handler(val, rows)
        } else {
          const row = findItem(val)?.raw
          applyLinkField(row)
          handler && handler(val, row)
        }
      }

      const remoteMethod = async (query: string) => {
        if (!query) return
        await loadOptions(query)
      }

      const buildSelect = () => (
        <el-select
          class="w-full"
          multiple={props.multiple}
          filterable
          loading={loading.value}
          {...attrs}
          remote={props.remote}
          {...(props.remote && { remoteMethod })}
          value-key="value"
          onChange={triggerChange}
        >
          {{
            default: () =>
              renderOptions.value.map((item, index) => (
                <el-option key={index} label={item.label} value={item.value} />
              ))
          }}
        </el-select>
      )

      const buildCheckbox = () => (
        <el-checkbox-group class="w-full" {...attrs} onChange={triggerChange}>
          {renderOptions.value.map((item, index) => (
            <el-checkbox key={index} label={item.value}>
              {item.label}
            </el-checkbox>
          ))}
        </el-checkbox-group>
      )

      const buildRadio = () => (
        <el-radio-group class="w-full" {...attrs} onChange={triggerChange}>
          {renderOptions.value.map((item, index) => (
            <el-radio key={index} value={item.value}>
              {item.label}
            </el-radio>
          ))}
        </el-radio-group>
      )

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
