import type { App, Plugin } from 'vue'
import formCreate from '@form-create/element-ui'
import { ElTreeSelect } from 'element-plus'
import { useFormCreateDesigner } from './src/useFormCreateDesigner'
import { createApiSelectComponent } from './src/components/createApiSelect'
import { useSelectRule } from './src/config/index'

export { useFormCreateDesigner, createApiSelectComponent, useSelectRule }

export default {
  install(app: App) {
    app.component('FormCreate', formCreate)
    app.component('ElTreeSelect', ElTreeSelect)
  }
} as Plugin
