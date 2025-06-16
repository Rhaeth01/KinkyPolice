<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NGrid, NGridItem, NIcon, NButton, NSpace, NH2, NP } from 'naive-ui'
import { 
  Shield as ShieldIcon,
  Settings as SettingsIcon,
  GameController as GameIcon,
  Heart as HeartIcon,
  Lock as LockIcon,
  Flash as FlashIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Chatbubbles as ChatIcon
} from '@vicons/ionicons5'

const features = ref([
  {
    icon: ShieldIcon,
    title: 'Modération NSFW Avancée',
    description: 'Système de modération spécialement conçu pour les communautés adultes avec filtres intelligents, gestion des rôles d\'âge, et protection anti-raid.',
    highlights: ['Vérification d\'âge automatique', 'Filtres de contenu adaptatifs', 'Sanctions graduelles'],
    color: '#ef4444',
    gradient: 'from-red-500 to-pink-500'
  },
  {
    icon: HeartIcon,
    title: 'Jeux Interactifs Kinky',
    description: 'Collection exclusive de jeux pour adultes : vérité ou action coquin, défis intimes, quiz BDSM, et mini-jeux de séduction pour animer vos soirées.',
    highlights: ['15+ jeux exclusifs', 'Contenu personnalisable', 'Système de points coquins'],
    color: '#ec4899',
    gradient: 'from-pink-500 to-purple-500'
  },
  {
    icon: LockIcon,
    title: 'Espaces Privés Sécurisés',
    description: 'Création automatique de salons privés temporaires, gestion des accès par consentement, et chiffrement des conversations intimes.',
    highlights: ['Salons auto-destructeurs', 'Gestion du consentement', 'Confidentialité maximale'],
    color: '#8b5cf6',
    gradient: 'from-purple-500 to-indigo-500'
  },
  {
    icon: PeopleIcon,
    title: 'Système de Rencontres',
    description: 'Matching intelligent entre membres, profils détaillés avec préférences, et organisation d\'événements communautaires pour adultes.',
    highlights: ['Profils compatibilité', 'Événements organisés', 'Matching sécurisé'],
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: AnalyticsIcon,
    title: 'Analytics Communauté',
    description: 'Statistiques détaillées sur l\'activité de votre serveur, engagement des membres, et insights pour optimiser votre communauté adulte.',
    highlights: ['Métriques en temps réel', 'Rapports détaillés', 'Optimisation automatique'],
    color: '#10b981',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: SettingsIcon,
    title: 'Configuration Intuitive',
    description: 'Interface web moderne pour configurer tous les aspects du bot, templates prêts à l\'emploi, et synchronisation en temps réel.',
    highlights: ['Dashboard web complet', 'Templates pré-configurés', 'Sync temps réel'],
    color: '#f59e0b',
    gradient: 'from-yellow-500 to-orange-500'
  }
])

const activeFeature = ref(0)

const setActiveFeature = (index: number) => {
  activeFeature.value = index
}
</script>

