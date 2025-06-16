<script setup lang="ts">
import { NButton } from 'naive-ui'
import { useRouter } from 'vue-router'

interface Props {
  currentPage?: string
}

const props = defineProps<Props>()
const router = useRouter()

const navigateToInvite = () => {
  // Redirect to Discord bot invitation URL
  window.open('https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=8&scope=bot', '_blank')
}
</script>

<template>
  <nav class="shared-navbar">
    <div class="nav-container">
      <router-link to="/" class="logo-container">
        <div class="brand-logo">
          <span class="brand-text">KinkyPolice</span>
          <span class="brand-subtitle">Bot</span>
        </div>
      </router-link>
      
      <div class="nav-menu">
        <router-link
          to="/"
          class="nav-item"
          :class="{ active: currentPage === 'home' }"
        >
          Accueil
        </router-link>
        <router-link
          to="/docs"
          class="nav-item"
          :class="{ active: currentPage === 'docs' }"
        >
          Documentation
        </router-link>
        <router-link
          to="/dashboard"
          class="nav-item"
          :class="{ active: currentPage === 'dashboard' }"
        >
          Dashboard
        </router-link>
      </div>
      
      <NButton type="primary" @click="navigateToInvite" class="nav-cta-minimal">
        Ajouter au Serveur
      </NButton>
    </div>
  </nav>
</template>

<style scoped>
.shared-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(2, 6, 23, 0.9);
  backdrop-filter: blur(40px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px 0;
  transition: all 0.3s ease;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-container {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  text-decoration: none;
}

.logo-container:hover {
  transform: translateY(-1px);
}

.brand-logo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.brand-text {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary-400), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 11px;
  color: var(--dark-400);
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: 2px;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 40px;
}

.nav-item {
  color: var(--dark-300);
  text-decoration: none;
  font-weight: 500;
  font-size: 15px;
  letter-spacing: 0.3px;
  position: relative;
  transition: all 0.3s ease;
  padding: 8px 0;
}

.nav-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: linear-gradient(135deg, var(--primary-400), var(--accent-purple));
  transition: width 0.3s ease;
}

.nav-item:hover,
.nav-item.active {
  color: var(--primary-400);
  transform: translateY(-1px);
}

.nav-item:hover::after,
.nav-item.active::after {
  width: 100%;
}

.nav-cta-minimal {
  background: linear-gradient(135deg, var(--primary-600), var(--accent-purple)) !important;
  border: none !important;
  padding: 10px 24px !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  letter-spacing: 0.3px !important;
  box-shadow: 0 4px 20px rgba(121, 22, 255, 0.3) !important;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  border-radius: 8px !important;
}

.nav-cta-minimal:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 8px 30px rgba(121, 22, 255, 0.4) !important;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .nav-container {
    padding: 0 20px;
  }
  
  .nav-menu {
    display: none;
  }
  
  .brand-text {
    font-size: 20px;
  }
  
  .nav-cta-minimal {
    padding: 8px 16px !important;
    font-size: 12px !important;
  }
}
</style>
