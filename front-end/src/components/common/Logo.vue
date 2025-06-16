<template>
  <div 
    class="logo" 
    :class="{ 'logo-large': large }"
    :title="title"
  >
    <!-- Custom KinkyPolice logo design -->
    <svg 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      :width="large ? 40 : 30"
      :height="large ? 40 : 30"
    >
      <!-- Badge/Shield shape -->
      <path 
        d="M20 2L32 8V18C32 26 26 32 20 38C14 32 8 26 8 18V8L20 2Z" 
        fill="currentColor" 
        fill-opacity="0.9"
      />
      <!-- Inner design -->
      <circle cx="20" cy="16" r="6" fill="rgba(255,255,255,0.3)" />
      <path 
        d="M16 16L18 18L24 12" 
        stroke="white" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      />
      <!-- Bottom accent -->
      <circle cx="20" cy="28" r="3" fill="rgba(255,255,255,0.4)" />
    </svg>
  </div>
</template>

<script setup lang="ts">
interface Props {
  large?: boolean
  title?: string
}

withDefaults(defineProps<Props>(), {
  large: false,
  title: 'KinkyPolice Bot'
})
</script>

<style scoped>
.logo {
  position: relative;
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%);
  box-shadow: 
    0 10px 25px rgba(139, 92, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.logo::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
  border-radius: inherit;
  pointer-events: none;
}

.logo:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 
    0 15px 35px rgba(139, 92, 246, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.logo svg {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}
</style>