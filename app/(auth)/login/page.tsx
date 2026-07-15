import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { BrandMark } from '@/components/brand/brand-mark'
import { InstallAppButton } from '@/components/pwa/install-app-button'

export default function LoginPage() {
  return (
    <div className="crystal-surface space-y-6 rounded-2xl p-6 sm:p-8">
      <div className="space-y-3 text-center">
        <BrandMark size="lg" className="mx-auto" />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Iniciar sesión</h1>
          <p className="text-sm text-text-muted">
            Gym Routines · Sistema de entrenamiento
          </p>
        </div>
      </div>

      <InstallAppButton />

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
