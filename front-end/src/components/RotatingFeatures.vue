<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  features?: string[]
  interval?: number
  animationType?: 'fade' | 'slide' | 'typewriter'
}

const props = defineProps<Props>()

const defaultFeatures = [
  'Modération NSFW Avancée',
  'Jeux Interactifs Kinky', 
  'Espaces Privés Sécurisés',
  'Système de Rencontres',
  'Analytics Communauté',
  'Configuration Intuitive'
]

const features = props.features || defaultFeatures
const interval = props.interval || 3000
const animationType = props.animationType || 'typewriter'

const currentFeatureIndex = ref(0)
const displayText = ref('')
const isAnimating = ref(false)
const intervalId = ref<number>()

// Typewriter effect
const typewriterSpeed = 80
const eraseSpeed = 40

const typeText = async (text: string) => {
  displayText.value = ''
  for (let i = 0; i <= text.length; i++) {
    displayText.value = text.slice(0, i)
    await new Promise(resolve => setTimeout(resolve, typewriterSpeed))
  }
}

const eraseText = async () => {
  const currentText = displayText.value
  for (let i = currentText.length; i >= 0; i--) {
    displayText.value = currentText.slice(0, i)
    await new Promise(resolve => setTimeout(resolve, eraseSpeed))
  }
}

const animateFeature = async () => {
  if (isAnimating.value) return
  
  isAnimating.value = true
  
  if (animationType === 'typewriter') {
    // Erase current text
    if (displayText.value) {
      await eraseText()
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Type new text
    await typeText(features[currentFeatureIndex.value])
    
    // Wait before next animation
    await new Promise(resolve => setTimeout(resolve, 1500))
  } else if (animationType === 'fade') {
    // Fade out
    displayText.value = ''
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Fade in new text
    displayText.value = features[currentFeatureIndex.value]
    await new Promise(resolve => setTimeout(resolve, 2000))
  } else if (animationType === 'slide') {
    // Slide animation handled by CSS
    displayText.value = features[currentFeatureIndex.value]
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  isAnimating.value = false
}

const nextFeature = () => {
  currentFeatureIndex.value = (currentFeatureIndex.value + 1) % features.length
  animateFeature()
}

onMounted(() => {
  // Start with first feature
  displayText.value = features[0]
  
  // Start animation after initial delay
  setTimeout(() => {
    intervalId.value = setInterval(nextFeature, interval)
  }, 2000)
})

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})
</script>

<template>
  <div class="rotating-features">
    <div class="feature-container" :class="`animation-${animationType}`">
      <div class="feature-prefix">
        <span class="prefix-text">Spécialisé en</span>
        <div class="prefix-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
      
      <div class="feature-text-container">
        <span 
          class="feature-text"
          :class="{ 
            'typewriter': animationType === 'typewriter',
            'fade-animation': animationType === 'fade',
            'slide-animation': animationType === 'slide'
          }"
        >
          {{ displayText }}
        </span>
        <span v-if="animationType === 'typewriter'" class="cursor">|</span>
      </div>
      
      <!-- Feature indicators -->
      <div class="feature-indicators">
        <div 
          v-for="(feature, index) in features" 
          :key="index"
          class="indicator"
          :class="{ active: index === currentFeatureIndex }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rotating-features {
  position: relative;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-container {
  text-align: center;
  max-width: 400px;
}

.feature-prefix {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.prefix-text {
  font-size: 0.9rem;
  color: var(--dark-400);
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.prefix-dots {
  display: flex;
  gap: 4px;
}

.dot {
  width: 4px;
  height: 4px;
  background: var(--primary-400);
  border-radius: 50%;
  animation: dotPulse 1.5s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

.feature-text-container {
  position: relative;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.feature-text {
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-400), var(--accent-purple), var(--accent-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  line-height: 1.3;
  letter-spacing: 0.5px;
  text-shadow: 0 4px 20px rgba(121, 22, 255, 0.3);
  transition: all 0.3s ease;
}

.cursor {
  color: var(--primary-400);
  font-weight: 300;
  animation: cursorBlink 1s infinite;
  margin-left: 2px;
}

.feature-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(121, 22, 255, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;
}

.indicator.active {
  background: var(--primary-400);
  box-shadow: 0 0 12px rgba(121, 22, 255, 0.6);
  transform: scale(1.2);
}

.indicator:hover {
  background: var(--primary-500);
  transform: scale(1.1);
}

/* Animation Types */
.fade-animation {
  animation: fadeInOut 0.6s ease-in-out;
}

.slide-animation {
  animation: slideInUp 0.6s ease-out;
}

/* Keyframes */
@keyframes dotPulse {
  0%, 100% { 
    opacity: 0.4;
    transform: scale(1);
  }
  50% { 
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes cursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes fadeInOut {
  0% { 
    opacity: 0;
    transform: translateY(10px);
  }
  100% { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInUp {
  0% { 
    opacity: 0;
    transform: translateY(30px);
  }
  100% { 
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .feature-container {
    max-width: 300px;
  }
  
  .feature-text {
    font-size: 1.2rem;
  }
  
  .prefix-text {
    font-size: 0.8rem;
  }
}

/* Hover effects */
.feature-text:hover {
  transform: scale(1.02);
  text-shadow: 0 6px 30px rgba(121, 22, 255, 0.5);
}

/* Glass morphism background */
.feature-container::before {
  content: '';
  position: absolute;
  inset: -20px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.feature-container:hover::before {
  opacity: 1;
}
</style>
