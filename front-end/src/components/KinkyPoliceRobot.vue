<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  size?: number
  animated?: boolean
}

const props = defineProps<Props>()
const size = props.size || 400
const animated = props.animated !== false

const robotRef = ref<HTMLDivElement>()

onMounted(() => {
  if (animated && robotRef.value) {
    // Add floating animation
    robotRef.value.style.animation = 'robotFloat 6s ease-in-out infinite'
  }
})
</script>

<template>
  <div 
    ref="robotRef"
    class="kinky-robot" 
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg 
      :width="size" 
      :height="size" 
      viewBox="0 0 400 400" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      class="robot-svg"
    >
      <defs>
        <!-- Gradients -->
        <linearGradient id="robotBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1a0a0a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
        </linearGradient>

        <linearGradient id="hornGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff0000;stop-opacity:1" />
          <stop offset="30%" style="stop-color:#cc0000;stop-opacity:1" />
          <stop offset="70%" style="stop-color:#990000;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#660000;stop-opacity:1" />
        </linearGradient>

        <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff0000;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ff3333;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#cc0000;stop-opacity:1" />
        </linearGradient>

        <linearGradient id="demonicGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff0000;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#990000;stop-opacity:0.3" />
        </linearGradient>
        
        <radialGradient id="glowEffect" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#7916ff;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#7916ff;stop-opacity:0" />
        </radialGradient>
        
        <!-- Filters -->
        <filter id="robotGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <filter id="hornGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Robot Body Shadow -->
      <ellipse cx="200" cy="380" rx="80" ry="15" fill="rgba(0,0,0,0.3)" class="robot-shadow"/>
      
      <!-- Robot Body -->
      <rect x="120" y="180" width="160" height="180" rx="20" fill="url(#robotBodyGradient)" 
            stroke="rgba(121, 22, 255, 0.3)" stroke-width="2" filter="url(#robotGlow)" class="robot-body"/>
      
      <!-- Robot Head -->
      <rect x="140" y="80" width="120" height="120" rx="15" fill="url(#robotBodyGradient)" 
            stroke="rgba(121, 22, 255, 0.3)" stroke-width="2" filter="url(#robotGlow)" class="robot-head"/>
      
      <!-- Demonic Horns - More Menacing -->
      <path d="M155 80 L140 25 L165 35 L175 45 Z" fill="url(#hornGradient)" filter="url(#hornGlow)" class="horn-left">
        <animateTransform attributeName="transform" type="rotate"
                         values="0 160 80;8 160 80;0 160 80" dur="3s" repeatCount="indefinite"/>
      </path>
      <path d="M245 80 L260 25 L235 35 L225 45 Z" fill="url(#hornGradient)" filter="url(#hornGlow)" class="horn-right">
        <animateTransform attributeName="transform" type="rotate"
                         values="0 240 80;-8 240 80;0 240 80" dur="3s" repeatCount="indefinite"/>
      </path>

      <!-- Additional Smaller Horns -->
      <path d="M170 85 L165 65 L175 70 Z" fill="url(#hornGradient)" opacity="0.8" class="small-horn-left">
        <animateTransform attributeName="transform" type="rotate"
                         values="0 170 85;3 170 85;0 170 85" dur="4s" repeatCount="indefinite"/>
      </path>
      <path d="M230 85 L235 65 L225 70 Z" fill="url(#hornGradient)" opacity="0.8" class="small-horn-right">
        <animateTransform attributeName="transform" type="rotate"
                         values="0 230 85;-3 230 85;0 230 85" dur="4s" repeatCount="indefinite"/>
      </path>
      
      <!-- Demonic Eyes - Glowing Red -->
      <ellipse cx="170" cy="130" rx="18" ry="12" fill="url(#eyeGradient)" class="eye-left">
        <animate attributeName="rx" values="18;22;18" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.8;1" dur="1.5s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="230" cy="130" rx="18" ry="12" fill="url(#eyeGradient)" class="eye-right">
        <animate attributeName="rx" values="18;22;18" dur="2s" repeatCount="indefinite" begin="0.3s"/>
        <animate attributeName="opacity" values="1;0.8;1" dur="1.5s" repeatCount="indefinite" begin="0.3s"/>
      </ellipse>

      <!-- Glowing Eye Centers -->
      <ellipse cx="170" cy="130" rx="10" ry="6" fill="#ff6666" class="pupil-left">
        <animate attributeName="fill" values="#ff6666;#ff0000;#ff6666" dur="2s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="230" cy="130" rx="10" ry="6" fill="#ff6666" class="pupil-right">
        <animate attributeName="fill" values="#ff6666;#ff0000;#ff6666" dur="2s" repeatCount="indefinite" begin="0.3s"/>
      </ellipse>

      <!-- Eye Glow Effect -->
      <circle cx="170" cy="130" r="25" fill="url(#demonicGlow)" opacity="0.3" class="eye-glow-left">
        <animate attributeName="r" values="25;30;25" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="230" cy="130" r="25" fill="url(#demonicGlow)" opacity="0.3" class="eye-glow-right">
        <animate attributeName="r" values="25;30;25" dur="3s" repeatCount="indefinite" begin="0.5s"/>
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" begin="0.5s"/>
      </circle>
      
      <!-- Mouth/Speaker Grille -->
      <rect x="180" y="155" width="40" height="20" rx="10" fill="rgba(121, 22, 255, 0.3)" 
            stroke="rgba(121, 22, 255, 0.6)" stroke-width="1"/>
      <line x1="185" y1="160" x2="185" y2="170" stroke="rgba(121, 22, 255, 0.8)" stroke-width="1"/>
      <line x1="190" y1="160" x2="190" y2="170" stroke="rgba(121, 22, 255, 0.8)" stroke-width="1"/>
      <line x1="195" y1="160" x2="195" y2="170" stroke="rgba(121, 22, 255, 0.8)" stroke-width="1"/>
      <line x1="200" y1="160" x2="200" y2="170" stroke="rgba(121, 22, 255, 0.8)" stroke-width="1"/>
      <line x1="205" y1="160" x2="205" y2="170" stroke="rgba(121, 22, 255, 0.8)" stroke-width="1"/>
      <line x1="210" y1="160" x2="210" y2="170" stroke="rgba(121, 22, 255, 0.8)" stroke-width="1"/>
      <line x1="215" y1="160" x2="215" y2="170" stroke="rgba(121, 22, 255, 0.8)" stroke-width="1"/>
      
      <!-- Chest Panel -->
      <rect x="160" y="220" width="80" height="60" rx="8" fill="rgba(121, 22, 255, 0.1)" 
            stroke="rgba(121, 22, 255, 0.4)" stroke-width="1" class="chest-panel"/>
      
      <!-- Chest Display -->
      <rect x="170" y="230" width="60" height="40" rx="4" fill="rgba(0, 0, 0, 0.8)" 
            stroke="rgba(121, 22, 255, 0.6)" stroke-width="1"/>
      
      <!-- Display Text -->
      <text x="200" y="245" text-anchor="middle" fill="url(#hornGradient)" font-family="monospace" font-size="8" class="display-text">
        KINKY
      </text>
      <text x="200" y="260" text-anchor="middle" fill="url(#hornGradient)" font-family="monospace" font-size="8" class="display-text">
        POLICE
      </text>
      
      <!-- Arms -->
      <rect x="80" y="200" width="40" height="80" rx="20" fill="url(#robotBodyGradient)" 
            stroke="rgba(121, 22, 255, 0.3)" stroke-width="2" class="arm-left">
        <animateTransform attributeName="transform" type="rotate" 
                         values="0 100 200;10 100 200;0 100 200" dur="5s" repeatCount="indefinite"/>
      </rect>
      <rect x="280" y="200" width="40" height="80" rx="20" fill="url(#robotBodyGradient)" 
            stroke="rgba(121, 22, 255, 0.3)" stroke-width="2" class="arm-right">
        <animateTransform attributeName="transform" type="rotate" 
                         values="0 300 200;-10 300 200;0 300 200" dur="5s" repeatCount="indefinite" begin="1s"/>
      </rect>
      
      <!-- Hands -->
      <circle cx="100" cy="290" r="15" fill="url(#robotBodyGradient)" 
              stroke="rgba(121, 22, 255, 0.3)" stroke-width="2" class="hand-left"/>
      <circle cx="300" cy="290" r="15" fill="url(#robotBodyGradient)" 
              stroke="rgba(121, 22, 255, 0.3)" stroke-width="2" class="hand-right"/>
      
      <!-- Legs -->
      <rect x="150" y="360" width="30" height="40" rx="15" fill="url(#robotBodyGradient)" 
            stroke="rgba(121, 22, 255, 0.3)" stroke-width="2" class="leg-left"/>
      <rect x="220" y="360" width="30" height="40" rx="15" fill="url(#robotBodyGradient)" 
            stroke="rgba(121, 22, 255, 0.3)" stroke-width="2" class="leg-right"/>
      
      <!-- Energy Particles -->
      <g class="energy-particles">
        <circle cx="120" cy="150" r="2" fill="#7916ff" opacity="0.8">
          <animate attributeName="cy" values="150;100;150" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="280" cy="160" r="1.5" fill="#ec4899" opacity="0.6">
          <animate attributeName="cy" values="160;110;160" dur="4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0;0.6" dur="4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="340" cy="140" r="1" fill="#8b5cf6" opacity="0.7">
          <animate attributeName="cy" values="140;90;140" dur="3.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0;0.7" dur="3.5s" repeatCount="indefinite"/>
        </circle>
      </g>
      
      <!-- Aura Effect -->
      <circle cx="200" cy="200" r="180" fill="url(#glowEffect)" opacity="0.3" class="robot-aura">
        <animate attributeName="r" values="180;200;180" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite"/>
      </circle>
    </svg>
  </div>
