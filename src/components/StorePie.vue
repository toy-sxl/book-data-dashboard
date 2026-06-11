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

const palette = ['#4c9bfd','#00d8ff','#36d399','#fbbf24','#f472b6','#a78bfa','#fb923c','#38bdf8','#94a3b8']

const fetchData = async () => {
  try {
    loading.value = true
    const data = await request.get('/book/list', { params: { pageNum: 1, pageSize: 200 } })
    const records = data.records || []
    const map = {}
    records.forEach(b => {
      const s = (b.store || '未知').trim()
      map[s] = (map[s] || 0) + 1
    })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 8)
    const rest = sorted.slice(8)
    if (rest.length > 0) {
      const otherCount = rest.reduce((s, [, v]) => s + v, 0)
      top.push(['其他', otherCount])
    }
    renderChart(top)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const renderChart = (data) => {
  if (!chart) return
  const pieData = data.map(([name, value]) => ({ name, value }))
  const total = data.reduce((s, [, v]) => s + v, 0)

  chart.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10,22,40,0.95)',
      borderColor: 'rgba(76,155,253,0.3)',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 15 },
      formatter: p => `<b style="color:#00d8ff">${p.name}</b><br/>数量: ${p.value} 本 (${p.percent}%)`
    },
    legend: {
      orient: 'vertical', right: '2%', top: 'middle',
      itemGap: 8, itemWidth: 8, itemHeight: 8,
      textStyle: { fontSize: 13, color: 'rgba(203,213,225,0.65)' },
      formatter: n => n.length > 5 ? n.slice(0, 5) + '..' : n
    },
    color: palette,
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '52%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#0a1628', borderWidth: 2 },
      label: {
        show: true, position: 'outside',
        formatter: '{b}\n{d}%',
        fontSize: 13, color: 'rgba(203,213,225,0.7)',
        lineHeight: 14
      },
      labelLine: { length: 12, length2: 8, lineStyle: { color: 'rgba(76,155,253,0.3)' } },
      emphasis: {
        label: { show: true, fontSize: 15, fontWeight: 700, color: '#00d8ff' },
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,216,255,0.4)' }
      },
      data: pieData
    }],
    graphic: [{
      type: 'text', left: '28%', top: '46%',
      style: { text: total + '\n本', fill: 'rgba(203,213,225,0.5)', fontSize: 18, textAlign: 'center', lineHeight: 24 }
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
