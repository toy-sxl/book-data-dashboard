import { ref, watch } from 'vue'

/* ========== 主题配色定义 ========== */
// 修改此处变量值即可全局调整对应主题的颜色

const themes = {
  dark: {
    // 背景
    '--bg-primary': '#0a1628',
    '--bg-panel': 'rgba(18,30,52,0.75)',
    '--bg-card': 'rgba(20,35,60,0.7)',
    // 文字
    '--text-primary': '#e2e8f0',
    '--text-secondary': '#cbd5e1',
    '--text-muted': 'rgba(148,163,184,0.65)',
    '--text-label': 'rgba(203,213,225,0.6)',
    // 主色
    '--accent-primary': '#4c9bfd',
    '--accent-secondary': '#00d8ff',
    // 边框
    '--border-panel': 'rgba(76,155,253,0.1)',
    '--border-card': 'rgba(76,155,253,0.12)',
    '--border-hover': 'rgba(0,216,255,0.25)',
    // 阴影
    '--shadow-panel': '0 2px 20px rgba(0,0,0,0.25)',
    '--shadow-card': '0 0 20px rgba(0,0,0,0.2)',
    // 图表专用（ECharts 不接受 CSS 变量，供 JS 读取）
    chartBg: 'transparent',
    chartText: 'rgba(203,213,225,0.5)',
    chartAxis: 'rgba(76,155,253,0.1)',
    chartSplit: 'rgba(76,155,253,0.06)',
    chartTooltipBg: 'rgba(10,22,40,0.95)',
    chartTooltipBorder: 'rgba(76,155,253,0.3)',
    chartTooltipText: '#e2e8f0',
    // 粒子
    particleAlpha: 0.15,
    particleLineAlpha: 0.04
  },
  light: {
    // 背景
    '--bg-primary': '#f0f4f8',
    '--bg-panel': 'rgba(255,255,255,0.85)',
    '--bg-card': 'rgba(255,255,255,0.9)',
    // 文字
    '--text-primary': '#1e293b',
    '--text-secondary': '#334155',
    '--text-muted': 'rgba(71,85,105,0.7)',
    '--text-label': 'rgba(71,85,105,0.6)',
    // 主色
    '--accent-primary': '#2563eb',
    '--accent-secondary': '#0891b2',
    // 边框
    '--border-panel': 'rgba(37,99,235,0.12)',
    '--border-card': 'rgba(37,99,235,0.1)',
    '--border-hover': 'rgba(37,99,235,0.3)',
    // 阴影
    '--shadow-panel': '0 2px 16px rgba(0,0,0,0.06)',
    '--shadow-card': '0 0 12px rgba(0,0,0,0.04)',
    // 图表专用
    chartBg: 'transparent',
    chartText: 'rgba(71,85,105,0.6)',
    chartAxis: 'rgba(37,99,235,0.12)',
    chartSplit: 'rgba(37,99,235,0.06)',
    chartTooltipBg: 'rgba(255,255,255,0.95)',
    chartTooltipBorder: 'rgba(37,99,235,0.2)',
    chartTooltipText: '#1e293b',
    // 粒子
    particleAlpha: 0.08,
    particleLineAlpha: 0.02
  }
}

/* ========== 响应式主题状态 ========== */
const STORAGE_KEY = 'dashboard-theme'
const currentTheme = ref(localStorage.getItem(STORAGE_KEY) || 'dark')

/* ========== 应用主题到 DOM ========== */
const applyTheme = (name) => {
  const theme = themes[name] || themes.dark
  const root = document.documentElement
  // 设置 CSS 变量
  Object.entries(theme).forEach(([key, value]) => {
    if (key.startsWith('--')) root.style.setProperty(key, value)
  })
  // 设置 body 背景
  document.body.style.background = theme['--bg-primary']
}

/* ========== 切换主题 ========== */
const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
}

/* ========== 获取当前主题的图表配色（供 ECharts 使用） ========== */
const getChartTheme = () => {
  return themes[currentTheme.value] || themes.dark
}

/* ========== 监听变化 → 持久化 + 应用 ========== */
watch(currentTheme, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
  applyTheme(val)
}, { immediate: true })

export { currentTheme, toggleTheme, getChartTheme, applyTheme, themes }
