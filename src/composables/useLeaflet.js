// Carga Leaflet (OpenStreetMap) desde CDN solo cuando se necesita --
// evita tener que instalar la dependencia y no pesa en el bundle.
const CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

let promesa = null

export function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (promesa) return promesa

  promesa = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = CSS
      document.head.appendChild(link)
    }
    const s = document.createElement('script')
    s.src = JS
    s.onload  = () => resolve(window.L)
    s.onerror = () => { promesa = null; reject(new Error('No se pudo cargar el mapa (¿sin internet?)')) }
    document.head.appendChild(s)
  })
  return promesa
}
