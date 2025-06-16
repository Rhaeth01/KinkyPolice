<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpace, NIcon, NDropdown } from 'naive-ui'
import { 
  Menu as MenuIcon,
  Close as CloseIcon,
  ChevronDown as ChevronDownIcon
} from '@vicons/ionicons5'
import KinkyPoliceLogo from '@/components/KinkyPoliceLogo.vue'

const router = useRouter()
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

const navigationItems = [
  { label: 'Accueil', path: '/', key: 'home' },
  { label: 'Fonctionnalités', path: '/#features', key: 'features' },
  { label: 'Documentation', path: '/docs', key: 'docs' },
  { label: 'Tableau de Bord', path: '/dashboard', key: 'dashboard' }
]

const supportDropdownOptions = [
  {
    label: 'Serveur Discord',
    key: 'discord',
    props: {
      onClick: () => window.open('https://discord.gg/kinkypolice', '_blank')
    }
  },
  {
    label: 'Guide d\'Installation',
    key: 'guide',
    props: {
      onClick: () => router.push('/docs/installation')
    }
  },
  {
    label: 'FAQ',
    key: 'faq',
    props: {
      onClick: () => router.push('/docs/faq')
    }
  }
]

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

const navigateToInvite = () => {
  router.push('/invite')
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <nav 
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled 
        ? 'bg-dark-950/80 backdrop-blur-xl border-b border-white/10 shadow-2xl' 
        : 'bg-transparent'
    ]"
  >
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <router-link
          to="/"
          class="flex items-center group transition-all duration-300 hover:scale-105"
        >
          <KinkyPoliceLogo :size="140" :animated="true" />
        </router-link>

        <!-- Desktop Navigation -->
        <div class="hidden lg:flex items-center space-x-8">
          <div class="flex items-center space-x-6">
            <router-link
              v-for="item in navigationItems"
              :key="item.key"
              :to="item.path"
              class="nav-link-premium"
            >
              {{ item.label }}
            </router-link>
            
            <!-- Support Dropdown -->
            <NDropdown 
              :options="supportDropdownOptions" 
              trigger="hover"
              placement="bottom-start"
            >
              <button class="nav-link-premium flex items-center space-x-1">
                <span>Support</span>
                <NIcon size="14">
                  <ChevronDownIcon />
                </NIcon>
              </button>
            </NDropdown>
          </div>

          <!-- CTA Button -->
          <NButton 
            type="primary"
            size="large"
            @click="navigateToInvite"
            class="cta-button"
            style="
              background: linear-gradient(135deg, var(--primary-600), var(--accent-purple));
              border: none;
              box-shadow: 0 8px 32px rgba(121, 22, 255, 0.3);
              transition: all 0.3s ease;
            "
          >
            <span class="font-semibold">Ajouter au Serveur</span>
          </NButton>
        </div>

        <!-- Mobile Menu Button -->
        <button 
          @click="toggleMobileMenu"
          class="lg:hidden p-2 rounded-lg bg-dark-800/50 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-dark-700/50"
        >
          <NIcon size="24" color="white">
            <MenuIcon v-if="!isMobileMenuOpen" />
            <CloseIcon v-else />
          </NIcon>
        </button>
      </div>

      <!-- Mobile Menu -->
      <div 
        v-if="isMobileMenuOpen"
        class="lg:hidden mt-4 p-6 bg-dark-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
      >
        <div class="space-y-4">
          <router-link
            v-for="item in navigationItems"
            :key="item.key"
            :to="item.path"
            @click="isMobileMenuOpen = false"
            class="block py-3 px-4 rounded-lg text-gray-300 hover:text-white hover:bg-dark-800/50 transition-all duration-300"
          >
            {{ item.label }}
          </router-link>
          
          <div class="border-t border-white/10 pt-4">
            <NButton 
              type="primary"
              size="large"
              @click="navigateToInvite"
              class="w-full"
              style="background: linear-gradient(135deg, var(--primary-600), var(--accent-purple));"
            >
              Ajouter au Serveur
            </NButton>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-link-premium {
  @apply relative text-gray-300 font-medium transition-all duration-300;
  @apply hover:text-white;
}

.nav-link-premium::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: linear-gradient(135deg, var(--primary-500), var(--accent-purple));
  transition: width 0.3s ease;
}

.nav-link-premium:hover::after {
  width: 100%;
}

.nav-link-premium.router-link-active {
  @apply text-white;
}

.nav-link-premium.router-link-active::after {
  width: 100%;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(121, 22, 255, 0.4) !important;
}
</style>
