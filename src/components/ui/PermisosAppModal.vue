<template>
  <Teleport to="body">
    <div class="pa-overlay" @click.self="$emit('close')">
      <div class="pa-box">
        <div class="pa-hdr">
          <div>
            <h2><i class="ti ti-device-mobile-cog"></i> Permisos de la app</h2>
            <p>{{ nombre }}</p>
          </div>
          <button class="pa-x" @click="$emit('close')"><i class="ti ti-x"></i></button>
        </div>

        <div class="pa-body">
          <div class="pa-base">
            <i class="ti ti-lock"></i>
            <span>Siempre disponibles: <strong>Ajustes</strong>, <strong>Asistencias</strong> y <strong>Expediente digital</strong> (propio).</span>
          </div>

          <div v-if="cargando" class="pa-load"><i class="ti ti-loader-2 spin"></i> Cargando…</div>
          <template v-else>
            <label class="pa-item pa-all" :class="{ on: todos, part: algunos && !todos }">
              <input type="checkbox" :checked="todos" @change="toggleTodos($event.target.checked)" />
              <span class="pa-ico all"><i class="ti ti-checks"></i></span>
              <span class="pa-tx"><strong>Marcar todo</strong><small>{{ sel.length }} de {{ OPCIONES.length }} activados</small></span>
              <span class="pa-sw"></span>
            </label>
            <label v-for="o in OPCIONES" :key="o.k" class="pa-item" :class="{ on: sel.includes(o.k) }">
              <input type="checkbox" :value="o.k" v-model="sel" />
              <span class="pa-ico"><i :class="['ti', o.icon]"></i></span>
              <span class="pa-tx"><strong>{{ o.t }}</strong><small>{{ o.d }}</small></span>
              <span class="pa-sw"></span>
            </label>
          </template>
          <p v-if="error" class="pa-err">{{ error }}</p>
        </div>

        <div class="pa-ftr">
          <button class="pa-btn" @click="$emit('close')">Cancelar</button>
          <button class="pa-btn main" :disabled="guardando || cargando" @click="guardar">
            <i :class="['ti', guardando ? 'ti-loader-2 spin' : 'ti-device-floppy']"></i> {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { empleadosService } from '@/services/empleados.service.js'

const props = defineProps({ idEmpleado: { type: [Number, String], required: true }, nombre: { type: String, default: '' } })
const emit = defineEmits(['close', 'saved'])

const OPCIONES = [
  { k: 'incidencias',   t: 'Incidencias',       d: 'Subir incidencias con comprobante', icon: 'ti-file-text' },
  { k: 'alta_empleado', t: 'Alta de empleado',  d: 'Registrar empleados nuevos',        icon: 'ti-user-plus' },
  { k: 'empleados',     t: 'Empleados',         d: 'Buscar, enrolar rostro y editar',   icon: 'ti-users' },
  { k: 'ticket',        t: 'Abrir ticket',      d: 'Mesa de ayuda',                     icon: 'ti-headset' },
  { k: 'camaras',       t: 'Cámaras',           d: 'Alta de cámaras y tickets de falla', icon: 'ti-camera' },
  { k: 'dispositivo',   t: 'Dispositivo',       d: 'Configuración y sincronización',    icon: 'ti-settings' },
]

const sel = ref([])
const todos = computed(() => sel.value.length === OPCIONES.length)
const algunos = computed(() => sel.value.length > 0)
const toggleTodos = (v) => { sel.value = v ? OPCIONES.map(o => o.k) : [] }
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')

onMounted(async () => {
  try { sel.value = (await empleadosService.getPermisosApp(props.idEmpleado)).permisos || [] }
  catch { error.value = 'No se pudieron cargar los permisos' }
  finally { cargando.value = false }
})

async function guardar() {
  guardando.value = true; error.value = ''
  try {
    const r = await empleadosService.guardarPermisosApp(props.idEmpleado, sel.value)
    emit('saved', r.permisos); emit('close')
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo guardar'
  } finally { guardando.value = false }
}
</script>

<style scoped>
.pa-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px; }
.pa-box { width: 100%; max-width: 480px; background: var(--bg1, #171c28); border: 0.5px solid var(--bdr, #263046); border-radius: 16px; display: flex; flex-direction: column; max-height: 90vh; }
.pa-hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 18px; border-bottom: 0.5px solid var(--bdr, #263046); }
.pa-hdr h2 { margin: 0; font-size: 16px; display: flex; gap: 8px; align-items: center; }
.pa-hdr p { margin: 4px 0 0; font-size: 12px; color: var(--tx2, #8b97ad); }
.pa-x { background: none; border: 0; color: var(--tx2, #8b97ad); font-size: 18px; cursor: pointer; }
.pa-body { padding: 14px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.pa-base { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: var(--tx2, #8b97ad); background: rgba(79,142,247,.08); border: 0.5px solid rgba(79,142,247,.25); border-radius: 10px; padding: 10px 12px; }
.pa-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0.5px solid var(--bdr, #263046); border-radius: 12px; cursor: pointer; }
.pa-item.on { border-color: rgba(34,201,122,.5); background: rgba(34,201,122,.07); }
.pa-item input { display: none; }
.pa-ico { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(79,142,247,.15); color: #4f8ef7; font-size: 18px; }
.pa-tx { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.pa-tx strong { font-size: 13px; } .pa-tx small { font-size: 11px; color: var(--tx2, #8b97ad); }
.pa-sw { width: 38px; height: 22px; border-radius: 22px; background: #3a4458; position: relative; transition: .15s; }
.pa-sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: .15s; }
.pa-item.on .pa-sw { background: #22c97a; } .pa-item.on .pa-sw::after { left: 19px; }
.pa-all { background: rgba(79,142,247,.06); margin-bottom: 2px; }
.pa-ico.all { background: rgba(34,201,122,.15); color: #22c97a; }
.pa-all.part .pa-sw { background: #4f8ef7; } .pa-all.part .pa-sw::after { left: 11px; }
.pa-err { color: #f05454; font-size: 12px; margin: 0; } .pa-load { text-align: center; padding: 20px; color: var(--tx2, #8b97ad); }
.pa-ftr { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 0.5px solid var(--bdr, #263046); }
.pa-btn { padding: 9px 16px; border-radius: 10px; border: 0.5px solid var(--bdr, #263046); background: transparent; color: inherit; cursor: pointer; font-size: 13px; display: inline-flex; gap: 6px; align-items: center; }
.pa-btn.main { background: #4f8ef7; border-color: #4f8ef7; color: #fff; } .pa-btn:disabled { opacity: .6; }
.spin { animation: sp 1s linear infinite; } @keyframes sp { to { transform: rotate(360deg); } }
</style>
