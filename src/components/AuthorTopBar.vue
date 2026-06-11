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
    const data = await request.get('/book/list', { params: { pageNum: 1, pageSize: 200 } })
    const records = data.records || []
    const map = {}
    records.forEach(b => {
      const a = (b.author || '未知').trim()
      map[a] = (map[a] || 0) + 1
    })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
    renderChart(sorted)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const renderChart = (data) => {
  if (!chart || data.length === 0) return
  const fullNames = data.map(([n]) => n)
  const names = fullNames.map(n => n.length > 8 ? n.slice(0, 8) + '…' : n)
  const values = data.map(([, v]) => v)

  chart.setOption({
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(76,155,253,0.3)', borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 15 },
      formatter: p => {
        const ri = names.length - 1 - p[0].dataIndex
        return `<b style="color:#00d8ff">${fullNames[ri]}</b><br/>作品数量: ${p[0].value} 本`
      }
    },
    grid: { left: 8, right: 50, top: 6, bottom: 6, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { show: false },
      axisLine: { show: false },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'category',
      data: [...names].reverse(),
      axisLabel: { fontSize: 13, color: 'rgba(203,213,225,0.65)', width: 90, overflow: 'truncate' },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    series: [{
      type: 'bar',
      data: [...values].reverse(),
      barWidth: '42%',
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: 'rgba(76,155,253,0.15)' },
          { offset: 1, color: '#4c9bfd' }
        ])
      },
      emphasis: {
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#4c9bfd' },
            { offset: 1, color: '#00d8ff' }
          ]),
          shadowBlur: 14, shadowColor: 'rgba(0,216,255,0.35)'
        }
      },
      label: { show: true, position: 'right', fontSize: 13, color: 'rgba(203,213,225,0.7)' }
    }],
    animationDuration: 900
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
