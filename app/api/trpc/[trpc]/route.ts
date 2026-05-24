import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ path, error }) {
      // Surface real error in server logs (visible in `bun dev` terminal)
      console.error(`[tRPC/${path}]`, error.message);
      if (error.cause) console.error("  cause:", error.cause);
    },
  });

export { handler as GET, handler as POST };
