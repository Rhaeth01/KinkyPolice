<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NButton, NCard, NSpace, NIcon, NH1, NP, NStatistic } from 'naive-ui'
import {
  ChevronForward as ChevronRightIcon,
  Play as PlayIcon,
  Shield as ShieldIcon,
  People as PeopleIcon,
  Flash as FlashIcon,
  Heart as HeartIcon
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import SharedNavigation from '@/components/SharedNavigation.vue'
import KinkyPoliceRobot from '@/components/KinkyPoliceRobot.vue'
import RotatingFeatures from '@/components/RotatingFeatures.vue'

const router = useRouter()
const isLoaded = ref(false)



const navigateToInvite = () => {
  router.push('/invite')
}

const scrollToFeatures = () => {
  const featuresSection = document.getElementById('features')
  if (featuresSection) {
    featuresSection.scrollIntoView({ behavior: 'smooth' })
  }
}

onMounted(() => {
  document.documentElement.style.scrollBehavior = 'smooth'
  setTimeout(() => {
    isLoaded.value = true
  }, 300)
})
</script>

<template>
  <div class="premium-landing">
    <!-- Shared Navigation -->
    <SharedNavigation current-page="home" />

    <!-- Premium Hero Section -->
    <section class="premium-hero">
      <!-- Background Effects -->
      <div class="hero-background">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
        <div class="floating-particles">
          <div v-for="i in 50" :key="i" class="particle" :style="{
            '--delay': `${i * 0.2}s`,
            '--duration': `${4 + Math.random() * 6}s`,
            '--x': `${Math.random() * 100}%`,
            '--y': `${Math.random() * 100}%`,
            '--size': `${1 + Math.random() * 3}px`
          }"></div>
        </div>
      </div>

      <div class="hero-container">
        <!-- Left Side: Content -->
        <div
          class="hero-content"
          v-motion
          :initial="{ opacity: 0, x: -60 }"
          :enter="{ opacity: 1, x: 0, transition: { duration: 1000, delay: 200 } }"
        >
          <!-- Premium Badge -->
          <div class="premium-badge">
            <div class="badge-glow"></div>
            <span class="badge-icon">👑</span>
            <span class="badge-text">Bot Discord NSFW Premium</span>
            <div class="badge-sparkles">
              <span class="sparkle">✨</span>
              <span class="sparkle">💎</span>
              <span class="sparkle">🔥</span>
            </div>
          </div>

          <!-- Minimalist Title -->
          <NH1 class="minimalist-title">
            <span class="main-title">
              <span class="gradient-text-premium">KinkyPolice</span>
            </span>
            <span class="subtitle-text">
              Le bot Discord premium pour communautés adultes
            </span>
          </NH1>

          <!-- Rotating Features -->
          <div class="rotating-features-container">
            <RotatingFeatures :animation-type="'typewriter'" />
          </div>

          <!-- CTA Buttons -->
          <div class="cta-container">
            <NButton
              type="primary"
              size="large"
              @click="navigateToInvite"
              class="premium-cta-primary"
            >
              <template #icon>
                <NIcon><ChevronRightIcon /></NIcon>
              </template>
              <span class="cta-text">Ajouter au Serveur</span>
              <div class="cta-shine"></div>
            </NButton>

            <NButton
              secondary
              size="large"
              @click="scrollToFeatures"
              class="premium-cta-secondary"
            >
              <template #icon>
                <NIcon><PlayIcon /></NIcon>
              </template>
              <span class="cta-text">Voir en Action</span>
            </NButton>
          </div>

          <!-- Trust Indicators -->
          <div class="trust-indicators">
            <div class="trust-item">
              <NIcon size="16" color="var(--success)"><ShieldIcon /></NIcon>
              <span>Sécurisé & Vérifié</span>
            </div>
            <div class="trust-item">
              <NIcon size="16" color="var(--primary-400)"><PeopleIcon /></NIcon>
              <span>+156K Utilisateurs</span>
            </div>
            <div class="trust-item">
              <NIcon size="16" color="var(--warning)"><FlashIcon /></NIcon>
              <span>99.9% Uptime</span>
            </div>
          </div>
        </div>

        <!-- Right Side: Robot Character -->
        <div
          class="hero-visual"
          v-motion
          :initial="{ opacity: 0, x: 60, scale: 0.8 }"
          :enter="{ opacity: 1, x: 0, scale: 1, transition: { duration: 1200, delay: 400 } }"
        >
          <div class="robot-container">
            <KinkyPoliceRobot :size="500" :animated="true" />
            <div class="robot-glow"></div>
          </div>
        </div>
      </div>
    </section>


  </div>
