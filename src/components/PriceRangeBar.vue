<template>
  <div class="chart-wrap">
    <div v-if="loading" class="loader"><div class="spin"></div></div>
    <div ref="el" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import request from '../utils/request.js'

const el = ref(null)
const loading = ref(true)
let chart = null

const fetchData = async () => {
  try {
    loading.value = true
    const data = await request.get('/book/priceRange')
    const items = data.map(item => {
      const keys = Object.keys(item)
      const nameKey = keys.find(k => /range|区间|name|price|rangeName/i.test(k)) || keys[0]
      const valueKey = keys.find(k => /count|数量|value|num|total/i.test(k)) || keys[1] || keys[0]
      return { name: String(item[nameKey]), value: item[valueKey] }
    })
    renderChart(items)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const renderChart = (items) => {
  if (!chart || items.length === 0) return
  const names = items.map(d => d.name)
  const values = items.map(d => d.value)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(76,155,253,0.3)', borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 15 },
      formatter: p => `<b style="color:#00d8ff">${p[0].name}</b><br/>图书数量: ${p[0].value} 本`
    },
    grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category', data: names, boundaryGap: false,
      axisLabel: { fontSize: 12, color: 'rgba(203,213,225,0.5)', interval: 0 },
      axisLine: { lineStyle: { color: 'rgba(76,155,253,0.1)' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 12, color: 'rgba(203,213,225,0.4)' },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(76,155,253,0.06)' } }
    },
    series: [{
      type: 'line', data: values, smooth: true,
      symbol: 'circle', symbolSize: 7,
      lineStyle: { width: 2.5, color: '#00d8ff', shadowBlur: 8, shadowColor: 'rgba(0,216,255,0.3)' },
      itemStyle: { color: '#00d8ff', borderColor: '#00d8ff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0,216,255,0.25)' },
          { offset: 0.6, color: 'rgba(76,155,253,0.08)' },
          { offset: 1, color: 'rgba(76,155,253,0)' }
        ])
      },
      emphasis: {
        itemStyle: { color: '#fff', borderColor: '#00d8ff', borderWidth: 3, shadowBlur: 16, shadowColor: 'rgba(0,216,255,0.6)' }
      }
    }],
    animationDuration: 1000
  })
}

const onResize = () => chart?.resize()
onMounted(() => { chart = echarts.init(el.value); fetchData(); window.addEventListener('resize', onResize) })
onUnmounted(() => { window.removeEventListener('resize', onResize); chart?.dispose() })
</script>

<style scoped>
.chart-wrap{position:relative;width:100%;flex:1;min-height:280px}
.chart{width:100%;height:100%}
.loader{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2}
.spin{width:24px;height:24px;border:2px solid rgba(76,155,253,0.15);border-top-color:#00d8ff;border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
</style>
