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
let cachedStoreNames = null
let cachedMatrix = null

// 价格区间定义
const priceRanges = [
  { label: '0-30', min: 0, max: 30 },
  { label: '30-60', min: 30, max: 60 },
  { label: '60-100', min: 60, max: 100 },
  { label: '100-150', min: 100, max: 150 },
  { label: '150-200', min: 150, max: 200 },
  { label: '200-300', min: 200, max: 300 },
  { label: '300+', min: 300, max: Infinity }
]

// 渐变色系：与左侧环形图 palette 统一
const stackColors = [
  { from: '#1a3a6e', to: '#4c9bfd' },
  { from: '#0a4d5e', to: '#00d8ff' },
  { from: '#0f4a3a', to: '#36d399' },
  { from: '#4a3a0a', to: '#fbbf24' },
  { from: '#4a1a3a', to: '#f472b6' },
  { from: '#2a1f5e', to: '#a78bfa' },
  { from: '#4a2a0a', to: '#fb923c' }
]

const fetchData = async () => {
  try {
    loading.value = true
    const data = await request.get('/book/list', { params: { pageNum: 1, pageSize: 200 } })
    const records = data.records || []

    // 统计每个价格区间中各店铺的图书数
    const storeSet = new Map()
    records.forEach(b => {
      const store = (b.store || '未知').trim()
      if (!storeSet.has(store)) storeSet.set(store, 0)
      storeSet.set(store, storeSet.get(store) + 1)
    })

    // 取 top 6 店铺，其余归为"其他"
    const sortedStores = [...storeSet.entries()].sort((a, b) => b[1] - a[1])
    const topStores = sortedStores.slice(0, 6).map(([name]) => name)
    const hasOther = sortedStores.length > 6

    // 构建每个价格区间 × 店铺的数据矩阵
    const matrix = {}
    topStores.forEach(s => { matrix[s] = new Array(priceRanges.length).fill(0) })
    if (hasOther) matrix['其他'] = new Array(priceRanges.length).fill(0)

    records.forEach(b => {
      const price = parseFloat(b.price) || 0
      const store = (b.store || '未知').trim()
      const rangeIdx = priceRanges.findIndex(r => price >= r.min && price < r.max)
      if (rangeIdx < 0) return
      if (topStores.includes(store)) {
        matrix[store][rangeIdx]++
      } else if (hasOther) {
        matrix['其他'][rangeIdx]++
      }
    })

    const storeNames = [...topStores]
    if (hasOther) storeNames.push('其他')
    cachedStoreNames = storeNames
    cachedMatrix = matrix
    renderChart(storeNames, matrix)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const renderChart = (storeNames, matrix) => {
  if (!chart) return
  const t = getChartTheme()
  const xLabels = priceRanges.map(r => r.label)

  const series = storeNames.map((name, i) => {
    const c = stackColors[i % stackColors.length]
    return {
      name, type: 'bar', stack: 'total', barWidth: '50%',
      data: matrix[name],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: c.to }, { offset: 1, color: c.from }
        ]),
        borderRadius: i === storeNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 16, shadowColor: 'rgba(0,216,255,0.4)',
          borderColor: t['--accent-secondary'], borderWidth: 1
        }
      }
    }
  })

  chart.setOption({
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: t.chartTooltipBg, borderColor: t.chartTooltipBorder,
      borderWidth: 1, textStyle: { color: t.chartTooltipText, fontSize: 15 },
      formatter: params => {
        const total = params.reduce((s, p) => s + p.value, 0)
        let html = `<b style="color:${t['--accent-secondary']}">¥${params[0].axisValue}</b> (共 ${total} 本)<br/>`
        params.filter(p => p.value > 0).forEach(p => {
          const pct = ((p.value / total) * 100).toFixed(1)
          html += `${p.marker} ${p.seriesName}: <b>${p.value}</b> 本 (${pct}%)<br/>`
        })
        return html
      }
    },
    legend: {
      data: storeNames, top: 4, itemGap: 14, itemWidth: 10, itemHeight: 10,
      textStyle: { fontSize: 13, color: t.chartText }
    },
    grid: { left: 12, right: 16, top: 40, bottom: 10, containLabel: true },
    xAxis: {
      type: 'category', data: xLabels,
      axisLabel: { fontSize: 14, color: t.chartText, formatter: v => '¥' + v },
      axisLine: { lineStyle: { color: t.chartAxis } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value', name: '图书数量',
      nameTextStyle: { color: t.chartText, fontSize: 13 },
      axisLabel: { fontSize: 13, color: t.chartText },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: t.chartSplit } }
    },
    series,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  })
}

watch(currentTheme, () => { if (cachedStoreNames) renderChart(cachedStoreNames, cachedMatrix) })
defineExpose({ refresh: fetchData })

const onResize = () => chart?.resize()
onMounted(() => { chart = echarts.init(el.value); fetchData(); window.addEventListener('resize', onResize) })
onUnmounted(() => { window.removeEventListener('resize', onResize); chart?.dispose() })
</script>

<style scoped>
.chart-wrap{position:relative;width:100%;flex:1;min-height:240px}
.chart{width:100%;height:100%}
.loader{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2}
.spin{width:24px;height:24px;border:2px solid rgba(76,155,253,0.15);border-top-color:var(--accent-secondary,#00d8ff);border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
</style>
