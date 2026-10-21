// Detecta los datos de un empleado a partir de texto libre ("Etiqueta: valor") o JSON.
// Devuelve registros con los campos del formulario de alta; los catálogos (sangre,
// escolaridad, parentesco...) se resuelven contra los catálogos reales.

const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const key  = s => norm(s).replace(/[^a-z0-9]/g, '')
const upper = s => String(s ?? '').trim().toUpperCase()

// alias de etiqueta (ya normalizada con key()) → campo
const ALIAS = {
  nombre: 'nombre', nombres: 'nombre', nombrecompleto: 'nombreCompleto', empleado: 'nombreCompleto', colaborador: 'nombreCompleto',
  paterno: 'paterno', apellidopaterno: 'paterno', materno: 'materno', apellidomaterno: 'materno',
  tipodesangre: 'tipoSangre', tiposangre: 'tipoSangre', sangre: 'tipoSangre', gruposanguineo: 'tipoSangre',
  escolaridad: 'escolaridad', estudios: 'escolaridad', gradodeestudios: 'escolaridad',
  alergias: 'alergias', alergia: 'alergias',
  numerodeemergencia: 'telefonoEmergencia', telefonodeemergencia: 'telefonoEmergencia', telefonoemergencia: 'telefonoEmergencia',
  numeroemergencia: 'telefonoEmergencia', telemergencia: 'telefonoEmergencia', celularemergencia: 'telefonoEmergencia',
  emergencia: 'telefonoEmergencia', telefono: 'telefonoEmergencia', celular: 'telefonoEmergencia',
  contactodeemergencia: 'nombreEmergencia', nombreemergencia: 'nombreEmergencia', contacto: 'nombreEmergencia',
  parentesco: 'parentesco',
  clabe: 'interbancaria', clabeinterbancaria: 'interbancaria', interbancaria: 'interbancaria', cuentaclabe: 'interbancaria',
  banco: 'banco', institucionbancaria: 'banco',
  nss: 'nss', numerosegurosocial: 'nss', segurosocial: 'nss', numerodeseguro: 'nss', imss: 'nss', numeroimss: 'nss',
  cp: 'cp', codigopostal: 'cp', cpfiscal: 'cp', codigopostalfiscal: 'cp',
  curp: 'curp', rfc: 'rfc',
  ingreso: 'fecha_ingreso', fechadeingreso: 'fecha_ingreso', fechaingreso: 'fecha_ingreso', ingresoel: 'fecha_ingreso', fechadealta: 'fecha_ingreso',
  turno: 'turnoTxt', puesto: 'puestoTxt', periodicidad: 'periodicidadTxt',
  salario: 'salario_mensual', salariomensual: 'salario_mensual', sueldo: 'salario_mensual',
}

const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 }

