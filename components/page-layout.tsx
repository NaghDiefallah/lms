"use client"

import { motion } from "framer-motion"
import { Navigation, MobileMenuButton } from "./navigation"
import { useSidebar } from "@/lib/sidebar-context"
import { AuthGuard } from "./auth-guard"

interface PageLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export function PageLayout({ title, subtitle, children, actions }: PageLayoutProps) {
  const { isCollapsed } = useSidebar()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navigation />

        <motion.main
          animate={{ paddingLeft: isCollapsed ? 72 : 256 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="lg:pl-64 transition-none"
        >
          <div className="lg:hidden sticky top-0 z-30 border-b border-border bg-card">
            <div className="flex items-center gap-3 px-4 py-3">
              <MobileMenuButton />
              <div className="min-w-0">
                <h1 className="text-base font-semibold truncate">{title}</h1>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="p-4 sm:p-6 lg:p-8"
          >
            <div className="hidden lg:flex items-start justify-between gap-6 mb-8">
              <div className="min-w-0">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl font-semibold tracking-tight"
                >
                  {title}
                </motion.h1>
                {subtitle && (
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mt-1 text-muted-foreground"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
              {actions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="shrink-0"
                >
                  {actions}
                </motion.div>
              )}
            </div>

            {actions && (
              <div className="lg:hidden mb-4">
                {subtitle && <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>}
                {actions}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {children}
            </motion.div>
          </motion.div>
        </motion.main>
      </div>
    </AuthGuard>
  )
}
