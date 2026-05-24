"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import {
  LayoutDashboard, Users, Briefcase, Receipt,
  Megaphone, UserCircle, Moon, Sun, Scale,
  ChevronLeft, ChevronRight, Menu, X, FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/lib/sidebar-context"
import { useAuth } from "@/lib/auth-context"
import { LogOut } from "lucide-react"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/cases", label: "Cases", icon: Briefcase },
  { href: "/ledger", label: "Ledger", icon: Receipt },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/personnel", label: "Personnel", icon: UserCircle },
]

export function MobileMenuButton() {
  const { isOpen, setIsOpen } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="lg:hidden h-9 w-9 p-0 rounded-lg"
      onClick={() => setIsOpen(!isOpen)}
    >
      {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </Button>
  )
}

export function Navigation() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { isCollapsed, toggle, isOpen, setIsOpen } = useSidebar()
  const { user, signOut } = useAuth()
  const router = useRouter()

  const sidebarWidth = isCollapsed ? "w-[72px]" : "w-64"

  const NavContent = (
    <TooltipProvider delayDuration={0}>
      {/* Logo */}
      <div className={`p-4 border-b border-border flex items-center ${isCollapsed ? "justify-center" : "gap-3 justify-between"}`}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-3 group min-w-0" onClick={() => setIsOpen(false)}>
            <motion.div whileHover={{ rotate: 15 }} transition={{ type: "spring", stiffness: 400 }}
              className="p-2 bg-primary rounded-lg shrink-0">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight truncate">LMS</h1>
              <p className="text-xs text-muted-foreground truncate">Lawfirm Management System</p>
            </div>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/" onClick={() => setIsOpen(false)}>
            <div className="p-2 bg-primary rounded-lg">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
          </Link>
        )}
        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex h-7 w-7 p-0 shrink-0"
          onClick={toggle}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          const linkContent = (
            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
              <motion.div
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative flex items-center px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-200 cursor-pointer
                  ${isCollapsed ? "justify-center" : "gap-3"}
                  ${isActive
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }
                `}
              >
                {isActive && (
                  <motion.div layoutId="activeNav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </motion.div>
            </Link>
          )

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }
          return linkContent
        })}
      </div>

      {/* Bottom bar */}
      <div className="p-3 border-t border-border space-y-2">
        {/* User info */}
        {!isCollapsed && user && (
          <div className="px-1 py-1.5 rounded-lg bg-secondary/70">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between px-1"}`}>
          {!isCollapsed && <p className="text-xs text-muted-foreground">v1.0.0</p>}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isCollapsed ? "right" : "top"}>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    await signOut()
                    router.push("/sign-in")
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isCollapsed ? "right" : "top"}>Sign Out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.nav
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex fixed left-0 top-0 h-screen border-r border-border bg-card flex-col z-50 overflow-hidden"
      >
        {NavContent}
      </motion.nav>

      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <motion.nav
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="lg:hidden fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex flex-col z-50"
      >
        {NavContent}
      </motion.nav>
    </>
  )
}
