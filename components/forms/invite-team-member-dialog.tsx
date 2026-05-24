"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  email: z.string().email("Must be a valid email address"),
  role: z.enum(["CEO", "Partner", "Senior Attorney", "Attorney", "Law Student"]),
});

type FormInput = z.infer<typeof schema>;

export function InviteTeamMemberDialog() {
  const [open, setOpen] = useState(false);
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      role: "Attorney",
    },
  });

  const invite = trpc.firms.invite.useMutation({
    onSuccess: (data) => {
      setLatestCode(data.inviteCode);
      toast.success("Invite created. Share the invite code with the user.");
      utils.firms.invitations.invalidate();
      form.reset({ email: "", role: "Attorney" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Invite a user to your firm</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => invite.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="teammate@firm.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CEO">CEO</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Senior Attorney">Senior Attorney</SelectItem>
                      <SelectItem value="Attorney">Attorney</SelectItem>
                      <SelectItem value="Law Student">Law Student</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Role is assigned when the invite is accepted during signup.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {latestCode && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Invite code</p>
                <p className="mt-1 font-mono text-sm">{latestCode}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Creating..." : "Create Invite"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
