<template>
  <div class="airspace-list">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>空域管理（禁飞区/限飞区）</span>
          <el-button type="primary" @click="openDialog()">
            <el-icon><Plus /></el-icon>
            新增空域
          </el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.type)">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="riskTag(row.riskLevel)">{{ riskLabel(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="高度范围(米)" width="150">
          <template #default="{ row }">
            {{ row.minAltitude }} - {{ row.maxAltitude }}
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="限制原因" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑空域' : '新增空域'" width="800px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-select v-model="form.type">
                <el-option label="禁飞区" value="no_fly" />
                <el-option label="限飞区" value="restricted" />
                <el-option label="警示区" value="warning" />
                <el-option label="管制区" value="controlled" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="风险等级" prop="riskLevel">
              <el-select v-model="form.riskLevel">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="极高" value="critical" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="最低高度">
              <el-input-number v-model="form.minAltitude" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="最高高度">
              <el-input-number v-model="form.maxAltitude" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="限制原因">
              <el-input v-model="form.reason" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">空域范围（在地图上绘制 Polygon）</el-divider>
        <div class="draw-toolbar">
          <el-radio-group v-model="drawMode">
            <el-radio-button label="polygon">绘制范围</el-radio-button>
            <el-radio-button :label="null">浏览</el-radio-button>
          </el-radio-group>
          <el-button @click="clearDraw">清除</el-button>
          <el-tag v-if="form.geom" type="success">已绘制</el-tag>
          <el-tag v-else type="danger">请绘制空域范围</el-tag>
        </div>
        <div style="height: 350px">
          <OpenLayersMap
            ref="mapRef"
            :draw-mode="drawMode"
            :center="[116.4074, 39.9042]"
            :zoom="11"
            @draw-end="handleDrawEnd"
          />
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import OpenLayersMap from '@/components/OpenLayersMap.vue';
import { airspaceApi } from '@/api/airspace';

const loading = ref(false);
const list = ref<any[]>([]);
const dialogVisible = ref(false);
const editing = ref<any>(null);
const formRef = ref<FormInstance>();
const mapRef = ref<any>();
const drawMode = ref<'polygon' | null>('polygon');

const form = reactive<any>({
  name: '',
  type: 'no_fly',
  riskLevel: 'medium',
  minAltitude: 0,
  maxAltitude: 500,
  reason: '',
  geom: null,
  isActive: true,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
};

function typeTag(t: string) {
  const map: Record<string, string> = { no_fly: 'danger', restricted: 'warning', warning: '', controlled: 'primary' };
  return (map[t] || '') as any;
}
function typeLabel(t: string) {
  const map: Record<string, string> = { no_fly: '禁飞区', restricted: '限飞区', warning: '警示区', controlled: '管制区' };
  return map[t] || t;
}
function riskTag(r: string) {
  const map: Record<string, string> = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };
  return (map[r] || '') as any;
}
function riskLabel(r: string) {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '极高' };
  return map[r] || r;
}

async function loadData() {
  loading.value = true;
  try {
    list.value = await airspaceApi.list() as any;
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  editing.value = row || null;
  if (row) {
    Object.assign(form, row);
  } else {
    Object.assign(form, {
      name: '', type: 'no_fly', riskLevel: 'medium', minAltitude: 0, maxAltitude: 500,
      reason: '', geom: null, isActive: true,
    });
  }
  dialogVisible.value = true;
  drawMode.value = 'polygon';
}

function handleDrawEnd(geojson: any) {
  form.geom = geojson.features?.[0]?.geometry || geojson;
  ElMessage.success('范围已绘制');
}

function clearDraw() {
  mapRef.value?.clearDrawLayer();
  form.geom = null;
}

async function handleSave() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  if (!form.geom) {
    ElMessage.warning('请绘制空域范围');
    return;
  }
  try {
    if (editing.value) {
      await airspaceApi.update(editing.value.id, form);
      ElMessage.success('更新成功');
    } else {
      await airspaceApi.create(form);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadData();
  } catch (e) {}
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除空域 "${row.name}"？`, '提示', { type: 'warning' });
    await airspaceApi.remove(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {}
}

onMounted(() => loadData());
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.draw-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
</style>
