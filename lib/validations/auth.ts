import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Introduce un correo válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export const signupSchema = z.object({
  email: z.email('Introduce un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
