<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpace, NIcon, NStatistic, NGrid, NGridItem } from 'naive-ui'
import {
  ChevronForward as ChevronRightIcon,
  Play as PlayIcon,
  Shield as ShieldIcon,
  People as PeopleIcon,
  Flash as FlashIcon
} from '@vicons/ionicons5'
// import ParticleBackground from '@/components/ParticleBackground.vue'

const router = useRouter()
const isLoaded = ref(false)

// Statistiques du bot (à remplacer par de vraies données)
const stats = ref([
  { label: 'Serveurs Actifs', value: '2,847', icon: ShieldIcon },
  { label: 'Utilisateurs', value: '156K+', icon: PeopleIcon },
  { label: 'Commandes/jour', value: '45K+', icon: FlashIcon }
])

const navigateToInvite = () => {
  router.push('/invite')
}

const navigateToDashboard = () => {
  router.push('/dashboard')
}

const scrollToFeatures = () => {
  const featuresSection = document.getElementById('features')
  if (featuresSection) {
    featuresSection.scrollIntoView({ behavior: 'smooth' })
  }
}

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
  }, 300)
})
</script>

<template>
  <section class="hero-section">
    <!-- Background Effects -->
    <div class="hero-background">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="floating-particles">
        <div v-for="i in 30" :key="i" class="particle" :style="{
          '--delay': `${i * 0.3}s`,
          '--duration': `${6 + Math.random() * 6}s`,
          '--x': `${Math.random() * 100}%`,
          '--y': `${Math.random() * 100}%`,
          '--size': `${2 + Math.random() * 4}px`
        }"></div>
      </div>
    </div>

    <div class="hero-content">
      <div class="max-w-6xl mx-auto px-6 py-32 relative z-10">
        <!-- Main Content -->
        <div 
          v-motion
          :initial="{ opacity: 0, y: 60 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 1000, delay: 200 } }"
          class="text-center mb-16"
        >
          <!-- Badge -->
          <div
            class="hero-badge"
            v-motion
            :initial="{ opacity: 0, scale: 0.8 }"
            :enter="{ opacity: 1, scale: 1, transition: { duration: 800, delay: 100 } }"
          >
            <div class="badge-glow"></div>
            <span class="badge-icon">🔥</span>
            <span class="badge-text">Bot Discord NSFW Premium</span>
            <div class="badge-particles">
              <div class="particle" v-for="i in 6" :key="i"></div>
            </div>
          </div>

          <!-- Main Title -->
          <h1 class="hero-title mb-8">
            <span class="gradient-text-hero">KinkyPolice</span>
            <br>
            <span class="text-white">Le Bot Discord Ultime</span>
            <br>
            <span class="text-gray-300 text-4xl md:text-5xl">pour Communautés Adultes</span>
          </h1>

          <!-- Subtitle -->
          <p class="hero-subtitle mb-12">
            Modération avancée, jeux interactifs kinky, et outils de gestion puissants 
            spécialement conçus pour les serveurs Discord NSFW. 
            <span class="text-primary-400 font-semibold">Rejoignez plus de 150K utilisateurs</span> 
            qui font confiance à KinkyPolice.
          </p>

          <!-- CTA Buttons -->
          <NSpace justify="center" class="mb-16" style="flex-wrap: wrap; gap: 20px;">
            <NButton 
              type="primary"
              size="large"
              @click="navigateToInvite"
              class="cta-primary"
            >
              <template #icon>
                <NIcon>
                  <ChevronRightIcon />
                </NIcon>
              </template>
              <span class="font-bold">Ajouter à mon Serveur</span>
            </NButton>
            
            <NButton 
              secondary
              size="large"
              @click="scrollToFeatures"
              class="cta-secondary"
            >
              <template #icon>
                <NIcon>
                  <PlayIcon />
                </NIcon>
              </template>
              <span class="font-semibold">Voir les Fonctionnalités</span>
            </NButton>
          </NSpace>
        </div>

        <!-- Stats Section -->
        <div 
          v-motion
          :initial="{ opacity: 0, y: 40 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 600 } }"
          class="stats-container"
        >
          <NGrid :cols="1" :md-cols="3" :x-gap="32" :y-gap="24">
            <NGridItem v-for="(stat, index) in stats" :key="stat.label">
              <div 
                class="stat-card"
                v-motion
                :initial="{ opacity: 0, scale: 0.8 }"
                :enter="{ opacity: 1, scale: 1, transition: { duration: 600, delay: 800 + index * 200 } }"
              >
                <div class="stat-icon">
                  <NIcon size="32" :color="'var(--primary-400)'">
                    <component :is="stat.icon" />
                  </NIcon>
                </div>
                <NStatistic 
                  :value="stat.value" 
                  class="stat-number"
                />
                <p class="stat-label">{{ stat.label }}</p>
              </div>
            </NGridItem>
          </NGrid>
        </div>

        <!-- Trust Indicators -->
        <div 
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { duration: 800, delay: 1200 } }"
          class="trust-indicators"
        >
          <p class="text-gray-400 text-sm mb-4">Utilisé par les plus grandes communautés Discord NSFW</p>
          <div class="flex justify-center items-center space-x-8 opacity-60">
            <!-- Placeholder pour logos de serveurs partenaires -->
            <div class="trust-badge">Serveur Vérifié Discord</div>
            <div class="trust-badge">+2.8K Serveurs</div>
            <div class="trust-badge">Support 24/7</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 80%, rgba(121, 22, 255, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
    linear-gradient(135deg, var(--dark-950) 0%, var(--dark-900) 50%, var(--dark-950) 100%);
}

