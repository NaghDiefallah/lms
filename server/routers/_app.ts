import { router } from "../trpc";
import { casesRouter } from "./cases";
import { clientsRouter } from "./clients";
import { ledgerRouter } from "./ledger";
import { marketingRouter } from "./marketing";
import { personnelRouter } from "./personnel";
import { firmsRouter } from "./firms";

export const appRouter = router({
  cases: casesRouter,
  clients: clientsRouter,
  ledger: ledgerRouter,
  marketing: marketingRouter,
  personnel: personnelRouter,
  firms: firmsRouter,
});

export type AppRouter = typeof appRouter;
