import type { App, Plugin } from 'vue'
import formCreate from '@form-create/element-ui'
import { ElTreeSelect } from 'element-plus'
import { useFormCreateDesigner } from './src/useFormCreateDesigner'
import { useApiSelect } from './src/components/useApiSelect'
import { useSelectRule } from './src/config/index'

type InstallCounters = {
  moduleEvaluations: number
  installInvocations: number
}

const formCreateDebugNamespace = (globalThis as Record<string, unknown>).__formCreateDebug ??=
  {}
const componentCounters = (formCreateDebugNamespace.component ??= {
  moduleEvaluations: 0,
  installInvocations: 0,
} as InstallCounters)

componentCounters.moduleEvaluations += 1
console.debug('[FormCreate/index] module evaluated', componentCounters.moduleEvaluations)

export { useFormCreateDesigner, useApiSelect, useSelectRule }

export default {
  install(app: App) {
    componentCounters.installInvocations += 1
    console.debug('[FormCreate/index] install called', componentCounters.installInvocations)
    app.component('FormCreate', formCreate)
    app.component('ElTreeSelect', ElTreeSelect)
  }
} as Plugin

