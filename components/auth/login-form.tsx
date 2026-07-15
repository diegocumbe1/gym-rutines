'use client'

import { useActionState } from 'react'
import { login, type AuthState } from '@/app/actions/auth'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-surface-2 px-3.5 py-3 text-base text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-highlight focus:shadow-[0_0_0_3px_rgba(49,93,168,0.18)]'

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    undefined
  )

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text-secondary">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          aria-invalid={Boolean(state?.errors?.email)}
        />
        {state?.errors?.email?.map((e) => (
          <p key={e} className="text-sm text-danger">
            {e}
          </p>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text-secondary">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          aria-invalid={Boolean(state?.errors?.password)}
        />
        {state?.errors?.password?.map((e) => (
          <p key={e} className="text-sm text-danger">
            {e}
          </p>
        ))}
      </div>

      {state?.message && (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary px-4 py-3 text-base font-semibold text-text-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
