/**
 * Búsqueda de ejercicios por texto.
 *
 * El catálogo importado guarda `name`, `equipment`, `target`, etc. en inglés
 * (dataset externo, ver CLAUDE.md §20), pero la UI y quien busca escriben en
 * español. Aquí se traduce la consulta antes de consultar la base:
 *
 *   1. Se normaliza (minúsculas, sin acentos).
 *   2. Se sustituyen frases conocidas ("peso muerto" -> "deadlift").
 *   3. Se separa en palabras, se descartan las vacías y se traduce cada una.
 *
 * El resultado son grupos de términos: dentro de un grupo se busca con OR
 * (sinónimos de la misma palabra) y entre grupos con AND (todas las palabras
 * de la consulta deben aparecer). Si eso no devuelve nada, quien consulta
 * puede reintentar con `terms` (OR de todo) para obtener resultados similares.
 */

const STOP_WORDS = new Set([
  'a',
  'al',
  'and',
  'con',
  'de',
  'del',
  'e',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'o',
  'of',
  'para',
  'por',
  'sin',
  'sobre',
  'the',
  'un',
  'una',
  'unos',
  'unas',
  'with',
  'y',
])

/** Frases en español -> equivalente en inglés del catálogo. */
const PHRASE_TRANSLATIONS: Array<[string, string]> = [
  ['peso muerto rumano', 'romanian deadlift'],
  ['peso muerto', 'deadlift'],
  ['peso corporal', 'body weight'],
  ['press de banca', 'bench press'],
  ['press banca', 'bench press'],
  ['press plano', 'bench press'],
  ['press inclinado', 'incline bench press'],
  ['press declinado', 'decline bench press'],
  ['banca inclinada', 'incline bench'],
  ['banca declinada', 'decline bench'],
  ['press militar', 'shoulder press'],
  ['press de hombro', 'shoulder press'],
  ['press de hombros', 'shoulder press'],
  ['press frances', 'triceps extension'],
  ['jalon al pecho', 'lat pulldown'],
  ['jalon frontal', 'lat pulldown'],
  ['jalon dorsal', 'lat pulldown'],
  ['jalon al triceps', 'triceps pushdown'],
  ['elevaciones laterales', 'lateral raise'],
  ['elevacion lateral', 'lateral raise'],
  ['elevaciones frontales', 'front raise'],
  ['elevacion frontal', 'front raise'],
  ['elevacion de talones', 'calf raise'],
  ['elevaciones de talones', 'calf raise'],
  ['elevacion de piernas', 'leg raise'],
  ['elevaciones de piernas', 'leg raise'],
  ['prensa de pierna', 'leg press'],
  ['prensa de piernas', 'leg press'],
  ['prensa 45', 'leg press'],
  ['extension de pierna', 'leg extension'],
  ['extension de piernas', 'leg extension'],
  ['extensiones de pierna', 'leg extension'],
  ['extension de triceps', 'triceps extension'],
  ['extension lumbar', 'back extension'],
  ['hiperextension lumbar', 'hyperextension'],
  ['curl femoral', 'leg curl'],
  ['curl de pierna', 'leg curl'],
  ['curl de biceps', 'biceps curl'],
  ['curl martillo', 'hammer curl'],
  ['patada de triceps', 'triceps kickback'],
  ['peck deck', 'seated fly'],
  ['pec deck', 'seated fly'],
  ['aperturas con mancuernas', 'dumbbell fly'],
  ['cruce de poleas', 'cable crossover'],
  ['cruces en polea', 'cable crossover'],
  ['remo con barra', 'barbell row'],
  ['remo con mancuerna', 'dumbbell row'],
  ['remo sentado', 'seated row'],
  ['remo en polea', 'cable row'],
  ['empuje de cadera', 'hip thrust'],
  ['puente de gluteos', 'glute bridge'],
  ['sentadilla bulgara', 'bulgarian split squat'],
  ['sentadilla hack', 'hack squat'],
  ['abduccion de cadera', 'hip abduction'],
  ['aduccion de cadera', 'hip adduction'],
  ['encogimiento de hombros', 'shrug'],
  ['encogimientos de hombros', 'shrug'],
  ['gemelos de pie', 'standing calf raise'],
  ['gemelos sentado', 'seated calf raise'],
  ['flexiones de pecho', 'push-up'],
  ['flexiones de brazos', 'push-up'],
  ['fondos en paralelas', 'dip'],
  ['plancha abdominal', 'plank'],
  ['silla romana', 'captains chair'],
  ['buenos dias', 'good morning'],
  ['salto al cajon', 'box jump'],
  ['cinta de correr', 'treadmill'],
  ['bicicleta estatica', 'stationary bike'],
  ['pesa rusa', 'kettlebell'],
  ['pesas rusas', 'kettlebell'],
  ['de pie', 'standing'],
]

