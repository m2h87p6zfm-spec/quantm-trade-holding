import { Link } from "@tanstack/react-router";

type Props = {
  className?: string;
  separator?: boolean;
};

/**
 * Konsistenter Legal-Links-Strip für Impressum, AGB und Datenschutz.
 * Wird auf Auth-Screens, in Sidebar/Footer und Account-Menüs verwendet.
 */
export function LegalLinks({ className = "", separator = true }: Props) {
  return (
    <nav
      aria-label="Rechtliches"
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/70 ${className}`}
    >
      <Link to="/impressum" className="hover:text-foreground">Impressum</Link>
      {separator && <span aria-hidden className="opacity-30">·</span>}
      <Link to="/agb" className="hover:text-foreground">AGB</Link>
      {separator && <span aria-hidden className="opacity-30">·</span>}
      <Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
    </nav>
  );
}
