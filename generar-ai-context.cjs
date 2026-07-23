const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'AI_CONTEXT');

const IGNORE_DIRS = new Set([
  'node_modules', 'dist', '.git', '.vscode', '.idea',
  'coverage', 'android', 'ios', 'AI_CONTEXT'
]);

const IGNORE_EXT = new Set([
  '.png','.jpg','.jpeg','.gif','.svg','.webp','.ico',
  '.pdf','.xlsx','.xls','.docx','.zip','.rar',
  '.mp4','.mp3','.ttf','.woff','.woff2'
]);

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
}

function walk(dir, files=[]){
  const items = fs.readdirSync(dir);

  for(const item of items){
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if(stat.isDirectory()){
      if(!IGNORE_DIRS.has(item)) walk(full, files);
    }else{
      if(!IGNORE_EXT.has(path.extname(item).toLowerCase())){
        files.push(full);
      }
    }
  }

  return files;
}

function write(file, content){
  fs.writeFileSync(path.join(OUT, file), content, 'utf8');
}

function append(file, content){
  fs.appendFileSync(path.join(OUT, file), content, 'utf8');
}

function readSafe(file){
  try{
    return fs.readFileSync(file, 'utf8');
  }catch{
    return '';
  }
}

function addFileSection(outFile, file){
  const rel = path.relative(ROOT, file).replace(/\\\\/g,'/');
  const code = readSafe(file);

  append(outFile, `\n\n==================================================\n`);
  append(outFile, `ARCHIVO: ${rel}\n`);
  append(outFile, `==================================================\n\n`);
  append(outFile, code);
}

// Crear carpeta salida
ensureDir(OUT);

// ===== 00 RESUMEN =====
const pkgPath = path.join(ROOT, 'package.json');
let pkg = {};
if(fs.existsSync(pkgPath)){
  pkg = JSON.parse(readSafe(pkgPath));
}

write('00_RESUMEN.md', `# Resumen del Proyecto\n\n` +
`Nombre: ${pkg.name || 'Proyecto Vue'}\n\n` +
`Framework: Vue 3 + Vite\n\n` +
`Dependencias principales:\n` +
Object.keys(pkg.dependencies || {}).map(d=>`- ${d}`).join('\n')
);

// ===== 01 ESTRUCTURA =====
const allFiles = walk(ROOT);
write('01_ESTRUCTURA.txt', allFiles
  .map(f => path.relative(ROOT, f).replace(/\\\\/g,'/'))
  .join('\n'));

// ===== 02 PACKAGE =====
if(fs.existsSync(pkgPath)){
  write('02_PACKAGE.md', '```json\n' + readSafe(pkgPath) + '\n```');
}

// ===== Clasificación =====
const groups = {
  router: [],
  stores: [],
  services: [],
  composables: [],
  views: [],
  components: [],
  utils: [],
  config: []
};

for(const file of allFiles){
  const rel = path.relative(ROOT, file).replace(/\\\\/g,'/');

  if(rel.startsWith('src/router/')) groups.router.push(file);
  else if(rel.startsWith('src/stores/')) groups.stores.push(file);
  else if(rel.startsWith('src/services/')) groups.services.push(file);
  else if(rel.startsWith('src/composables/')) groups.composables.push(file);
  else if(rel.startsWith('src/views/')) groups.views.push(file);
  else if(rel.startsWith('src/components/')) groups.components.push(file);
  else if(rel.startsWith('src/utils/')) groups.utils.push(file);
  else if(rel.includes('vite.config') || rel.includes('main.ts') || rel.includes('main.js') || rel.includes('App.vue')) groups.config.push(file);
}

const filesMap = [
  ['03_ROUTER.md', groups.router],
  ['04_STORES.md', groups.stores],
  ['05_SERVICES.md', groups.services],
  ['06_COMPOSABLES.md', groups.composables],
  ['07_VIEWS.md', groups.views],
  ['08_COMPONENTS.md', groups.components],
  ['09_UTILS.md', groups.utils],
  ['10_CONFIG.md', groups.config],
];

for(const [out, arr] of filesMap){
  write(out, `# ${out}\n`);
  arr.forEach(f => addFileSection(out, f));
}

// ===== Estadísticas =====
let totalLines = 0;
for(const f of allFiles){
  totalLines += readSafe(f).split(/\r?\n/).length;
}

write('11_ESTADISTICAS.md', `# Estadísticas\n\n` +
`- Archivos analizados: ${allFiles.length}\n` +
`- Views: ${groups.views.length}\n` +
`- Components: ${groups.components.length}\n` +
`- Stores: ${groups.stores.length}\n` +
`- Services: ${groups.services.length}\n` +
`- Composables: ${groups.composables.length}\n` +
`- Utils: ${groups.utils.length}\n` +
`- Líneas aproximadas: ${totalLines}\n`
);

// ===== Dependencias =====
write('12_DEPENDENCIAS.md', Object.entries(pkg.dependencies || {})
  .map(([k,v])=>`- ${k}: ${v}`)
  .join('\n'));

// ===== Prompt Claude =====
write('PROMPT_CLAUDE.md', `# Instrucciones para Claude\n\n` +
`Analiza este proyecto como un Arquitecto Senior de Vue 3.\n\n` +
`Orden de análisis:\n` +
`1. 00_RESUMEN.md\n` +
`2. 02_PACKAGE.md\n` +
`3. 03_ROUTER.md\n` +
`4. 04_STORES.md\n` +
`5. 05_SERVICES.md\n` +
`6. 06_COMPOSABLES.md\n` +
`7. 07_VIEWS.md\n` +
`8. 08_COMPONENTS.md\n\n` +
`Detecta:\n` +
`- Código duplicado\n` +
`- Componentes muertos\n` +
`- Imports innecesarios\n` +
`- Dependencias circulares\n` +
`- Problemas de rendimiento\n` +
`- Problemas de arquitectura\n` +
`- Problemas de escalabilidad\n` +
`- Problemas de seguridad\n\n` +
`Finalmente genera un resumen completo del funcionamiento de la aplicación.\n`
);

console.log('=========================================');
console.log('AI_CONTEXT generado correctamente');
console.log('Ruta:', OUT);
console.log('=========================================');