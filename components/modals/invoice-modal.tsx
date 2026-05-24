"use client"

import { useRef } from "react"
import { Printer, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import dayjs from "dayjs"

interface Transaction {
  $id: string
  clientId: string
  clientName: string
  date: string
  amount: number
  attorney: string
  method: string
  status: string
  type: string
}

interface InvoiceModalProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function InvoiceModal({ transaction: tx, open, onOpenChange }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open("", "_blank", "width=800,height=600")
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${tx?.$id}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
            .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
            .value { font-size: 14px; font-weight: 500; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
            .amount { font-size: 32px; font-weight: 700; margin: 16px 0; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #d1fae5; color: #065f46; }
            .badge.pending { background: #fef3c7; color: #92400e; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  if (!tx) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>Invoice {tx.$id}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice</p>
            <h2 className="text-xl font-bold font-mono">{tx.$id}</h2>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
        </div>

        <Separator />

        <div ref={printRef} className="space-y-4 py-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Invoice</p>
            <p className="text-xl font-bold font-mono">{tx.$id}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-medium">{tx.clientName}</p>
              <p className="text-xs text-muted-foreground font-mono">{tx.clientId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attorney</p>
              <p className="text-sm font-medium">{tx.attorney}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium">{dayjs(tx.date).format("MMMM D, YYYY")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Method</p>
              <p className="text-sm font-medium capitalize">{tx.method}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm font-medium capitalize">{tx.type}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold">${tx.amount.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Badge variant={tx.status === "completed" ? "default" : "secondary"} className="text-xs">
              {tx.status === "completed" ? "Paid" : "Pending"}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
