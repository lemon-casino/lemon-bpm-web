import { defineComponent, onMounted, ref, useAttrs } from 'vue'
import request from '@/config/axios'
import { jsonParse } from '@/utils'
import { isEmpty } from '@/utils/is'
import { ApiSelectProps } from '@/components/FormCreate/src/type'

export const useApiSelect = (option: ApiSelectProps) => {
  console.log('useApiSelect', option)
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

      const parseExpression = (data: any, template: string) => {
        if (template.indexOf('${') === -1) {
          return data[template]
        }
        const pattern = /\$\{([^}]*)}/g
        return template.replace(pattern, (_, expr) => {
          const result = data[expr.trim()]
          if (!result) {
            console.warn(
              `接口选择器选项模版[${template}][${expr.trim()}] 解析值失败结果为[${result}], 请检查属性名称是否存在于接口返回值中,存在则忽略此条！！！`
            )
          }
          return result
        })
      }

      const parseFunc = () => {
        let parse: any = null
        if (props.parseFunc) {
          parse = new Function(`return ${props.parseFunc}`)()
        }
        return parse
      }

      const parseOptions0 = (data: any[]) => {
        if (Array.isArray(data)) {
          options.value = data.map((item: any) => ({
            label: parseExpression(item, props.labelField),
            value: parseExpression(item, props.valueField)
          }))
          return
        }
        console.warn(`接口[${props.url}] 返回结果不是一个数组`)
      }

      const parseOptions = (data: any) => {
        if (!isEmpty(props.parseFunc)) {
          options.value = parseFunc()?.(data)
          return
        }
        if (Array.isArray(data)) {
          parseOptions0(data)
          return
        }
        data = data.list
        if (!!data && Array.isArray(data)) {
          parseOptions0(data)
          return
        }
        console.warn(
          `接口[${props.url}] 返回结果不是 yudao-vue-pro 标准返回建议采用自定义解析函数处理`
        )
      }

      const getOptions = async () => {
        options.value = []
        if (isEmpty(props.url)) {
          return
        }

        switch (props.method) {
          case 'GET': {
            let url = props.url
            if (props.remote && queryParam.value !== undefined) {
              if (url.includes('?')) {
                url = `${url}&${props.remoteField}=${queryParam.value}`
              } else {
                url = `${url}?${props.remoteField}=${queryParam.value}`
              }
            }
            parseOptions(await request.get({ url }))
            break
          }
          case 'POST': {
            const data: any = jsonParse(props.data)
            if (props.remote) {
              data[props.remoteField] = queryParam.value
            }
            parseOptions(await request.post({ url: props.url, data }))
            break
          }
        }
      }

      const remoteMethod = async (query: any) => {
        if (!query) {
          return
        }
        loading.value = true
        try {
          queryParam.value = query
          await getOptions()
        } finally {
          loading.value = false
        }
      }

      onMounted(async () => {
        await getOptions()
      })

      const buildSelect = () => {
        if (props.multiple) {
          return (
            <el-select
              class="w-1/1"
              multiple
              loading={loading.value}
              {...attrs}
              remote={props.remote}
              {...(props.remote && { remoteMethod })}
            >
              {options.value.map((item, index) => (
                <el-option key={index} label={item.label} value={item.value} />
              ))}
            </el-select>
          )
        }
        return (
          <el-select
            class="w-1/1"
            loading={loading.value}
            {...attrs}
            remote={props.remote}
            {...(props.remote && { remoteMethod })}
          >
            {options.value.map((item, index) => (
              <el-option key={index} label={item.label} value={item.value} />
            ))}
          </el-select>
        )
      }

      const buildCheckbox = () => {
        if (isEmpty(options.value)) {
          options.value = [
            { label: '选项1', value: '选项1' },
            { label: '选项2', value: '选项2' }
          ]
        }
        return (
          <el-checkbox-group class="w-1/1" {...attrs}>
            {options.value.map((item, index) => (
              <el-checkbox key={index} label={item.label} value={item.value} />
            ))}
          </el-checkbox-group>
        )
      }

      const buildRadio = () => {
        if (isEmpty(options.value)) {
          options.value = [
            { label: '选项1', value: '选项1' },
            { label: '选项2', value: '选项2' }
          ]
        }
        return (
          <el-radio-group class="w-1/1" {...attrs}>
            {options.value.map((item, index) => (
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
