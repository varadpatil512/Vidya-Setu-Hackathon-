import { Link } from 'react-router-dom';
import { GraduationCap, Sparkles } from 'lucide-react';

function GithubIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-vs-surface-2/70 dark:bg-vs-surface-2/40 border-t border-vs-border text-vs-text transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        
        {/* Main Footer Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          
          {/* Left/Top Area: Brand & Team Nexus */}
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2.5 group inline-flex">
              <div className="w-9 h-9 rounded-lg bg-vs-accent flex items-center justify-center group-hover:bg-vs-accent-hover transition-colors">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-vs-accent tracking-tight">
                  VidyaSetu
                </span>
                <span className="block text-[10px] tracking-widest text-vs-muted font-medium uppercase leading-tight">
                  Learn · Do · Prove
                </span>
              </div>
            </Link>

            <p className="text-xs text-vs-muted max-w-sm leading-relaxed">
              Transforming passive learning into verified, transparent engineering capability.
            </p>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-vs-accent">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Built by Team Nexus</span>
            </div>
          </div>

          {/* Team Members Area: Two Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Varad Patil */}
            <div className="p-4 rounded-xl bg-vs-surface border border-vs-border shadow-sm flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-vs-text">Varad Patil</h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/varadpatil512"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-vs-surface-2 border border-vs-border text-vs-muted hover:text-vs-accent hover:border-vs-accent/40 transition-all btn-scale"
                  title="Varad Patil GitHub"
                  aria-label="Varad Patil GitHub"
                >
                  <GithubIcon className="w-5 h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/in/varad-patil-1o8/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-vs-surface-2 border border-vs-border text-vs-muted hover:text-vs-accent hover:border-vs-accent/40 transition-all btn-scale"
                  title="Varad Patil LinkedIn"
                  aria-label="Varad Patil LinkedIn"
                >
                  <LinkedinIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Deep Keni */}
            <div className="p-4 rounded-xl bg-vs-surface border border-vs-border shadow-sm flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-vs-text">Deep Keni</h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/Deep-keni"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-vs-surface-2 border border-vs-border text-vs-muted hover:text-vs-accent hover:border-vs-accent/40 transition-all btn-scale"
                  title="Deep Keni GitHub"
                  aria-label="Deep Keni GitHub"
                >
                  <GithubIcon className="w-5 h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/in/deepkeni/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-vs-surface-2 border border-vs-border text-vs-muted hover:text-vs-accent hover:border-vs-accent/40 transition-all btn-scale"
                  title="Deep Keni LinkedIn"
                  aria-label="Deep Keni LinkedIn"
                >
                  <LinkedinIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

          </div>

        </div>

        {/* Divider & Copyright */}
        <div className="border-t border-vs-border mt-8 pt-6 text-center">
          <p className="text-xs text-vs-muted font-medium">
            © 2026 VidyaSetu — Prasunethon 2.0
          </p>
        </div>

      </div>
    </footer>
  );
}
