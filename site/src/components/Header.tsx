import { Link } from "react-router-dom";
import Search from "./Search";
import ThemeToggle from "./ThemeToggle";
import { GitHubIcon, MenuIcon } from "./Icons";
import { GITHUB_URL } from "../nav";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="site-header">
      <button type="button" className="icon-button sidebar-toggle" aria-label="Open navigation" onClick={onMenuClick}>
        <MenuIcon />
      </button>
      <Link to="/" className="site-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span>LocalCortex</span>
      </Link>
      <div className="site-header-search">
        <Search />
      </div>
      <div className="site-header-actions">
        <ThemeToggle />
        <a className="github-button" href={GITHUB_URL} target="_blank" rel="noreferrer" title="View on GitHub">
          <GitHubIcon />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
}
