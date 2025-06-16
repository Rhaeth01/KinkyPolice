<script setup lang="ts">
import { RouterView } from 'vue-router'
import { NConfigProvider, darkTheme } from 'naive-ui'
import { computed } from 'vue'

// Configuration du thème sombre personnalisé
const themeOverrides = computed(() => ({
  common: {
    primaryColor: '#7916ff',
    primaryColorHover: '#843dff',
    primaryColorPressed: '#6b04fd',
    primaryColorSuppl: '#9f75ff',
    infoColor: '#3b82f6',
    successColor: '#10b981',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    textColorBase: '#f1f5f9',
    textColor1: '#f1f5f9',
    textColor2: '#cbd5e1',
    textColor3: '#94a3b8',
    textColorDisabled: '#64748b',
    placeholderColor: '#64748b',
    iconColor: '#94a3b8',
    iconColorHover: '#cbd5e1',
    iconColorPressed: '#64748b',
    iconColorDisabled: '#475569',
    opacity1: '0.82',
    opacity2: '0.72',
    opacity3: '0.38',
    opacity4: '0.24',
    opacity5: '0.18',
    dividerColor: '#334155',
    borderColor: '#334155',
    closeIconColor: '#94a3b8',
    closeIconColorHover: '#cbd5e1',
    closeIconColorPressed: '#64748b',
    clearColor: '#94a3b8',
    clearColorHover: '#cbd5e1',
    clearColorPressed: '#64748b',
    scrollbarColor: '#475569',
    scrollbarColorHover: '#64748b',
    scrollbarWidth: '8px',
    scrollbarHeight: '8px',
    scrollbarBorderRadius: '4px',
    progressRailColor: '#334155',
    railColor: '#334155',
    popoverColor: '#1e293b',
    tableColor: '#0f172a',
    cardColor: '#1e293b',
    modalColor: '#1e293b',
    bodyColor: '#020617',
    tagColor: '#334155',
    avatarColor: '#334155',
    invertedColor: '#f1f5f9',
    inputColor: '#1e293b',
    codeColor: '#334155',
    tabColor: '#1e293b',
    actionColor: '#334155',
    tableHeaderColor: '#334155',
    hoverColor: '#334155',
    tableColorHover: '#334155',
    tableColorStriped: '#1e293b',
    pressedColor: '#475569',
    opacityDisabled: '0.5',
    inputColorDisabled: '#334155',
    buttonColor2: '#334155',
    buttonColor2Hover: '#475569',
    buttonColor2Pressed: '#1e293b',
    boxShadow1: '0 1px 2px -2px rgba(0, 0, 0, .08), 0 3px 6px 0 rgba(0, 0, 0, .06), 0 5px 12px 4px rgba(0, 0, 0, .04)',
    boxShadow2: '0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05)',
    boxShadow3: '0 6px 16px -9px rgba(0, 0, 0, .08), 0 9px 28px 0 rgba(0, 0, 0, .05), 0 12px 48px 16px rgba(0, 0, 0, .03)'
  }
}))
</script>

<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="themeOverrides">
    <div id="app" style="min-height: 100vh; background: var(--dark-950); color: var(--dark-100);">
      <RouterView />
    </div>
  </NConfigProvider>
</template>

<style scoped>
#app {
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