// Se aplican de la frase más larga a la más corta para no romper una frase
// larga sustituyendo antes una de sus partes.
PHRASE_TRANSLATIONS.sort((a, b) => b[0].length - a[0].length)

/** Palabra en español -> términos equivalentes en el catálogo. */
const TOKEN_TRANSLATIONS: Record<string, string[]> = {
  // Movimientos
  sentadilla: ['squat'],
  sentadillas: ['squat'],
  zancada: ['lunge'],
  zancadas: ['lunge'],
  estocada: ['lunge'],
  estocadas: ['lunge'],
  desplante: ['lunge'],
  desplantes: ['lunge'],
  prensa: ['leg press', 'sled'],
  remo: ['row'],
  remos: ['row'],
  jalon: ['pulldown', 'pull'],
  jalones: ['pulldown', 'pull'],
  tiron: ['pull'],
  empuje: ['push', 'press'],
  extension: ['extension'],
  extensiones: ['extension'],
  flexion: ['push-up', 'push up', 'flexion'],
  flexiones: ['push-up', 'push up'],
  dominada: ['pull-up', 'pull up', 'chin-up'],
  dominadas: ['pull-up', 'pull up', 'chin-up'],
  fondo: ['dip'],
  fondos: ['dip'],
  paralelas: ['dip', 'parallel'],
  apertura: ['fly', 'flye'],
  aperturas: ['fly', 'flye'],
  cruce: ['crossover', 'fly'],
  cruces: ['crossover', 'fly'],
  contractora: ['seated fly', 'butterfly'],
  mariposa: ['butterfly', 'fly'],
  pajaro: ['reverse fly', 'rear delt'],
  encogimiento: ['shrug'],
  encogimientos: ['shrug'],
  elevacion: ['raise'],
  elevaciones: ['raise'],
  patada: ['kickback', 'kick'],
  patadas: ['kickback', 'kick'],
  subida: ['step-up', 'step up'],
  subidas: ['step-up', 'step up'],
  escalon: ['step-up', 'step'],
  plancha: ['plank'],
  puente: ['bridge', 'hip thrust'],
  giro: ['twist', 'rotation'],
  giros: ['twist', 'rotation'],
  rotacion: ['rotation', 'twist'],
  salto: ['jump'],
  saltos: ['jump'],
  saltar: ['jump'],
  comba: ['jump rope', 'rope'],
  correr: ['run', 'treadmill'],
  caminar: ['walk', 'treadmill'],
  estiramiento: ['stretch'],
  estiramientos: ['stretch'],
  hiperextension: ['hyperextension', 'back extension'],
  hiperextensiones: ['hyperextension', 'back extension'],
  abduccion: ['abduction', 'abductor'],
  abductora: ['abduction', 'abductor'],
  aduccion: ['adduction', 'adductor'],
  aductora: ['adduction', 'adductor'],
  muerto: ['deadlift'],
  peso: ['weight'],
  hack: ['hack squat'],
  arranque: ['snatch'],
  cargada: ['clean'],

  // Zonas y músculos
  pecho: ['chest', 'pectoral'],
  pectoral: ['chest', 'pectoral'],
  pectorales: ['chest', 'pectoral'],
  espalda: ['back', 'lat'],
  dorsal: ['lat', 'back'],
  dorsales: ['lat', 'back'],
  hombro: ['shoulder', 'deltoid', 'delts'],
  hombros: ['shoulder', 'deltoid', 'delts'],
  deltoide: ['deltoid', 'shoulder'],
  deltoides: ['deltoid', 'shoulder'],
  brazo: ['arm'],
  brazos: ['arm'],
  biceps: ['biceps', 'curl'],
  triceps: ['triceps'],
  antebrazo: ['forearm', 'wrist'],
  antebrazos: ['forearm', 'wrist'],
  pierna: ['leg'],
  piernas: ['leg'],
  cuadriceps: ['quadriceps', 'quads', 'leg extension'],
  femoral: ['hamstring', 'leg curl'],
  femorales: ['hamstring', 'leg curl'],
  isquiotibiales: ['hamstring'],
  gluteo: ['glute', 'hip'],
  gluteos: ['glute', 'hip'],
  cadera: ['hip'],
  gemelo: ['calf', 'calves'],
  gemelos: ['calf', 'calves'],
  pantorrilla: ['calf', 'calves'],
  pantorrillas: ['calf', 'calves'],
  talon: ['calf'],
  talones: ['calf'],
  abdomen: ['abs', 'waist', 'crunch'],
  abdominal: ['abs', 'crunch', 'sit-up'],
  abdominales: ['abs', 'crunch', 'sit-up'],
  core: ['abs', 'waist'],
  oblicuo: ['oblique', 'twist'],
  oblicuos: ['oblique', 'twist'],
  lumbar: ['lower back', 'hyperextension'],
  lumbares: ['lower back', 'hyperextension'],
  trapecio: ['trap', 'shrug', 'upper back'],
  trapecios: ['trap', 'shrug', 'upper back'],
  cuello: ['neck'],
  muneca: ['wrist'],
  munecas: ['wrist'],
  rodilla: ['knee'],
  rodillas: ['knee'],
  tobillo: ['ankle'],
  tobillos: ['ankle'],

  // Material
  mancuerna: ['dumbbell'],
  mancuernas: ['dumbbell'],
  barra: ['barbell', 'bar'],
  barras: ['barbell', 'bar'],
  polea: ['cable', 'pulley'],
  poleas: ['cable', 'pulley'],
  maquina: ['machine', 'lever', 'smith', 'sled'],
  maquinas: ['machine', 'lever', 'smith', 'sled'],
  multipower: ['smith'],
  banco: ['bench'],
  banca: ['bench'],
  cuerda: ['rope'],
  banda: ['band'],
  bandas: ['band'],
  liga: ['band'],
  ligas: ['band'],
  disco: ['plate', 'weighted'],
  discos: ['plate', 'weighted'],
  balon: ['ball'],
  pelota: ['ball'],
  fitball: ['stability ball', 'exercise ball'],
  caminadora: ['treadmill'],
  trotadora: ['treadmill'],
  cinta: ['treadmill'],
  bicicleta: ['bike', 'cycle'],
  bici: ['bike', 'cycle'],
  eliptica: ['elliptical'],
  remadora: ['rowing', 'row'],
  escaladora: ['stair', 'stepmill'],
  escalera: ['stair', 'step'],

  // Erratas frecuentes al escribir el término en inglés
  dumble: ['dumbbell'],
  dumbell: ['dumbbell'],
  dumbel: ['dumbbell'],
  barbel: ['barbell'],
  leaver: ['lever'],
  machina: ['machine'],

  // Variantes y posiciones
  frontal: ['front'],
  frontales: ['front'],
  lateral: ['lateral', 'side'],
  laterales: ['lateral', 'side'],
  posterior: ['rear', 'reverse'],
  militar: ['military', 'shoulder press', 'overhead'],
  frances: ['skull', 'triceps extension', 'french'],
  francesa: ['skull', 'triceps extension', 'french'],
  martillo: ['hammer'],
  concentrado: ['concentration'],
  predicador: ['preacher'],
  scott: ['preacher'],
  inclinado: ['incline', 'bent over', 'bent-over'],
  inclinada: ['incline', 'bent over', 'bent-over'],
  declinado: ['decline'],
  declinada: ['decline'],
  plano: ['flat', 'bench'],
  plana: ['flat', 'bench'],
  sentado: ['seated'],
  sentada: ['seated'],
  acostado: ['lying'],
  acostada: ['lying'],
  tumbado: ['lying'],
  tumbada: ['lying'],
  recostado: ['lying', 'reclining'],
  arrodillado: ['kneeling'],
  parado: ['standing'],
  pie: ['standing'],
  unilateral: ['single', 'one arm', 'single arm'],
  alterno: ['alternate', 'alternating'],
  alternado: ['alternate', 'alternating'],
  agarre: ['grip'],
  cerrado: ['close'],
  abierto: ['wide'],
  ancho: ['wide'],
  supino: ['supine', 'underhand'],
  prono: ['prone', 'overhand'],
  neutro: ['neutral', 'hammer'],
  rumano: ['romanian'],
  rumana: ['romanian'],
  bulgara: ['bulgarian', 'split squat'],
  bulgaro: ['bulgarian', 'split squat'],
}

