"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Search, MoreHorizontal, CheckCircle2, Clock, CreditCard, Banknote, Building2,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { useQueryState, parseAsString } from "nuqs"
import { toast } from "sonner"
import { PageLayout } from "@/components/page-layout"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc"
import { useDebounce } from "@/hooks/use-debounce"
import { useHasPermission } from "@/hooks/use-role"
import { useBulkSelect } from "@/hooks/use-bulk-select"
import { BulkActionBar } from "@/components/ui/bulk-action-bar"
import { NewInvoiceDialog } from "@/components/forms/new-invoice-dialog"
import { EditInvoiceDialog } from "@/components/forms/edit-invoice-dialog"
import { ExportDialog } from "@/components/forms/export-dialog"
import { InvoiceModal } from "@/components/modals/invoice-modal"
import dayjs from "dayjs"

const methodIcons = { cash: Banknote, wire: Building2, check: CreditCard }
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]
const LIMIT = 25

type TxDoc = {
  $id: string; clientId: string; clientName: string; date: string
  amount: number; attorney: string; method: string; status: string; type: string
}

function LedgerContent() {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""))
  const debouncedSearch = useDebounce(search, 300)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [cursor, setCursor] = useState<string | undefined>()
  const [prevCursors, setPrevCursors] = useState<Array<string | undefined>>([])
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<TxDoc | null>(null)
  const canEdit = useHasPermission("ledger.update")
  const canDelete = useHasPermission("ledger.delete")

  const utils = trpc.useUtils()
  const { data, isLoading, error } = trpc.ledger.list.useQuery({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter as "completed" | "pending" : undefined,
    type: typeFilter !== "all" ? typeFilter as "retainer" | "income" | "expense" | "fee" : undefined,
    limit: LIMIT,
    cursor,
  })
  const { data: summary } = trpc.ledger.summary.useQuery()

  // Reset pagination when filters change
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setCursor(undefined)
    setPrevCursors([])
  }, [debouncedSearch, typeFilter, statusFilter])

  const markPaid = trpc.ledger.update.useMutation({
    onSuccess: () => { toast.success("Marked as paid"); utils.ledger.list.invalidate(); utils.ledger.summary.invalidate() },
    onError: (err) => toast.error(err.message),
  })
  const deleteTx = trpc.ledger.delete.useMutation({
    onSuccess: () => { toast.success("Invoice deleted"); utils.ledger.list.invalidate(); utils.ledger.summary.invalidate() },
    onError: (err) => toast.error(err.message),
  })

  const transactions = (data?.documents ?? []) as TxDoc[]

  const bulk = useBulkSelect(transactions)
  const deleteMany = trpc.ledger.deleteMany.useMutation({
    onSuccess: () => {
      toast.success(`${bulk.count} invoice${bulk.count !== 1 ? "s" : ""} deleted`)
      utils.ledger.list.invalidate()
      utils.ledger.summary.invalidate()
      bulk.clear()
    },
    onError: (err) => toast.error(err.message),
  })

  const typeBreakdown = [
    { name: "Retainer", value: transactions.filter(t => t.type === "retainer").reduce((s, t) => s + t.amount, 0) },
    { name: "Income",   value: transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0) },
    { name: "Expense",  value: transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0) },
    { name: "Fee",      value: transactions.filter(t => t.type === "fee").reduce((s, t) => s + t.amount, 0) },
  ]

  const profit = summary?.profit ?? 0
  const isFirstPage = prevCursors.length === 0
  const hasMore = transactions.length >= LIMIT
  const pageNumber = prevCursors.length + 1

  function goNextPage() {
    const lastId = transactions[transactions.length - 1]?.$id
    if (!lastId) return
    setPrevCursors(prev => [...prev, cursor])
    setCursor(lastId)
  }

  function goPrevPage() {
    const prev = [...prevCursors]
    const prevCursor = prev.pop()
    setPrevCursors(prev)
    setCursor(prevCursor)
  }

  function openInvoice(tx: TxDoc) { setSelectedTx(tx); setInvoiceOpen(true) }
  function openEdit(tx: TxDoc) { setSelectedTx(tx); setEditOpen(true) }

  return (
    <PageLayout
      title="Ledger"
      subtitle="Track invoices and payments"
      actions={<div className="flex gap-2"><ExportDialog transactions={transactions} /><NewInvoiceDialog /></div>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatCard label="Retainer" value={isLoading ? "—" : `$${(summary?.totalRetainer ?? 0).toLocaleString()}`} delay={0} />
        <StatCard label="Income"   value={isLoading ? "—" : `$${(summary?.totalIncome ?? 0).toLocaleString()}`}   delay={0.05} />
        <StatCard label="Expense"  value={isLoading ? "—" : `$${(summary?.totalExpense ?? 0).toLocaleString()}`}  delay={0.1} />
        <StatCard label="Fee"      value={isLoading ? "—" : `$${(summary?.totalFee ?? 0).toLocaleString()}`}      delay={0.15} />
        <StatCard label="Profit"   value={isLoading ? "—" : `$${profit.toLocaleString()}`}                        delay={0.2} />
      </div>

      {error && <Alert variant="destructive" className="mb-6"><AlertDescription>Failed to load transactions: {error.message}</AlertDescription></Alert>}

      <div className="grid grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-3">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg font-medium">Transactions</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="text" placeholder="Search client…" value={search}
                      onChange={(e) => setSearch(e.target.value || null)} className="pl-10 h-9" />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="retainer">Retainer</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="fee">Fee</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {canDelete && (
                          <TableHead className="w-10">
                            <Checkbox
                              checked={bulk.allSelected ? true : bulk.someSelected ? "indeterminate" : false}
                              onCheckedChange={bulk.toggleAll}
                            />
                          </TableHead>
                        )}
                        <TableHead>Invoice</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canDelete ? 9 : 8} className="text-center py-12 text-muted-foreground">
                            No transactions found.
                          </TableCell>
                        </TableRow>
                      ) : transactions.map((tx, index) => {
                        const MethodIcon = methodIcons[tx.method as keyof typeof methodIcons] ?? CreditCard
                        return (
                          <motion.tr key={tx.$id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 + index * 0.02 }} className="group hover:bg-muted/50">
                            {canDelete && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={bulk.selected.has(tx.$id)}
                                  onCheckedChange={() => bulk.toggle(tx.$id)}
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              <p className="font-medium font-mono text-sm">{tx.$id}</p>
                            </TableCell>
                            <TableCell>{tx.clientName}</TableCell>
                            <TableCell className="text-muted-foreground">{dayjs(tx.date).format("MMM D, YYYY")}</TableCell>
                            <TableCell>
                              <span className={`font-medium ${tx.type === "expense" ? "text-destructive" : ""}`}>
                                {tx.type === "expense" ? "-" : ""}${tx.amount.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-xs">{tx.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MethodIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="capitalize text-sm">{tx.method}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={tx.status === "completed" ? "default" : "secondary"} className="gap-1">
                                {tx.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {tx.status === "completed" ? "Paid" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openInvoice(tx)}>View Invoice</DropdownMenuItem>
                                  {tx.status === "pending" && canEdit && (
                                    <DropdownMenuItem onClick={() => markPaid.mutate({ id: tx.$id, status: "completed" })}>
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}
                                  {canEdit && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openEdit(tx)}>Edit Invoice</DropdownMenuItem>
                                    </>
                                  )}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => deleteTx.mutate({ id: tx.$id, clientId: tx.clientId })}
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {pageNumber} · {transactions.length} shown
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8 gap-1"
                        disabled={isFirstPage} onClick={goPrevPage}>
                        <ChevronLeft className="w-4 h-4" />Prev
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1"
                        disabled={!hasMore} onClick={goNextPage}>
                        Next<ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg font-medium">Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                      {typeBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {typeBreakdown.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className={`font-medium ${item.name === "Expense" ? "text-destructive" : ""}`}>
                      ${item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profit</p>
                  <p className={`text-2xl font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                    ${profit.toLocaleString()}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${profit >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  {profit >= 0
                    ? <TrendingUp className="w-5 h-5 text-success" />
                    : <TrendingDown className="w-5 h-5 text-destructive" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-semibold">${(summary?.totalPending ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <InvoiceModal transaction={selectedTx} open={invoiceOpen} onOpenChange={setInvoiceOpen} />
      <EditInvoiceDialog transaction={selectedTx} open={editOpen} onOpenChange={setEditOpen} />
      {canDelete && (
        <BulkActionBar
          count={bulk.count}
          onDelete={() => deleteMany.mutate({ ids: bulk.selectedIds })}
          onClear={bulk.clear}
          isDeleting={deleteMany.isPending}
        />
      )}
    </PageLayout>
  )
}

export default function LedgerPage() {
  return <Suspense><LedgerContent /></Suspense>
}
