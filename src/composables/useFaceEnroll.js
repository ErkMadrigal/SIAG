// Enrolamiento facial con TensorFlow.js (face-api de vladmandic).
// Mismo modelo y umbrales que la app del kiosko, así los descriptores
// son intercambiables (128 valores, distancia euclidiana).
let faceapiPromise = null
let modelosListos = false

function cargarLib() {
  // import dinámico: la librería (~MBs) solo se baja cuando se enrola
  if (!faceapiPromise) faceapiPromise = import('@vladmandic/face-api')
  return faceapiPromise
}

export async function cargarModelos() {
  const faceapi = await cargarLib()
  if (modelosListos) return faceapi
  const ruta = `${import.meta.env.BASE_URL}models`
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(ruta),
    faceapi.nets.faceLandmark68Net.loadFromUri(ruta),
    faceapi.nets.faceRecognitionNet.loadFromUri(ruta),
  ])
  modelosListos = true
  return faceapi
}

export async function descriptorDesdeVideo(video) {
  const faceapi = await cargarModelos()
  const det = await faceapi
    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()
  return det ? Array.from(det.descriptor) : null
}

export async function abrirCamara(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  })
  video.srcObject = stream
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => video.play().then(resolve).catch(reject)
    setTimeout(() => reject(new Error('Timeout iniciando cámara')), 8000)
  })
  return stream
}

export function detenerCamara(stream) {
  stream?.getTracks().forEach(t => t.stop())
}

// Comparación idéntica a la del kiosko (tensorflow.service.ts):
// score = sqrt(1 - distancia); match si score >= 0.79 (distancia <= ~0.376)
export function compararDescriptores(a, b) {
  let suma = 0
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; suma += d * d }
  const distancia = Math.sqrt(suma)
  const score = Math.max(0, Math.min(1, Math.pow(1 - distancia, 0.5)))
  return { distancia, score, similar: score >= 0.79 }
}
