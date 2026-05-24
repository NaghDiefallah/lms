"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AttorneyPicker } from "@/components/ui/attorney-picker"
import { MultiClientPicker } from "@/components/ui/multi-client-picker"
import { trpc } from "@/lib/trpc"
import { CaseCreateSchema, type CaseCreateInput } from "@/lib/schemas/cases"

export function NewCaseDialog() {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()

  const create = trpc.cases.create.useMutation({
    onSuccess: () => {
      toast.success("Case created")
      utils.cases.list.invalidate()
      setOpen(false)
      form.reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<CaseCreateInput>({
    resolver: zodResolver(CaseCreateSchema),
    defaultValues: {
      clientIds: [], clientNames: [], description: "", notes: "",
      startDate: new Date().toISOString().split("T")[0], endDate: "",
      status: "pending", currentStatus: "", assignedAttorneys: [],
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />New Case</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>New Case</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
            <FormItem>
              <FormLabel>Clients</FormLabel>
              <MultiClientPicker
                clientIds={form.watch("clientIds")}
                clientNames={form.watch("clientNames")}
                onChange={(ids, names) => { form.setValue("clientIds", ids); form.setValue("clientNames", names) }}
              />
              {form.formState.errors.clientIds && (
                <p className="text-xs text-destructive">{form.formState.errors.clientIds.message}</p>
              )}
            </FormItem>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="Brief case description" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Detailed case notes…" rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currentStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Status</FormLabel>
                  <FormControl><Input placeholder="e.g. Discovery Phase" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="assignedAttorneys" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Attorneys</FormLabel>
                <AttorneyPicker value={field.value ?? []} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
