<script setup lang="ts">
const { data, status, signOut } = useAuth()

const router = useRouter()

async function handleLogout() {
  await signOut()
  router.push('/login')
}
</script>

<template>
  <el-container class="layout-container">
    <el-header class="layout-header">
      <div class="header-left">
        <NuxtLink to="/cad" class="logo">
          Create 3D Things
        </NuxtLink>
      </div>
      <div class="header-right">
        <template v-if="status === 'authenticated'">
          <span class="user-name">{{ data?.user?.name || data?.user?.email }}</span>
          <el-button type="danger" plain size="small" @click="handleLogout">
            退出登录
          </el-button>
        </template>
        <template v-else>
          <NuxtLink to="/login">
            <el-button type="primary" plain size="small">
              登录
            </el-button>
          </NuxtLink>
        </template>
      </div>
    </el-header>
    <el-main class="layout-main">
      <slot />
    </el-main>
  </el-container>
</template>

<style scoped>
.layout-container {
  min-height: 100vh;
  background: var(--lxp-bg-deep, #080b14);
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--lxp-glass, rgba(13, 17, 23, 0.72));
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  backdrop-filter: blur(20px) saturate(150%);
  border-bottom: 1px solid var(--lxp-glass-border, rgba(0, 229, 255, 0.12));
  box-shadow: 0 1px 0 rgba(0, 229, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  font-family: 'Space Grotesk', 'DM Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--lxp-primary, #00e5ff);
  text-decoration: none;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  color: var(--lxp-text-secondary, #8b949e);
  font-size: 14px;
}

.layout-main {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 20px;
  background: transparent;
}
</style>