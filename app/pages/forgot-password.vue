<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

definePageMeta({
  layout: 'default',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/cad',
  },
})

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitted = ref(false)
const form = reactive({
  email: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: form.email },
    })
    submitted.value = true
  }
  catch (error: any) {
    ElMessage.error(error?.data?.message || '请求失败')
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
        <h2>忘记密码</h2>
      </template>
      <template v-if="!submitted">
        <p class="tip">请输入您的注册邮箱，我们将发送密码重置链接。</p>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="0" @submit.prevent="handleSubmit">
          <el-form-item prop="email">
            <el-input v-model="form.email" placeholder="邮箱" size="large" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="handleSubmit">
              发送重置链接
            </el-button>
          </el-form-item>
        </el-form>
      </template>
      <template v-else>
        <el-result icon="success" title="邮件已发送" sub-title="请查看您的邮箱，点击重置链接修改密码。" />
      </template>
      <div class="auth-links">
        <NuxtLink to="/login">返回登录</NuxtLink>
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

.tip {
  color: var(--lxp-text-secondary, #8b949e);
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.auth-links {
  text-align: center;
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