<template>
  <span class="pill" :class="status">
    <span class="dot"></span>
    {{ label }}
  </span>
</template>

<script setup>
const props = defineProps({
  status: { type: String, default: 'activo' }
})

const labels = {
  activo:     'Activo',
  baja:       'Baja',
  permiso:    'Permiso',
  incompleto: 'Incompleto',
}

const label = labels[props.status] || props.status
</script>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 20px;
  font-weight: 500;
}
.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.activo     { background: var(--grn-dim); color: var(--grn); }
.baja       { background: var(--red-dim); color: var(--red); }
.permiso    { background: var(--amb-dim); color: var(--amb); }
.incompleto { background: var(--amb-dim); color: var(--amb); }
</style>