"use client"

import { useState } from "react"
import dayjs from "dayjs"
import {
  Mail, Phone, CreditCard, Hash, CheckCircle2, XCircle, Calendar,
  FileText, ExternalLink, ImageIcon, History,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { FileViewerModal } from "@/components/modals/file-viewer-modal"
import { trpc } from "@/lib/trpc"

interface Client {
  $id: string; name: string; email: string
  phone?: string; passportNumber?: string; retainer: number
  activeCases?: number; status: boolean; lastContacted?: string
  clientSince?: string; $createdAt: string
  passportFileId?: string; contractFileId?: string
}

interface ClientDetailsModalProps {
  client: Client | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

function DetailRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value?: string | number
}) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-secondary rounded-lg shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email / Username",
  phone: "Phone",
  passportNumber: "Passport Number",
  passportFileId: "Passport File",
  contractFileId: "Contract File",
}

const FILE_FIELDS = new Set(["passportFileId", "contractFileId"])

function fileChangeLabel(oldVal: string | null | undefined, newVal: string | null | undefined) {
  if (!oldVal && newVal) return "added"
  if (oldVal && !newVal) return "removed"
  return "updated"
}

export function ClientDetailsModal({ client, open, onOpenChange }: ClientDetailsModalProps) {
  const [viewerFile, setViewerFile] = useState<{ id: string; label: string } | null>(null)

  const { data: historyData, isLoading: historyLoading } = trpc.clients.history.useQuery(
    { clientId: client?.$id ?? "" },
    { enabled: open && !!client?.$id }
  )
  const history = (historyData?.documents ?? []) as Array<{
    $id: string; $createdAt: string; field: string; oldValue?: string | null; newValue?: string | null
  }>

  if (!client) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>

          {/* Header */}
          <div className="flex items-center gap-4 py-2">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-base bg-primary text-primary-foreground">
                {client.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{client.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">{client.$id}</Badge>
                <Badge variant={client.status ? "default" : "secondary"}>
                  {client.status ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <DetailRow icon={Mail} label="Email / Username" value={client.email} />
            <DetailRow icon={Phone} label="Phone" value={client.phone} />
            <DetailRow icon={CreditCard} label="Passport Number" value={client.passportNumber} />
            <DetailRow icon={Hash} label="Active Cases" value={client.activeCases ?? 0} />
            <DetailRow icon={CreditCard} label="Total Retainer" value={`$${(client.retainer ?? 0).toLocaleString()}`} />
            {client.lastContacted && (
              <DetailRow icon={Calendar} label="Last Contacted" value={dayjs(client.lastContacted).format("MMM D, YYYY")} />
            )}
            <DetailRow icon={Calendar} label="Client Since" value={dayjs(client.clientSince ?? client.$createdAt).format("MMM D, YYYY")} />
          </div>

          <Separator />

          {/* Documents */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Documents</p>
            {[
              { id: client.passportFileId, label: "Passport Photo", icon: ImageIcon },
              { id: client.contractFileId, label: "Contract", icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-md">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{id ? "Attached" : "Not uploaded"}</p>
                  </div>
                </div>
                {id && (
                  <Button variant="outline" size="sm" className="gap-1.5 h-8"
                    onClick={() => setViewerFile({ id, label })}>
                    <ExternalLink className="w-3.5 h-3.5" />View
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {client.status
              ? <CheckCircle2 className="w-4 h-4 text-success" />
              : <XCircle className="w-4 h-4 text-muted-foreground" />}
            <span className={`text-sm ${client.status ? "text-success" : "text-muted-foreground"}`}>
              {client.status ? "Active client" : "Inactive client"}
            </span>
          </div>

          <Separator />

          {/* History */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Change History</p>
            </div>
            {historyLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No changes recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((h) => {
                  const fieldLabel = FIELD_LABELS[h.field] ?? h.field
                  const isFile = FILE_FIELDS.has(h.field)
                  return (
                    <div key={h.$id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0 text-muted-foreground">
                        <span className="font-medium text-foreground">{fieldLabel}</span>
                        {isFile ? (
                          <> {fileChangeLabel(h.oldValue, h.newValue)}</>
                        ) : (
                          <>
                            {h.oldValue ? <> changed from <span className="font-mono bg-secondary px-1 rounded">{h.oldValue}</span></> : " set"}
                            {h.newValue ? <> to <span className="font-mono bg-secondary px-1 rounded">{h.newValue}</span></> : " (cleared)"}
                          </>
                        )}
                      </div>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {dayjs(h.$createdAt).format("MMM D")}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
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
