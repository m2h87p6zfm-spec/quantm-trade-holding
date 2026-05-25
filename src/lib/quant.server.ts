// Re-export of the pure-math quant engine so server-side modules can keep importing
// from "@/lib/quant.server". The actual implementation lives in ./quant and is
// safe for both client and server runtimes (no node-only APIs).
export * from "./quant";
