import Link from 'next/link'
import { Dumbbell } from 'lucide-react'
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <div className="crystal-surface space-y-6 rounded-2xl p-6 sm:p-8">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary crystal-highlight">
          <Dumbbell size={22} strokeWidth={1.75} className="text-text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-sm text-text-muted">
            Gym Routines · Sistema de entrenamiento
          </p>
        </div>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-highlight hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}
