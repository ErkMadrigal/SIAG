<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-hdr">
          <div>
            <h2><i class="ti ti-map-pin-cog"></i> Alcance del usuario</h2>
            <p>{{ usuario?.nombre || usuario?.username || '' }}</p>
          </div>
          <button class="btn-close" @click="$emit('close')"><i class="ti ti-x"></i></button>
        </div>

        <div class="modal-body">
          <p class="muted-txt">Si eliges zonas y/o clientes, este usuario solo verá registros y empleados de los servicios que pertenezcan a ellos. Sin selección ve todo (según sus permisos). Los administradores siempre ven todo.</p>

          <div v-if="loading" class="muted-txt" style="padding:20px;text-align:center">Cargando...</div>
          <template v-else>
            <label class="lbl">Zonas <small>({{ zonas.length }} seleccionadas)</small></label>
            <div class="lista">
              <label v-for="z in opciones.zonas" :key="z.id" class="chk">
                <input type="checkbox" :value="z.id" v-model="zonas" /> <span>{{ z.nombre }}</span>
              </label>
            </div>

            <label class="lbl">Clientes <small>({{ clientes.length }} seleccionados)</small></label>
            <div class="lista">
              <label v-for="c in opciones.clientes" :key="c.id" class="chk">
                <input type="checkbox" :value="c.id" v-model="clientes" /> <span>{{ c.nombre }}</span>
              </label>
            </div>
            <p v-if="error" class="err">{{ error }}</p>
          </template>
        </div>

        <div class="modal-ftr">
          <button class="btn-sm" @click="zonas = []; clientes = []"><i class="ti ti-eraser"></i> Quitar restricción</button>
          <div style="display:flex;gap:8px">
            <button class="btn-sm" @click="$emit('close')">Cancelar</button>
            <button class="btn-primary" :disabled="guardando || loading" @click="guardar">{{ guardando ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usuariosService } from '@/services/usuarios.service.js'

const props = defineProps({ usuario: { type: Object, required: true } })
const emit = defineEmits(['close'])

const loading = ref(true), guardando = ref(false), error = ref('')
const zonas = ref([]), clientes = ref([])
const opciones = ref({ zonas: [], clientes: [] })

onMounted(async () => {
  try {
    const r = await usuariosService.getAlcance(props.usuario.id)
    zonas.value = r.zonas || []; clientes.value = r.clientes || []
    opciones.value = r.opciones || opciones.value
  } catch (e) { error.value = e.response?.data?.message || 'No se pudo cargar' }
  finally { loading.value = false }
})

async function guardar() {
  guardando.value = true; error.value = ''
  try { await usuariosService.setAlcance(props.usuario.id, zonas.value, clientes.value); emit('close') }
  catch (e) { error.value = e.response?.data?.message || 'No se pudo guardar' }
  finally { guardando.value = false }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 14px; width: 100%; max-width: 520px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 0.5px solid var(--bdr); }
.modal-hdr h2 { font-size: 15px; font-weight: 600; color: var(--tx0); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.modal-hdr h2 i { color: var(--acc); } .modal-hdr p { font-size: 12px; color: var(--tx2); }
.btn-close { width: 30px; height: 30px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx1); cursor: pointer; }
.modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.modal-ftr { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 20px; border-top: 0.5px solid var(--bdr); flex-wrap: wrap; }
.lbl { font-size: 12px; font-weight: 600; color: var(--tx0); margin-top: 6px; } .lbl small { font-weight: 400; color: var(--tx3); }
.lista { max-height: 170px; overflow-y: auto; border: 0.5px solid var(--bdr); border-radius: 8px; background: var(--bg2); }
.chk { display: flex; align-items: center; gap: 8px; padding: 7px 10px; font-size: 13px; color: var(--tx1); cursor: pointer; border-bottom: 0.5px solid var(--bdr); }
.chk:last-child { border-bottom: none; } .chk:hover { background: var(--bg3); }
.muted-txt { font-size: 12px; color: var(--tx3); line-height: 1.45; } .err { color: var(--red); font-size: 12px; }
.btn-sm { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: transparent; font-size: 12px; color: var(--tx1); cursor: pointer; font-family: inherit; }
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.btn-primary { padding: 7px 16px; border-radius: 8px; border: none; background: var(--acc); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
</style>
