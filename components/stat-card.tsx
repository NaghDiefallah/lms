"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  delay?: number
}

export function StatCard({ label, value, icon: Icon, trend, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{label}</p>
              <motion.p
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + 0.1, type: "spring", stiffness: 200 }}
                className="text-3xl font-semibold tracking-tight"
              >
                {typeof value === "number" ? value.toLocaleString() : value}
              </motion.p>
              {trend && (
                <p className={`text-sm font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </p>
              )}
            </div>
            {Icon && (
              <div className="p-2.5 bg-secondary rounded-lg">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
