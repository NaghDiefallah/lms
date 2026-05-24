"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  value: string
  className?: string
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded",
        "text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
        className
      )}
      title={`Copy: ${value}`}
    >
      {copied
        ? <Check className="w-3 h-3 text-success" />
        : <Copy className="w-3 h-3" />}
    </button>
  )
}
