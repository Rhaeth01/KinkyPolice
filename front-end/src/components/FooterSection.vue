<script setup lang="ts">
import { NButton, NSpace, NIcon, NGrid, NGridItem, NH3, NP } from 'naive-ui'
import { 
  LogoDiscord as DiscordIcon,
  Mail as MailIcon,
  Document as DocumentIcon,
  Shield as ShieldIcon,
  Heart as HeartIcon,
  Sparkles as SparklesIcon
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import LogoSvg from '@/assets/logo.svg'

const router = useRouter()

const footerLinks = {
  product: [
    { label: 'Fonctionnalités', path: '/#features' },
    { label: 'Tableau de Bord', path: '/dashboard' },
    { label: 'Tarification', path: '/pricing' },
    { label: 'Statut', path: '/status' }
  ],
  support: [
    { label: 'Documentation', path: '/docs' },
    { label: 'Serveur Discord', href: 'https://discord.gg/kinkypolice' },
    { label: 'FAQ', path: '/docs/faq' },
    { label: 'Contact', path: '/contact' }
  ],
  legal: [
    { label: 'Conditions d\'utilisation', path: '/terms' },
    { label: 'Politique de confidentialité', path: '/privacy' },
    { label: 'Règles communauté', path: '/community-guidelines' },
    { label: 'DMCA', path: '/dmca' }
  ]
}

const socialLinks = [
  { icon: DiscordIcon, href: 'https://discord.gg/kinkypolice', label: 'Discord' },
  { icon: MailIcon, href: 'mailto:support@kinkypolice.com', label: 'Email' }
]

const navigateToInvite = () => {
  router.push('/invite')
}

const handleLinkClick = (link: any) => {
  if (link.href) {
    window.open(link.href, '_blank')
  } else if (link.path) {
    router.push(link.path)
  }
}
</script>

<template>
  <footer class="footer-section">
    <!-- Main Footer Content -->
    <div class="footer-content">
      <div class="max-w-7xl mx-auto px-6 py-16">
        <NGrid :cols="1" :md-cols="2" :lg-cols="5" :x-gap="48" :y-gap="32">
          <!-- Brand Section -->
          <NGridItem :lg-span="2">
            <div class="brand-section">
              <!-- Logo -->
              <div class="footer-logo">
                <img :src="LogoSvg" alt="KinkyPolice Logo" class="logo-image" />
              </div>
              
              <!-- Description -->
              <NP class="brand-description">
                KinkyPolice est le bot Discord premium spécialement conçu pour les communautés adultes. 
                Modération intelligente, jeux interactifs, et outils de gestion avancés pour créer 
                des espaces sécurisés et divertissants.
              </NP>
              
              <!-- Stats -->
              <div class="footer-stats">
                <div class="stat-item">
                  <span class="stat-number">2.8K+</span>
                  <span class="stat-label">Serveurs</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">156K+</span>
                  <span class="stat-label">Utilisateurs</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">99.9%</span>
                  <span class="stat-label">Uptime</span>
                </div>
              </div>
              
              <!-- CTA -->
              <NButton 
                type="primary"
                size="large"
                @click="navigateToInvite"
                class="footer-cta"
              >
                <template #icon>
                  <NIcon>
                    <SparklesIcon />
                  </NIcon>
                </template>
                Ajouter à mon Serveur
              </NButton>
            </div>
          </NGridItem>
          
          <!-- Product Links -->
          <NGridItem>
            <div class="footer-column">
              <NH3 class="column-title">Produit</NH3>
              <div class="links-list">
                <button 
                  v-for="link in footerLinks.product" 
                  :key="link.label"
                  @click="handleLinkClick(link)"
                  class="footer-link"
                >
                  {{ link.label }}
                </button>
              </div>
            </div>
          </NGridItem>
          
          <!-- Support Links -->
          <NGridItem>
            <div class="footer-column">
              <NH3 class="column-title">Support</NH3>
              <div class="links-list">
                <button 
                  v-for="link in footerLinks.support" 
                  :key="link.label"
                  @click="handleLinkClick(link)"
                  class="footer-link"
                >
                  {{ link.label }}
                </button>
              </div>
            </div>
          </NGridItem>
          
          <!-- Legal Links -->
          <NGridItem>
            <div class="footer-column">
              <NH3 class="column-title">Légal</NH3>
              <div class="links-list">
                <button 
                  v-for="link in footerLinks.legal" 
                  :key="link.label"
                  @click="handleLinkClick(link)"
                  class="footer-link"
                >
                  {{ link.label }}
                </button>
              </div>
            </div>
          </NGridItem>
        </NGrid>
      </div>
    </div>
    
    <!-- Footer Bottom -->
    <div class="footer-bottom">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="bottom-content">
          <!-- Copyright -->
          <div class="copyright">
            <NP class="copyright-text">
              © 2024 KinkyPolice. Tous droits réservés. 
              <span class="made-with">Fait avec</span>
              <NIcon size="16" color="#ec4899" class="heart-icon">
                <HeartIcon />
              </NIcon>
              <span class="made-with">et Vue.js</span>
            </NP>
          </div>
          
          <!-- Social Links -->
          <div class="social-links">
            <button 
              v-for="social in socialLinks" 
              :key="social.label"
              @click="window.open(social.href, '_blank')"
              class="social-link"
              :title="social.label"
            >
              <NIcon size="20">
                <component :is="social.icon" />
              </NIcon>
            </button>
          </div>
          
          <!-- Trust Badges -->
          <div class="trust-badges">
            <div class="trust-badge">
              <NIcon size="16" color="var(--success)">
                <ShieldIcon />
              </NIcon>
              <span>Sécurisé</span>
            </div>
            <div class="trust-badge">
              <NIcon size="16" color="var(--primary-400)">
                <DocumentIcon />
              </NIcon>
              <span>Conforme RGPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-section {
  background: linear-gradient(180deg, var(--dark-950) 0%, var(--dark-900) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}

.footer-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-500), transparent);
}

