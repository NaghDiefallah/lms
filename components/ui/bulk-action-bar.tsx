"use client"

import { Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

interface BulkActionBarProps {
  count: number
  onDelete: () => void
  onClear: () => void
  isDeleting?: boolean
}

export function BulkActionBar({ count, onDelete, onClear, isDeleting }: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border shadow-xl rounded-full px-4 py-2"
        >
          <span className="text-sm font-medium tabular-nums">{count} selected</span>
          <div className="w-px h-4 bg-border" />
          <Button
            variant="destructive"
            size="sm"
            className="rounded-full gap-1.5 h-7 px-3"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full h-7 w-7 p-0" onClick={onClear}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