<template>
  <section id="features" class="features-section">
    <div class="max-w-7xl mx-auto px-6 py-24">
      <!-- Section Header -->
      <div 
        v-motion
        :initial="{ opacity: 0, y: 40 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 800 } }"
        class="text-center mb-20"
      >
        <div class="inline-flex items-center px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full mb-8">
          <span class="text-primary-400 text-sm font-medium">✨ Fonctionnalités Exclusives</span>
        </div>
        
        <NH2 class="section-title mb-6">
          <span class="gradient-text">Fonctionnalités Premium</span>
          <br>
          <span class="text-white">pour Communautés Adultes</span>
        </NH2>
        
        <NP class="section-subtitle">
          KinkyPolice offre des outils uniques spécialement conçus pour les serveurs Discord NSFW, 
          alliant sécurité, divertissement et gestion communautaire avancée.
        </NP>
      </div>

      <!-- Features Grid -->
      <NGrid :cols="1" :lg-cols="2" :xl-cols="3" :x-gap="32" :y-gap="32" class="mb-20">
        <NGridItem 
          v-for="(feature, index) in features" 
          :key="feature.title"
          v-motion
          :initial="{ opacity: 0, y: 40 }"
          :visible="{ opacity: 1, y: 0, transition: { duration: 600, delay: index * 150 } }"
        >
          <NCard 
            class="feature-card"
            :class="{ 'feature-card-active': activeFeature === index }"
            @mouseenter="setActiveFeature(index)"
            hoverable
          >
            <!-- Feature Icon -->
            <div class="feature-icon-container" :style="{ background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}10)` }">
              <div class="feature-icon-wrapper">
                <NIcon size="32" :color="feature.color">
                  <component :is="feature.icon" />
                </NIcon>
              </div>
            </div>

            <!-- Feature Content -->
            <div class="feature-content">
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
              
              <!-- Feature Highlights -->
              <div class="feature-highlights">
                <div 
                  v-for="highlight in feature.highlights" 
                  :key="highlight"
                  class="highlight-item"
                >
                  <div class="highlight-dot" :style="{ background: feature.color }"></div>
                  <span>{{ highlight }}</span>
                </div>
              </div>
            </div>

            <!-- Hover Effect -->
            <div 
              class="feature-glow" 
              :style="{ background: `linear-gradient(135deg, ${feature.color}15, transparent)` }"
            ></div>
          </NCard>
        </NGridItem>
      </NGrid>

      <!-- Feature Showcase -->
      <div 
        v-motion
        :initial="{ opacity: 0, y: 40 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 800, delay: 600 } }"
        class="feature-showcase"
      >
        <NCard class="showcase-card">
          <div class="showcase-content">
            <div class="showcase-text">
              <h3 class="showcase-title">
                Interface de Configuration Avancée
              </h3>
              <p class="showcase-description">
                Gérez tous les aspects de votre serveur depuis notre dashboard web intuitif. 
                Configuration en temps réel, templates personnalisables, et synchronisation automatique 
                avec votre serveur Discord.
              </p>
              <NSpace class="mt-6">
                <NButton type="primary" size="large">
                  Voir le Dashboard
                </NButton>
                <NButton secondary size="large">
                  Documentation
                </NButton>
              </NSpace>
            </div>
            <div class="showcase-visual">
              <!-- Placeholder pour screenshot du dashboard -->
              <div class="dashboard-preview">
                <div class="preview-header">
                  <div class="preview-dots">
                    <div class="dot red"></div>
                    <div class="dot yellow"></div>
                    <div class="dot green"></div>
                  </div>
                  <span class="preview-title">KinkyPolice Dashboard</span>
                </div>
                <div class="preview-content">
                  <div class="preview-sidebar">
                    <div class="sidebar-item active">Configuration</div>
                    <div class="sidebar-item">Modération</div>
                    <div class="sidebar-item">Jeux</div>
                    <div class="sidebar-item">Analytics</div>
                  </div>
                  <div class="preview-main">
                    <div class="config-section">
                      <div class="config-item"></div>
                      <div class="config-item"></div>
                      <div class="config-item"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features-section {
  background: linear-gradient(180deg, var(--dark-950) 0%, var(--dark-900) 50%, var(--dark-950) 100%);
  position: relative;
  overflow: hidden;
}

.features-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-500), transparent);
}

.section-title {
  font-size: clamp(2.5rem, 6vw, 4rem) !important;
  font-weight: 900 !important;
  line-height: 1.1 !important;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
}

.section-subtitle {
  font-size: 1.25rem !important;
  color: var(--dark-300) !important;
  max-width: 800px !important;
  margin: 0 auto !important;
  line-height: 1.7 !important;
}

.feature-card {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 24px !important;
  padding: 32px !important;
  transition: all 0.4s ease !important;
  position: relative !important;
  overflow: hidden !important;
  height: 100% !important;
}

.feature-card:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  transform: translateY(-8px) !important;
}

.feature-card-active {
  border-color: var(--primary-500) !important;
  box-shadow: 0 20px 60px rgba(121, 22, 255, 0.2) !important;
}

.feature-icon-container {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  position: relative;
}

.feature-icon-wrapper {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-content {
  flex: 1;
}

.feature-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
  line-height: 1.3;
}

.feature-description {
  color: var(--dark-300);
  line-height: 1.6;
  margin-bottom: 20px;
}

.feature-highlights {
  space-y: 8px;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.highlight-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.highlight-item span {
  color: var(--dark-200);
  font-size: 0.9rem;
  font-weight: 500;
}

.feature-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  border-radius: 24px;
}

.feature-card:hover .feature-glow {
  opacity: 1;
}

.feature-showcase {
  margin-top: 80px;
}

.showcase-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 32px !important;
  padding: 48px !important;
  overflow: hidden !important;
}

.showcase-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}

@media (max-width: 768px) {
  .showcase-content {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

.showcase-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 20px;
  line-height: 1.2;
}

.showcase-description {
  color: var(--dark-300);
  font-size: 1.1rem;
  line-height: 1.7;
}

.dashboard-preview {
  background: var(--dark-900);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.preview-header {
  background: var(--dark-800);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.preview-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #10b981; }

.preview-title {
  color: var(--dark-300);
  font-size: 0.9rem;
  font-weight: 500;
}

.preview-content {
  display: flex;
  height: 300px;
}

.preview-sidebar {
  width: 200px;
  background: var(--dark-850);
  padding: 20px;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-item {
  padding: 12px 16px;
  border-radius: 8px;
  color: var(--dark-400);
  font-size: 0.9rem;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.sidebar-item.active {
  background: var(--primary-600);
  color: white;
}

.preview-main {
  flex: 1;
  padding: 20px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-item {
  height: 60px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
