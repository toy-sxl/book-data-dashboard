<template>
  <div class="dashboard">
    <!-- 背景粒子层 -->
    <canvas ref="particleCanvas" class="particles"></canvas>

    <!-- 顶部标题栏 -->
    <header class="header">
      <h1 class="title">图书数据分析大屏</h1>
      <div class="header-right">
        <!-- 主题切换按钮 -->
        <button class="theme-btn" @click="toggleTheme" :title="currentTheme === 'dark' ? '切换到高亮主题' : '切换到暗黑主题'">
          <span v-if="currentTheme === 'dark'">☀️</span>
          <span v-else>🌙</span>
        </button>
        <div class="time-box">
          <span class="time">{{ currentTime }}</span>
          <span class="date">{{ currentDate }}</span>
        </div>
        <div class="update-badge" v-if="lastUpdate">
          <span class="update-dot"></span>
          <span>{{ lastUpdate }}</span>
        </div>
      </div>
    </header>

    <!-- 加载提示条 -->
    <transition name="fade">
      <div v-if="refreshing" class="refresh-bar">
        <div class="refresh-spinner"></div>
        <span>数据刷新中...</span>
      </div>
    </transition>

    <!-- 统计卡片：4个核心指标 -->
    <section class="stat-row">
      <div class="stat-card" v-for="item in statItems" :key="item.label">
        <div class="stat-main">
          <span class="stat-icon">{{ item.icon }}</span>
          <span class="stat-num">{{ item.value }}</span>
        </div>
        <div class="stat-bottom">
          <span class="stat-lbl">{{ item.label }}</span>
          <span class="trend-arrow">↑</span>
        </div>
      </div>
    </section>

    <!-- 三列主体布局 -->
    <section class="main-grid">
      <!-- 左列 -->
      <div class="col-side">
        <div class="panel">
          <h2 class="ptitle"><i class="dot"></i>店铺图书数量占比</h2>
          <StorePie ref="storePieRef" />
        </div>
        <div class="panel">
          <h2 class="ptitle"><i class="dot"></i>价格区间分布趋势</h2>
          <PriceRangeBar ref="priceRangeRef" />
        </div>
      </div>

      <!-- 中间主图 -->
      <div class="col-center">
        <div class="panel panel-hero">
          <h2 class="ptitle"><i class="dot"></i>价格区间分布堆叠柱状图</h2>
          <PriceStackBar ref="priceStackRef" />
        </div>
      </div>

      <!-- 右列 -->
      <div class="col-side">
        <div class="panel">
          <h2 class="ptitle"><i class="dot"></i>TOP10 店铺图书数量</h2>
          <StoreTopBar ref="storeTopRef" />
        </div>
        <div class="panel">
          <h2 class="ptitle"><i class="dot"></i>TOP10 作者作品数量</h2>
          <AuthorTopBar ref="authorTopRef" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import StorePie from './components/StorePie.vue'
import StoreTopBar from './components/StoreTopBar.vue'
import PriceRangeBar from './components/PriceRangeBar.vue'
import AuthorTopBar from './components/AuthorTopBar.vue'
import PriceStackBar from './components/PriceStackBar.vue'
import request from './utils/request.js'
import { currentTheme, toggleTheme } from './utils/theme.js'

/* ========== 自动刷新间隔（毫秒），修改此值即可调整刷新频率 ========== */
const REFRESH_INTERVAL = 30000  // 默认30秒

/* ========== 响应式数据 ========== */
const stats = ref({ totalBooks: 0, storeCount: 0, avgPrice: '0.00', totalComments: '0' })
const currentTime = ref('')
const currentDate = ref('')
const lastUpdate = ref('')
const refreshing = ref(false)
const particleCanvas = ref(null)

// 图表组件引用（用于触发主题更新）
const storePieRef = ref(null)
const storeTopRef = ref(null)
const priceRangeRef = ref(null)
const authorTopRef = ref(null)
const priceStackRef = ref(null)

const statItems = computed(() => [
  { label: '图书总数', value: stats.value.totalBooks, icon: '📚' },
  { label: '店铺数量', value: stats.value.storeCount, icon: '🏪' },
  { label: '平均价格', value: '¥' + stats.value.avgPrice, icon: '💰' },
  { label: '总评论数', value: stats.value.totalComments, icon: '💬' }
])

/* ========== 时钟 ========== */
let clockTimer = null
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })
}

