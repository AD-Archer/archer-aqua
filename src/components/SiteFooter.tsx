import { Link } from 'react-router-dom';
import { PRIVACY_ROUTE, TERMS_ROUTE } from '@/lib/policies';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/80 backdrop-blur">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 text-sm text-muted-foreground md:flex-row">
        <div className="flex flex-col items-center gap-2 text-center md:flex-row md:gap-3 md:text-left">
          <span className="font-medium text-foreground">Archer Aqua</span>
          <span className="hidden md:inline" aria-hidden="true">
            •
          </span>
          <a
            href="https://antonioarcher.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            antonioarcher.com
          </a>
          <span className="hidden md:inline" aria-hidden="true">
            •
          </span>
          <span>© {year}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link to={PRIVACY_ROUTE} className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to={TERMS_ROUTE} className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