.footer-content {
  position: relative;
  z-index: 10;
}

.brand-section {
  max-width: 400px;
}

.footer-logo {
  margin-bottom: 24px;
}

.logo-image {
  height: 48px;
  width: auto;
  filter: drop-shadow(0 4px 12px rgba(121, 22, 255, 0.3));
}

.brand-description {
  color: var(--dark-300) !important;
  line-height: 1.7 !important;
  margin-bottom: 32px !important;
}

.footer-stats {
  display: flex;
  gap: 32px;
  margin-bottom: 32px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--dark-400);
  font-weight: 500;
}

.footer-cta {
  background: linear-gradient(135deg, var(--primary-600), var(--accent-purple)) !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(121, 22, 255, 0.3) !important;
  transition: all 0.3s ease !important;
}

.footer-cta:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 12px 40px rgba(121, 22, 255, 0.4) !important;
}

.footer-column {
  height: 100%;
}

.column-title {
  color: white !important;
  font-size: 1.1rem !important;
  font-weight: 700 !important;
  margin-bottom: 20px !important;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-link {
  background: none;
  border: none;
  color: var(--dark-300);
  font-size: 0.9rem;
  text-align: left;
  padding: 4px 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--primary-400);
}

.footer-bottom {
  background: var(--dark-900);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.bottom-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px;
}

@media (max-width: 768px) {
  .bottom-content {
    flex-direction: column;
    text-align: center;
  }
}

.copyright-text {
  color: var(--dark-400) !important;
  font-size: 0.9rem !important;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.made-with {
  color: var(--dark-400);
}

.heart-icon {
  animation: heartbeat 2s ease-in-out infinite;
}

.social-links {
  display: flex;
  gap: 16px;
}

.social-link {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dark-300);
  transition: all 0.3s ease;
  cursor: pointer;
}

.social-link:hover {
  background: var(--primary-600);
  border-color: var(--primary-500);
  color: white;
  transform: translateY(-2px);
}

.trust-badges {
  display: flex;
  gap: 16px;
}

.trust-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  font-size: 0.8rem;
  color: var(--dark-300);
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
</style>
