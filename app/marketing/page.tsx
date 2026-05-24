"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp, TrendingDown, DollarSign, Target, BarChart3,
  MessageSquare, Globe, Search, Megaphone, Radio, ChevronLeft, ChevronRight,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts"
import { toast } from "sonner"
import { PageLayout } from "@/components/page-layout"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/lib/trpc"
import { useBulkSelect } from "@/hooks/use-bulk-select"
import { BulkActionBar } from "@/components/ui/bulk-action-bar"
import { useHasPermission } from "@/hooks/use-role"
import { NewCampaignDialog } from "@/components/forms/new-campaign-dialog"
import { UpdateCampaignDialog } from "@/components/forms/update-campaign-dialog"
import { useDebounce } from "@/hooks/use-debounce"
import dayjs from "dayjs"

const platformIcons: Record<string, React.ElementType> = {
  Discord: MessageSquare,
  "LI Ads": Megaphone,
  "LI Broadcasts": Radio,
  Other: Globe,
}

const PAGE_SIZE = 10

type Campaign = {
  $id: string; campaignId?: string; platform: string; date: string; time?: string
  manager: string; budget: number; actual: number; results?: string; roi: number; status: string
}

export default function MarketingPage() {
  const [updateCampaign, setUpdateCampaign] = useState<Campaign | null>(null)
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, error } = trpc.marketing.list.useQuery({
    search: debouncedSearch || undefined,
    platform: platformFilter !== "all" ? platformFilter as "Discord" | "LI Ads" | "LI Broadcasts" | "Other" : undefined,
    status: statusFilter !== "all" ? statusFilter as "active" | "completed" : undefined,
    limit: 500,
  })
  const utils = trpc.useUtils()
  const canDelete = useHasPermission("marketing.delete")

  const campaigns = (data?.documents ?? []) as Campaign[]

  // Reset page on filter change
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setPage(0)
  }, [debouncedSearch, platformFilter, statusFilter])

  const pageCount = Math.ceil(campaigns.length / PAGE_SIZE)
  const paginated = campaigns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const bulk = useBulkSelect(campaigns)
  const deleteMany = trpc.marketing.deleteMany.useMutation({
    onSuccess: () => {
      toast.success(`${bulk.count} campaign${bulk.count !== 1 ? "s" : ""} deleted`)
      utils.marketing.list.invalidate()
      bulk.clear()
    },
    onError: (err) => toast.error(err.message),
  })

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.actual, 0)
  const avgRoi = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + c.roi, 0) / campaigns.length : 0

  const platformSpend = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.platform] = (acc[c.platform] ?? 0) + c.actual
    return acc
  }, {})
  const performanceData = Object.entries(platformSpend).map(([platform, spend]) => ({ platform, spend }))

  const roiTrend = [...campaigns]
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
    .map((c) => ({ date: dayjs(c.date).format("MMM D"), roi: c.roi }))

  return (
    <PageLayout
      title="Marketing"
      subtitle="Track advertising campaigns and ROI"
      actions={<NewCampaignDialog />}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatCard label="Total Budget" value={isLoading ? "—" : `$${totalBudget.toLocaleString()}`} icon={DollarSign} delay={0} />
        <StatCard label="Total Spent" value={isLoading ? "—" : `$${totalSpent.toLocaleString()}`} icon={BarChart3} delay={0.05} />
        <StatCard label="Remaining" value={isLoading ? "—" : `$${(totalBudget - totalSpent).toLocaleString()}`} icon={Target} delay={0.1} />
        <StatCard label="Avg. ROI" value={isLoading ? "—" : `${avgRoi.toFixed(2)}%`} icon={TrendingUp} delay={0.15} />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>Failed to load campaigns: {error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }} className="col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-lg font-medium">Spend by Platform</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full" /> : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="platform" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false}
                        tickFormatter={(v) => `$${v / 1000}k`} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`, "Spend"]} />
                      <Bar dataKey="spend" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-lg font-medium">ROI Trend</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-52 w-full" /> : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={roiTrend}>
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                        formatter={(v: number) => [`${v}%`, "ROI"]} />
                      <Line type="monotone" dataKey="roi" stroke="var(--chart-2)" strokeWidth={2}
                        dot={{ fill: "var(--chart-2)", strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {canDelete && campaigns.length > 0 && (
                  <Checkbox
                    checked={bulk.allSelected ? true : bulk.someSelected ? "indeterminate" : false}
                    onCheckedChange={bulk.toggleAll}
                  />
                )}
                <CardTitle className="text-lg font-medium">Campaigns</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {campaigns.length > 0 && `${campaigns.length} total`}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search advertiser…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="Discord">Discord</SelectItem>
                    <SelectItem value="LI Ads">LI Ads</SelectItem>
                    <SelectItem value="LI Broadcasts">LI Broadcasts</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : paginated.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No campaigns found.</p>
            ) : (
              <div className="space-y-4">
                {paginated.map((c, i) => {
                  const Icon = platformIcons[c.platform] ?? Globe
                  const pct = c.budget > 0 ? (c.actual / c.budget) * 100 : 0
                  return (
                    <motion.div key={c.$id}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.03 }}
                      className="flex items-center gap-6 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      {canDelete && (
                        <Checkbox
                          checked={bulk.selected.has(c.$id)}
                          onCheckedChange={() => bulk.toggle(c.$id)}
                        />
                      )}
                      <div className="flex items-center gap-3 w-44 min-w-0">
                        <div className="p-2 bg-background rounded-lg shrink-0"><Icon className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{c.platform}</p>
                          <p className="text-xs text-muted-foreground">
                            {dayjs(c.date).format("MMM D, YYYY")}
                            {c.time ? ` · ${c.time}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">${c.actual.toLocaleString()} / ${c.budget.toLocaleString()}</span>
                          <span className="font-medium">{pct.toFixed(0)}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                      <div className="w-28 text-center">
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>
                          {c.status === "active" ? "Active" : "Completed"}
                        </Badge>
                      </div>
                      <div className="w-24 text-center"><p className="font-medium text-sm">{c.results ?? "—"}</p></div>
                      <div className="w-24 text-right flex items-center justify-end gap-1">
                        {c.roi > 0 ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-muted-foreground" />}
                        <span className={c.roi > 0 ? "text-success font-medium" : "text-muted-foreground"}>{c.roi}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {c.manager.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="hidden lg:block">
                          <p className="text-xs font-medium">{c.manager}</p>
                          <p className="text-xs text-muted-foreground">Advertiser</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setUpdateCampaign(c)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                      >
                        Update
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {pageCount} · {campaigns.length} campaigns
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                    disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <Button key={i} variant={i === page ? "default" : "outline"} size="sm"
                      className="h-8 w-8 p-0 text-xs" onClick={() => setPage(i)}>
                      {i + 1}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                    disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <UpdateCampaignDialog
        campaign={updateCampaign}
        open={!!updateCampaign}
        onOpenChange={(v) => { if (!v) setUpdateCampaign(null) }}
      />
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
