"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { NaInput } from "@/components/ui/na-input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/lib/trpc"
import { PersonnelUpdateSchema, type PersonnelUpdateInput } from "@/lib/schemas/personnel"

const ROLES = ["CEO", "Partner", "Senior Attorney", "Attorney", "Law Student"] as const

interface EmployeeDoc {
  $id: string; name: string; email: string; contact?: string
  licensed: boolean; startDate: string; role: string; passportNumber?: string
}

interface EditPersonnelDialogProps {
  employee: EmployeeDoc | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function EditPersonnelDialog({ employee, open, onOpenChange }: EditPersonnelDialogProps) {
  const utils = trpc.useUtils()
  const update = trpc.personnel.update.useMutation({
    onSuccess: () => {
      toast.success("Employee updated")
      utils.personnel.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<PersonnelUpdateInput>({
    resolver: zodResolver(PersonnelUpdateSchema),
    defaultValues: { id: "", name: "", email: "", contact: "", licensed: false, startDate: "", role: "Attorney", passportNumber: "" },
  })

  useEffect(() => {
    if (employee) {
      form.reset({
        id: employee.$id,
        name: employee.name,
        email: employee.email,
        contact: employee.contact ?? "",
        licensed: employee.licensed,
        startDate: employee.startDate?.split("T")[0] ?? "",
        role: employee.role as any,
        passportNumber: employee.passportNumber ?? "",
      })
    }
  }, [employee, form])

  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Employee — {employee.$id}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email / Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="contact" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <NaInput value={field.value ?? ""} onChange={field.onChange} placeholder="00-00-000"
                    mask={(raw) => {
                      let v = raw.replace(/\D/g, "")
                      if (v.length > 2) v = v.slice(0, 2) + "-" + v.slice(2)
                      if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5)
                      return v.slice(0, 9)
                    }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="passportNumber" render={({ field }) => (
              <FormItem><FormLabel>Passport Number</FormLabel><FormControl><Input placeholder="A12345678" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="licensed" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="mb-0">Bar Licensed</FormLabel>
                <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
