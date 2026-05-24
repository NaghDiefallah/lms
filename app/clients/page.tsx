"use client"

import { Suspense, useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Search, MoreHorizontal, Mail, Phone, FileText,
  CheckCircle2, XCircle, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { NewClientDialog } from "@/components/forms/new-client-dialog"
import { CopyButton } from "@/components/ui/copy-button"
import { EditClientDialog } from "@/components/forms/edit-client-dialog"
import { DeleteClientDialog } from "@/components/forms/delete-client-dialog"
import { ClientDetailsModal } from "@/components/modals/client-details-modal"
import { ClientCasesModal } from "@/components/modals/client-cases-modal"
import { Checkbox } from "@/components/ui/checkbox"
import { useBulkSelect } from "@/hooks/use-bulk-select"
import { BulkActionBar } from "@/components/ui/bulk-action-bar"
import { useHasPermission } from "@/hooks/use-role"
import dayjs from "dayjs"

type Client = {
  $id: string; $createdAt: string; name: string; email: string
  cid?: string
  phone?: string; passportNumber?: string; retainer: number
  activeCases?: number; status: boolean; lastContacted?: string; clientSince?: string
  passportFileId?: string; contractFileId?: string
}

type SortKey = "name" | "retainer" | "clientSince" | "$createdAt"
type SortDir = "asc" | "desc"

function SortHeader({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <button
      className="flex items-center gap-1 group hover:text-foreground transition-colors"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active ? (
        dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
      )}
    </button>
  )
}

