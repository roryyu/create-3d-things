<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

definePageMeta({
  layout: 'default',
})

const { signUp } = useAuth()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (value !== form.password) {
          callback(new Error('两次密码不一致'))
        }
        else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await signUp({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password }, { callbackUrl: '/cad' })
    ElMessage.success('注册成功')
  }
  catch (error: any) {
    ElMessage.error(error?.data?.message || '注册失败')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <template #header>
        <h2>注册</h2>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" @submit.prevent="handleSubmit">
        <el-form-item prop="name">
          <el-input v-model="form.name" placeholder="姓名" size="large" />
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱" size="large" />
        </el-form-item>
        <el-form-item prop="phone">
          <el-input v-model="form.phone" placeholder="手机号（可选）" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="handleSubmit">
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <div class="auth-links">
        <span />
        <NuxtLink to="/login">已有账号？去登录</NuxtLink>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  background: var(--lxp-bg-deep, #080b14);
}

.auth-card {
  width: 400px;
  background: var(--lxp-glass, rgba(13, 17, 23, 0.72));
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid var(--lxp-glass-border, rgba(0, 229, 255, 0.12));
  border-radius: var(--lxp-radius-lg, 20px);
  box-shadow: var(--lxp-glow, 0 0 20px rgba(0, 229, 255, 0.15));
}

h2 {
  margin: 0;
  text-align: center;
  font-family: 'Space Grotesk', 'DM Sans', sans-serif;
  color: var(--lxp-text-primary, #f0f6fc);
}

.auth-links {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.auth-links a {
  color: var(--lxp-primary, #00e5ff);
  text-decoration: none;
  transition: text-shadow 0.2s ease;
}

.auth-links a:hover {
  text-decoration: underline;
  text-shadow: 0 0 12px rgba(0, 229, 255, 0.5);
}
</style>