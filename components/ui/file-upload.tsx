"use client"

import { useState, useRef } from "react"
import { Upload, X, Eye, FileText, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileViewerModal } from "@/components/modals/file-viewer-modal"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  label: string
  fileId?: string | null
  accept?: string
  onUpload: (fileId: string) => void
  onRemove: () => void
  className?: string
}

export function FileUpload({ label, fileId, accept = "image/*,.pdf", onUpload, onRemove, className }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Upload failed")
      onUpload(json.fileId)
    } catch (err: any) {
      setError(err?.message ?? "Upload failed")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">{label}</p>

      {fileId ? (
        <>
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-secondary/30">
            <div className="p-2 bg-secondary rounded-md">
              {accept.includes("image") ? (
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-muted-foreground truncate">{fileId}</p>
            </div>
            <div className="flex gap-1.5">
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
                onClick={() => setViewerOpen(true)}>
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={onRemove}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <FileViewerModal fileId={fileId} label={label} open={viewerOpen} onOpenChange={setViewerOpen} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed",
            "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            "transition-colors text-sm",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading…" : `Upload ${label}`}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
    </div>
  )
}
