<template>
  <div class="risk-events">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>大型活动管理（公安风险评估）</span>
          <el-button type="primary" @click="openDialog()">
            <el-icon><Plus /></el-icon>
            新增活动
          </el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="活动名称" min-width="180" />
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="riskTag(row.riskLevel)">{{ riskLabel(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bufferRadius" label="缓冲区(米)" width="100" />
        <el-table-column prop="organizer" label="主办方" width="120" />
        <el-table-column label="时间" width="280">
          <template #default="{ row }">
            {{ formatTime(row.startTime) }} ~ {{ formatTime(row.endTime) }}
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

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑活动' : '新增活动'" width="800px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="活动名称" prop="name">
              <el-input v-model="form.name" />
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
          <el-col :span="12">
            <el-form-item label="开始时间" prop="startTime">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" prop="endTime">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="缓冲区(米)">
              <el-input-number v-model="form.bufferRadius" :min="0" :max="5000" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主办方">
              <el-input v-model="form.organizer" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="活动描述">
              <el-input v-model="form.description" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">活动区域（在地图上绘制）</el-divider>
        <div class="draw-toolbar">
          <el-radio-group v-model="drawMode">
            <el-radio-button label="polygon">绘制区域</el-radio-button>
            <el-radio-button :label="null">浏览</el-radio-button>
          </el-radio-group>
          <el-button @click="clearDraw">清除</el-button>
          <el-tag v-if="form.area" type="success">已绘制</el-tag>
          <el-tag v-else type="danger">请绘制活动区域</el-tag>
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
import dayjs from 'dayjs';
import OpenLayersMap from '@/components/OpenLayersMap.vue';
import { riskApi } from '@/api/risk';

const loading = ref(false);
const list = ref<any[]>([]);
const dialogVisible = ref(false);
const editing = ref<any>(null);
const formRef = ref<FormInstance>();
const mapRef = ref<any>();
const drawMode = ref<'polygon' | null>('polygon');

const form = reactive<any>({
  name: '',
  description: '',
  riskLevel: 'high',
  bufferRadius: 500,
  organizer: '',
  startTime: '',
  endTime: '',
  area: null,
  isActive: true,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  riskLevel: [{ required: true, message: '请选择风险等级', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
};

function formatTime(t: string) {
  return dayjs(t).format('MM-DD HH:mm');
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
    list.value = await riskApi.listLargeEvents(false) as any;
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
      name: '', description: '', riskLevel: 'high', bufferRadius: 500,
      organizer: '', startTime: '', endTime: '', area: null, isActive: true,
    });
  }
  dialogVisible.value = true;
}

function handleDrawEnd(geojson: any) {
  form.area = geojson.features?.[0]?.geometry || geojson;
  ElMessage.success('区域已绘制');
}

function clearDraw() {
  mapRef.value?.clearDrawLayer();
  form.area = null;
}

async function handleSave() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  if (!form.area) {
    ElMessage.warning('请绘制活动区域');
    return;
  }
  try {
    if (editing.value) {
      await riskApi.updateLargeEvent(editing.value.id, form);
      ElMessage.success('更新成功');
    } else {
      await riskApi.createLargeEvent(form);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadData();
  } catch (e) {}
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除活动 "${row.name}"？`, '提示', { type: 'warning' });
    await riskApi.removeLargeEvent(row.id);
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
