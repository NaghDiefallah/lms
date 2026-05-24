"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trpc } from "@/lib/trpc"

interface DeleteClientDialogProps {
  client: { $id: string; name: string } | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function DeleteClientDialog({ client, open, onOpenChange }: DeleteClientDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const utils = trpc.useUtils()

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast.success(`${client?.name} deleted`)
      utils.clients.list.invalidate()
      onOpenChange(false)
      setConfirmation("")
    },
    onError: (err) => toast.error(err.message),
  })

  if (!client) return null

  const required = `DELETE-${client.$id}`
  const confirmed = confirmation === required

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirmation("") }}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete Client
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
            <p className="font-medium text-destructive">This action cannot be undone.</p>
            <p className="text-muted-foreground mt-1">
              All data for <span className="font-medium text-foreground">{client.name}</span> ({client.$id}) will be permanently deleted.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">{required}</span> to confirm
            </Label>
            <Input
              placeholder={required}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={confirmed ? "border-destructive focus-visible:ring-destructive" : ""}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!confirmed || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: client.$id })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
