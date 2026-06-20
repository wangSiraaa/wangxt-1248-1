<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <el-icon size="36" color="#3b82f6"><Promotion /></el-icon>
        <h1>低空无人机飞行审批系统</h1>
        <p>空域申请 · 风险评估 · 现场报备 · 轨迹归档</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="0"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>

      <div class="test-accounts">
        <div class="title">测试账号（密码：123456）</div>
        <el-tag type="primary">operator 运营公司</el-tag>
        <el-tag type="success">airtraffic 空管协同</el-tag>
        <el-tag type="warning">police 公安人员</el-tag>
        <el-tag type="danger">admin 系统管理员</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { User, Lock, Promotion } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  username: '',
  password: '',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLogin() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await userStore.login(form);
    ElMessage.success('登录成功');
    router.push('/');
  } catch (e) {
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.login-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #0ea5e9 100%);
}

.login-box {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 22px;
    color: #1f2937;
    margin: 12px 0 6px;
  }

  p {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
  }
}

.login-btn {
  width: 100%;
  height: 44px;
}

.test-accounts {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;

  .title {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 10px;
  }

  :deep(.el-tag) {
    margin: 3px;
  }
}
</style>