</template>

<style scoped>
.kinky-robot {
  display: inline-block;
  filter: drop-shadow(0 10px 40px rgba(121, 22, 255, 0.4));
  transition: all 0.3s ease;
}

.kinky-robot:hover {
  filter: drop-shadow(0 15px 60px rgba(121, 22, 255, 0.6));
  transform: scale(1.02);
}

.robot-svg {
  width: 100%;
  height: 100%;
}

.display-text {
  animation: textPulse 2s ease-in-out infinite;
}

@keyframes robotFloat {
  0%, 100% { 
    transform: translateY(0px) rotate(0deg); 
  }
  50% { 
    transform: translateY(-20px) rotate(2deg); 
  }
}

@keyframes textPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.robot-shadow {
  animation: shadowPulse 6s ease-in-out infinite;
}

@keyframes shadowPulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.3;
  }
  50% { 
    transform: scale(1.1);
    opacity: 0.1;
  }
}

.chest-panel {
  animation: panelGlow 3s ease-in-out infinite;
}

@keyframes panelGlow {
  0%, 100% { 
    stroke: rgba(121, 22, 255, 0.4);
    fill: rgba(121, 22, 255, 0.1);
  }
  50% { 
    stroke: rgba(121, 22, 255, 0.8);
    fill: rgba(121, 22, 255, 0.2);
  }
}
</style>
