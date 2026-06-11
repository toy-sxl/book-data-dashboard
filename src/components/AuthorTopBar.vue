<template>
  <div class="chart-wrap">
    <div v-if="loading" class="loader"><div class="spin"></div></div>
    <div ref="el" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import request from '../utils/request.js'
import { currentTheme, getChartTheme } from '../utils/theme.js'

const el = ref(null)
const loading = ref(true)
let chart = null
let cachedData = null

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
    cachedData = sorted
    renderChart(sorted)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const renderChart = (data) => {
  if (!chart || data.length === 0) return
  const t = getChartTheme()
  const fullNames = data.map(([n]) => n)
  const names = fullNames.map(n => n.length > 8 ? n.slice(0, 8) + '…' : n)
  const values = data.map(([, v]) => v)

  chart.setOption({
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: t.chartTooltipBg, borderColor: t.chartTooltipBorder, borderWidth: 1,
      textStyle: { color: t.chartTooltipText, fontSize: 15 },
      formatter: p => {
        const ri = names.length - 1 - p[0].dataIndex
        return `<b style="color:${t['--accent-secondary']}">${fullNames[ri]}</b><br/>作品数量: ${p[0].value} 本`
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
      axisLabel: { fontSize: 13, color: t.chartText, width: 90, overflow: 'truncate' },
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
          { offset: 1, color: t['--accent-primary'] }
        ])
      },
      emphasis: {
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: t['--accent-primary'] },
            { offset: 1, color: t['--accent-secondary'] }
          ]),
          shadowBlur: 14, shadowColor: 'rgba(0,216,255,0.35)'
        }
      },
      label: { show: true, position: 'right', fontSize: 13, color: t.chartText }
    }],
    animationDuration: 900
  })
}

watch(currentTheme, () => { if (cachedData) renderChart(cachedData) })
defineExpose({ refresh: fetchData })

const onResize = () => chart?.resize()
onMounted(() => { chart = echarts.init(el.value); fetchData(); window.addEventListener('resize', onResize) })
onUnmounted(() => { window.removeEventListener('resize', onResize); chart?.dispose() })
</script>

<style scoped>
.chart-wrap{position:relative;width:100%;flex:1;min-height:280px}
.chart{width:100%;height:100%}
.loader{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2}
.spin{width:24px;height:24px;border:2px solid rgba(76,155,253,0.15);border-top-color:var(--accent-secondary,#00d8ff);border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
</style>
