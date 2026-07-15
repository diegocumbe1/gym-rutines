import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'
import { BrandMark } from '@/components/brand/brand-mark'
import { InstallAppButton } from '@/components/pwa/install-app-button'

export default function SignupPage() {
  return (
    <div className="crystal-surface space-y-6 rounded-2xl p-6 sm:p-8">
      <div className="space-y-3 text-center">
        <BrandMark size="lg" className="mx-auto" />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-sm text-text-muted">
            Gym Routines · Sistema de entrenamiento
          </p>
        </div>
      </div>

      <InstallAppButton />

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