export type SearchPlan = {
  /**
   * Lo escrito, traducido palabra por palabra y en el mismo orden
   * ("dumble seated" -> "dumbbell seated"). Sirve para dar prioridad a los
   * nombres que contienen la secuencia tal cual se escribió.
   */
  phrase: string
  /** OR dentro de cada grupo, AND entre grupos. */
  groups: string[][]
  /** Todos los términos juntos, para una búsqueda laxa (OR). */
  terms: string[]
}

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Limpia un término para usarlo dentro de un filtro `or` de PostgREST:
 * las comas y paréntesis separan condiciones y `%` es el comodín del ilike.
 */
function sanitizeTerm(term: string): string {
  return term.replace(/[%,()"\\*]/g, ' ').replace(/\s+/g, ' ').trim()
}

function singularize(token: string): string {
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2)
  if (token.endsWith('s') && token.length > 3) return token.slice(0, -1)
  return token
}

function translationsFor(token: string): string[] | undefined {
  return TOKEN_TRANSLATIONS[token] ?? TOKEN_TRANSLATIONS[singularize(token)]
}

function expandToken(token: string): string[] {
  const terms = new Set<string>([token])
  const translations = translationsFor(token)

  if (translations) {
    terms.add(singularize(token))
    translations.forEach((term) => terms.add(term))
  }

  return Array.from(terms)
}

/** Traducción principal de la palabra, o la palabra tal cual si no la hay. */
function preferredTerm(token: string): string {
  return translationsFor(token)?.[0] ?? token
}

function translatePhrases(value: string): string {
  let result = value
  for (const [phrase, replacement] of PHRASE_TRANSLATIONS) {
    if (result.includes(phrase)) result = result.replaceAll(phrase, replacement)
  }
  return result
}

/**
 * Convierte el texto buscado en grupos de términos listos para la consulta.
 * Devuelve null si no queda nada buscable.
 */
export function buildSearchPlan(search: string): SearchPlan | null {
  const normalized = normalizeSearch(search)
  if (!normalized) return null

  const tokens = translatePhrases(normalized)
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))

  const groups = tokens
    .map((token) =>
      Array.from(
        new Set(expandToken(token).map(sanitizeTerm).filter(Boolean))
      )
    )
    .filter((group) => group.length > 0)

  if (groups.length === 0) return null

  return {
    phrase: sanitizeTerm(tokens.map(preferredTerm).join(' ')),
    groups,
    terms: Array.from(new Set(groups.flat())),
  }
}