</template>

<style scoped>
/* Premium Landing Page Styles */
.premium-landing {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 80%, rgba(121, 22, 255, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(236, 72, 153, 0.05) 0%, transparent 50%),
    linear-gradient(135deg, var(--dark-950) 0%, var(--dark-900) 30%, var(--dark-950) 100%);
  overflow-x: hidden;
}



/* Premium Hero Section */
.premium-hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 140px 0 80px;
}

.hero-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 1;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: orbFloat 12s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--primary-500), transparent);
  top: -300px;
  left: -300px;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--accent-purple), transparent);
  top: 20%;
  right: -200px;
  animation-delay: 4s;
}

.orb-3 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--accent-pink), transparent);
  bottom: -250px;
  left: 40%;
  animation-delay: 8s;
}

.floating-particles {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  width: var(--size, 2px);
  height: var(--size, 2px);
  background: radial-gradient(circle, var(--primary-400), var(--accent-purple));
  border-radius: 50%;
  opacity: 0.8;
  left: var(--x);
  top: var(--y);
  box-shadow: 0 0 10px var(--primary-400);
  animation: particleFloat var(--duration) ease-in-out infinite;
  animation-delay: var(--delay);
}

.hero-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  position: relative;
  z-index: 10;
}

.hero-content {
  max-width: 600px;
}

/* Premium Badge */
.premium-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: rgba(121, 22, 255, 0.08);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(121, 22, 255, 0.2);
  border-radius: 60px;
  margin-bottom: 40px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}

.badge-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, var(--primary-500), var(--accent-purple), var(--accent-pink));
  border-radius: 60px;
  opacity: 0;
  filter: blur(12px);
  transition: opacity 0.4s ease;
  z-index: -1;
}

.premium-badge:hover .badge-glow {
  opacity: 0.6;
  animation: badgeGlow 2s ease-in-out infinite;
}

.badge-icon {
  font-size: 18px;
  animation: iconFloat 3s ease-in-out infinite;
}

