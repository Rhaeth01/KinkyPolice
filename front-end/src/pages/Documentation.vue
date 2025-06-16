<template>
  <div class="space-y-6">
    <!-- Header -->
    <div v-motion-slide-visible-once-top>
      <h2 class="text-2xl font-bold text-foreground">Documentation</h2>
      <p class="text-muted-foreground mt-1">
        Guide complet et documentation des commandes KinkyPolice
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Sidebar Navigation -->
      <div v-motion-slide-visible-once-left class="lg:col-span-1">
        <div class="bg-card rounded-lg border border-border p-4 sticky top-24">
          <h3 class="font-semibold text-foreground mb-4">Sections</h3>
          <nav class="space-y-2">
            <button
              v-for="section in docSections"
              :key="section.id"
              @click="activeSection = section.id"
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              :class="activeSection === section.id 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
            >
              {{ section.name }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Main Content -->
      <div class="lg:col-span-3">
        <!-- Getting Started -->
        <div v-if="activeSection === 'getting-started'" v-motion-slide-visible-once-right class="space-y-6">
          <div class="bg-card rounded-lg border border-border p-6">
            <h3 class="text-xl font-semibold text-foreground mb-4">🚀 Commencer avec KinkyPolice</h3>
            
            <div class="prose prose-sm max-w-none dark:prose-invert">
              <p>Bienvenue dans la documentation de KinkyPolice ! Ce guide vous aidera à configurer et utiliser votre bot Discord.</p>
              
              <h4>Configuration initiale</h4>
              <ol>
                <li>Invitez le bot sur votre serveur avec les permissions appropriées</li>
                <li>Utilisez <code>/config</code> pour accéder au panneau de configuration</li>
                <li>Configurez les canaux de log et les rôles de modération</li>
                <li>Activez les modules souhaités (jeux, NSFW, économie)</li>
              </ol>

              <h4>Permissions requises</h4>
              <ul>
                <li>Gérer les messages</li>
                <li>Gérer les rôles</li>
                <li>Bannir des membres</li>
                <li>Expulser des membres</li>
                <li>Gérer les webhooks</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Commands -->
        <div v-if="activeSection === 'commands'" v-motion-slide-visible-once-right class="space-y-6">
          <div class="bg-card rounded-lg border border-border p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-semibold text-foreground">📋 Commandes disponibles</h3>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher une commande..."
                class="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64"
              />
            </div>

            <div class="space-y-4">
              <div
                v-for="category in filteredCommands"
                :key="category.name"
                class="border border-border rounded-lg overflow-hidden"
              >
                <div class="bg-muted/50 px-4 py-3 border-b border-border">
                  <h4 class="font-semibold text-foreground flex items-center gap-2">
                    <span class="text-lg">{{ category.icon }}</span>
                    {{ category.name }}
                  </h4>
                </div>
                <div class="divide-y divide-border">
                  <div
                    v-for="command in category.commands"
                    :key="command.name"
                    class="p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <code class="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">
                            {{ command.name }}
                          </code>
                          <span
                            v-if="command.permissions"
                            class="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded text-xs"
                          >
                            {{ command.permissions }}
                          </span>
                        </div>
                        <p class="text-muted-foreground mb-2">{{ command.description }}</p>
                        
                        <div v-if="command.examples" class="space-y-1">
                          <p class="text-sm font-medium text-foreground">Exemples :</p>
                          <div class="space-y-1">
                            <code
                              v-for="example in command.examples"
                              :key="example"
                              class="block bg-muted p-2 rounded text-sm font-mono"
                            >
                              {{ example }}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- API Reference -->
        <div v-if="activeSection === 'api'" v-motion-slide-visible-once-right class="space-y-6">
          <div class="bg-card rounded-lg border border-border p-6">
            <h3 class="text-xl font-semibold text-foreground mb-4">🔌 Référence API</h3>
            
            <div class="prose prose-sm max-w-none dark:prose-invert">
              <p>Documentation de l'API REST pour intégrer KinkyPolice avec d'autres services.</p>
              
              <h4>Authentification</h4>
              <p>Toutes les requêtes API nécessitent un token d'authentification dans l'en-tête :</p>
              <pre><code>Authorization: Bearer YOUR_API_TOKEN</code></pre>

              <h4>Endpoints disponibles</h4>
              
              <h5>GET /api/v1/stats</h5>
              <p>Récupère les statistiques générales du bot</p>
              <pre><code>{
  "users": 1234,
  "commands": 5678,
  "uptime": "7d 12h 34m"
}</code></pre>

              <h5>POST /api/v1/config</h5>
              <p>Met à jour la configuration du bot</p>
              <pre><code>{
  "prefix": "!",
  "logChannel": "123456789",
  "moderatorRole": "987654321"
}</code></pre>
            </div>
          </div>
        </div>

        <!-- FAQ -->
        <div v-if="activeSection === 'faq'" v-motion-slide-visible-once-right class="space-y-6">
          <div class="bg-card rounded-lg border border-border p-6">
            <h3 class="text-xl font-semibold text-foreground mb-6">❓ Questions fréquentes</h3>
            
            <div class="space-y-4">
              <div
                v-for="faq in faqs"
                :key="faq.id"
                class="border border-border rounded-lg overflow-hidden"
              >
                <button
                  @click="toggleFaq(faq.id)"
                  class="w-full px-4 py-3 text-left bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between"
                >
                  <span class="font-medium text-foreground">{{ faq.question }}</span>
                  <svg
                    class="h-5 w-5 text-muted-foreground transition-transform"
                    :class="{ 'rotate-180': openFaqs.includes(faq.id) }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  v-if="openFaqs.includes(faq.id)"
                  class="px-4 py-3 text-muted-foreground border-t border-border"
                >
                  {{ faq.answer }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const activeSection = ref('getting-started')
const searchQuery = ref('')
const openFaqs = ref<number[]>([])

const docSections = [
  { id: 'getting-started', name: 'Commencer' },
  { id: 'commands', name: 'Commandes' },
  { id: 'api', name: 'API' },
  { id: 'faq', name: 'FAQ' }
]

const commandCategories = reactive([
  {
    name: 'Modération',
    icon: '🛡️',
    commands: [
      {
        name: '/ban',
        description: 'Bannir un utilisateur du serveur',
        permissions: 'Bannir des membres',
        examples: ['/ban @utilisateur Raison du bannissement']
      },
      {
        name: '/kick',
        description: 'Expulser un utilisateur du serveur',
        permissions: 'Expulser des membres',
        examples: ['/kick @utilisateur Raison de l\'expulsion']
      },
      {
        name: '/warn',
        description: 'Donner un avertissement à un utilisateur',
        permissions: 'Gérer les messages',
        examples: ['/warn @utilisateur Comportement inapproprié']
      }
    ]
  },
  {
    name: 'Configuration',
    icon: '⚙️',
    commands: [
      {
        name: '/config',
        description: 'Accéder au panneau de configuration',
        permissions: 'Administrateur',
        examples: ['/config']
      },
      {
        name: '/webhook-config',
        description: 'Configurer les webhooks de log',
        permissions: 'Gérer les webhooks',
        examples: ['/webhook-config']
      }
    ]
  },
  {
    name: 'Jeux',
    icon: '🎮',
    commands: [
      {
        name: '/uno',
        description: 'Lancer une partie d\'UNO',
        examples: ['/uno', '/uno @joueur1 @joueur2']
      },
      {
        name: '/quiz-kinky',
        description: 'Quiz interactif sur les thèmes NSFW',
        examples: ['/quiz-kinky']
      },
      {
        name: '/morpion',
        description: 'Jouer au morpion avec un autre utilisateur',
        examples: ['/morpion @adversaire']
      }
    ]
  },
  {
    name: 'NSFW',
    icon: '🔞',
    commands: [
      {
        name: '/kinky',
        description: 'Commandes liées au contenu NSFW',
        examples: ['/kinky random', '/kinky categories']
      },
      {
        name: '/confession',
        description: 'Système de confessions anonymes',
        examples: ['/confession Votre confession...']
      }
    ]
  },
  {
    name: 'Économie',
    icon: '💰',
    commands: [
      {
        name: '/balance',
        description: 'Voir votre solde de points',
        examples: ['/balance', '/balance @utilisateur']
      },
      {
        name: '/shop',
        description: 'Accéder à la boutique',
        examples: ['/shop']
      },
      {
        name: '/leaderboard',
        description: 'Classement des utilisateurs les plus riches',
        examples: ['/leaderboard']
      }
    ]
  }
])

const faqs = reactive([
  {
    id: 1,
    question: 'Comment inviter le bot sur mon serveur ?',
    answer: 'Utilisez le lien d\'invitation fourni par l\'administrateur du bot avec les permissions appropriées. Assurez-vous que le bot a les permissions nécessaires pour fonctionner correctement.'
  },
  {
    id: 2,
    question: 'Le bot ne répond pas à mes commandes, que faire ?',
    answer: 'Vérifiez que le bot est en ligne, que vous utilisez le bon préfixe, et que vous avez les permissions nécessaires pour utiliser la commande. Consultez également les logs de modération.'
  },
  {
    id: 3,
    question: 'Comment configurer les canaux NSFW ?',
    answer: 'Utilisez la commande /config, allez dans la section NSFW, et sélectionnez les canaux autorisés. Assurez-vous que ces canaux sont marqués comme NSFW dans Discord.'
  },
  {
    id: 4,
    question: 'Puis-je personnaliser les messages du bot ?',
    answer: 'Oui, dans le panneau de configuration, vous pouvez modifier la plupart des messages envoyés par le bot selon vos préférences.'
  },
  {
    id: 5,
    question: 'Comment sauvegarder ma configuration ?',
    answer: 'Le bot sauvegarde automatiquement votre configuration. Vous pouvez également exporter votre configuration depuis le panneau de configuration.'
  }
])

const filteredCommands = computed(() => {
  if (!searchQuery.value) {
    return commandCategories
  }
  
  return commandCategories
    .map(category => ({
      ...category,
      commands: category.commands.filter(command =>
        command.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        command.description.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    }))
    .filter(category => category.commands.length > 0)
})

const toggleFaq = (faqId: number) => {
  const index = openFaqs.value.indexOf(faqId)
  if (index > -1) {
    openFaqs.value.splice(index, 1)
  } else {
    openFaqs.value.push(faqId)
  }
}
</script>