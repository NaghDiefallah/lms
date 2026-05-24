"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Users, Briefcase, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts"
import { PageLayout } from "@/components/page-layout"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/lib/trpc"
import dayjs from "dayjs"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const TEAM_PAGE_SIZE = 5

export default function DashboardPage() {
  const currentYear = dayjs().year()
  const [revenueYear, setRevenueYear] = useState(currentYear)
  const [teamPage, setTeamPage] = useState(0)

  const { data: casesData, isLoading: casesLoading } = trpc.cases.list.useQuery({ limit: 500 })
  const { data: clientsData, isLoading: clientsLoading } = trpc.clients.list.useQuery({ limit: 500 })
  const { data: personnelData, isLoading: personnelLoading } = trpc.personnel.list.useQuery({ limit: 50 })
  const { data: allLedger, isLoading: ledgerLoading } = trpc.ledger.all.useQuery()
  const { data: ledgerSummary } = trpc.ledger.summary.useQuery()

  const cases = (casesData?.documents ?? []) as Array<{ $id: string; status: string }>
  const clients = (clientsData?.documents ?? []) as Array<{ $id: string }>
  const personnel = (personnelData?.documents ?? []) as Array<{
    $id: string; name: string; role: string; cases?: number; revenue?: number
  }>
  const transactions = (allLedger?.documents ?? []) as Array<{
    date: string; amount: number; status: string
  }>

  const isLoading = casesLoading || clientsLoading || personnelLoading || ledgerLoading

  // Available years from transaction data, always include current year
  const availableYears = [...new Set([
    currentYear,
    ...transactions.map(t => dayjs(t.date).year()),
  ])].sort((a, b) => b - a)

  // Revenue chart filtered by selected year
  const monthlyRevenue = transactions
    .filter((t) => t.status === "completed" && dayjs(t.date).year() === revenueYear)
    .reduce<Record<string, number>>((acc, t) => {
      const m = dayjs(t.date).format("MMM")
      acc[m] = (acc[m] ?? 0) + t.amount
      return acc
    }, {})

  const revenueData = MONTHS.map((m) => ({ month: m, revenue: monthlyRevenue[m] ?? 0 }))

  const activeCases = cases.filter((c) => c.status === "in_progress").length
  const pendingCases = cases.filter((c) => c.status === "pending").length
  const completedCases = cases.filter((c) => c.status === "completed").length

  const caseStatusData = [
    { status: "Active", count: activeCases },
    { status: "Pending", count: pendingCases },
    { status: "Completed", count: completedCases },
  ]

  // Team pagination
  const teamPageCount = Math.ceil(personnel.length / TEAM_PAGE_SIZE)
  const paginatedTeam = personnel.slice(teamPage * TEAM_PAGE_SIZE, (teamPage + 1) * TEAM_PAGE_SIZE)

  return (
    <PageLayout title="Dashboard" subtitle="Overview of your legal practice">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatCard label="Total Clients" value={isLoading ? "—" : (clientsData?.total ?? 0)}
          icon={Users} delay={0} />
        <StatCard label="Active Cases" value={isLoading ? "—" : activeCases}
          icon={Briefcase} delay={0.05} />
        <StatCard label="Total Received"
          value={isLoading ? "—" : `$${((ledgerSummary?.totalRetainer ?? 0) + (ledgerSummary?.totalIncome ?? 0) + (ledgerSummary?.totalFee ?? 0)).toLocaleString()}`}
          icon={DollarSign} delay={0.1} />
        <StatCard label="Team Members" value={isLoading ? "—" : (personnelData?.total ?? 0)}
          icon={TrendingUp} delay={0.15} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }} className="col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Revenue by Month</CardTitle>
                <Select value={String(revenueYear)} onValueChange={(v) => setRevenueYear(Number(v))}>
                  <SelectTrigger className="w-24 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? <Skeleton className="h-72 w-full" /> : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false}
                        tickFormatter={(v) => v === 0 ? "0" : `$${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2}
                        fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-lg font-medium">Case Status</CardTitle></CardHeader>
            <CardContent>
              {casesLoading ? <Skeleton className="h-48 w-full" /> : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={caseStatusData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="status" type="category" stroke="var(--muted-foreground)"
                          fontSize={12} tickLine={false} axisLine={false} width={80} />
                        <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {caseStatusData.map((item) => (
                      <div key={item.status} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.status}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }} className="col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Team Performance</CardTitle>
                {teamPageCount > 1 && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      disabled={teamPage === 0} onClick={() => setTeamPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">{teamPage + 1} / {teamPageCount}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      disabled={teamPage >= teamPageCount - 1} onClick={() => setTeamPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {personnelLoading ? (
                <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : personnel.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No team members yet</p>
              ) : (
                <div className="space-y-4">
                  {paginatedTeam.map((m, i) => (
                    <motion.div key={m.$id}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {m.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-sm text-muted-foreground">{m.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Cases</p>
                          <p className="font-medium">{m.cases ?? 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Revenue</p>
                          <p className="font-medium">${(m.revenue ?? 0).toLocaleString()}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-lg font-medium">Ledger Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ledgerLoading ? <Skeleton className="h-48 w-full" /> : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Retainer", value: ledgerSummary?.totalRetainer ?? 0, color: "text-chart-1" },
                      { label: "Income",   value: ledgerSummary?.totalIncome ?? 0,   color: "text-chart-2" },
                      { label: "Expense",  value: ledgerSummary?.totalExpense ?? 0,  color: "text-destructive" },
                      { label: "Fee",      value: ledgerSummary?.totalFee ?? 0,      color: "text-chart-3" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`font-semibold ${color}`}>${value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-lg bg-secondary flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Profit</p>
                      <p className={`text-lg font-semibold ${(ledgerSummary?.profit ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                        ${(ledgerSummary?.profit ?? 0).toLocaleString()}
                      </p>
                    </div>
                    {(ledgerSummary?.profit ?? 0) >= 0
                      ? <TrendingUp className="w-5 h-5 text-success" />
                      : <TrendingDown className="w-5 h-5 text-destructive" />}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
                    <div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="font-semibold text-warning">${(ledgerSummary?.totalPending ?? 0).toLocaleString()}</p>
                    </div>
                    <Clock className="w-4 h-4 text-warning" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageLayout>
  )
}
