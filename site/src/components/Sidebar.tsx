import { NavLink } from "react-router-dom";
import { nav, type NavGroup } from "../nav";

// Guides ("User guide") contain groups ("How it works"), groups contain page
// links. Each level is styled differently in global.css.
const sections = nav.reduce<{ label: NavGroup["section"]; groups: NavGroup[] }[]>((acc, g) => {
  const last = acc[acc.length - 1];
  if (last && last.label === g.section) last.groups.push(g);
  else acc.push({ label: g.section, groups: [g] });
  return acc;
}, []);

export default function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return (
    <nav className={`site-sidebar${open ? " open" : ""}`} aria-label="Documentation">
      {sections.map((section) => (
        <div className="sidebar-section" key={section.label}>
          <div className="sidebar-section-label">{section.label}</div>
          {section.groups.map((group) => (
            <div className="sidebar-group" key={group.label}>
              <div className="sidebar-group-label">{group.label}</div>
              <ul>
                {group.pages.map((page) => (
                  <li key={page.path}>
                    <NavLink
                      to={page.path}
                      end={page.path === "/"}
                      className={({ isActive }) => (isActive ? "active" : undefined)}
                      onClick={onNavigate}
                    >
                      {page.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}
