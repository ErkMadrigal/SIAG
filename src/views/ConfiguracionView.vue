<template>
  <div class="config-view">

    <div class="view-header">
      <div>
        <h1 class="view-title">Configuración</h1>
        <p class="view-sub">Administra los parámetros y catálogos del sistema</p>
      </div>
    </div>

    <!-- Secciones -->
    <div class="config-grid">

      <!-- Multicatálogo -->
      <div class="config-card" @click="router.push('/catalogos')">
        <div class="config-icon blue">
          <i class="ti ti-list" aria-hidden="true"></i>
        </div>
        <div class="config-info">
          <h3>Multicatálogo</h3>
          <p>Podrás agregar datos para la asignación del empleado como horarios, turnos, bancos</p>
        </div>
        <i class="ti ti-chevron-right config-arrow" aria-hidden="true"></i>
      </div>

      <!-- Parámetros del sistema -->
      <div class="config-card" @click="router.push('/parametros')">
        <div class="config-icon amber">
          <i class="ti ti-building" aria-hidden="true"></i>
        </div>
        <div class="config-info">
          <h3>Parámetros del sistema</h3>
          <p>Podrás agregar ubicaciones, direcciones y nuevas empresas</p>
        </div>
        <i class="ti ti-chevron-right config-arrow" aria-hidden="true"></i>
      </div>

      <!-- Tabulador -->
      <div class="config-card" @click="router.push('/tabulador')">
        <div class="config-icon green">
          <i class="ti ti-ruler-2" aria-hidden="true"></i>
        </div>
        <div class="config-info">
          <h3>Tabulador de salarios</h3>
          <p>Gestiona sueldos, bonos y descuentos por zona y puesto</p>
        </div>
        <i class="ti ti-chevron-right config-arrow" aria-hidden="true"></i>
      </div>

      <!-- Roles y permisos -->
      <div class="config-card" @click="router.push('/colaboradores')">
        <div class="config-icon purple">
          <i class="ti ti-shield-lock" aria-hidden="true"></i>
        </div>
        <div class="config-info">
          <h3>Roles y permisos</h3>
          <p>Administra los accesos y permisos de los colaboradores del sistema</p>
        </div>
        <i class="ti ti-chevron-right config-arrow" aria-hidden="true"></i>
      </div>

      <!-- Próximamente -->
      <div class="config-card disabled">
        <div class="config-icon gray">
          <i class="ti ti-bell" aria-hidden="true"></i>
        </div>
        <div class="config-info">
          <h3>Notificaciones <span class="soon-badge">Próximamente</span></h3>
          <p>Configura alertas automáticas por correo o SMS para eventos del sistema</p>
        </div>
        <i class="ti ti-chevron-right config-arrow" aria-hidden="true"></i>
      </div>

      <div class="config-card disabled">
        <div class="config-icon gray">
          <i class="ti ti-palette" aria-hidden="true"></i>
        </div>
        <div class="config-info">
          <h3>Apariencia <span class="soon-badge">Próximamente</span></h3>
          <p>Personaliza colores, logo y nombre del sistema por empresa</p>
        </div>
        <i class="ti ti-chevron-right config-arrow" aria-hidden="true"></i>
      </div>

      <div class="config-card disabled">
        <div class="config-icon gray">
          <i class="ti ti-clock" aria-hidden="true"></i>
        </div>
        <div class="config-info">
          <h3>Horarios y turnos <span class="soon-badge">Próximamente</span></h3>
          <p>Define horarios laborales, descansos y reglas de asistencia</p>
        </div>
        <i class="ti ti-chevron-right config-arrow" aria-hidden="true"></i>
      </div>

      <div class="config-card disabled">
        <div class="config-icon gray">
          <i class="ti ti-lock" aria-hidden="true"></i>
        </div>
        <div class="config-info">
          <h3>Seguridad <span class="soon-badge">Próximamente</span></h3>
          <p>Políticas de contraseñas, 2FA y sesiones activas</p>
        </div>
        <i class="ti ti-chevron-right config-arrow" aria-hidden="true"></i>
      </div>

    </div>

    <!-- Info sistema -->
    <div class="system-info">
      <div class="sys-item">
        <i class="ti ti-server" aria-hidden="true"></i>
        <span class="sys-label">Sistema</span>
        <span class="sys-val">SIAG v1.0</span>
      </div>
      <div class="sys-sep"></div>
      <div class="sys-item">
        <i class="ti ti-database" aria-hidden="true"></i>
        <span class="sys-label">Base de datos</span>
        <span class="sys-val">MariaDB · RecursosHumanos</span>
      </div>
      <div class="sys-sep"></div>
      <div class="sys-item">
        <i class="ti ti-api" aria-hidden="true"></i>
        <span class="sys-label">API</span>
        <span class="sys-val">CodeIgniter 4 · 87 endpoints</span>
      </div>
      <div class="sys-sep"></div>
      <div class="sys-item">
        <i class="ti ti-shield-check" aria-hidden="true"></i>
        <span class="sys-label">Seguridad</span>
        <span class="sys-val">JWT · RS256 · 15 min</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'

const router = useRouter()
const ui     = useUiStore()

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Configuración', to: '/configuracion' }
  ])
})
</script>

<style scoped>
.config-view { display: flex; flex-direction: column; gap: 16px; }
.view-header { display: flex; align-items: center; justify-content: space-between; }
.view-title  { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub    { font-size: 12px; color: var(--tx2); margin-top: 3px; }

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
}

.config-card {
  display: flex; align-items: center; gap: 14px;
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 18px 16px;
  cursor: pointer; transition: all .15s;
}
.config-card:hover:not(.disabled) {
  border-color: var(--acc);
  background: var(--bg2);
}
.config-card.disabled {
  opacity: .55; cursor: default;
}
.config-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.config-icon.blue   { background: var(--acc-dim); color: var(--acc); }
.config-icon.green  { background: var(--grn-dim); color: var(--grn); }
.config-icon.amber  { background: var(--amb-dim); color: var(--amb); }
.config-icon.purple { background: #2d1b4d;        color: #a855f7;   }
.config-icon.gray   { background: var(--bg3);     color: var(--tx2); }

.config-info { flex: 1; min-width: 0; }
.config-info h3 {
  font-size: 14px; font-weight: 500; color: var(--tx0);
  margin-bottom: 4px; display: flex; align-items: center; gap: 8px;
}
.config-info p { font-size: 12px; color: var(--tx2); line-height: 1.5; }
.config-arrow { font-size: 16px; color: var(--tx3); flex-shrink: 0; }

.soon-badge {
  font-size: 10px; padding: 2px 6px; border-radius: 20px;
  background: var(--bg3); color: var(--tx2); font-weight: 400;
}

/* System info bar */
.system-info {
  display: flex; align-items: center; flex-wrap: wrap; gap: 0;
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 14px 20px; gap: 0;
}
.sys-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; flex: 1; min-width: 160px;
}
.sys-item i { font-size: 16px; color: var(--acc); }
.sys-label  { color: var(--tx2); }
.sys-val    { color: var(--tx0); font-weight: 500; }
.sys-sep {
  width: 0.5px; height: 24px; background: var(--bdr2); margin: 0 16px;
}

@media (max-width: 768px) {
  .config-grid   { grid-template-columns: 1fr; }
  .system-info   { flex-direction: column; align-items: flex-start; gap: 12px; }
  .sys-sep       { display: none; }
}
</style>