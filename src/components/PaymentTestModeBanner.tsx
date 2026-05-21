const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-center text-[11px] text-amber-200">
      Testmodus — alle Zahlungen im Preview sind Test-Transaktionen.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Mehr
      </a>
    </div>
  );
}
