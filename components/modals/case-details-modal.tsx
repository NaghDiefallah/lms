"use client"

import dayjs from "dayjs"
import { Clock, CheckCircle2, AlertCircle, Calendar, Users, Activity, FileText, AlignLeft } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface CaseDoc {
  $id: string; $createdAt: string; clientId: string; clientName: string
  description: string; notes?: string; startDate: string; endDate?: string; status: string
  currentStatus?: string; assignedAttorneys?: string[]
}

interface CaseDetailsModalProps {
  caseDoc: CaseDoc | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

const statusConfig = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-chart-1", bg: "bg-chart-1/10" },
  pending: { label: "Pending", icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
}

export function CaseDetailsModal({ caseDoc, open, onOpenChange }: CaseDetailsModalProps) {
  if (!caseDoc) return null
  const cfg = statusConfig[caseDoc.status as keyof typeof statusConfig]
  const StatusIcon = cfg?.icon ?? AlertCircle

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Case Details</DialogTitle>
          <DialogDescription className="sr-only">View case information</DialogDescription>
        </DialogHeader>

        <div className="flex items-start justify-between py-2">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{caseDoc.$id}</p>
            <h3 className="text-lg font-semibold mt-0.5">{caseDoc.description}</h3>
            <p className="text-sm text-muted-foreground">{caseDoc.clientName} ({caseDoc.clientId})</p>
          </div>
          {cfg && (
            <Badge className={`${cfg.bg} ${cfg.color} border-0 gap-1.5 shrink-0`}>
              <StatusIcon className="w-3.5 h-3.5" />{cfg.label}
            </Badge>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-secondary rounded-md mt-0.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="text-sm font-medium">{dayjs(caseDoc.startDate).format("MMM D, YYYY")}</p>
              </div>
            </div>
            {caseDoc.endDate && (
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-secondary rounded-md mt-0.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="text-sm font-medium">{dayjs(caseDoc.endDate).format("MMM D, YYYY")}</p>
                </div>
              </div>
            )}
          </div>

          {caseDoc.currentStatus && (
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-secondary rounded-md mt-0.5"><Activity className="w-3.5 h-3.5 text-chart-1" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Current Status</p>
                <p className="text-sm font-medium">{caseDoc.currentStatus}</p>
              </div>
            </div>
          )}

          {(caseDoc.assignedAttorneys ?? []).length > 0 && (
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-secondary rounded-md mt-0.5"><Users className="w-3.5 h-3.5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Attorneys</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {caseDoc.assignedAttorneys!.map((a) => (
                    <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {caseDoc.notes && (
            <>
              <Separator />
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-secondary rounded-md mt-0.5"><AlignLeft className="w-3.5 h-3.5 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{caseDoc.notes}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
