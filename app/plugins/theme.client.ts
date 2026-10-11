export default defineNuxtPlugin(() => {
  // 空间科技先锋风主题 — 霓虹青主色调，强制覆盖 Element Plus 运行时注入的默认色
  const style = document.createElement('style')
  style.id = 'theme-override'
  style.textContent = `
    :root {
      --el-color-primary: #00e5ff !important;
      /* 暗色主题下 light-N 作为背景/悬停，须为深色半透明 tint */
      --el-color-primary-light-3: rgba(0, 229, 255, 0.35) !important;
      --el-color-primary-light-5: rgba(0, 229, 255, 0.25) !important;
      --el-color-primary-light-7: rgba(0, 229, 255, 0.18) !important;
      --el-color-primary-light-8: rgba(0, 229, 255, 0.14) !important;
      --el-color-primary-light-9: rgba(0, 229, 255, 0.1) !important;
      --el-color-primary-dark-2: #00b8cc !important;
    }

    /* 按钮 */
    .el-button--primary {
      background: linear-gradient(135deg, #00e5ff, #0091ea) !important;
      border-color: transparent !important;
      color: #04121a !important;
      box-shadow: 0 0 16px rgba(0, 229, 255, 0.25) !important;
    }
    .el-button--primary:hover {
      background: linear-gradient(135deg, #33ebff, #00b8d4) !important;
      border-color: transparent !important;
      box-shadow: 0 0 24px rgba(0, 229, 255, 0.4) !important;
    }
    .el-button--primary:active {
      background: linear-gradient(135deg, #00b8cc, #0077b6) !important;
      border-color: transparent !important;
    }

    /* 单选框 */
    .el-radio__input.is-checked .el-radio__inner {
      border-color: var(--el-color-primary) !important;
      background-color: var(--el-color-primary) !important;
    }
    .el-radio__input.is-checked+.el-radio__label {
      color: var(--el-color-primary) !important;
    }

    /* 输入框 */
    .el-input .el-input__wrapper.is-focus,
    .el-input .el-input__wrapper:hover {
      box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
    }

    /* 标签 */
    .el-tag--primary {
      background: var(--el-color-primary-light-9) !important;
      border-color: rgba(0, 229, 255, 0.2) !important;
      color: var(--el-color-primary) !important;
    }
    .el-tag--primary.is-dark {
      background: var(--el-color-primary) !important;
      border-color: var(--el-color-primary) !important;
      color: #04121a !important;
    }
  `
  document.head.prepend(style)
})