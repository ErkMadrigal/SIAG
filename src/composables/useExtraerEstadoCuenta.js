// Extrae CLABE y titular de un estado de cuenta (PDF con texto, PDF escaneado
// o foto). Todo en el navegador: pdf.js para la capa de texto y Tesseract.js
// (OCR) cuando el PDF es solo una imagen. Se cargan bajo demanda (pesan).
const PDF_TEXTO_MINIMO_UTIL = 25

async function cargarPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  return pdfjs
}

async function leerTextoPdf(pdfjs, arrayBuffer) {
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)           // en la pág. 1 viven CLABE y titular
  const content = await page.getTextContent()

  const items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: Math.round(it.transform[5]) }))
  items.sort((a, b) => (b.y - a.y) || (a.x - b.x))

  let texto = ''
  let yActual = null
  items.forEach(it => {
    if (yActual === null || Math.abs(it.y - yActual) > 2) { texto += '\n'; yActual = it.y }
    else texto += ' '
    texto += it.str
  })
  return texto
}

async function renderizarPagina(pdfjs, arrayBuffer) {
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

async function ocr(imagen) {
  const Tesseract = (await import('tesseract.js')).default
  const { data: { text } } = await Tesseract.recognize(imagen, 'spa+eng')
  return text
}

// Dígito verificador de la CLABE (pesos 3-7-1, módulo 10)
export function validarClabe(clabe) {
  if (!/^\d{18}$/.test(clabe)) return false
  const pesos = [3, 7, 1]
  let suma = 0
  for (let i = 0; i < 17; i++) suma += (parseInt(clabe[i], 10) * pesos[i % 3]) % 10
  return ((10 - (suma % 10)) % 10) === parseInt(clabe[17], 10)
}

function extraerClabe(texto) {
  const etiquetada = texto.match(/CLABE\s*[:\-]?\s*(\d{3})\s*(\d{3})\s*(\d{11})\s*(\d{1})\b/i)
  if (etiquetada) return etiquetada[1] + etiquetada[2] + etiquetada[3] + etiquetada[4]

  const corridas = texto.match(/(?:\d[\s-]*){18}/g) || []
  for (const c of corridas) {
    const limpia = c.replace(/\D/g, '')
    if (limpia.length === 18 && validarClabe(limpia)) return limpia
  }
  const simple = texto.match(/\b\d{18}\b/)   // último respaldo, sin validar
  return simple ? simple[0] : null
}

function limpiarNombre(t) {
  let n = t.trim().replace(/\s+/g, ' ')
  const cortes = ['PRIV', 'CALLE', 'AV', 'BLVD', 'COL', 'FRACC', 'MEXICO', 'CP', 'C.P', 'NO.', 'PERIODO',
                  'FECHA', 'ESTADO', 'CUENTA', 'CLIENTE', 'SUCURSAL']
  const palabras = n.split(' ')
  const idx = palabras.findIndex(p => cortes.includes(p.toUpperCase()))
  if (idx > 0) n = palabras.slice(0, idx).join(' ')
  return n.trim()
}

function extraerNombre(texto) {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const directos = [
    /Nombre del Receptor\s*:?\s*([A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚ\s]{6,60})/i,
    /(?:Titular|A nombre de)\s*:?\s*([A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚ\s]{6,60})/i,
  ]
  for (const re of directos) {
    const m = texto.match(re)
    if (m && m[1]) return limpiarNombre(m[1])
  }
  // Primera línea en mayúsculas (2-5 palabras) seguida de un renglón de domicilio
  const dom = /^(PRIV|CALLE|AV\.?|AVE|BLVD|COL\.?|FRACC|LOC|CALZ)\b/i
  const soloLetras = /^[A-ZÑÁÉÍÓÚ]{2,}(\s+[A-ZÑÁÉÍÓÚ]{2,}){1,4}$/
  for (let i = 0; i < lineas.length - 1; i++) {
    if (soloLetras.test(lineas[i]) && dom.test(lineas[i + 1])) return lineas[i]
  }
  return null
}

/**
 * @param {File} file PDF, JPG o PNG
 * @param {(msg:string)=>void} [onProgreso]
 * @returns {{clabe:string|null, nombre:string|null}}
 */
export async function extraerDatosEstadoCuenta(file, onProgreso = () => {}) {
  const esPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')
  let texto = ''

  if (esPdf) {
    onProgreso('Leyendo PDF...')
    const pdfjs = await cargarPdfjs()
    const buffer = await file.arrayBuffer()
    texto = await leerTextoPdf(pdfjs, buffer.slice(0))
    if (texto.trim().length < PDF_TEXTO_MINIMO_UTIL) {
      onProgreso('El PDF es una imagen; leyendo con OCR (puede tardar unos segundos)...')
      const img = await renderizarPagina(pdfjs, buffer.slice(0))
      texto = await ocr(img)
    }
  } else {
    onProgreso('Leyendo imagen con OCR (puede tardar unos segundos)...')
    texto = await ocr(file)
  }

  return { clabe: extraerClabe(texto), nombre: extraerNombre(texto) }
}

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

// ¿El titular del documento corresponde al empleado? (al menos 2 palabras en común)
export function coincideTitular(detectado, empleadoNombre) {
  if (!detectado) return null
  const tokensEmp = new Set(norm(empleadoNombre).split(/\s+/).filter(t => t.length >= 3))
  const tokensDet = norm(detectado).split(/\s+/).filter(t => t.length >= 3)
  if (!tokensDet.length) return null
  const comunes = tokensDet.filter(t => tokensEmp.has(t)).length
  return comunes >= Math.min(2, tokensDet.length)
}
