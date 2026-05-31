"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Scale, Briefcase, Users, Receipt, BarChart3,
  ArrowRight, Shield, Clock, UserCircle,
  Sun, Moon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"

const features = [
  {
    icon: Briefcase,
    title: "Case Management",
    desc: "Track every case from filing to resolution with assigned attorneys, notes, and real-time status updates.",
  },
  {
    icon: Users,
    title: "Client Portal",
    desc: "Manage client relationships with passport verification, contract storage, and full case history.",
  },
  {
    icon: Receipt,
    title: "Ledger & Invoicing",
    desc: "Auto-generate invoices, track retainers, and export reports in CSV, Markdown, or plain text.",
  },
  {
    icon: BarChart3,
    title: "Marketing Analytics",
    desc: "Monitor campaign performance across platforms with live ROI tracking and spend analysis.",
  },
  {
    icon: UserCircle,
    title: "Personnel",
    desc: "Manage your licensed attorneys with role-based access control and performance tracking.",
  },
  {
    icon: Shield,
    title: "Security & RBAC",
    desc: "Fine-grained permissions for CEO, Partner, Senior Attorney, Attorney, and Law Student roles.",
  },
]

const stats = [
  { value: "100%", label: "Type-safe API" },
  { value: "RBAC", label: "Role-based access" },
  { value: "Real-time", label: "Live data sync" },
  { value: "Self-hosted", label: "Your infrastructure" },
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  // Auto-redirect signed-in users to dashboard
  useEffect(() => {
    if (!loading && user) router.push("/dashboard")
  }, [user, loading, router])

  if (loading) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <motion.div whileHover={{ rotate: 15 }} transition={{ type: "spring", stiffness: 400 }} className="rounded-lg bg-primary p-2">
              <Scale className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <span className="text-lg font-semibold tracking-tight">LMS</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <Moon className="h-4 w-4" />}
            </button>
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Clock className="h-3.5 w-3.5" />
              Built for modern law firms
            </div>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Legal management,<br />
              <span className="text-primary">finally done right.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Lawfirm Management System unifies case tracking, client management, billing, and team collaboration
              in one secure platform built for attorneys who mean business.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2 px-6 text-base">
                  Start free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="px-6 text-base">
                  Sign in
                </Button>
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="text-center">
                  <p className="text-3xl font-bold text-foreground">{s.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-16 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border bg-background/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-success/60" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">lms.law/dashboard</span>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
              {[
                { label: "Total Clients", value: "48", color: "text-chart-1" },
                { label: "Active Cases", value: "12", color: "text-chart-2" },
                { label: "Total Received", value: "$2.4M", color: "text-success" },
                { label: "Team Members", value: "7", color: "text-chart-4" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything your firm needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From intake to invoice, LMS handles the operational side so your attorneys can focus on the law.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.05 }}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="mb-4 inline-flex rounded-lg bg-secondary p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-medium tracking-tight">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        <section className="border-y border-border bg-card/50 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="text-center">
                  <p className="text-3xl font-bold text-foreground">{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-10">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to modernize your practice?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Replace scattered tools with one focused workspace for your team, clients, and financial flow.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link href="/sign-up">
                  <Button size="lg" className="gap-2 px-6">Create account <ArrowRight className="h-4 w-4" /></Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="outline" className="px-6">Sign in</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pb-8 text-sm text-muted-foreground sm:px-6">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4" />
          <span>Lawfirm Management System (LMS)</span>
        </div>
        <span>© {new Date().getFullYear()} All rights reserved.</span>
      </footer>
    </div>
  )
}
