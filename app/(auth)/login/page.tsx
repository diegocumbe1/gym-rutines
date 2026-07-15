import Link from 'next/link'
import { Dumbbell } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="crystal-surface space-y-6 rounded-2xl p-6 sm:p-8">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary crystal-highlight">
          <Dumbbell size={22} strokeWidth={1.75} className="text-text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Iniciar sesión</h1>
          <p className="text-sm text-text-muted">
            Gym Routines · Sistema de entrenamiento
          </p>
        </div>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-text-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/signup" className="font-medium text-highlight hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  )
}
