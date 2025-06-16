<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div
      v-motion-slide-visible-once-bottom
      class="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 border border-border"
    >
      <h2 class="text-2xl font-bold text-foreground mb-2">
        Bienvenue sur KinkyPolice Dashboard
      </h2>
      <p class="text-muted-foreground">
        Gérez votre bot Discord et surveillez les statistiques en temps réel.
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        v-for="stat in stats"
        :key="stat.title"
        :title="stat.title"
        :value="stat.value"
        :icon="stat.icon"
        :trend="stat.trend"
        :color="stat.color"
      />
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Activity Chart -->
      <div
        v-motion-slide-visible-once-left
        class="bg-card rounded-lg border border-border p-6"
      >
        <h3 class="text-lg font-semibold text-foreground mb-4">
          Activité du serveur
        </h3>
        <div class="h-64 flex items-center justify-center text-muted-foreground">
          <div class="text-center">
            <div class="animate-pulse bg-muted rounded h-48 w-full mb-4"></div>
            <p>Graphique d'activité (à implémenter)</p>
          </div>
        </div>
      </div>

      <!-- Commands Usage -->
      <div
        v-motion-slide-visible-once-right
        class="bg-card rounded-lg border border-border p-6"
      >
        <h3 class="text-lg font-semibold text-foreground mb-4">
          Commandes populaires
        </h3>
        <div class="space-y-3">
          <div
            v-for="command in popularCommands"
            :key="command.name"
            class="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div>
              <span class="font-medium text-foreground">{{ command.name }}</span>
              <p class="text-sm text-muted-foreground">{{ command.description }}</p>
            </div>
            <span class="text-sm font-medium text-primary">{{ command.usage }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div
      v-motion-slide-visible-once-bottom
      class="bg-card rounded-lg border border-border p-6"
    >
      <h3 class="text-lg font-semibold text-foreground mb-4">Actions rapides</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          v-for="action in quickActions"
          :key="action.name"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
          @click="handleQuickAction(action.id)"
        >
          <span class="text-2xl">{{ getActionIcon(action.id) }}</span>
          <span class="text-sm font-medium">{{ action.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import StatsCard from '@/components/common/StatsCard.vue'

// Mock data
const stats = reactive([
  {
    title: 'Utilisateurs actifs',
    value: '1,234',
    trend: '+12%',
    color: 'text-green-600',
    icon: 'UsersIcon'
  },
  {
    title: 'Commandes exécutées',
    value: '5,678',
    trend: '+8%',
    color: 'text-blue-600',
    icon: 'CommandIcon'
  },
  {
    title: 'Messages traités',
    value: '23,456',
    trend: '+15%',
    color: 'text-purple-600',
    icon: 'MessageIcon'
  },
  {
    title: 'Temps de réponse',
    value: '45ms',
    trend: '-3%',
    color: 'text-orange-600',
    icon: 'ClockIcon'
  }
])

const popularCommands = reactive([
  {
    name: '/config',
    description: 'Configuration du bot',
    usage: '156 fois'
  },
  {
    name: '/modmail',
    description: 'Système de modmail',
    usage: '89 fois'
  },
  {
    name: '/warn',
    description: 'Avertissement utilisateur',
    usage: '67 fois'
  },
  {
    name: '/kinky',
    description: 'Commandes NSFW',
    usage: '234 fois'
  }
])

const quickActions = reactive([
  {
    id: 'restart',
    name: 'Redémarrer le bot'
  },
  {
    id: 'backup',
    name: 'Sauvegarde'
  },
  {
    id: 'logs',
    name: 'Voir les logs'
  },
  {
    id: 'config',
    name: 'Configuration'
  }
])

const getActionIcon = (actionId: string) => {
  const icons: Record<string, string> = {
    'restart': '🔄',
    'backup': '💾',
    'logs': '📋',
    'config': '⚙️'
  }
  return icons[actionId] || '📄'
}

const handleQuickAction = (actionId: string) => {
  console.log(`Quick action: ${actionId}`)
  // TODO: Implement quick actions
}
</script>