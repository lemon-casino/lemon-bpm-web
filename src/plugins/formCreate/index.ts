import type { App } from 'vue'
// 👇使用 form-create 需额外全局引入 element plus 组件
import {
  ElAlert,
  ElTransfer,
  ElAside,
  ElContainer,
  ElDivider,
  ElHeader,
  ElMain,
  ElPopconfirm,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElBadge,
  ElTag,
  ElText,
  ElMenu,
  ElMenuItem,
  ElFooter,
  ElMessage,
  ElCollapse,
  ElCollapseItem,
  ElCard
} from 'element-plus'
import FcDesigner from '@form-create/designer'
import formCreate from '@form-create/element-ui'
import install from '@form-create/element-ui/auto-import'

//======================= 自定义组件 =======================
import { UploadFile, UploadImg, UploadImgs } from '@/components/UploadFile'
import { createApiSelectComponent } from '@/components/FormCreate'
import { Editor } from '@/components/Editor'
import DictSelect from '@/components/FormCreate/src/components/DictSelect.vue'

const UserSelect = createApiSelectComponent({
  name: 'UserSelect',
  labelField: 'nickname',
  valueField: 'id',
  url: '/system/user/simple-list',
  method: 'GET'
})
const DeptSelect = createApiSelectComponent({
  name: 'DeptSelect',
  labelField: 'name',
  valueField: 'id',
  url: '/system/dept/simple-list'
})
const ApiSelect = createApiSelectComponent({
  name: 'ApiSelect'
})

const components = [
  ElAlert,
  ElTransfer,
  ElAside,
  ElContainer,
  ElDivider,
  ElHeader,
  ElMain,
  ElPopconfirm,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElBadge,
  ElTag,
  ElText,
  ElMenu,
  ElMenuItem,
  ElFooter,
  ElMessage,
  UploadImg,
  UploadImgs,
  UploadFile,
  DictSelect,
  UserSelect,
  DeptSelect,
  ApiSelect,
  Editor,
  ElCollapse,
  ElCollapseItem,
  ElCard
]

// 参考 http://www.form-create.com/v3/element-ui/auto-import.html 文档
export const setupFormCreate = (app: App<Element>) => {
  components.forEach((component) => {
    if (component.name) {
      app.component(component.name, component)
    }
  })
  formCreate.use(install)
  app.use(formCreate)
  app.use(FcDesigner)
}
