import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { listTemplates } from '@/lib/data/templates'
import { CreateTemplateForm } from '@/components/templates/create-template-form'

export default async function TemplatesPage() {
  const templates = await listTemplates()

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Plantillas</h1>

      <CreateTemplateForm />

      {templates.length === 0 ? (
        <div className="crystal-surface rounded-2xl p-6 text-center">
          <p className="text-text-secondary">Aún no tienes plantillas.</p>
          <p className="mt-1 text-sm text-text-muted">
            Crea tu primera rutina (Push, Pull, Legs…).
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/templates/${t.id}`}
                className="crystal-surface flex items-center justify-between rounded-2xl p-4 transition-colors hover:border-highlight/30"
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-text-muted">
                    {t.exerciseCount}{' '}
                    {t.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                  </p>
                </div>
                <ChevronRight size={20} className="text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
