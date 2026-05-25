function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatErrorDetails(error: unknown): { message: string; stack: string } {
  if (!error) return { message: "Unknown error", stack: "" };
  if (error instanceof Error) {
    return { message: `${error.name}: ${error.message}`, stack: error.stack ?? "" };
  }
  if (typeof error === "string") return { message: error, stack: "" };
  try {
    return { message: JSON.stringify(error, null, 2), stack: "" };
  } catch {
    return { message: String(error), stack: "" };
  }
}

export function renderErrorPage(error?: unknown): string {
  const details = error !== undefined ? formatErrorDetails(error) : null;
  const debugBlock = details
    ? `
      <details class="debug" open>
        <summary>Debug-Details (SSR Fehler)</summary>
        <h2>${escapeHtml(details.message)}</h2>
        ${details.stack ? `<pre>${escapeHtml(details.stack)}</pre>` : `<p class="muted">Kein Stacktrace verfügbar.</p>`}
        <p class="muted">Zeitpunkt: ${new Date().toISOString()}</p>
      </details>`
    : "";

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Diese Seite konnte nicht geladen werden</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; margin: 0; padding: 1.5rem; }
      .wrap { max-width: 56rem; margin: 0 auto; }
      .card { text-align: center; padding: 2rem 1rem 1rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
      .debug { margin-top: 2rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem 1.25rem; text-align: left; }
      .debug summary { cursor: pointer; font-weight: 600; color: #b91c1c; }
      .debug h2 { font-size: 0.95rem; margin: 1rem 0 0.5rem; color: #991b1b; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-word; }
      .debug pre { background: #0b0f17; color: #e5e7eb; padding: 1rem; border-radius: 0.375rem; overflow: auto; font-size: 12px; line-height: 1.5; max-height: 24rem; }
      .muted { color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Diese Seite konnte nicht geladen werden</h1>
        <p>Auf dem Server ist ein Fehler aufgetreten. Du kannst es erneut versuchen oder zur Startseite zurückkehren.</p>
        <div class="actions">
          <button class="primary" onclick="location.reload()">Erneut versuchen</button>
          <a class="secondary" href="/">Zur Startseite</a>
        </div>
      </div>
      ${debugBlock}
    </div>
  </body>
</html>`;
}