/* ========== 数据获取（顶部统计卡片） ========== */
const fetchStats = async () => {
  try {
    const data = await request.get('/book/list', { params: { pageNum: 1, pageSize: 200 } })
    const records = data.records || []
    const stores = new Set(records.map(b => b.store).filter(Boolean))
    const prices = records.map(b => parseFloat(b.price) || 0)
    const comments = records.reduce((s, b) => s + (b.commitNum || 0), 0)
    const avg = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0
    stats.value = {
      totalBooks: data.total || records.length,
      storeCount: stores.size,
      avgPrice: avg.toFixed(2),
      totalComments: comments.toLocaleString()
    }
    const now = new Date()
    lastUpdate.value = now.toLocaleTimeString('zh-CN', { hour12: false }) + ' 更新'
  } catch (e) { console.error('统计失败:', e) }
}

/* ========== 全量刷新（统计 + 所有图表） ========== */
const refreshAll = async () => {
  refreshing.value = true
  try {
    await fetchStats()
    // 触发各图表数据刷新
    storePieRef.value?.refresh?.()
    storeTopRef.value?.refresh?.()
    priceRangeRef.value?.refresh?.()
    authorTopRef.value?.refresh?.()
    priceStackRef.value?.refresh?.()
  } catch (e) {
    console.error('数据刷新失败:', e)
  } finally {
    // 延迟隐藏 loading，给用户视觉反馈
    setTimeout(() => { refreshing.value = false }, 500)
  }
}

/* ========== 自动刷新定时器 ========== */
let refreshTimer = null
const startAutoRefresh = () => {
  refreshTimer = setInterval(refreshAll, REFRESH_INTERVAL)
}

/* ========== 主题切换 → 通知图表更新配色 ========== */
watch(currentTheme, () => {
  // 图表组件内部通过 watch currentTheme 自动响应
}, { flush: 'post' })

/* ========== 粒子背景动效 ========== */
let animId = null
let cleanupResize = null
const initParticles = () => {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const particles = []
  const PARTICLE_COUNT = 45

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  const createParticle = () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 2 + 0.5,
    color: Math.random() > 0.5 ? 'rgba(76,155,253,' : 'rgba(0,216,255,',
    alpha: Math.random() * 0.15 + 0.05
  })

  resize()
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle())

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.color + p.alpha + ')'
      ctx.fill()
    })
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 160) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = 'rgba(76,155,253,' + (0.04 * (1 - dist / 160)) + ')'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    animId = requestAnimationFrame(draw)
  }
  draw()
  window.addEventListener('resize', resize)
  return () => window.removeEventListener('resize', resize)
}

/* ========== 生命周期 ========== */
onMounted(() => {
  updateTime()
  clockTimer = setInterval(updateTime, 1000)
  refreshAll()
  startAutoRefresh()
  cleanupResize = initParticles()
})
onUnmounted(() => {
  clearInterval(clockTimer)
  clearInterval(refreshTimer)
  cancelAnimationFrame(animId)
  cleanupResize?.()
})
</script>

