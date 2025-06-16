<template>
  <div class="space-y-6">
    <!-- Header -->
    <div v-motion-slide-visible-once-top>
      <h2 class="text-2xl font-bold text-foreground">Analytics</h2>
      <p class="text-muted-foreground mt-1">
        Statistiques détaillées et analytics de votre serveur Discord
      </p>
    </div>

    <!-- Time Range Selector -->
    <div v-motion-slide-visible-once-left class="flex items-center gap-4">
      <span class="text-sm font-medium text-foreground">Période :</span>
      <div class="flex gap-2">
        <button
          v-for="range in timeRanges"
          :key="range.value"
          @click="selectedTimeRange = range.value"
          class="px-3 py-1 text-sm rounded-lg border transition-colors"
          :class="selectedTimeRange === range.value 
            ? 'bg-primary text-primary-foreground border-primary' 
            : 'border-border hover:bg-accent hover:text-accent-foreground'"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <!-- Key Metrics -->
    <div v-motion-slide-visible-once-right class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="metric in keyMetrics"
        :key="metric.name"
        class="bg-card rounded-lg border border-border p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">{{ metric.name }}</p>
            <p class="text-2xl font-bold text-foreground mt-1">{{ metric.value }}</p>
          </div>
          <div class="text-2xl">{{ metric.icon }}</div>
        </div>
        <div class="mt-4 flex items-center">
          <span
            class="text-sm font-medium"
            :class="metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'"
          >
            {{ metric.change }}
          </span>
          <span class="text-sm text-muted-foreground ml-1">vs période précédente</span>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Activity Chart -->
      <div v-motion-slide-visible-once-bottom class="bg-card rounded-lg border border-border p-6">
        <h3 class="text-lg font-semibold text-foreground mb-4">Activité quotidienne</h3>
        <div class="h-64 flex items-center justify-center text-muted-foreground">
          <div class="text-center">
            <div class="animate-pulse bg-muted rounded h-48 w-full mb-4"></div>
            <p>Graphique d'activité (Chart.js à implémenter)</p>
          </div>
        </div>
      </div>

      <!-- Commands Usage -->
      <div v-motion-slide-visible-once-bottom class="bg-card rounded-lg border border-border p-6">
        <h3 class="text-lg font-semibold text-foreground mb-4">Top commandes</h3>
        <div class="space-y-4">
          <div
            v-for="command in topCommands"
            :key="command.name"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span class="text-xs font-medium text-primary">{{ command.name.charAt(1) }}</span>
              </div>
              <div>
                <p class="font-medium text-foreground">{{ command.name }}</p>
                <p class="text-sm text-muted-foreground">{{ command.category }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-medium text-foreground">{{ command.uses }}</p>
              <div class="w-16 h-2 bg-muted rounded-full mt-1">
                <div
                  class="h-full bg-primary rounded-full"
                  :style="{ width: `${command.percentage}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Tables -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- User Activity -->
      <div v-motion-slide-visible-once-left class="bg-card rounded-lg border border-border">
        <div class="p-6 border-b border-border">
          <h3 class="text-lg font-semibold text-foreground">Utilisateurs les plus actifs</h3>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div
              v-for="(user, index) in topUsers"
              :key="user.id"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {{ index + 1 }}
                </div>
                <div class="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <span class="text-sm font-medium">{{ user.username.charAt(0) }}</span>
                </div>
                <div>
                  <p class="font-medium text-foreground">{{ user.username }}</p>
                  <p class="text-sm text-muted-foreground">{{ user.messages }} messages</p>
                </div>
              </div>
              <div class="text-sm text-muted-foreground">
                {{ user.lastActive }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Channel Activity -->
      <div v-motion-slide-visible-once-right class="bg-card rounded-lg border border-border">
        <div class="p-6 border-b border-border">
          <h3 class="text-lg font-semibold text-foreground">Canaux les plus actifs</h3>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div
              v-for="channel in topChannels"
              :key="channel.id"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="text-xl">{{ channel.icon }}</div>
                <div>
                  <p class="font-medium text-foreground">{{ channel.name }}</p>
                  <p class="text-sm text-muted-foreground">{{ channel.category }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-medium text-foreground">{{ channel.messages }}</p>
                <p class="text-sm text-muted-foreground">{{ channel.users }} utilisateurs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const selectedTimeRange = ref('7d')

const timeRanges = [
  { value: '1d', label: '24h' },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' }
]

const keyMetrics = reactive([
  {
    name: 'Messages totaux',
    value: '45,678',
    change: '+12.5%',
    icon: '💬'
  },
  {
    name: 'Utilisateurs actifs',
    value: '1,234',
    change: '+8.2%',
    icon: '👥'
  },
  {
    name: 'Commandes exécutées',
    value: '8,901',
    change: '+15.7%',
    icon: '⚡'
  }
])

const topCommands = reactive([
  {
    name: '/config',
    category: 'Configuration',
    uses: 234,
    percentage: 100
  },
  {
    name: '/kinky',
    category: 'NSFW',
    uses: 189,
    percentage: 80
  },
  {
    name: '/warn',
    category: 'Modération',
    uses: 156,
    percentage: 66
  },
  {
    name: '/balance',
    category: 'Économie',
    uses: 123,
    percentage: 52
  },
  {
    name: '/help',
    category: 'Aide',
    uses: 98,
    percentage: 42
  }
])

const topUsers = reactive([
  {
    id: 1,
    username: 'ActiveUser1',
    messages: 1234,
    lastActive: 'Il y a 2h'
  },
  {
    id: 2,
    username: 'ChattyMember',
    messages: 987,
    lastActive: 'Il y a 30min'
  },
  {
    id: 3,
    username: 'RegularUser',
    messages: 756,
    lastActive: 'Il y a 1h'
  },
  {
    id: 4,
    username: 'FrequentVisitor',
    messages: 634,
    lastActive: 'Il y a 45min'
  },
  {
    id: 5,
    username: 'CommunityMember',
    messages: 521,
    lastActive: 'Il y a 3h'
  }
])

const topChannels = reactive([
  {
    id: 1,
    name: '#général',
    category: 'Général',
    messages: 5678,
    users: 234,
    icon: '💬'
  },
  {
    id: 2,
    name: '#nsfw-général',
    category: 'NSFW',
    messages: 3456,
    users: 156,
    icon: '🔞'
  },
  {
    id: 3,
    name: '#jeux',
    category: 'Divertissement',
    messages: 2345,
    users: 189,
    icon: '🎮'
  },
  {
    id: 4,
    name: '#confession',
    category: 'NSFW',
    messages: 1987,
    users: 98,
    icon: '💭'
  },
  {
    id: 5,
    name: '#modération',
    category: 'Staff',
    messages: 1234,
    users: 23,
    icon: '🛡️'
  }
])
</script>