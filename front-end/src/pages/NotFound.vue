<template>
  <div v-motion-slide-visible-once-bottom class="min-h-[60vh] flex items-center justify-center">
    <div class="text-center space-y-6">
      <div class="space-y-2">
        <h1 class="text-8xl font-bold text-primary">404</h1>
        <h2 class="text-2xl font-semibold text-foreground">Page non trouvée</h2>
        <p class="text-muted-foreground max-w-md mx-auto">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
      </div>
      
      <div class="space-y-4">
        <router-link
          to="/"
          class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Retour au dashboard
        </router-link>
        
        <div class="text-sm text-muted-foreground">
          Ou essayez ces liens :
        </div>
        
        <div class="flex justify-center gap-4 text-sm">
          <router-link to="/config" class="text-primary hover:text-primary/80 transition-colors">
            Configuration
          </router-link>
          <router-link to="/moderation" class="text-primary hover:text-primary/80 transition-colors">
            Modération
          </router-link>
          <router-link to="/docs" class="text-primary hover:text-primary/80 transition-colors">
            Documentation
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No additional logic needed for this simple 404 page
</script>