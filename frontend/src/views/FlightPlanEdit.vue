<template>
  <div class="flight-plan-edit">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>新建飞行计划</span>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="130px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="计划标题" prop="title">
              <el-input v-model="form.title" placeholder="例如：朝阳区航拍作业" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="无人机型号" prop="uavModel">
              <el-input v-model="form.uavModel" placeholder="例如：大疆 Matrice 300" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="无人机序列号" prop="uavSn">
              <el-input v-model="form.uavSn" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="飞行员姓名" prop="pilotName">
              <el-input v-model="form.pilotName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="飞行员执照号" prop="pilotLicense">
              <el-input v-model="form.pilotLicense" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="最大高度(米)" prop="maxAltitude">
              <el-input-number v-model="form.maxAltitude" :min="0" :max="500" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="最大速度(km/h)" prop="maxSpeed">
              <el-input-number v-model="form.maxSpeed" :min="0" :max="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划起飞时间" prop="plannedStartTime">
              <el-date-picker
                v-model="form.plannedStartTime"
                type="datetime"
                placeholder="选择时间"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划降落时间" prop="plannedEndTime">
              <el-date-picker
                v-model="form.plannedEndTime"
                type="datetime"
                placeholder="选择时间"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="飞行目的" prop="purpose">
              <el-input
                v-model="form.purpose"
                type="textarea"
                :rows="2"
                placeholder="请描述本次飞行作业的目的"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">飞行航线（在地图上绘制）</el-divider>
        <div class="map-section">
          <div class="draw-toolbar">
            <el-radio-group v-model="drawMode">
              <el-radio-button label="line">绘制航线(Line)</el-radio-button>
              <el-radio-button label="polygon">绘制作业区(Polygon)</el-radio-button>
              <el-radio-button :label="null">浏览</el-radio-button>
            </el-radio-group>
            <el-button @click="clearDraw">清除绘制</el-button>
            <el-button type="primary" :disabled="!form.plannedRoute" @click="checkConflict">
              检查禁飞区
            </el-button>
            <el-tag v-if="form.plannedRoute" type="success">航线已绘制</el-tag>
            <el-tag v-else type="danger">请先在地图上绘制航线</el-tag>
          </div>
          <div style="height: 450px">
            <OpenLayersMap
              ref="mapRef"
              :layers="mapLayers"
              :draw-mode="drawMode"
              :center="mapCenter"
              :zoom="12"
              :show-legend="true"
              :legend-items="legendItems"
              @draw-end="handleDrawEnd"
            />
          </div>
        </div>

        <el-divider />
        <div class="form-footer">
          <el-button @click="$router.back()">取消</el-button>
          <el-button type="primary" @click="handleSaveDraft">保存草稿</el-button>
          <el-button type="success" @click="handleSaveAndSubmit">保存并提交审批</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import OpenLayersMap from '@/components/OpenLayersMap.vue';
import { flightPlanApi } from '@/api/flight-plan';
import { airspaceApi } from '@/api/airspace';
import { Style, Fill, Stroke } from 'ol/style';

const router = useRouter();
const formRef = ref<FormInstance>();
const mapRef = ref<any>();
const drawMode = ref<'line' | 'polygon' | null>('line');
const mapCenter = ref([116.4074, 39.9042]);
const noFlyZones = ref<any[]>([]);

const form = reactive<any>({
  title: '',
  uavModel: '',
  uavSn: '',
  pilotName: '',
  pilotLicense: '',
  maxAltitude: 120,
  maxSpeed: 50,
  plannedStartTime: '',
  plannedEndTime: '',
  purpose: '',
  plannedRoute: null,
  operationArea: null,
});

const rules: FormRules = {
  title: [{ required: true, message: '请输入计划标题', trigger: 'blur' }],
  uavModel: [{ required: true, message: '请输入无人机型号', trigger: 'blur' }],
  uavSn: [{ required: true, message: '请输入无人机序列号', trigger: 'blur' }],
  pilotName: [{ required: true, message: '请输入飞行员姓名', trigger: 'blur' }],
  pilotLicense: [{ required: true, message: '请输入飞行员执照号', trigger: 'blur' }],
  plannedStartTime: [{ required: true, message: '请选择起飞时间', trigger: 'change' }],
  plannedEndTime: [{ required: true, message: '请选择降落时间', trigger: 'change' }],
};

const mapLayers = computed(() => {
  const layers: any[] = [];
  noFlyZones.value.forEach((zone) => {
    layers.push({
      id: `nofly-${zone.id}`,
      type: 'geojson' as const,
      data: zone.geom,
      style: new Style({
        fill: new Fill({ color: 'rgba(239, 68, 68, 0.3)' }),
        stroke: new Stroke({ color: '#dc2626', width: 2 }),
      }),
      label: zone.name,
    });
  });
  return layers;
});

const legendItems = [
  { label: '禁飞区', color: 'rgba(239, 68, 68, 0.5)' },
];

function handleDrawEnd(geojson: any) {
  if (drawMode.value === 'line') {
    form.plannedRoute = geojson.features?.[0]?.geometry || geojson;
    ElMessage.success('航线绘制完成');
  } else if (drawMode.value === 'polygon') {
    form.operationArea = geojson.features?.[0]?.geometry || geojson;
    ElMessage.success('作业区域绘制完成');
  }
}

function clearDraw() {
  mapRef.value?.clearDrawLayer();
  form.plannedRoute = null;
  form.operationArea = null;
}

async function checkConflict() {
  if (!form.plannedRoute) {
    ElMessage.warning('请先绘制航线');
    return;
  }
  try {
    const res: any = await airspaceApi.checkConflict(form.plannedRoute, form.maxAltitude);
    if (res.hasConflict) {
      ElMessageBox.alert(
        `航线穿越 ${res.conflicts.length} 个禁飞区：${res.conflicts.map((c: any) => c.name).join('、')}`,
        '禁飞区冲突警告',
        { type: 'error' },
      );
    } else {
      ElMessage.success('航线未穿越禁飞区');
    }
  } catch (e) {}
}

async function validateForm() {
  if (!formRef.value) return false;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return false;
  if (!form.plannedRoute) {
    ElMessage.warning('请在地图上绘制飞行航线');
    return false;
  }
  return true;
}

async function handleSaveDraft() {
  if (!(await validateForm())) return;
  try {
    await flightPlanApi.create(form);
    ElMessage.success('草稿保存成功');
    router.push('/flight-plans');
  } catch (e) {}
}

async function handleSaveAndSubmit() {
  if (!(await validateForm())) return;
  try {
    const res: any = await flightPlanApi.create(form);
    await flightPlanApi.submit(res.id);
    ElMessage.success('创建并提交成功');
    router.push('/flight-plans');
  } catch (e: any) {
    if (e?.response?.data?.message?.includes('禁飞区')) {
      ElMessageBox.alert(e.response.data.message, '禁飞区冲突', { type: 'error' });
    }
  }
}

onMounted(async () => {
  try {
    noFlyZones.value = (await airspaceApi.noFlyZones()) as any;
  } catch (e) {}
});
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.draw-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
