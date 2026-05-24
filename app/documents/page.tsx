"use client"

import { useState, useEffect, useRef } from "react"
import { ImageIcon, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { StatCard } from "@/components/stat-card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { trpc } from "@/lib/trpc"
import { ClientDocumentsModal } from "@/components/modals/client-documents-modal"

type ClientDoc = {
  $id: string; name: string; passportFileId?: string; contractFileId?: string
}

const PAGE_SIZE = 20

export default function DocumentsPage() {
  const { data, isLoading } = trpc.clients.list.useQuery({ limit: 500 })
  const [docClient, setDocClient] = useState<ClientDoc | null>(null)
  const [search, setSearch] = useState("")
  const [docFilter, setDocFilter] = useState<string>("all")
  const [page, setPage] = useState(0)

  const clients = (data?.documents ?? []) as ClientDoc[]
  const withPassport = clients.filter(c => c.passportFileId).length
  const withContract = clients.filter(c => c.contractFileId).length

  // Reset page on filter change
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setPage(0)
  }, [search, docFilter])

  const filtered = clients.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.$id.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      docFilter === "all" ||
      (docFilter === "passport" && !!c.passportFileId) ||
      (docFilter === "contract" && !!c.contractFileId) ||
      (docFilter === "missing" && !c.passportFileId && !c.contractFileId)
    return matchesSearch && matchesFilter
  })

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <PageLayout title="Documents" subtitle="Client passports and contracts">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Clients" value={isLoading ? "—" : clients.length} delay={0} />
        <StatCard label="With Passport" value={isLoading ? "—" : withPassport} delay={0.05} />
        <StatCard label="With Contract" value={isLoading ? "—" : withContract} delay={0.1} />
      </div>

      <Card>
        <div className="flex items-center gap-3 p-4 border-b flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={docFilter} onValueChange={setDocFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="passport">Has Passport</SelectItem>
              <SelectItem value="contract">Has Contract</SelectItem>
              <SelectItem value="missing">Missing Both</SelectItem>
            </SelectContent>
          </Select>
          {filtered.length !== clients.length && (
            <span className="text-sm text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Client ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-40">Passport</TableHead>
                    <TableHead className="w-40">Contract</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No clients found.
                      </TableCell>
                    </TableRow>
                  ) : paginated.map((client) => (
                    <TableRow key={client.$id} className="group hover:bg-muted/50">
                      <TableCell className="font-mono text-xs text-muted-foreground">{client.$id}</TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        {client.passportFileId ? (
                          <Badge variant="default" className="gap-1 text-xs">
                            <ImageIcon className="w-3 h-3" />Attached
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.contractFileId ? (
                          <Badge variant="default" className="gap-1 text-xs">
                            <FileText className="w-3 h-3" />Attached
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setDocClient(client)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {pageCount} · {filtered.length} clients
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                      disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                      disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ClientDocumentsModal
        client={docClient}
        open={!!docClient}
        onOpenChange={(v) => { if (!v) setDocClient(null) }}
      />
    </PageLayout>
  )
}