export function parseFecha(txt) {
  const t = norm(txt)
  let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = t.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = t.match(/(\d{1,2})\s*(?:de\s+)?([a-z]+)\s*(?:del?\s+)?(\d{4})/)
  if (m && MESES[m[2]]) return `${m[3]}-${String(MESES[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return ''
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa', 'mc', 'van', 'von', 'da', 'di'])

// Separa "José Luis Rodríguez" en nombre / paterno / materno. La CURP ayuda:
// letras 1-2 = paterno, 3 = materno (X si no tiene).
export function separarNombre(completo, curp = '') {
  const toks = String(completo || '').trim().split(/\s+/).filter(Boolean)
  if (!toks.length) return { nombre: '', paterno: '', materno: '' }
  if (toks.length === 1) return { nombre: upper(toks[0]), paterno: '', materno: '' }

  // agrupa partículas con la palabra siguiente ("DE LA CRUZ")
  const grupos = []
  for (let i = 0; i < toks.length; i++) {
    let g = toks[i]
    while (PARTICULAS.has(norm(toks[i])) && i < toks.length - 1) { i++; g += ' ' + toks[i] }
    grupos.push(g)
  }
  const n = grupos.length
  if (n === 2) return { nombre: upper(grupos[0]), paterno: upper(grupos[1]), materno: '' }

  const c = upper(curp)
  let tieneMaterno = n >= 4 ? true : true
  if (c.length >= 3) {
    if (c[2] === 'X') tieneMaterno = false
    else {
      // ¿la inicial del último grupo coincide con la 3ª letra de la CURP?
      tieneMaterno = norm(grupos[n - 1])[0] === c[2].toLowerCase() || norm(grupos[n - 1])[0] !== norm(c[0] + c[1])[0]
      if (norm(grupos[n - 1]).slice(0, 2) === c.slice(0, 2).toLowerCase()) tieneMaterno = false
    }
  } else if (n === 3) {
    tieneMaterno = true
  }
  if (tieneMaterno) return { nombre: upper(grupos.slice(0, n - 2).join(' ')), paterno: upper(grupos[n - 2]), materno: upper(grupos[n - 1]) }
  return { nombre: upper(grupos.slice(0, n - 1).join(' ')), paterno: upper(grupos[n - 1]), materno: '' }
}

const esCurp = v => /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v)
const esRfc  = v => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v)

function crudoDeTexto(texto) {
  const r = { _extras: [] }
  let sinEtiqueta = []
  texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(linea => {
    const m = linea.match(/^([^:=]{1,40})[:=]\s*(.*)$/)
    if (m) {
      const campo = ALIAS[key(m[1])]
      const val = m[2].trim()
      if (campo) {
        // CURP y RFC pueden venir mal etiquetados: se clasifican por patrón después
        if ((campo === 'curp' || campo === 'rfc')) (r._codigos ??= []).push(upper(val).replace(/[\s-]/g, ''))
        else if (r[campo] === undefined) r[campo] = val
      } else r._extras.push(linea)
    } else {
      const mi = linea.match(/^ingres[oó]\s+(?:el\s+)?(.+)$/i)
      if (mi && r.fecha_ingreso === undefined) r.fecha_ingreso = mi[1]
      else sinEtiqueta.push(linea)
    }
  })
  // línea sin etiqueta → nombre (la primera) o código
  sinEtiqueta.forEach(l => {
    const v = upper(l).replace(/[\s-]/g, '')
    if (esCurp(v) || esRfc(v)) (r._codigos ??= []).push(v)
    else if (!r.nombreCompleto && !r.nombre) r.nombreCompleto = l
  })
  return r
}

function resolverCodigos(r) {
  ;(r._codigos || []).forEach(v => {
    if (esCurp(v) || v.length === 18) r.curp = r.curp || v
    else if (esRfc(v) || v.length === 12 || v.length === 13) r.rfc = r.rfc || v
    else r._extras.push(v)
  })
  delete r._codigos
}

// Parte el texto en varios empleados: bloques separados por línea en blanco (si cada uno trae CURP o nombre)
function bloques(texto) {
  const partes = texto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return partes.length > 1 ? partes : [texto]
}

function buscarEnCatalogo(lista, texto) {
  const t = key(texto)
  if (!t) return null
  const exacto = lista.find(o => key(o.valor) === t)
  if (exacto) return exacto
  return lista.find(o => key(o.valor).includes(t) || t.includes(key(o.valor))) || null
}

export function normalizarSangre(txt) {
  const t = upper(txt).replace(/[\s()]/g, '').replace('POSITIVO', '+').replace('NEGATIVO', '-')
  const m = t.match(/^(AB|A|B|O)([+-])$/)
  return m ? m[1] + m[2] : t
}

// Convierte un crudo en registro del formulario
function aRegistro(r, cats) {
  const reg = {
    nombre: '', paterno: '', materno: '', curp: '', rfc: '', nss: '', cp: '', alergias: '',
    escolaridad: '', tipoSangre: '', nombreEmergencia: '', telefonoEmergencia: '', parentesco: '',
    turno: '', puesto: '', periodicidad: '', fecha_ingreso: '', interbancaria: '', banco: '', bancoNombre: '',
    modo_sueldo: 'tabulador', salario_mensual: '',
  }
  resolverCodigos(r)
  reg.curp = upper(r.curp).replace(/[\s-]/g, '')
  reg.rfc  = upper(r.rfc).replace(/[\s-]/g, '')

  if (r.nombreCompleto) Object.assign(reg, separarNombre(r.nombreCompleto, reg.curp))
  if (r.nombre) reg.nombre = upper(r.nombre)
  if (r.paterno) reg.paterno = upper(r.paterno)
  if (r.materno) reg.materno = upper(r.materno)

  reg.nss = String(r.nss ?? '').replace(/\D/g, '')
  reg.cp  = String(r.cp ?? '').replace(/\D/g, '')
  reg.interbancaria = String(r.interbancaria ?? '').replace(/\D/g, '')
  reg.telefonoEmergencia = String(r.telefonoEmergencia ?? '').replace(/\D/g, '').slice(-10)
  reg.alergias = upper(r.alergias || 'NINGUNA')
  if (/^(ninguna|no|n\/a|na|sin|ninguno)$/i.test(norm(reg.alergias))) reg.alergias = 'NINGUNA'
  reg.fecha_ingreso = r.fecha_ingreso ? parseFecha(r.fecha_ingreso) : ''
  if (r.salario_mensual) { reg.salario_mensual = String(r.salario_mensual).replace(/[^\d.]/g, ''); reg.modo_sueldo = 'salario' }
  reg.bancoNombre = r.banco ? upper(r.banco) : ''

  // Catálogos
  if (r.tipoSangre) { const o = buscarEnCatalogo(cats.tipoSangre, normalizarSangre(r.tipoSangre)); reg.tipoSangre = o ? o.id : '' }
  if (r.escolaridad) { const o = buscarEnCatalogo(cats.escolaridad, r.escolaridad); reg.escolaridad = o ? o.id : '' }
  if (r.turnoTxt)    { const o = buscarEnCatalogo(cats.turno, r.turnoTxt); reg.turno = o ? o.id : '' }
  if (r.periodicidadTxt) { const o = buscarEnCatalogo(cats.periodicidad, r.periodicidadTxt); reg.periodicidad = o ? o.id : '' }
  const p = buscarEnCatalogo(cats.puesto, r.puestoTxt || 'GUARDIA'); reg.puesto = p ? p.id : ''

  // Parentesco: "hija Lorena Rodríguez" → parentesco + nombre del contacto
  if (r.parentesco) {
    const palabras = String(r.parentesco).trim().split(/\s+/)
    let hallado = null, usadas = 0
    // primero coincidencia exacta de 2 palabras ("tío abuelo"), luego la primera palabra
    if (palabras.length >= 2) {
      const dos = key(palabras.slice(0, 2).join(' '))
      const c2 = cats.parentesco.find(o => key(o.valor) === dos)
      if (c2) { hallado = c2; usadas = 2 }
    }
    if (!hallado) {
      const c1 = buscarEnCatalogo(cats.parentesco, palabras[0])
      if (c1 && key(c1.valor).length >= 3) { hallado = c1; usadas = 1 }
    }
    if (hallado) {
      reg.parentesco = hallado.id
      const resto = palabras.slice(usadas).join(' ').replace(/^(de|del)\s+/i, '')
      if (resto) reg.nombreEmergencia = upper(resto)
    } else reg.nombreEmergencia = upper(r.parentesco)
  }
  if (r.nombreEmergencia) reg.nombreEmergencia = upper(r.nombreEmergencia)
  reg._extras = r._extras || []
  return reg
}

// Aliases de JSON: normaliza las llaves y arma el "crudo"
function crudoDeJson(obj) {
  const r = { _extras: [] }
  Object.entries(obj).forEach(([k, v]) => {
    if (v === null || typeof v === 'object') return
    const campo = ALIAS[key(k)] || (['nombre', 'paterno', 'materno', 'turno', 'puesto', 'periodicidad'].includes(key(k)) ? key(k) : null)
    if (!campo) { r._extras.push(`${k}: ${v}`); return }
    if (campo === 'curp' || campo === 'rfc') (r._codigos ??= []).push(upper(v).replace(/[\s-]/g, ''))
    else r[campo] = String(v)
  })
  return r
}

export function detectarEmpleados(entrada, cats) {
  const texto = String(entrada || '').trim()
  if (!texto) return []
  if (/^[\[{]/.test(texto)) {
    try {
      const j = JSON.parse(texto)
      const arr = Array.isArray(j) ? j : (Array.isArray(j.empleados) ? j.empleados : [j])
      return arr.filter(o => o && typeof o === 'object').map(o => aRegistro(crudoDeJson(o), cats))
    } catch { /* si no es JSON válido se trata como texto */ }
  }
  return bloques(texto).map(b => aRegistro(crudoDeTexto(b), cats))
}

// Validaciones iguales a las del servidor
export function validarRegistro(reg) {
  const e = {}
  if (!reg.nombre) e.nombre = 'Falta el nombre'
  if (!reg.paterno) e.paterno = 'Falta el apellido paterno'
  if (reg.curp.length !== 18) e.curp = `CURP debe tener 18 caracteres (tiene ${reg.curp.length})`
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(reg.rfc)) e.rfc = 'RFC inválido (12 o 13 caracteres)'
  if (!/^\d{11}$/.test(reg.nss)) e.nss = `NSS debe tener 11 dígitos (tiene ${reg.nss.length})`
  if (!/^\d{5}$/.test(reg.cp)) e.cp = 'C.P. debe tener 5 dígitos'
  if (reg.interbancaria.length !== 18) e.interbancaria = `CLABE debe tener 18 dígitos (tiene ${reg.interbancaria.length})`
  if (!reg.turno) e.turno = 'Falta el turno'
  if (!reg.puesto) e.puesto = 'Falta el puesto'
  if (!reg.periodicidad) e.periodicidad = 'Falta la periodicidad'
  if (!reg.escolaridad) e.escolaridad = 'Escolaridad no reconocida'
  if (!reg.tipoSangre) e.tipoSangre = 'Tipo de sangre no reconocido'
  if (!reg.nombreEmergencia) e.nombreEmergencia = 'Falta el contacto de emergencia'
  if (!/^\d{10}$/.test(reg.telefonoEmergencia)) e.telefonoEmergencia = 'Teléfono de 10 dígitos'
  if (!reg.parentesco) e.parentesco = 'Parentesco no reconocido'
  return e
}
