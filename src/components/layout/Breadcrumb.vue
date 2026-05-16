<template>
  <nav class="breadcrumb">
    <template v-for="(crumb, i) in breadcrumbs" :key="i">
      <RouterLink v-if="i < breadcrumbs.length - 1" :to="crumb.to" class="crumb-link">
        {{ crumb.label }}
      </RouterLink>
      <span v-else class="crumb-cur">{{ crumb.label }}</span>
      <span v-if="i < breadcrumbs.length - 1" class="crumb-sep">/</span>
    </template>
  </nav>
</template>

<script setup>
import { useUiStore } from '@/stores/ui.js'
import { storeToRefs } from 'pinia'

const ui = useUiStore()
const { breadcrumbs } = storeToRefs(ui)
</script>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}
.crumb-link {
  color: var(--acc);
  text-decoration: none;
  transition: opacity .15s;
}
.crumb-link:hover { opacity: .75; }
.crumb-sep  { color: var(--tx3); }
.crumb-cur  { color: var(--tx0); font-weight: 500; }
</style>