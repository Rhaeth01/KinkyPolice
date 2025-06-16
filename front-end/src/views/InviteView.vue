<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NCard, NSpace, NIcon, NH1, NP, NGrid, NGridItem } from 'naive-ui'
import {
  Checkmark as CheckIcon,
  Open as ExternalLinkIcon,
  Sparkles as SparklesIcon
} from '@vicons/ionicons5'
import NavigationBar from '@/components/NavigationBar.vue'
import FooterSection from '@/components/FooterSection.vue'

const permissions = ref([
  'Envoyer des Messages',
  'Gérer les Messages',
  'Intégrer des Liens',
  'Lire l\'Historique',
  'Utiliser les Commandes Slash',
  'Gérer les Rôles',
  'Expulser des Membres',
  'Bannir des Membres',
  'Gérer les Salons',
  'Voir les Logs d\'Audit'
])

const inviteUrl = 'https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=8&scope=bot%20applications.commands'

const openInviteLink = () => {
  window.open(inviteUrl, '_blank')
}
</script>

<template>
  <div class="invite-page">
    <!-- Navigation -->
    <NavigationBar />

    <div class="max-w-4xl mx-auto px-6 py-32">
      <!-- Header -->
      <div class="text-center mb-16">
        <div
          v-motion
          :initial="{ opacity: 0, y: 30 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 600 } }"
          style="margin-bottom: 48px;"
        >
          <div style="
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--primary-500), var(--accent-purple));
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 32px auto;
          ">
            <NIcon size="40" color="white">
              <SparklesIcon />
            </NIcon>
          </div>

          <NH1 style="font-size: 3.5rem; font-weight: bold; color: white; margin-bottom: 24px;">
            Ajouter KinkyPolice à votre Serveur
          </NH1>

          <NP style="font-size: 1.25rem; color: var(--dark-300); max-width: 600px; margin: 0 auto;">
            Améliorez votre serveur Discord avec des outils de modération puissants,
            des jeux interactifs et des fonctionnalités de gestion complètes.
          </NP>
        </div>
      </div>

      <!-- Main Content -->
      <NGrid :cols="1" :lg-cols="2" :x-gap="48" :y-gap="32">
        <!-- Permissions -->
        <NGridItem>
          <NCard
            class="glass-effect"
            style="padding: 32px; border: 1px solid rgba(255,255,255,0.1);"
            v-motion
            :initial="{ opacity: 0, x: -30 }"
            :enter="{ opacity: 1, x: 0, transition: { duration: 600, delay: 200 } }"
          >
            <h2 style="font-size: 1.5rem; font-weight: 600; color: white; margin-bottom: 24px;">
              Permissions Requises
            </h2>
            <NP style="color: var(--dark-400); margin-bottom: 24px;">
              KinkyPolice a besoin de ces permissions pour fonctionner correctement sur votre serveur :
            </NP>

            <div style="margin-bottom: 32px;">
              <div
                v-for="permission in permissions"
                :key="permission"
                style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;"
              >
                <NIcon size="20" color="var(--success)">
                  <CheckIcon />
                </NIcon>
                <span style="color: var(--dark-200);">{{ permission }}</span>
              </div>
            </div>

            <div style="
              padding: 16px;
              background: rgba(59, 130, 246, 0.1);
              border: 1px solid rgba(59, 130, 246, 0.2);
              border-radius: 12px;
            ">
              <NP style="color: var(--info); font-size: 0.9rem; margin: 0;">
                <strong>Note :</strong> Vous pouvez toujours modifier ces permissions plus tard dans les paramètres de votre serveur.
              </NP>
            </div>
          </NCard>
        </NGridItem>

        <!-- Invite Action -->
        <NGridItem>
          <NCard
            class="glass-effect"
            style="padding: 32px; text-align: center; border: 1px solid rgba(255,255,255,0.1);"
            v-motion
            :initial="{ opacity: 0, x: 30 }"
            :enter="{ opacity: 1, x: 0, transition: { duration: 600, delay: 400 } }"
          >
            <h2 style="font-size: 1.5rem; font-weight: 600; color: white; margin-bottom: 24px;">
              Prêt à Commencer ?
            </h2>

            <div style="margin-bottom: 32px;">
              <NP style="color: var(--dark-400); margin-bottom: 16px;">
                Cliquez sur le bouton ci-dessous pour ajouter KinkyPolice à votre serveur Discord.
              </NP>
              <NP style="color: var(--dark-500); font-size: 0.9rem;">
                Vous serez redirigé vers Discord pour terminer le processus d'autorisation.
              </NP>
            </div>

            <NButton
              type="primary"
              size="large"
              @click="openInviteLink"
              style="
                width: 100%;
                background: linear-gradient(135deg, var(--primary-600), var(--accent-purple));
                border: none;
                padding: 16px 32px;
                font-size: 18px;
                margin-bottom: 16px;
              "
            >
              <template #icon>
                <NIcon>
                  <ExternalLinkIcon />
                </NIcon>
              </template>
              Ajouter à Discord
            </NButton>

            <NP style="color: var(--dark-500); font-size: 0.8rem; margin: 0;">
              En ajoutant ce bot, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
            </NP>
          </NCard>
        </NGridItem>
      </NGrid>
    </div>

    <!-- Footer -->
    <FooterSection />
  </div>
</template>

<style scoped>
.invite-page {
  min-height: 100vh;
  background: var(--dark-950);
}

.glass-effect {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(20px) !important;
}
</style>
