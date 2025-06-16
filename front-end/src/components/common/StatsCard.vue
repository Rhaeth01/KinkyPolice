<template>
  <div
    v-motion-slide-visible-once-bottom
    class="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow duration-200"
  >
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-muted-foreground">{{ title }}</p>
        <p class="text-2xl font-bold text-foreground">{{ value }}</p>
      </div>
      <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span class="text-lg">{{ iconComponent }}</span>
      </div>
    </div>
    
    <div v-if="trend" class="mt-4 flex items-center">
      <span class="mr-1" :class="trendColor">
        {{ trend.startsWith('+') ? '↗️' : '↘️' }}
      </span>
      <span class="text-xs font-medium" :class="trendColor">
        {{ trend }} depuis le mois dernier
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  value: string | number
  trend?: string
  color?: string
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'text-primary'
})

// Simple icon mapping
const iconComponent = computed(() => {
  const iconMap: Record<string, string> = {
    'UsersIcon': '👥',
    'CommandIcon': '⚡',
    'MessageIcon': '💬',
    'ClockIcon': '⏱️'
  }
  return iconMap[props.icon || ''] || '📊'
})


const trendColor = computed(() => {
  if (!props.trend) return ''
  return props.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
})
</script>