"use client"

import dayjs from "dayjs"
import { Mail, Phone, Calendar, Briefcase, TrendingUp, CreditCard, Award } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface EmployeeDoc {
  $id: string; $createdAt: string; name: string; email: string; contact?: string
  licensed: boolean; startDate: string; role: string; passportNumber?: string
  cases?: number; revenue?: number; recentWins?: number
}

interface PersonnelDetailsModalProps {
  employee: EmployeeDoc | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-2.5">
      <div className="p-1.5 bg-secondary rounded-md mt-0.5"><Icon className="w-3.5 h-3.5 text-muted-foreground" /></div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>
    </div>
  )
}

export function PersonnelDetailsModal({ employee, open, onOpenChange }: PersonnelDetailsModalProps) {
  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogDescription className="sr-only">View employee information</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-base bg-primary text-primary-foreground">
              {employee.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{employee.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">{employee.$id}</Badge>
              <Badge variant="secondary">{employee.role}</Badge>
              {employee.licensed && (
                <Badge variant="secondary" className="gap-1">
                  <Award className="w-3 h-3" />Licensed
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Row icon={Mail} label="Email / Username" value={employee.email} />
          <Row icon={Phone} label="Phone" value={employee.contact} />
          <Row icon={CreditCard} label="Passport Number" value={employee.passportNumber} />
          <Row icon={Calendar} label="Started" value={dayjs(employee.startDate).format("MMM D, YYYY")} />
          <Row icon={Briefcase} label="Active Cases" value={employee.cases ?? 0} />
          <Row icon={TrendingUp} label="Revenue Generated" value={employee.revenue ? `$${employee.revenue.toLocaleString()}` : undefined} />
          <Row icon={TrendingUp} label="Recent Wins" value={employee.recentWins ?? 0} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
