"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Search, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle,
} from "lucide-react"
import { PageLayout } from "@/components/page-layout"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useBulkSelect } from "@/hooks/use-bulk-select"
import { BulkActionBar } from "@/components/ui/bulk-action-bar"
import { useHasPermission } from "@/hooks/use-role"
import { NewTeamMemberDialog } from "@/components/forms/new-team-member-dialog"
import { InviteTeamMemberDialog } from "@/components/forms/invite-team-member-dialog"
import { EditPersonnelDialog } from "@/components/forms/edit-personnel-dialog"
import { PersonnelDetailsModal } from "@/components/modals/personnel-details-modal"
import { CopyButton } from "@/components/ui/copy-button"
import { toast } from "sonner"
import dayjs from "dayjs"

type Employee = {
  $id: string; $createdAt: string; name: string; email: string; contact?: string
  licensed: boolean; startDate: string; role: string; passportNumber?: string
  cases?: number; revenue?: number; recentWins?: number
}

type SortKey = "name" | "role" | "startDate"
type SortDir = "asc" | "desc"

function SortHeader({ label, sortKey, current, dir, onSort }: any) {
  const active = current === sortKey
  return (
    <button className="flex items-center gap-1 group hover:text-foreground transition-colors"
      onClick={() => onSort(sortKey)}>
      {label}
      {active ? (dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />}
    </button>
  )
}

export default function PersonnelPage() {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("startDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null)

  const utils = trpc.useUtils()
  const { data, isLoading, error } = trpc.personnel.list.useQuery({ limit: 500 })
  const allEmployees = useMemo(() => (data?.documents as Employee[] | undefined) ?? [], [data?.documents])
  const canDelete = useHasPermission("personnel.delete")

  const deleteEmp = trpc.personnel.delete.useMutation({
    onSuccess: () => { toast.success("Employee deleted"); utils.personnel.list.invalidate() },
    onError: (err) => toast.error(err.message),
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allEmployees
    return allEmployees.filter((e) =>
      e.$id.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      (e.contact?.toLowerCase().includes(q) ?? false) ||
      (e.passportNumber?.toLowerCase().includes(q) ?? false)
    )
  }, [allEmployees, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = String((a as any)[sortKey] ?? "")
      const vb = String((b as any)[sortKey] ?? "")
      const cmp = va.localeCompare(vb)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const employees = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const bulk = useBulkSelect(employees)
  const deleteMany = trpc.personnel.deleteMany.useMutation({
    onSuccess: () => {
      toast.success(`${bulk.count} employee${bulk.count !== 1 ? "s" : ""} deleted`)
      utils.personnel.list.invalidate()
      bulk.clear()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
    setPage(1)
  }

  const totalRevenue = allEmployees.reduce((s, e) => s + (e.revenue ?? 0), 0)
  const licensed = allEmployees.filter((e) => e.licensed).length

  return (
    <PageLayout
      title="Personnel"
      subtitle="Manage your team members"
      actions={
        <div className="flex flex-wrap gap-2">
          <InviteTeamMemberDialog />
          <NewTeamMemberDialog />
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Team Size" value={isLoading ? "—" : allEmployees.length} delay={0} />
        <StatCard label="Licensed" value={isLoading ? "—" : licensed} delay={0.05} />
        <StatCard label="Active Cases" value={isLoading ? "—" : allEmployees.reduce((s,e)=>s+(e.cases??0),0)} delay={0.1} />
        <StatCard label="Total Revenue" value={isLoading ? "—" : `$${totalRevenue.toLocaleString()}`} delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }} className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, passport, phone…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10" />
        </div>
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / page</SelectItem>
            <SelectItem value="25">25 / page</SelectItem>
            <SelectItem value="50">50 / page</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>Failed to load personnel: {error.message}</AlertDescription></Alert>}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
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
                        <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">ID</TableHead>
                      <TableHead className="hidden md:table-cell">Passport #</TableHead>
                      <TableHead>
                        <SortHeader label="Role" sortKey="role" current={sortKey} dir={sortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead>Licensed</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <SortHeader label="Joined" sortKey="startDate" current={sortKey} dir={sortDir} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canDelete ? 9 : 8} className="text-center py-12 text-muted-foreground">
                          No employees found.
                        </TableCell>
                      </TableRow>
                    ) : employees.map((emp, index) => (
                      <motion.tr key={emp.$id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="group hover:bg-muted/50 transition-colors"
                      >
                        {canDelete && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={bulk.selected.has(emp.$id)}
                              onCheckedChange={() => bulk.toggle(emp.$id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {emp.name.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm truncate">{emp.name}</p>
                                <CopyButton value={emp.name} />
                              </div>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{emp.$id}</span>
                            <CopyButton value={emp.$id} />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {emp.passportNumber ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs">{emp.passportNumber}</span>
                              <CopyButton value={emp.passportNumber} />
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">{emp.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {emp.licensed
                            ? <CheckCircle2 className="w-4 h-4 text-success" />
                            : <XCircle className="w-4 h-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {emp.contact && emp.contact !== "N/A" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{emp.contact}</span>
                              <CopyButton value={emp.contact} />
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {dayjs(emp.startDate).format("MMM D, YYYY")}
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
                              <DropdownMenuItem onClick={() => setDetailsEmployee(emp)}>View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditEmployee(emp)}>Edit Employee</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteEmp.mutate({ id: emp.$id })}
                              >
                                Delete Employee
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

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>{((safePage-1)*pageSize)+1}–{Math.min(safePage*pageSize, sorted.length)} of {sorted.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={safePage<=1} onClick={() => setPage(safePage-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2">Page {safePage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={safePage>=totalPages} onClick={() => setPage(safePage+1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      <EditPersonnelDialog employee={editEmployee} open={!!editEmployee} onOpenChange={(v) => { if (!v) setEditEmployee(null) }} />
      <PersonnelDetailsModal employee={detailsEmployee} open={!!detailsEmployee} onOpenChange={(v) => { if (!v) setDetailsEmployee(null) }} />
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
