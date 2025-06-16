<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NCode, NButton, NIcon, NAlert } from 'naive-ui'
import { 
  Play as PlayIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
  Game as GameIcon,
  Chat as ChatIcon
} from '@vicons/ionicons5'
import SharedNavigation from '@/components/SharedNavigation.vue'

const activeSection = ref('getting-started')

const sections = ref([
  {
    id: 'getting-started',
    title: 'Démarrage Rapide',
    icon: PlayIcon,
    color: '#10b981'
  },
  {
    id: 'commands',
    title: 'Commandes',
    icon: SettingsIcon,
    color: '#3b82f6'
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: HelpIcon,
    color: '#f59e0b'
  }
])

// Commandes authentiques basées sur le codebase
const commandCategories = ref([
  {
    category: 'Confessions',
    icon: ChatIcon,
    color: '#8b5cf6',
    description: 'Système de confessions anonymes',
    commands: [
      { 
        name: '/confession', 
        description: 'Envoie une confession anonyme', 
        usage: '/confession message:<votre confession>',
        permissions: 'Tous les membres'
      }
    ]
  },
  {
    category: 'Jeux NSFW',
    icon: GameIcon,
    color: '#ec4899',
    description: 'Jeux interactifs pour adultes',
    commands: [
      { 
        name: '/kinky', 
        description: 'Affiche un GIF coquin', 
        usage: '/kinky categorie:<BDSM|Femdom|etc>',
        permissions: 'Canaux NSFW uniquement'
      },
      { 
        name: '/pendu', 
        description: 'Jeu du pendu classique', 
        usage: '/pendu',
        permissions: 'Tous les membres'
      }
    ]
  },
  {
    category: 'Modération',
    icon: ShieldIcon,
    color: '#ef4444',
    description: 'Outils de modération',
    commands: [
      { 
        name: '/ban', 
        description: 'Bannit un membre', 
        usage: '/ban utilisateur:<@membre> raison:<motif>',
        permissions: 'Bannir des membres'
      },
      { 
        name: '/kick', 
        description: 'Expulse un membre', 
        usage: '/kick utilisateur:<@membre> raison:<motif>',
        permissions: 'Expulser des membres'
      }
    ]
  }
])

onMounted(() => {
  document.title = 'Documentation - KinkyPolice Bot'
})
</script>

<template>
  <div class="docs-page">
    <SharedNavigation current-page="docs" />
    
    <div class="docs-container">
      <!-- Sidebar Navigation -->
      <aside class="docs-sidebar">
        <div class="sidebar-content">
          <h3 class="sidebar-title">Documentation</h3>
          <nav class="sidebar-nav">
            <a 
              v-for="section in sections"
              :key="section.id"
              :href="`#${section.id}`"
              class="sidebar-link"
              :class="{ active: activeSection === section.id }"
              @click="activeSection = section.id"
            >
              <NIcon size="16" :color="section.color">
                <component :is="section.icon" />
              </NIcon>
              <span>{{ section.title }}</span>
            </a>
          </nav>
        </div>
      </aside>

      <!-- Main Documentation Content -->
      <main class="docs-main">
        <!-- Getting Started Section -->
        <section id="getting-started" class="docs-section">
          <div class="section-header">
            <h1 class="section-title">
              <span class="gradient-text">Démarrage</span> Rapide
            </h1>
            <p class="section-subtitle">
              Guide pour inviter et configurer KinkyPolice sur votre serveur Discord
            </p>
          </div>

          <NAlert type="info" class="setup-alert">
            <template #icon>
              <NIcon><WarningIcon /></NIcon>
            </template>
            <strong>Important :</strong> KinkyPolice est un bot NSFW. Assurez-vous que votre serveur respecte les conditions Discord.
          </NAlert>

          <div class="steps-grid">
            <NCard class="step-card">
              <div class="step-number">1</div>
              <h3 class="step-title">Invitation du Bot</h3>
              <p class="step-description">
                Cliquez sur "Ajouter au Serveur" et sélectionnez votre serveur Discord. 
                Vous devez avoir les permissions d'administrateur.
              </p>
              <NButton type="primary" class="step-button">
                Inviter KinkyPolice
              </NButton>
            </NCard>

            <NCard class="step-card">
              <div class="step-number">2</div>
              <h3 class="step-title">Configuration</h3>
              <p class="step-description">
                Utilisez la commande de configuration pour paramétrer le bot.
              </p>
              <NCode class="command-example">/config</NCode>
            </NCard>

            <NCard class="step-card">
              <div class="step-number">3</div>
              <h3 class="step-title">Test</h3>
              <p class="step-description">
                Testez les fonctionnalités principales.
              </p>
              <NCode class="command-example">/confession message:Test</NCode>
            </NCard>
          </div>
        </section>

        <!-- Commands Reference Section -->
        <section id="commands" class="docs-section">
          <div class="section-header">
            <h1 class="section-title">
              <span class="gradient-text">Commandes</span> Disponibles
            </h1>
            <p class="section-subtitle">
              Liste des commandes principales de KinkyPolice
            </p>
          </div>

          <div class="commands-grid">
            <NCard 
              v-for="category in commandCategories" 
              :key="category.category" 
              class="command-category-card"
            >
              <div class="category-header">
                <div class="category-icon" :style="{ color: category.color }">
                  <NIcon size="24">
                    <component :is="category.icon" />
                  </NIcon>
                </div>
                <div class="category-info">
                  <h3 class="category-title">{{ category.category }}</h3>
                  <p class="category-description">{{ category.description }}</p>
                </div>
              </div>

              <div class="commands-list">
                <div v-for="cmd in category.commands" :key="cmd.name" class="command-item">
                  <NCode class="command-name">{{ cmd.name }}</NCode>
                  <p class="command-description">{{ cmd.description }}</p>
                  <NCode class="command-usage">{{ cmd.usage }}</NCode>
                  <div class="command-meta">
                    <span class="command-permissions">
                      <NIcon size="12"><ShieldIcon /></NIcon>
                      {{ cmd.permissions }}
                    </span>
                  </div>
                </div>
              </div>
            </NCard>
          </div>
        </section>

        <!-- FAQ Section -->
        <section id="faq" class="docs-section">
          <div class="section-header">
            <h1 class="section-title">
              <span class="gradient-text">Questions</span> Fréquentes
            </h1>
          </div>

          <div class="faq-grid">
            <NCard class="faq-card">
              <h3 class="faq-question">Comment inviter KinkyPolice ?</h3>
              <p class="faq-answer">Cliquez sur "Ajouter au Serveur" et suivez les instructions Discord.</p>
            </NCard>
            
            <NCard class="faq-card">
              <h3 class="faq-question">Les confessions sont-elles anonymes ?</h3>
              <p class="faq-answer">Oui, les confessions sont 100% anonymes.</p>
            </NCard>
            
            <NCard class="faq-card">
              <h3 class="faq-question">Le bot est-il gratuit ?</h3>
              <p class="faq-answer">Oui, KinkyPolice est entièrement gratuit.</p>
            </NCard>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.docs-page {
  min-height: 100vh;
  background: 
    radial-gradient(circle at 20% 80%, rgba(121, 22, 255, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
    linear-gradient(135deg, var(--dark-950) 0%, var(--dark-900) 30%, var(--dark-950) 100%);
}

.docs-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  max-width: 1400px;
  margin: 0 auto;
  padding-top: 80px;
  min-height: 100vh;
}

/* Sidebar */
.docs-sidebar {
  position: sticky;
  top: 80px;
  height: fit-content;
  padding: 32px 0 32px 32px;
}

.sidebar-content {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
}

.sidebar-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 20px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--dark-300);
  font-weight: 500;
  transition: all 0.3s ease;
}

