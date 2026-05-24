"use client"

import dayjs from "dayjs"
import { Clock, CheckCircle2, AlertCircle, Calendar, User, Activity } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { trpc } from "@/lib/trpc"

interface Client {
  $id: string; cid?: string; name: string
}

interface ClientCasesModalProps {
  client: Client | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

const statusConfig = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-chart-1", bg: "bg-chart-1/10" },
  pending: { label: "Pending", icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
}

export function ClientCasesModal({ client, open, onOpenChange }: ClientCasesModalProps) {
  const { data, isLoading } = trpc.cases.byClient.useQuery(
    { clientId: client?.$id ?? "" },
    { enabled: !!client?.$id && open }
  )

  const cases = (data?.documents ?? []) as Array<{
    $id: string; caseId: string; description: string; status: string
    startDate: string; leadAttorney: string; currentStatus?: string
  }>

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{client.name} — Cases</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}

          {!isLoading && cases.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No cases found for this client.
            </div>
          )}

          {cases.map((c) => {
            const cfg = statusConfig[c.status as keyof typeof statusConfig]
            const Icon = cfg?.icon ?? AlertCircle

            return (
              <div key={c.$id} className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{c.caseId}</span>
                    <p className="font-medium text-sm mt-0.5">{c.description}</p>
                  </div>
                  {cfg && (
                    <Badge className={`${cfg.bg} ${cfg.color} border-0 gap-1 shrink-0 text-xs`}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dayjs(c.startDate).format("MMM D, YYYY")}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {c.leadAttorney}
                  </div>
                </div>
                {c.currentStatus && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Activity className="w-3 h-3 text-chart-1" />
                    <span className="text-foreground">{c.currentStatus}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-3 border-t text-xs text-muted-foreground">
          {isLoading ? "Loading..." : `${cases.length} case${cases.length !== 1 ? "s" : ""} total`}
        </div>
      </DialogContent>
    </Dialog>
  )
}
