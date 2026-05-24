"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/lib/trpc"

interface Campaign {
  $id: string; platform: string; manager: string
  budget: number; actual: number; results?: string; roi: number; status: string
}

interface UpdateCampaignDialogProps {
  campaign: Campaign | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

const UpdateSchema = z.object({
  id: z.string(),
  actual: z.number().min(0, "Must be ≥ 0"),
  results: z.string().optional(),
  roi: z.number(),
  status: z.enum(["active", "completed"]),
})

type UpdateInput = z.infer<typeof UpdateSchema>

export function UpdateCampaignDialog({ campaign, open, onOpenChange }: UpdateCampaignDialogProps) {
  const utils = trpc.useUtils()

  const update = trpc.marketing.update.useMutation({
    onSuccess: () => {
      toast.success("Campaign updated")
      utils.marketing.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<UpdateInput>({
    resolver: zodResolver(UpdateSchema),
    defaultValues: { id: "", actual: 0, results: "", roi: 0, status: "active" },
  })
  const watchedActual = useWatch({ control: form.control, name: "actual" }) ?? 0

  useEffect(() => {
    if (campaign) {
      form.reset({
        id: campaign.$id,
        actual: campaign.actual,
        results: campaign.results ?? "",
        roi: campaign.roi,
        status: campaign.status as "active" | "completed",
      })
    }
  }, [campaign, form])

  if (!campaign) return null

  const spendPercent = campaign.budget > 0
    ? Math.min(100, Math.round((watchedActual / campaign.budget) * 100))
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Update Campaign — {campaign.$id}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v))} className="space-y-4">
            {/* Budget reference */}
            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Budget</span>
                <span>${campaign.budget.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-chart-1 rounded-full transition-all"
                  style={{ width: `${spendPercent}%` }}
                />
              </div>
              <p className="text-xs text-right mt-1 text-muted-foreground">{spendPercent}% spent</p>
            </div>

            <FormField control={form.control} name="actual" render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Spent ($)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={campaign.budget * 1.5} {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="roi" render={({ field }) => (
                <FormItem>
                  <FormLabel>ROI (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="results" render={({ field }) => (
              <FormItem>
                <FormLabel>Results</FormLabel>
                <FormControl><Input placeholder="e.g. 3 Leads, 1 Client" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving..." : "Save Progress"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
