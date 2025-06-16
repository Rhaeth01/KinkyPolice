<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-background"></div>
      <div class="container">
        <div class="hero-content animate-fadeInUp">
          <div class="logo-section">
            <Logo large />
            <h1 class="hero-title">KinkyPolice</h1>
            <p class="hero-subtitle">Bot Discord pour communautés NSFW</p>
          </div>
          
          <p class="hero-description">
            Un bot Discord complet spécialement conçu pour la gestion de communautés NSFW 
            avec des outils de modération avancés, des jeux interactifs et un système économique.
          </p>

          <div class="hero-actions">
            <button @click="goToDashboard" class="btn btn-primary btn-hero">
              <span>🎛️</span>
              Ouvrir le Dashboard
            </button>
            <button @click="goToDocumentation" class="btn btn-secondary btn-hero">
              <span>📖</span>
              Documentation
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <h2>Fonctionnalités principales</h2>
        
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.title" class="feature-card">
            <div class="feature-icon">{{ feature.icon }}</div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
            <ul class="feature-list">
              <li v-for="item in feature.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Commands Section -->
    <section class="commands">
      <div class="container">
        <h2>Commandes populaires</h2>
        <div class="commands-grid">
          <div v-for="command in popularCommands" :key="command.name" class="command-card">
            <code>{{ command.name }}</code>
            <p>{{ command.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="final-cta">
      <div class="container">
        <h2>Prêt à commencer ?</h2>
        <p>Accédez au dashboard pour configurer et gérer votre bot Discord</p>
        <button @click="goToDashboard" class="btn btn-primary btn-large">
          Accéder au Dashboard →
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Logo from '@/components/common/Logo.vue'

const router = useRouter()

const features = [
  {
    icon: '🛡️',
    title: 'Modération avancée',
    description: 'Système complet de modération pour maintenir l\'ordre',
    items: [
      'Bannissement et expulsion',
      'Système d\'avertissements',
      'Logs détaillés avec webhooks',
      'Modération automatique'
    ]
  },
  {
    icon: '🎮',
    title: 'Jeux interactifs',
    description: 'Une variété de jeux pour divertir votre communauté',
    items: [
      'UNO, Morpion, Puissance 4',
      'Quiz NSFW personnalisés',
      'Anagrammes et mots mystères',
      'Système de points et récompenses'
    ]
  },
  {
    icon: '💰',
    title: 'Économie virtuelle',
    description: 'Système économique complet avec boutique',
    items: [
      'Points et monnaie virtuelle',
      'Boutique avec objets personnalisés',
      'Quêtes et défis quotidiens',
      'Classements et leaderboards'
    ]
  },
  {
    icon: '🔞',
    title: 'Contenu NSFW',
    description: 'Fonctionnalités spécialisées pour communautés adultes',
    items: [
      'Système de confessions anonymes',
      'API NSFW intégrées',
      'Gestion des canaux adultes',
      'Actions et vérités personnalisées'
    ]
  }
]

const popularCommands = [
  { name: '/config', description: 'Interface de configuration complète' },
  { name: '/warn', description: 'Donner un avertissement à un utilisateur' },
  { name: '/confession', description: 'Système de confessions anonymes' },
  { name: '/uno', description: 'Lancer une partie d\'UNO multijoueur' },
  { name: '/balance', description: 'Voir son solde de points' },
  { name: '/kinky', description: 'Accès aux fonctionnalités NSFW' },
  { name: '/quiz-kinky', description: 'Quiz interactif sur thèmes adultes' },
  { name: '/shop', description: 'Boutique virtuelle avec objets' }
]

const goToDashboard = () => {
  router.push('/dashboard')
}

const goToDocumentation = () => {
  router.push('/docs')
}
</script>

<style scoped>
.landing-page {
  background: var(--gray-50);
  min-height: 100vh;
}

.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  color: white;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--gradient-dark);
  z-index: 0;
}

.hero-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(6, 182, 212, 0.2) 0%, transparent 50%);
}

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-xl) 0;
}

.logo-section {
  margin-bottom: var(--space-xl);
}

.hero-title {
  font-size: var(--font-size-5xl);
  font-weight: 800;
  margin: var(--space-md) 0 var(--space-sm);
  background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: var(--font-size-xl);
  opacity: 0.9;
  margin: 0;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.8);
}

.hero-description {
  font-size: var(--font-size-lg);
  line-height: 1.8;
  margin: var(--space-xl) auto;
  opacity: 0.95;
  max-width: 600px;
  color: rgba(255, 255, 255, 0.9);
}

.hero-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  margin-top: var(--space-xl);
  flex-wrap: wrap;
}

.btn-hero {
  padding: var(--space-md) var(--space-xl);
  font-size: var(--font-size-lg);
  border-radius: var(--radius-xl);
}

.features, .commands {
  padding: var(--space-2xl) 0;
  background: white;
}

.commands {
  background: var(--gray-50);
}

.final-cta {
  padding: var(--space-2xl) 0;
  background: var(--gradient-primary);
  color: white;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.final-cta::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

h2 {
  font-size: var(--font-size-4xl);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-xl);
  color: var(--gray-800);
  position: relative;
}

h2::after {
  content: '';
  position: absolute;
  bottom: -var(--space-sm);
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
}

.final-cta h2 {
  color: white;
  margin-bottom: var(--space-sm);
  position: relative;
  z-index: 1;
}

.final-cta p {
  font-size: var(--font-size-lg);
  opacity: 0.9;
  margin-bottom: var(--space-lg);
  position: relative;
  z-index: 1;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.feature-card {
  background: white;
  border-radius: var(--radius-2xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-normal);
  border: 1px solid var(--gray-200);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-primary);
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
  border-color: var(--primary);
}

.feature-icon {
  font-size: var(--font-size-5xl);
  margin-bottom: var(--space-md);
  display: block;
}

.feature-card h3 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--space-sm);
  color: var(--gray-800);
}

.feature-card p {
  color: var(--gray-600);
  margin-bottom: var(--space-md);
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  padding: var(--space-xs) 0;
  color: var(--gray-600);
  position: relative;
  padding-left: var(--space-md);
  font-size: var(--font-size-sm);
}

.feature-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--primary);
  font-weight: 700;
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-md);
}

.command-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-fast);
  border: 1px solid var(--gray-200);
}

.command-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.command-card code {
  background: var(--gradient-primary);
  color: white;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-weight: 600;
  display: inline-block;
  margin-bottom: var(--space-xs);
  font-size: var(--font-size-sm);
}

.command-card p {
  color: var(--gray-600);
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

/* Responsive design */
@media (max-width: 768px) {
  .hero-title {
    font-size: var(--font-size-3xl);
  }
  
  .hero-description {
    font-size: var(--font-size-base);
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn-hero {
    width: 100%;
    max-width: 280px;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }
  
  .commands-grid {
    grid-template-columns: 1fr;
  }
  
  h2 {
    font-size: var(--font-size-3xl);
  }
  
  .feature-card {
    padding: var(--space-md);
  }
}
</style>