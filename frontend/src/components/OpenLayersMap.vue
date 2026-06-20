<template>
  <div class="ol-map-wrapper" ref="wrapperRef">
    <div ref="mapRef" class="ol-map" />
    <div class="map-controls" v-if="$slots.controls">
      <slot name="controls" />
    </div>
    <div class="map-legend" v-if="showLegend">
      <div v-for="item in legendItems" :key="item.label" class="legend-item">
        <span class="legend-color" :style="{ background: item.color }"></span>
        <span class="legend-text">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, PropType } from 'vue';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';

interface MapLayer {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'geojson';
  data: any;
  style?: any;
  label?: string;
  labelKey?: string;
}

interface LegendItem {
  label: string;
  color: string;
}

const props = defineProps({
  layers: {
    type: Array as PropType<MapLayer[]>,
    default: () => [],
  },
  showLegend: {
    type: Boolean,
    default: false,
  },
  legendItems: {
    type: Array as PropType<LegendItem[]>,
    default: () => [],
  },
  center: {
    type: Array as PropType<number[]>,
    default: () => [116.4074, 39.9042],
  },
  zoom: {
    type: Number,
    default: 11,
  },
  drawMode: {
    type: String as PropType<'point' | 'line' | 'polygon' | null>,
    default: null,
  },
});

const emit = defineEmits(['drawEnd', 'featureClick']);

const wrapperRef = ref<HTMLDivElement>();
const mapRef = ref<HTMLDivElement>();
let map: Map | null = null;
let vectorLayer: VectorLayer | null = null;
let drawVectorLayer: VectorLayer | null = null;

const createStyle = (type: string, customStyle?: any) => {
  if (customStyle) {
    return new Style(customStyle);
  }
  const defaults: Record<string, Style> = {
    point: new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: '#3b82f6' }),
        stroke: new Stroke({ color: '#fff', width: 2 }),
      }),
    }),
    line: new Style({
      stroke: new Stroke({ color: '#3b82f6', width: 3 }),
    }),
    polygon: new Style({
      fill: new Fill({ color: 'rgba(59, 130, 246, 0.2)' }),
      stroke: new Stroke({ color: '#3b82f6', width: 2 }),
    }),
  };
  return defaults[type] || defaults.polygon;
};

function initMap() {
  if (!mapRef.value) return;

  const vectorSource = new VectorSource();
  vectorLayer = new VectorLayer({ source: vectorSource });

  const drawSource = new VectorSource();
  drawVectorLayer = new VectorLayer({
    source: drawSource,
    style: new Style({
      fill: new Fill({ color: 'rgba(16, 185, 129, 0.3)' }),
      stroke: new Stroke({ color: '#10b981', width: 3 }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: '#10b981' }),
      }),
    }),
  });

  map = new Map({
    target: mapRef.value,
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
      vectorLayer,
      drawVectorLayer,
    ],
    view: new View({
      center: fromLonLat(props.center),
      zoom: props.zoom,
    }),
  });

  map.on('singleclick', (evt) => {
    const features = map!.getFeaturesAtPixel(evt.pixel);
    if (features && features.length > 0) {
      emit('featureClick', features[0]);
    }
  });
}

function addGeoJSONLayer(layer: MapLayer) {
  if (!vectorLayer) return;
  try {
    const format = new GeoJSON();
    const features = format.readFeatures(layer.data, {
      featureProjection: 'EPSG:3857',
    });
    features.forEach((f: any) => {
      if (layer.style) {
        f.setStyle(createStyle(layer.type, layer.style));
      } else {
        f.setStyle(createStyle(layer.type));
      }
      if (layer.labelKey) {
        const label = f.get(layer.labelKey) || layer.label;
        f.setStyle(
          new Style({
            ...f.getStyle(),
            text: new Text({
              text: label,
              font: '12px sans-serif',
              fill: new Fill({ color: '#1f2937' }),
              stroke: new Stroke({ color: '#fff', width: 3 }),
              offsetY: -15,
            }),
          }),
        );
      }
    });
    vectorLayer!.getSource()!.addFeatures(features);
  } catch (e) {
    console.error('GeoJSON parse error:', e);
  }
}

