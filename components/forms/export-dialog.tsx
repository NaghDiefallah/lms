"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Download, Copy, FileText, Table, AlignLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import dayjs from "dayjs"

type Transaction = {
  $id: string
  clientName: string
  date: string
  amount: number
  attorney: string
  method: string
  status: string
  type: string
}

function toCSV(rows: Transaction[]): string {
  const headers = ["Invoice #", "Client", "Date", "Amount", "Attorney", "Method", "Status", "Type"]
  const lines = rows.map((r) =>
    [
      r.$id, r.clientName,
      dayjs(r.date).format("MMM D YYYY"),
      r.amount, r.attorney, r.method, r.status, r.type,
    ].join(",")
  )
  return [headers.join(","), ...lines].join("\n")
}

function toTXT(rows: Transaction[]): string {
  return rows
    .map((r) =>
      `${r.$id} | ${r.clientName} | ${dayjs(r.date).format("MMM D YYYY")} | $${r.amount.toLocaleString()} | ${r.status.toUpperCase()}`
    )
    .join("\n")
}

function toMD(rows: Transaction[]): string {
  const header = "| Invoice # | Client | Date | Amount | Status |\n|---|---|---|---|---|"
  const lines = rows.map((r) =>
    `| ${r.$id} | ${r.clientName} | ${dayjs(r.date).format("MMM D YYYY")} | $${r.amount.toLocaleString()} | ${r.status} |`
  )
  return [header, ...lines].join("\n")
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ExportDialogProps {
  transactions: Transaction[]
}

export function ExportDialog({ transactions }: ExportDialogProps) {
  const [open, setOpen] = useState(false)

  const filename = `lms-ledger-${dayjs().format("YYYY-MM-DD")}`

  const formats = [
    {
      label: "CSV",
      icon: Table,
      description: "Spreadsheet-compatible, comma-separated",
      action: () => {
        download(toCSV(transactions), `${filename}.csv`, "text/csv")
        toast.success("CSV downloaded")
        setOpen(false)
      },
    },
    {
      label: "TXT",
      icon: AlignLeft,
      description: "Plain text, one transaction per line",
      action: () => {
        download(toTXT(transactions), `${filename}.txt`, "text/plain")
        toast.success("TXT downloaded")
        setOpen(false)
      },
    },
    {
      label: "Markdown",
      icon: FileText,
      description: "Formatted table for docs or notes",
      action: () => {
        download(toMD(transactions), `${filename}.md`, "text/markdown")
        toast.success("Markdown downloaded")
        setOpen(false)
      },
    },
    {
      label: "Copy to clipboard",
      icon: Copy,
      description: "Copies CSV format to clipboard",
      action: async () => {
        await navigator.clipboard.writeText(toCSV(transactions))
        toast.success("Copied to clipboard")
        setOpen(false)
      },
    },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Export Ledger</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} will be exported.
        </p>
        <div className="space-y-2 pt-2">
          {formats.map((fmt) => {
            const Icon = fmt.icon
            return (
              <button
                key={fmt.label}
                onClick={fmt.action}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="p-2 bg-secondary rounded-md">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{fmt.label}</p>
                  <p className="text-xs text-muted-foreground">{fmt.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
