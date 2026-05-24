"use client"

import { useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NaInputProps {
  value?: string
  onChange: (val: string) => void
  placeholder?: string
  mask?: (raw: string) => string
  className?: string
}

/**
 * Input that supports an explicit "N/A" toggle.
 * When N/A is active the field is greyed out and the value is set to "N/A".
 */
export function NaInput({ value, onChange, placeholder, mask, className }: NaInputProps) {
  const isNA = value === "N/A"
  const lastTextRef = useRef(isNA ? "" : (value ?? ""))

  useEffect(() => {
    if (value !== "N/A") {
      lastTextRef.current = value ?? ""
    }
  }, [value])

  function handleTextChange(raw: string) {
    const formatted = mask ? mask(raw) : raw
    lastTextRef.current = formatted
    onChange(formatted)
  }

  function toggleNA() {
    if (isNA) {
      onChange(lastTextRef.current)
    } else {
      lastTextRef.current = value ?? ""
      onChange("N/A")
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={isNA ? "N/A" : (value ?? "")}
        disabled={isNA}
        placeholder={isNA ? "N/A" : placeholder}
        className={cn(isNA && "opacity-50 cursor-not-allowed", className)}
        onChange={(e) => handleTextChange(e.target.value)}
      />
      <Button
        type="button"
        variant={isNA ? "secondary" : "outline"}
        size="sm"
        className={cn("shrink-0 text-xs", isNA && "bg-secondary text-foreground")}
        onClick={toggleNA}
      >
        N/A
      </Button>
    </div>
  )
}