function addPointLayer(layer: MapLayer) {
  if (!vectorLayer) return;
  const coords = layer.data;
  const feature = new Feature({
    geometry: new Point(fromLonLat(coords)),
  });
  feature.setStyle(createStyle('point', layer.style));
  vectorLayer.getSource()!.addFeature(feature);
}

function addLineLayer(layer: MapLayer) {
  if (!vectorLayer) return;
  const line = new LineString(
    layer.data.map((c: number[]) => fromLonLat(c)),
  );
  const feature = new Feature({ geometry: line });
  feature.setStyle(createStyle('line', layer.style));
  vectorLayer.getSource()!.addFeature(feature);
}

function addPolygonLayer(layer: MapLayer) {
  if (!vectorLayer) return;
  const poly = new Polygon(
    layer.data.map((ring: number[][]) =>
      ring.map((c: number[]) => fromLonLat(c)),
    ),
  );
  const feature = new Feature({ geometry: poly });
  feature.setStyle(createStyle('polygon', layer.style));
  if (layer.label) {
    const style = feature.getStyle() as Style;
    feature.setStyle(
      new Style({
        fill: style.getFill(),
        stroke: style.getStroke(),
        text: new Text({
          text: layer.label,
          font: 'bold 13px sans-serif',
          fill: new Fill({ color: '#1f2937' }),
          stroke: new Stroke({ color: '#fff', width: 3 }),
        }),
      }),
    );
  }
  vectorLayer.getSource()!.addFeature(feature);
}

function renderLayers() {
  if (!vectorLayer) return;
  vectorLayer.getSource()!.clear();
  props.layers.forEach((layer) => {
    switch (layer.type) {
      case 'geojson':
        addGeoJSONLayer(layer);
        break;
      case 'point':
        addPointLayer(layer);
        break;
      case 'line':
        addLineLayer(layer);
        break;
      case 'polygon':
        addPolygonLayer(layer);
        break;
    }
  });
}

export function clearDrawLayer() {
  if (drawVectorLayer) {
    drawVectorLayer.getSource()!.clear();
  }
}

export function getDrawGeoJSON() {
  if (!drawVectorLayer) return null;
  const features = drawVectorLayer.getSource()!.getFeatures();
  if (features.length === 0) return null;
  const format = new GeoJSON();
  return format.writeFeaturesObject(features, {
    featureProjection: 'EPSG:3857',
    dataProjection: 'EPSG:4326',
  });
}

let drawInteraction: any = null;

function setupDraw() {
  if (!map || !drawVectorLayer) return;
  if (drawInteraction) {
    map.removeInteraction(drawInteraction);
    drawInteraction = null;
  }
  if (!props.drawMode) return;

  import('ol/interaction/Draw').then(({ default: Draw }) => {
    const typeMap: Record<string, string> = {
      point: 'Point',
      line: 'LineString',
      polygon: 'Polygon',
    };
    drawInteraction = new Draw({
      source: drawVectorLayer!.getSource()!,
      type: typeMap[props.drawMode] as any,
    });
    drawInteraction.on('drawend', (evt: any) => {
      const format = new GeoJSON();
      const geojson = format.writeFeatureObject(evt.feature, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326',
      });
      emit('drawEnd', geojson);
    });
    map!.addInteraction(drawInteraction);
  });
}

watch(
  () => props.layers,
  () => renderLayers(),
  { deep: true },
);

watch(
  () => props.drawMode,
  () => setupDraw(),
);

defineExpose({ clearDrawLayer, getDrawGeoJSON });

onMounted(() => {
  initMap();
  renderLayers();
  setupDraw();
});

onBeforeUnmount(() => {
  if (map) {
    map.dispose();
    map = null;
  }
});
</script>

<style scoped lang="scss">
.ol-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.ol-map {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.map-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.map-legend {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .legend-color {
    width: 18px;
    height: 18px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .legend-text {
    font-size: 12px;
    color: #374151;
  }
}
</style>