.sidebar-link:hover,
.sidebar-link.active {
  background: rgba(121, 22, 255, 0.1);
  color: var(--primary-400);
  transform: translateX(4px);
}

/* Main Content */
.docs-main {
  padding: 32px;
  overflow-x: hidden;
}

.docs-section {
  margin-bottom: 80px;
}

.section-header {
  margin-bottom: 40px;
  text-align: center;
}

.section-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  margin-bottom: 16px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary-400), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-subtitle {
  font-size: 1.1rem;
  color: var(--dark-300);
  line-height: 1.6;
  max-width: 700px;
  margin: 0 auto;
}

/* Setup Alert */
.setup-alert {
  margin-bottom: 40px;
  background: rgba(59, 130, 246, 0.1) !important;
  border: 1px solid rgba(59, 130, 246, 0.3) !important;
  border-radius: 12px !important;
}

/* Steps Grid */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.step-card {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 16px !important;
  padding: 32px !important;
  transition: all 0.3s ease;
  text-align: center;
}

.step-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.step-number {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary-600), var(--accent-purple));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  margin: 0 auto 16px;
}

.step-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 12px;
}

.step-description {
  color: var(--dark-300);
  line-height: 1.6;
  margin-bottom: 20px;
}

.step-button {
  background: linear-gradient(135deg, var(--primary-600), var(--accent-purple)) !important;
  border: none !important;
}

.command-example {
  background: rgba(0, 0, 0, 0.3) !important;
  color: var(--primary-400) !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  font-family: 'JetBrains Mono', monospace !important;
  display: block;
  margin-top: 12px;
}

/* Commands Grid */
.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.command-category-card {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 16px !important;
  padding: 24px !important;
  transition: all 0.3s ease;
}

.command-category-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.category-header {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: flex-start;
}

.category-icon {
  flex-shrink: 0;
}

.category-info {
  flex: 1;
}

.category-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}

.category-description {
  color: var(--dark-300);
  line-height: 1.5;
  font-size: 0.95rem;
}

.commands-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.command-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.command-name {
  background: rgba(121, 22, 255, 0.2) !important;
  color: var(--primary-400) !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.9rem !important;
  margin-bottom: 8px;
}

.command-description {
  color: var(--dark-300);
  margin: 8px 0;
  line-height: 1.5;
}

.command-usage {
  background: rgba(0, 0, 0, 0.2) !important;
  color: var(--dark-400) !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.85rem !important;
  margin: 8px 0;
}

.command-meta {
  margin-top: 8px;
}

.command-permissions {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--dark-400);
  font-size: 0.85rem;
}

/* FAQ */
.faq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.faq-card {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 16px !important;
  padding: 24px !important;
  transition: all 0.3s ease;
}

.faq-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.faq-question {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  margin-bottom: 12px;
}

.faq-answer {
  color: var(--dark-300);
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 1024px) {
  .docs-container {
    grid-template-columns: 1fr;
  }
  
  .docs-sidebar {
    position: static;
    padding: 16px 32px 0;
  }
  
  .sidebar-content {
    margin-bottom: 32px;
  }
  
  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    gap: 16px;
  }
  
  .sidebar-link {
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .docs-main {
    padding: 16px;
  }
  
  .steps-grid,
  .commands-grid,
  .faq-grid {
    grid-template-columns: 1fr;
  }
}
</style>
