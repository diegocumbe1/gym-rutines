'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyPublicLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const url = new URL(path, window.location.origin).toString()
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
    >
      {copied ? (
        <Check size={16} strokeWidth={1.75} />
      ) : (
        <Copy size={16} strokeWidth={1.75} />
      )}
      {copied ? 'Enlace copiado' : 'Copiar enlace público'}
    </button>
  )
}
