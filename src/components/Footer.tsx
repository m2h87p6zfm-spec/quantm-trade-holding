import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/40 px-4 py-5 text-[11px] text-muted-foreground sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-gold/80" />
          <span>
            © {new Date().getFullYear()} Quantm Trade · Keine Anlageberatung · Handel birgt Totalverlust-Risiko
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link to="/impressum" className="hover:text-foreground">Impressum</Link>
          <Link to="/agb" className="hover:text-foreground">AGB</Link>
          <Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
          <Link to="/methodology" className="hover:text-foreground">Methodik</Link>
          <Link to="/about" className="hover:text-foreground">Über</Link>
        </nav>
      </div>
    </footer>
  );
}
