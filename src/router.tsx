import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">The platform is still available. Go back home or try again.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => { reset(); router.invalidate(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Reload</button>
          <button onClick={() => { reset(); router.navigate({ to: "/" }); }} className="rounded-md border border-border px-4 py-2 text-sm font-medium">Go home</button>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register { router: ReturnType<typeof getRouter>; }
}
