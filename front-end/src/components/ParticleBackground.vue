<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

const canvas = ref<HTMLCanvasElement>()
const particles = ref<Particle[]>([])
const animationId = ref<number>()

const colors = [
  'rgba(121, 22, 255, 0.6)',
  'rgba(139, 92, 246, 0.5)',
  'rgba(236, 72, 153, 0.4)',
  'rgba(59, 130, 246, 0.3)'
]

const createParticle = (x?: number, y?: number): Particle => {
  return {
    x: x ?? Math.random() * window.innerWidth,
    y: y ?? Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.8 + 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 0,
    maxLife: Math.random() * 300 + 200
  }
}

const initParticles = () => {
  particles.value = []
  for (let i = 0; i < 50; i++) {
    particles.value.push(createParticle())
  }
}

const updateParticles = () => {
  particles.value.forEach((particle, index) => {
    particle.x += particle.vx
    particle.y += particle.vy
    particle.life++
    
    // Fade out as particle ages
    particle.opacity = Math.max(0, 1 - (particle.life / particle.maxLife))
    
    // Remove dead particles
    if (particle.life >= particle.maxLife) {
      particles.value.splice(index, 1)
      particles.value.push(createParticle())
    }
    
    // Wrap around screen
    if (particle.x < 0) particle.x = window.innerWidth
    if (particle.x > window.innerWidth) particle.x = 0
    if (particle.y < 0) particle.y = window.innerHeight
    if (particle.y > window.innerHeight) particle.y = 0
  })
}

const drawParticles = (ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  
  particles.value.forEach(particle => {
    ctx.save()
    ctx.globalAlpha = particle.opacity
    ctx.fillStyle = particle.color
    ctx.shadowBlur = 10
    ctx.shadowColor = particle.color
    
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  })
  
  // Draw connections between nearby particles
  particles.value.forEach((particle1, i) => {
    particles.value.slice(i + 1).forEach(particle2 => {
      const dx = particle1.x - particle2.x
      const dy = particle1.y - particle2.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 100) {
        ctx.save()
        ctx.globalAlpha = (1 - distance / 100) * 0.2
        ctx.strokeStyle = 'rgba(121, 22, 255, 0.3)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(particle1.x, particle1.y)
        ctx.lineTo(particle2.x, particle2.y)
        ctx.stroke()
        ctx.restore()
      }
    })
  })
}

const animate = () => {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  
  updateParticles()
  drawParticles(ctx)
  animationId.value = requestAnimationFrame(animate)
}

const resizeCanvas = () => {
  if (!canvas.value) return
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight
}

const handleMouseMove = (event: MouseEvent) => {
  // Add particles on mouse movement
  if (Math.random() < 0.1) {
    particles.value.push(createParticle(event.clientX, event.clientY))
  }
}

onMounted(() => {
  resizeCanvas()
  initParticles()
  animate()
  
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <canvas 
    ref="canvas"
    class="particle-canvas"
  />
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1;
  opacity: 0.7;
}
</style>