.badge-text {
  color: var(--primary-400);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.badge-sparkles {
  display: flex;
  gap: 4px;
}

.sparkle {
  font-size: 12px;
  animation: sparkleFloat 2s ease-in-out infinite;
}

.sparkle:nth-child(2) { animation-delay: 0.3s; }
.sparkle:nth-child(3) { animation-delay: 0.6s; }

.premium-badge:hover {
  background: rgba(121, 22, 255, 0.12);
  border-color: rgba(121, 22, 255, 0.4);
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 15px 50px rgba(121, 22, 255, 0.3);
}

/* Minimalist Title */
.minimalist-title {
  font-size: clamp(2.8rem, 6vw, 4.2rem) !important;
  font-weight: 900 !important;
  line-height: 1.2 !important;
  margin-bottom: 32px !important;
  text-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;
  letter-spacing: -0.02em !important;
}

.main-title {
  display: block;
  margin-bottom: 12px;
}

.subtitle-text {
  display: block;
  color: var(--dark-300);
  font-size: 0.35em;
  font-weight: 500;
  letter-spacing: 0.5px;
  line-height: 1.4;
}

.gradient-text-premium {
  background: linear-gradient(135deg,
    var(--primary-400) 0%,
    var(--accent-purple) 30%,
    var(--accent-pink) 60%,
    var(--primary-500) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 4s ease-in-out infinite;
}

.highlight-text {
  color: var(--accent-pink);
  position: relative;
}

.highlight-text::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(135deg, var(--accent-pink), var(--primary-400));
  border-radius: 2px;
  animation: highlightPulse 2s ease-in-out infinite;
}

/* Rotating Features Container */
.rotating-features-container {
  margin: 40px 0;
  min-height: 120px;
  display: flex;
  align-items: center;
}

/* CTA Container */
.cta-container {
  display: flex;
  gap: 24px;
  margin: 50px 0;
  flex-wrap: wrap;
}

/* Premium CTA Buttons */
.premium-cta-primary {
  position: relative !important;
  background: linear-gradient(135deg, var(--primary-600), var(--accent-purple)) !important;
  border: none !important;
  padding: 20px 48px !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
  box-shadow:
    0 15px 50px rgba(121, 22, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  overflow: hidden !important;
  border-radius: 16px !important;
}

.cta-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.8s ease;
}

.premium-cta-primary:hover .cta-shine {
  left: 100%;
}

.premium-cta-primary:hover {
  transform: translateY(-4px) scale(1.03) !important;
  box-shadow:
    0 25px 70px rgba(121, 22, 255, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

.premium-cta-secondary {
  position: relative !important;
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(30px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding: 20px 48px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  letter-spacing: 0.5px !important;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  border-radius: 16px !important;
  overflow: hidden !important;
}

.premium-cta-secondary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(121, 22, 255, 0.1), rgba(139, 92, 246, 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.premium-cta-secondary:hover::before {
  opacity: 1;
}

.premium-cta-secondary:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(121, 22, 255, 0.3) !important;
  transform: translateY(-4px) scale(1.03) !important;
  box-shadow: 0 20px 60px rgba(121, 22, 255, 0.3) !important;
}

.cta-text {
  position: relative;
  z-index: 2;
}

/* Trust Indicators */
.trust-indicators {
  display: flex;
  gap: 32px;
  margin-top: 40px;
  flex-wrap: wrap;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 30px;
  font-size: 13px;
  color: var(--dark-300);
  font-weight: 500;
  transition: all 0.3s ease;
}

.trust-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

/* Hero Visual */
.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.robot-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.robot-glow {
  position: absolute;
  inset: -50px;
  background: radial-gradient(circle, rgba(121, 22, 255, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: robotGlow 4s ease-in-out infinite;
  z-index: -1;
}





/* Animations */
@keyframes orbFloat {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-30px) rotate(180deg);
  }
}

@keyframes particleFloat {
  0%, 100% {
    transform: translateY(0px) translateX(0px);
    opacity: 0.8;
  }
  50% {
    transform: translateY(-100px) translateX(50px);
    opacity: 1;
  }
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes badgeGlow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}

@keyframes sparkleFloat {
  0%, 100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2) rotate(180deg);
    opacity: 1;
  }
}

@keyframes highlightPulse {
  0%, 100% {
    opacity: 0.8;
    transform: scaleX(1);
  }
  50% {
    opacity: 1;
    transform: scaleX(1.05);
  }
}

@keyframes robotGlow {
  0%, 100% {
    opacity: 0.2;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.1);
  }
}

/* Responsive Design */
@media (max-width: 1200px) {
  .hero-container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }

  .hero-visual {
    order: -1;
  }

  .robot-container {
    transform: scale(0.8);
  }
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0 20px;
  }

  .nav-menu {
    display: none;
  }

  .premium-hero {
    padding: 120px 0 60px;
  }

  .hero-container {
    padding: 0 20px;
    gap: 40px;
  }

  .premium-title {
    font-size: 2.5rem !important;
  }

  .cta-container {
    flex-direction: column;
    align-items: center;
  }

  .premium-cta-primary,
  .premium-cta-secondary {
    width: 100%;
    max-width: 300px;
  }

  .trust-indicators {
    justify-content: center;
    gap: 16px;
  }

  .stats-container {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 24px;
  }

  .robot-container {
    transform: scale(0.6);
  }
}

@media (max-width: 480px) {
  .premium-badge {
    padding: 12px 20px;
    font-size: 12px;
  }

  .badge-text {
    font-size: 12px;
  }

  .premium-title {
    font-size: 2rem !important;
  }

  .trust-indicators {
    flex-direction: column;
    align-items: center;
  }
}

/* Performance Optimizations */
.premium-landing * {
  will-change: transform;
}

.gradient-orb,
.particle,
.robot-glow {
  will-change: transform, opacity;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--dark-900);
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, var(--primary-600), var(--accent-purple));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, var(--primary-500), var(--accent-purple));
}
</style>


