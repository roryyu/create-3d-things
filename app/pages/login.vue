<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

definePageMeta({
  layout: 'default',
})

const { signIn, status } = useAuth()
const router = useRouter()

// 已登录用户访问登录页时自动跳转到建模页
watch(status, (newStatus) => {
  if (newStatus === 'authenticated') {
    router.push('/cad')
  }
}, { immediate: true })

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({
  email: '',
  password: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
  ],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await signIn(
      { email: form.email, password: form.password },
      { callbackUrl: '/cad' }
    )
    ElMessage.success('登录成功')
  }
  catch (error: any) {
    ElMessage.error(error?.data?.message || error?.message || '登录失败')
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <template #header>
        <h2>登录</h2>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" @submit.prevent="handleSubmit">
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="handleSubmit">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="auth-links">
        <NuxtLink to="/forgot-password">忘记密码？</NuxtLink>
        <NuxtLink to="/register">注册账号</NuxtLink>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: 20px;
  background: var(--lxp-bg-deep, #080b14);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--lxp-glass, rgba(13, 17, 23, 0.72));
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid var(--lxp-glass-border, rgba(0, 229, 255, 0.12));
  border-radius: var(--lxp-radius-lg, 20px);
  box-shadow: var(--lxp-glow, 0 0 20px rgba(0, 229, 255, 0.15));
}

.auth-card h2 {
  margin: 0;
  text-align: center;
  font-family: 'Space Grotesk', 'DM Sans', sans-serif;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--lxp-text-primary, #f0f6fc);
}

.auth-links {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
}

.auth-links a {
  color: var(--lxp-primary, #00e5ff);
  text-decoration: none;
  font-size: 14px;
  transition: text-shadow 0.2s ease;
}

.auth-links a:hover {
  text-decoration: underline;
  text-shadow: 0 0 12px rgba(0, 229, 255, 0.5);
}
</style>