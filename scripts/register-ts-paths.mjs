// Permite correr módulos de la app con `node --experimental-strip-types`:
// resuelve el alias `@/` a la raíz y los imports sin extensión a `.ts`.
// Uso: node --experimental-strip-types --import ./scripts/register-ts-paths.mjs <script.ts>
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null
    if (specifier.startsWith('@/')) {
      base = path.join(root, specifier.slice(2))
    } else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
    }

    if (base && !path.extname(base)) {
      for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
        if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context)
      }
    }
    if (base) return nextResolve(pathToFileURL(base).href, context)
    return nextResolve(specifier, context)
  },
})
