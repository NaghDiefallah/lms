"use client"

import { useState } from "react"
import { ImageIcon, FileText, ExternalLink } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileViewerModal } from "@/components/modals/file-viewer-modal"

interface ClientDocumentsModalProps {
  client: { $id: string; name: string; passportFileId?: string; contractFileId?: string } | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ClientDocumentsModal({ client, open, onOpenChange }: ClientDocumentsModalProps) {
  const [viewerFile, setViewerFile] = useState<{ id: string; label: string } | null>(null)

  if (!client) return null

  const docs = [
    { fileId: client.passportFileId, label: "Passport", icon: ImageIcon },
    { fileId: client.contractFileId, label: "Contract", icon: FileText },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{client.name} — Documents</DialogTitle>
            <DialogDescription className="sr-only">Client passport and contract</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {docs.map(({ fileId, label, icon: Icon }) => (
              <div key={label} className="p-4 rounded-lg border bg-secondary/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{label}</span>
                </div>
                {fileId ? (
                  <div className="space-y-2">
                    <p className="text-xs text-success font-medium">Attached</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 w-full h-8"
                      onClick={() => setViewerFile({ id: fileId, label: `${client.name} — ${label}` })}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View {label}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not uploaded</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <FileViewerModal
        fileId={viewerFile?.id ?? null}
        label={viewerFile?.label}
        open={!!viewerFile}
        onOpenChange={(v) => { if (!v) setViewerFile(null) }}
      />
    </>
  )
}
