"use client"

import { Suspense, useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Search, MoreHorizontal, Clock, CheckCircle2, AlertCircle,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Activity,
} from "lucide-react"
import { useQueryState, parseAsString, parseAsInteger } from "nuqs"
import { toast } from "sonner"
import { PageLayout } from "@/components/page-layout"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/lib/trpc"
import { NewCaseDialog } from "@/components/forms/new-case-dialog"
import { EditCaseDialog } from "@/components/forms/edit-case-dialog"
import { CaseDetailsModal } from "@/components/modals/case-details-modal"
import { Checkbox } from "@/components/ui/checkbox"
import { useBulkSelect } from "@/hooks/use-bulk-select"
import { BulkActionBar } from "@/components/ui/bulk-action-bar"
import { useHasPermission } from "@/hooks/use-role"
import dayjs from "dayjs"

type CaseDoc = {
  $id: string; $createdAt: string; clientId: string; clientName: string
  description: string; startDate: string; status: string
  currentStatus?: string; assignedAttorneys?: string[]
}

type SortKey = "description" | "clientName" | "clientName" | "startDate" | "$createdAt"
type SortDir = "asc" | "desc"

const statusConfig = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-chart-1", bg: "bg-chart-1/10" },
  pending: { label: "Pending", icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
}

function SortHeader({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <button className="flex items-center gap-1 group hover:text-foreground transition-colors"
      onClick={() => onSort(sortKey)}>
      {label}
      {active ? (
        dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
      )}
    </button>
  )
}

function CasesContent() {
  const [rawSearch, setRawSearch] = useQueryState("q", parseAsString.withDefault(""))
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsString.withDefault("all"))
  const [sortKey, setSortKey] = useQueryState<SortKey>("sort", parseAsString.withDefault("$createdAt") as any)
  const [sortDir, setSortDir] = useQueryState<SortDir>("dir", parseAsString.withDefault("desc") as any)
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1))
  const [pageSize, setPageSize] = useQueryState("size", parseAsInteger.withDefault(25))

  const [editCase, setEditCase] = useState<CaseDoc | null>(null)
  const [detailsCase, setDetailsCase] = useState<CaseDoc | null>(null)

  const canDelete = useHasPermission("cases.delete")

  const utils = trpc.useUtils()

  // Fetch all cases and filter/sort client-side
  const { data, isLoading, error } = trpc.cases.list.useQuery({ limit: 500 })
  const allCases = useMemo(() => (data?.documents as CaseDoc[] | undefined) ?? [], [data?.documents])

  // Quick inline status update
  const updateStatus = trpc.cases.update.useMutation({
    onSuccess: () => utils.cases.list.invalidate(),
    onError: (err) => { throw err },
  })

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = rawSearch.toLowerCase().trim()
    return allCases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.$id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.clientId.toLowerCase().includes(q) ||
        (c.assignedAttorneys?.join(", ")?.toLowerCase()?.includes(q) ?? false) ||
        (c.currentStatus?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [allCases, rawSearch, statusFilter])

  // ─── Sort ─────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = String((a as any)[sortKey] ?? "")
      const vb = String((b as any)[sortKey] ?? "")
      const cmp = va.localeCompare(vb)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // ─── Paginate ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const cases = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const bulk = useBulkSelect(cases)
  const deleteMany = trpc.cases.deleteMany.useMutation({
    onSuccess: () => {
      toast.success(`${bulk.count} case${bulk.count !== 1 ? "s" : ""} deleted`)
      utils.cases.list.invalidate()
      bulk.clear()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
    setPage(1)
  }

  const countByStatus = (s: string) => allCases.filter((c) => c.status === s).length

  return (
    <PageLayout title="Cases" subtitle="Track and manage your legal matters" actions={<NewCaseDialog />}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Cases" value={isLoading ? "—" : allCases.length} delay={0} />
        <StatCard label="Completed" value={isLoading ? "—" : countByStatus("completed")} delay={0.05} />
        <StatCard label="In Progress" value={isLoading ? "—" : countByStatus("in_progress")} delay={0.1} />
        <StatCard label="Pending" value={isLoading ? "—" : countByStatus("pending")} delay={0.15} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, description, client, attorney…"
            value={rawSearch}
            onChange={(e) => { setRawSearch(e.target.value || null); setPage(1) }}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / page</SelectItem>
            <SelectItem value="25">25 / page</SelectItem>
            <SelectItem value="50">50 / page</SelectItem>
          </SelectContent>
        </Select>

        {rawSearch && (
          <span className="text-sm text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        )}
      </motion.div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Failed to load cases: {error.message}</AlertDescription>
        </Alert>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                      <TableHead className="w-36">Ref / ID</TableHead>
                      <TableHead>
                        <SortHeader label="Description" sortKey="description" current={sortKey as SortKey} dir={sortDir as SortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        <SortHeader label="Client" sortKey="clientName" current={sortKey as SortKey} dir={sortDir as SortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">
                        <SortHeader label="Attorney" sortKey="clientName" current={sortKey as SortKey} dir={sortDir as SortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">Current Status</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <SortHeader label="Started" sortKey="startDate" current={sortKey as SortKey} dir={sortDir as SortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canDelete ? 9 : 8} className="text-center py-12 text-muted-foreground">
                          No cases found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : cases.map((c, index) => {
                      const cfg = statusConfig[c.status as keyof typeof statusConfig]
                      const StatusIcon = cfg?.icon ?? AlertCircle
                      return (
                        <motion.tr key={c.$id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="group hover:bg-muted/50 transition-colors"
                        >
                          {canDelete && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={bulk.selected.has(c.$id)}
                                onCheckedChange={() => bulk.toggle(c.$id)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <p className="font-mono text-xs text-muted-foreground">{c.$id}</p>
                            <p className="text-xs text-muted-foreground">{c.clientId}</p>
                          </TableCell>

                          <TableCell>
                            <p className="font-medium text-sm max-w-[200px] truncate">{c.description}</p>
                          </TableCell>

                          <TableCell className="hidden sm:table-cell text-sm">{c.clientName}</TableCell>

                          <TableCell>
                            {/* Status dropdown for quick update */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="cursor-pointer">
                                  {cfg ? (
                                    <Badge className={`${cfg.bg} ${cfg.color} border-0 gap-1.5 whitespace-nowrap`}>
                                      <StatusIcon className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">{cfg.label}</span>
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">{c.status}</Badge>
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.$id, status: "pending" })}>
                                  <AlertCircle className="w-3.5 h-3.5 text-warning mr-2" />Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.$id, status: "in_progress" })}>
                                  <Clock className="w-3.5 h-3.5 text-chart-1 mr-2" />In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.$id, status: "completed" })}>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success mr-2" />Completed
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>

                          <TableCell className="hidden md:table-cell text-sm">{(c.assignedAttorneys ?? []).join(", ") || "—"}</TableCell>

                          <TableCell className="hidden lg:table-cell">
                            {c.currentStatus ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Activity className="w-3 h-3 text-chart-1" />
                                <span className="truncate max-w-[120px]">{c.currentStatus}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {dayjs(c.startDate).format("MMM D, YYYY")}
                          </TableCell>

                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDetailsCase(c)}>View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditCase(c)}>Edit Case</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2">Page {safePage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      <EditCaseDialog caseDoc={editCase} open={!!editCase} onOpenChange={(v) => { if (!v) setEditCase(null) }} />
      <CaseDetailsModal caseDoc={detailsCase} open={!!detailsCase} onOpenChange={(v) => { if (!v) setDetailsCase(null) }} />
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

export default function CasesPage() {
  return <Suspense><CasesContent /></Suspense>
}