<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:var(--text-secondary,#cbd5e1);min-height:100vh;overflow-x:hidden;transition:background 0.4s}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(76,155,253,0.15);border-radius:2px}
</style>

<style scoped>
.dashboard{height:100vh;padding:16px 26px 18px;background:var(--bg-primary,#0a1628);display:flex;flex-direction:column;position:relative;overflow:hidden;transition:background 0.4s}

/* 背景粒子 */
.particles{position:fixed;inset:0;z-index:0;pointer-events:none}
.dashboard>*:not(.particles){position:relative;z-index:1}

/* 标题栏 */
.header{display:flex;justify-content:space-between;align-items:center;padding:8px 0 16px;margin-bottom:14px;border-bottom:1px solid var(--border-panel,rgba(76,155,253,0.1))}
.title{font-size:1.9rem;font-weight:700;background:linear-gradient(90deg,var(--accent-primary,#4c9bfd),var(--accent-secondary,#00d8ff));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:3px}
.header-right{display:flex;align-items:center;gap:16px}

/* 主题切换按钮 */
.theme-btn{width:40px;height:40px;border-radius:50%;border:1px solid var(--border-panel,rgba(76,155,253,0.15));background:var(--bg-card,rgba(20,35,60,0.7));backdrop-filter:blur(8px);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:all 0.3s;box-shadow:0 0 12px rgba(0,0,0,0.15)}
.theme-btn:hover{border-color:var(--accent-secondary,#00d8ff);box-shadow:0 0 16px rgba(0,216,255,0.2);transform:scale(1.1)}

.time-box{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.time{font-size:1.45rem;font-weight:600;color:var(--accent-primary,#4c9bfd);font-variant-numeric:tabular-nums;letter-spacing:1px}
.date{font-size:0.85rem;color:rgba(76,155,253,0.5)}
.update-badge{display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(76,155,253,0.08);border:1px solid rgba(76,155,253,0.15);border-radius:20px;font-size:0.75rem;color:rgba(76,155,253,0.7)}
.update-dot{width:6px;height:6px;border-radius:50%;background:var(--accent-secondary,#00d8ff);box-shadow:0 0 6px rgba(0,216,255,0.6);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}

/* 加载提示条 */
.refresh-bar{position:absolute;top:60px;left:50%;transform:translateX(-50%);z-index:100;display:flex;align-items:center;gap:8px;padding:6px 18px;background:rgba(76,155,253,0.12);border:1px solid rgba(76,155,253,0.2);border-radius:20px;font-size:0.8rem;color:var(--accent-primary,#4c9bfd);backdrop-filter:blur(8px)}
.refresh-spinner{width:14px;height:14px;border:2px solid rgba(76,155,253,0.2);border-top-color:var(--accent-secondary,#00d8ff);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-enter-active,.fade-leave-active{transition:opacity 0.3s}
.fade-enter-from,.fade-leave-to{opacity:0}

/* 统计卡片 */
.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:14px}
.stat-card{padding:18px 22px;background:var(--bg-card,rgba(20,35,60,0.7));border:1px solid var(--border-card,rgba(76,155,253,0.12));border-radius:14px;backdrop-filter:blur(10px);display:flex;flex-direction:column;gap:5px;transition:all 0.25s;box-shadow:var(--shadow-card,0 0 20px rgba(0,0,0,0.2))}
.stat-card:hover{border-color:var(--border-hover,rgba(0,216,255,0.35));box-shadow:0 0 18px rgba(0,216,255,0.08)}
.stat-main{display:flex;align-items:center;gap:10px}
.stat-icon{font-size:1.4rem;line-height:1;filter:drop-shadow(0 0 4px rgba(0,216,255,0.4))}
.stat-num{font-size:2rem;font-weight:700;background:linear-gradient(135deg,var(--accent-primary,#4c9bfd),var(--accent-secondary,#00d8ff));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-variant-numeric:tabular-nums}
.stat-bottom{display:flex;justify-content:space-between;align-items:center}
.stat-lbl{font-size:0.95rem;color:var(--text-muted,rgba(148,163,184,0.65));letter-spacing:0.5px}
.trend-arrow{font-size:1.1rem;font-weight:700;background:linear-gradient(135deg,var(--accent-primary,#4c9bfd),var(--accent-secondary,#00d8ff));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;filter:drop-shadow(0 0 4px rgba(0,216,255,0.5));line-height:1}

/* 三列主体 */
.main-grid{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:16px;flex:1}
.col-side{display:flex;flex-direction:column;gap:16px}
.col-center{display:flex;flex-direction:column}
.panel-hero{flex:1}

/* 面板通用 */
.panel{background:var(--bg-panel,rgba(18,30,52,0.75));border:1px solid var(--border-panel,rgba(76,155,253,0.1));border-radius:14px;padding:16px 18px;backdrop-filter:blur(10px);display:flex;flex-direction:column;flex:1;transition:all 0.25s;box-shadow:var(--shadow-panel,0 2px 20px rgba(0,0,0,0.25))}
.panel:hover{border-color:var(--border-hover,rgba(0,216,255,0.25));box-shadow:0 0 24px rgba(0,216,255,0.06)}
.ptitle{font-size:1.05rem;font-weight:600;color:var(--text-primary,rgba(226,232,240,0.9));margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-shrink:0}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent-secondary,#00d8ff);box-shadow:0 0 8px rgba(0,216,255,0.6);font-style:normal}

/* 响应式 */
@media(max-width:1200px){
  .main-grid{grid-template-columns:1fr 1fr}
  .col-center{order:-1;grid-column:span 2}
}
@media(max-width:768px){
  .main-grid{grid-template-columns:1fr}
  .col-center{grid-column:span 1}
}
@media(max-width:700px){
  .dashboard{padding:10px}
  .stat-row{grid-template-columns:repeat(2,1fr)}
  .title{font-size:1.15rem}
}
</style>
