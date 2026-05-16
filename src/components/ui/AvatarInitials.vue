<template>
  <div class="avatar-circle" :style="{ width: size + 'px', height: size + 'px', fontSize: fontSize + 'px', background: bg, color: color }">
    {{ initials }}
  </div>
</template>

<script setup>
const props = defineProps({
  initials: { type: String, default: 'US' },
  size:     { type: Number, default: 32 },
  fontSize: { type: Number, default: 12 },
  bg:       { type: String, default: 'var(--acc-dim)' },
  color:    { type: String, default: 'var(--acc)' },
})
</script>

<style scoped>
.avatar-circle {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}
</style>