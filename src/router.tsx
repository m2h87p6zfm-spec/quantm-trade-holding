import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Etwas ist schiefgelaufen</h1>
        <p className="mt-2 text-sm text-muted-foreground">Die Plattform bleibt erreichbar. Gehe zur Startseite oder versuche es erneut.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => { reset(); router.invalidate(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Erneut laden</button>
          <button onClick={() => { reset(); router.navigate({ to: "/" }); }} className="rounded-md border border-border px-4 py-2 text-sm font-medium">Zur Startseite</button>
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
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register { router: ReturnType<typeof getRouter>; }
}
