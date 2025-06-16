<script setup lang="ts">
interface Props {
  size?: number
  animated?: boolean
}

const props = defineProps<Props>()
const size = props.size || 120
const animated = props.animated !== false
</script>

<template>
  <div class="kinky-logo" :style="{ width: `${size}px`, height: `${size * 0.33}px` }">
    <svg
      :width="size"
      :height="size * 0.33"
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      :class="{ 'logo-animated': animated }"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7916ff;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Badge/Shield Background -->
      <path 
        d="M8 12C8 8.686 10.686 6 14 6H26C29.314 6 32 8.686 32 12V20C32 26.627 26.627 32 20 32C13.373 32 8 26.627 8 20V12Z" 
        fill="url(#logoGradient)" 
        filter="url(#glow)"
        class="shield-bg"
      />
      
      <!-- Police Badge Star -->
      <path 
        d="M20 10L21.545 14.635H26.472L22.464 17.73L24.009 22.365L20 19.27L15.991 22.365L17.536 17.73L13.528 14.635H18.455L20 10Z" 
        fill="white" 
        opacity="0.95"
        filter="url(#textGlow)"
        class="star"
      />
      
      <!-- Text: Kinky -->
      <text 
        x="38" 
        y="16" 
        font-family="Inter, sans-serif" 
        font-weight="800" 
        font-size="12" 
        fill="url(#logoGradient)"
        filter="url(#textGlow)"
        class="text-kinky"
      >
        Kinky
      </text>
      
      <!-- Text: Police -->
      <text 
        x="38" 
        y="28" 
        font-family="Inter, sans-serif" 
        font-weight="600" 
        font-size="10" 
        fill="#cbd5e1"
        filter="url(#textGlow)"
        class="text-police"
      >
        Police
      </text>
      
      <!-- Decorative elements -->
      <circle 
        cx="110" 
        cy="12" 
        r="2" 
        fill="#7916ff" 
        opacity="0.8"
        class="particle-1"
      />
      <circle 
        cx="115" 
        cy="18" 
        r="1.5" 
        fill="#8b5cf6" 
        opacity="0.6"
        class="particle-2"
      />
      <circle 
        cx="105" 
        cy="25" 
        r="1" 
        fill="#ec4899" 
        opacity="0.7"
        class="particle-3"
      />
    </svg>
  </div>
</template>

<style scoped>
.kinky-logo {
  display: inline-block;
  filter: drop-shadow(0 4px 20px rgba(121, 22, 255, 0.4));
  transition: all 0.3s ease;
}

.kinky-logo:hover {
  filter: drop-shadow(0 8px 30px rgba(121, 22, 255, 0.6));
  transform: scale(1.05);
}

.logo-animated .shield-bg {
  animation: pulseGlow 3s ease-in-out infinite;
}

.logo-animated .star {
  animation: starRotate 4s linear infinite;
  transform-origin: 20px 16px;
}

.logo-animated .text-kinky {
  animation: textShimmer 2s ease-in-out infinite;
}

.logo-animated .particle-1 {
  animation: particleFloat1 3s ease-in-out infinite;
}

.logo-animated .particle-2 {
  animation: particleFloat2 4s ease-in-out infinite 0.5s;
}

.logo-animated .particle-3 {
  animation: particleFloat3 3.5s ease-in-out infinite 1s;
}

@keyframes pulseGlow {
  0%, 100% { 
    filter: url(#glow);
    opacity: 1;
  }
  50% { 
    filter: url(#glow);
    opacity: 0.8;
  }
}

@keyframes starRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes textShimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes particleFloat1 {
  0%, 100% { 
    transform: translateY(0px);
    opacity: 0.8;
  }
  50% { 
    transform: translateY(-8px);
    opacity: 1;
  }
}

@keyframes particleFloat2 {
  0%, 100% { 
    transform: translateY(0px) translateX(0px);
    opacity: 0.6;
  }
  50% { 
    transform: translateY(-6px) translateX(3px);
    opacity: 1;
  }
}

@keyframes particleFloat3 {
  0%, 100% { 
    transform: translateY(0px) translateX(0px);
    opacity: 0.7;
  }
  50% { 
    transform: translateY(-4px) translateX(-2px);
    opacity: 1;
  }
}
</style>