.hero-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.3;
  animation: float 8s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--primary-500), transparent);
  top: -200px;
  left: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, var(--accent-purple), transparent);
  top: 50%;
  right: -150px;
  animation-delay: 2s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, var(--accent-pink), transparent);
  bottom: -125px;
  left: 30%;
  animation-delay: 4s;
}

.floating-particles {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  width: var(--size, 4px);
  height: var(--size, 4px);
  background: radial-gradient(circle, var(--primary-400), var(--accent-purple));
  border-radius: 50%;
  opacity: 0.8;
  left: var(--x);
  top: var(--y);
  box-shadow: 0 0 10px var(--primary-400);
  animation: particleFloat var(--duration) ease-in-out infinite;
  animation-delay: var(--delay);
}

.hero-content {
  position: relative;
  z-index: 10;
  width: 100%;
}

.hero-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: rgba(121, 22, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(121, 22, 255, 0.3);
  border-radius: 50px;
  margin-bottom: 32px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.hero-badge:hover {
  background: rgba(121, 22, 255, 0.15);
  border-color: rgba(121, 22, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(121, 22, 255, 0.3);
}

.badge-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, var(--primary-500), var(--accent-purple), var(--accent-pink));
  border-radius: 50px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
  z-index: -1;
}

.hero-badge:hover .badge-glow {
  opacity: 0.6;
  animation: borderGlow 2s ease-in-out infinite;
}

.badge-icon {
  font-size: 16px;
  animation: iconBounce 2s ease-in-out infinite;
}

.badge-text {
  color: var(--primary-400);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.badge-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.badge-particles .particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: var(--primary-400);
  border-radius: 50%;
  opacity: 0;
  animation: particleSparkle 3s ease-in-out infinite;
}

.badge-particles .particle:nth-child(1) { top: 20%; left: 15%; animation-delay: 0s; }
.badge-particles .particle:nth-child(2) { top: 60%; left: 25%; animation-delay: 0.5s; }
.badge-particles .particle:nth-child(3) { top: 30%; right: 20%; animation-delay: 1s; }
.badge-particles .particle:nth-child(4) { bottom: 25%; right: 15%; animation-delay: 1.5s; }
.badge-particles .particle:nth-child(5) { top: 70%; left: 60%; animation-delay: 2s; }
.badge-particles .particle:nth-child(6) { top: 15%; right: 40%; animation-delay: 2.5s; }

.hero-title {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 900;
  line-height: 1.1;
  text-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  margin-bottom: 2rem;
}

.gradient-text-hero {
  background: linear-gradient(135deg, var(--primary-400), var(--accent-purple), var(--accent-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease-in-out infinite;
}

.hero-subtitle {
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  color: var(--dark-300);
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.7;
}

.cta-primary {
  position: relative !important;
  background: linear-gradient(135deg, var(--primary-600), var(--accent-purple)) !important;
  border: none !important;
  padding: 18px 40px !important;
  font-size: 18px !important;
  font-weight: 700 !important;
  box-shadow:
    0 12px 40px rgba(121, 22, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  overflow: hidden !important;
}

.cta-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s ease;
}

.cta-primary:hover::before {
  left: 100%;
}

.cta-primary:hover {
  transform: translateY(-4px) scale(1.02) !important;
  box-shadow:
    0 20px 60px rgba(121, 22, 255, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

.cta-primary:active {
  transform: translateY(-2px) scale(0.98) !important;
}

.cta-secondary {
  position: relative !important;
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  padding: 18px 40px !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  overflow: hidden !important;
}

.cta-secondary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(121, 22, 255, 0.1), rgba(139, 92, 246, 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cta-secondary:hover::before {
  opacity: 1;
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(121, 22, 255, 0.3) !important;
  transform: translateY(-3px) scale(1.02) !important;
  box-shadow: 0 12px 40px rgba(121, 22, 255, 0.2) !important;
}

.stats-container {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 32px;
  margin-bottom: 48px;
}

.stat-card {
  text-align: center;
  padding: 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-4px);
}

.stat-icon {
  margin-bottom: 16px;
}

.stat-number {
  font-size: 2.5rem !important;
  font-weight: 900 !important;
  color: white !important;
  margin-bottom: 8px !important;
}

.stat-label {
  color: var(--dark-400);
  font-size: 0.9rem;
  font-weight: 500;
}

.trust-indicators {
  text-align: center;
}

.trust-badge {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--dark-300);
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

@keyframes particleFloat {
  0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
  50% { transform: translateY(-100px) translateX(50px); opacity: 1; }
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes borderGlow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes iconBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

@keyframes particleSparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0) translateY(0px);
  }
  50% {
    opacity: 1;
    transform: scale(1) translateY(-10px);
  }
}
</style>
