<template>
  <div class="space-y-6">
    <!-- Header -->
    <div v-motion-slide-visible-once-top>
      <h2 class="text-2xl font-bold text-foreground">Modération</h2>
      <p class="text-muted-foreground mt-1">
        Gérez les actions de modération et surveillez les logs
      </p>
    </div>

    <!-- Quick Actions -->
    <div v-motion-slide-visible-once-left class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        v-for="action in quickModerationActions"
        :key="action.id"
        @click="handleModerationAction(action.id)"
        class="p-4 bg-card border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-center"
      >
        <div class="text-2xl mb-2">{{ action.icon }}</div>
        <div class="font-medium">{{ action.name }}</div>
        <div class="text-sm text-muted-foreground">{{ action.count }}</div>
      </button>
    </div>

    <!-- Recent Actions -->
    <div v-motion-slide-visible-once-bottom class="bg-card rounded-lg border border-border">
      <div class="p-6 border-b border-border">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-foreground">Actions récentes</h3>
          <div class="flex gap-2">
            <select
              v-model="filterType"
              class="px-3 py-1 border border-border rounded text-sm bg-background"
            >
              <option value="all">Toutes les actions</option>
              <option value="ban">Bannissements</option>
              <option value="kick">Expulsions</option>
              <option value="warn">Avertissements</option>
              <option value="mute">Mutes</option>
            </select>
            <button
              @click="refreshLogs"
              class="px-3 py-1 border border-border rounded text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Action
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Utilisateur
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Modérateur
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Raison
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getActionColor(log.action)"
                >
                  {{ log.action }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <span class="text-xs font-medium text-primary">
                      {{ log.user.username.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-foreground">{{ log.user.username }}</div>
                    <div class="text-sm text-muted-foreground">{{ log.user.id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-foreground">{{ log.moderator.username }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-foreground max-w-xs truncate">{{ log.reason }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ formatDate(log.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredLogs.length === 0" class="p-8 text-center text-muted-foreground">
        Aucune action de modération trouvée
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

const filterType = ref('all')

// Mock data
const quickModerationActions = reactive([
  {
    id: 'warnings',
    name: 'Avertissements',
    icon: '⚠️',
    count: '12 actifs'
  },
  {
    id: 'bans',
    name: 'Bannissements',
    icon: '🔨',
    count: '3 ce mois'
  },
  {
    id: 'mutes',
    name: 'Mutes actifs',
    icon: '🔇',
    count: '5 utilisateurs'
  },
  {
    id: 'reports',
    name: 'Signalements',
    icon: '📢',
    count: '8 en attente'
  }
])

const moderationLogs = reactive([
  {
    id: 1,
    action: 'BAN',
    user: { username: 'BadUser123', id: '123456789' },
    moderator: { username: 'ModeratorBot' },
    reason: 'Comportement inapproprié répété',
    createdAt: new Date('2024-01-15T10:30:00Z')
  },
  {
    id: 2,
    action: 'WARN',
    user: { username: 'NewUser456', id: '987654321' },
    moderator: { username: 'AdminUser' },
    reason: 'Spam dans le chat général',
    createdAt: new Date('2024-01-15T09:15:00Z')
  },
  {
    id: 3,
    action: 'KICK',
    user: { username: 'TrollUser789', id: '456789123' },
    moderator: { username: 'ModeratorBot' },
    reason: 'Contenu NSFW dans un canal inapproprié',
    createdAt: new Date('2024-01-14T16:45:00Z')
  },
  {
    id: 4,
    action: 'MUTE',
    user: { username: 'ChattyUser', id: '789123456' },
    moderator: { username: 'StaffMember' },
    reason: 'Flood de messages',
    createdAt: new Date('2024-01-14T14:20:00Z')
  }
])

const filteredLogs = computed(() => {
  if (filterType.value === 'all') {
    return moderationLogs
  }
  return moderationLogs.filter(log => 
    log.action.toLowerCase() === filterType.value.toLowerCase()
  )
})

const getActionColor = (action: string) => {
  const colors = {
    'BAN': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'KICK': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'WARN': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'MUTE': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
  }
  return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const handleModerationAction = (actionId: string) => {
  console.log(`Moderation action: ${actionId}`)
  // TODO: Implement moderation actions
}

const refreshLogs = () => {
  console.log('Refreshing logs...')
  // TODO: Implement log refresh
}
</script>