function ClientsContent() {
  const [rawSearch, setRawSearch] = useQueryState("q", parseAsString.withDefault(""))
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsString.withDefault("all"))
  const [sortKey, setSortKey] = useQueryState<SortKey>("sort", parseAsString.withDefault("$createdAt") as any)
  const [sortDir, setSortDir] = useQueryState<SortDir>("dir", parseAsString.withDefault("desc") as any)
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1))
  const [pageSize, setPageSize] = useQueryState("size", parseAsInteger.withDefault(25))

  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [detailsClient, setDetailsClient] = useState<Client | null>(null)
  const [casesClient, setCasesClient] = useState<Client | null>(null)

  const canDelete = useHasPermission("clients.delete")

  // Fetch all clients — filter/sort/paginate client-side for multi-field search
  const utils = trpc.useUtils()
  const { data, isLoading, error } = trpc.clients.list.useQuery({ limit: 500 })
  const allClients = useMemo(() => (data?.documents as Client[] | undefined) ?? [], [data?.documents])

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = rawSearch.toLowerCase().trim()
    return allClients.filter((c) => {
      // Status filter
      if (statusFilter === "active" && !c.status) return false
      if (statusFilter === "inactive" && c.status) return false

      // Multi-field search: ID, name, email, phone
      if (!q) return true
      return (
        c.$id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone?.toLowerCase().includes(q) ?? false) ||
        (c.passportNumber?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [allClients, rawSearch, statusFilter])

  // ─── Sort ─────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: any, vb: any
      if (sortKey === "name") { va = a.name; vb = b.name }
      else if (sortKey === "retainer") { va = a.retainer; vb = b.retainer }
      else if (sortKey === "clientSince") {
        va = a.clientSince ?? a.$createdAt; vb = b.clientSince ?? b.$createdAt
      } else {
        va = a.$createdAt; vb = b.$createdAt
      }
      const cmp = typeof va === "number"
        ? va - vb
        : String(va ?? "").localeCompare(String(vb ?? ""))
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // ─── Paginate ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const clients = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const bulk = useBulkSelect(clients)
  const deleteMany = trpc.clients.deleteMany.useMutation({
    onSuccess: () => {
      toast.success(`${bulk.count} client${bulk.count !== 1 ? "s" : ""} deleted`)
      utils.clients.list.invalidate()
      bulk.clear()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
    setPage(1)
  }

  const totalRetainer = allClients.reduce((s, c) => s + (c.retainer ?? 0), 0)
  const activeCount = allClients.filter((c) => c.status).length

  return (
    <PageLayout title="Clients" subtitle="Manage your client relationships" actions={<NewClientDialog />}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Clients" value={isLoading ? "—" : allClients.length} delay={0} />
        <StatCard label="Active Clients" value={isLoading ? "—" : activeCount} delay={0.05} />
        <StatCard label="Total Retainers" value={isLoading ? "—" : `$${totalRetainer.toLocaleString()}`} delay={0.1} />
      </div>

      {/* Filters + search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }} className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, name, username, phone…"
            value={rawSearch}
            onChange={(e) => { setRawSearch(e.target.value || null); setPage(1) }}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
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
          <AlertDescription>Failed to load clients: {error.message}</AlertDescription>
        </Alert>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
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
                      <TableHead>
                        <SortHeader label="Client" sortKey="name" current={sortKey as SortKey} dir={sortDir as SortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">Contact</TableHead>
                      <TableHead className="hidden md:table-cell">Cases</TableHead>
                      <TableHead className="hidden md:table-cell">
                        <SortHeader label="Retainer" sortKey="retainer" current={sortKey as SortKey} dir={sortDir as SortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <SortHeader label="Client Since" sortKey="clientSince" current={sortKey as SortKey} dir={sortDir as SortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canDelete ? 8 : 7} className="text-center py-12 text-muted-foreground">
                          No clients found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : clients.map((client, index) => (
                      <motion.tr
                        key={client.$id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="group hover:bg-muted/50 transition-colors"
                      >
                        {canDelete && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={bulk.selected.has(client.$id)}
                              onCheckedChange={() => bulk.toggle(client.$id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {client.name.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium truncate">{client.name}</p>
                                <CopyButton value={client.name} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs text-muted-foreground font-mono">{client.$id}</p>
                                <CopyButton value={client.$id} />
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden sm:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[120px]">{client.email}</span>
                              <CopyButton value={client.email} />
                            </div>
                            {client.phone && client.phone !== "N/A" && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                <span>{client.phone}</span>
                                <CopyButton value={client.phone} />
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <Badge variant={(client.activeCases ?? 0) > 0 ? "default" : "secondary"}>
                            {client.activeCases ?? 0} active
                          </Badge>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <span className="font-medium">${(client.retainer ?? 0).toLocaleString()}</span>
                        </TableCell>

                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {client.clientSince
                            ? dayjs(client.clientSince).format("MMM D, YYYY")
                            : dayjs(client.$createdAt).format("MMM D, YYYY")}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {client.status
                              ? <CheckCircle2 className="w-4 h-4 text-success" />
                              : <XCircle className="w-4 h-4 text-muted-foreground" />}
                            <span className={`text-sm hidden sm:inline ${client.status ? "text-success" : "text-muted-foreground"}`}>
                              {client.status ? "Active" : "Inactive"}
                            </span>
                          </div>
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
                              <DropdownMenuItem onClick={() => setDetailsClient(client)}>View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditClient(client)}>Edit Client</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCasesClient(client)}>View Cases</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteClient(client)}
                              >
                                Delete Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
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
              <Button variant="outline" size="sm" disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2">Page {safePage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      <DeleteClientDialog client={deleteClient} open={!!deleteClient} onOpenChange={(v) => { if (!v) setDeleteClient(null) }} />
      <EditClientDialog client={editClient} open={!!editClient} onOpenChange={(v) => { if (!v) setEditClient(null) }} />
      <ClientDetailsModal client={detailsClient} open={!!detailsClient} onOpenChange={(v) => { if (!v) setDetailsClient(null) }} />
      <ClientCasesModal client={casesClient} open={!!casesClient} onOpenChange={(v) => { if (!v) setCasesClient(null) }} />
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

export default function ClientsPage() {
  return <Suspense><ClientsContent /></Suspense>
}
