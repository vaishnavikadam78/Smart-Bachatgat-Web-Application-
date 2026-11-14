import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingNavbar.css";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";

const baseLinks = [
  { key: "home",      href: "#home"      },
  { key: "about",     href: "#about"     },
  { key: "features",  href: "#features"  },
  { key: "reviews",   href: "#reviews"   },
  { key: "pricing",   href: "#pricing"   },
  { key: "contact",   href: "#contact"   },
];

const LandingNavbar = () => {
  const [scrolled,     setScrolled]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [activeLink,   setActiveLink]   = useState("#home");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const navLinks = baseLinks.map(l => ({ label: t(l.key), href: l.href }));

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);

      // Active section detection
      const sections = navLinks.map(l => l.href.replace("#", ""));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && window.scrollY >= el.offsetTop - 100) {
          setActiveLink(`#${sections[i]}`);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setActiveLink(href);
    setMenuOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <nav className={`ln-nav ${scrolled ? "ln-nav-scrolled" : ""}`}>
        <div className="ln-container">

          {/* Logo */}
          <a className="ln-logo" href="#home" onClick={e => handleNavClick(e, "#home")}>
            <div className="ln-logo-mark">B</div>
            <div className="ln-logo-text">
              <span className="ln-logo-name">Bachatgat</span>
              <span className="ln-logo-tagline">Smart SHG Platform</span>
            </div>
          </a>

          {/* Desktop Links */}
          <ul className="ln-links">
            {navLinks.map(l => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={`ln-link ${activeLink === l.href ? "ln-link-active" : ""}`}
                  onClick={e => handleNavClick(e, l.href)}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="ln-cta-group">
            <a href="tel:+919370930007" className="ln-phone">
              <span className="ln-phone-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </span>
              +91 93709 30007
            </a>
            <LanguageSwitcher compact={true} />
            <button className="ln-cta-btn" onClick={() => navigate("/login")}> 
              {t("login") || "Login / Sign In"}
            </button>
          </div>

          {/* Hamburger */}
          <button
            className={`ln-hamburger ${menuOpen ? "ln-ham-open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`ln-mobile-menu ${menuOpen ? "ln-mobile-open" : ""}`}>
        <ul className="ln-mobile-links">
          {navLinks.map(l => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`ln-mobile-link ${activeLink === l.href ? "ln-mobile-active" : ""}`}
                onClick={e => handleNavClick(e, l.href)}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ln-mobile-cta">
          <a href="tel:+919370930007" className="ln-mobile-phone">
            📞 +91 93709 30007
          </a>
          <button className="ln-cta-btn ln-cta-full" onClick={() => { navigate("/login"); setMenuOpen(false); }}>
            {t("login") || "Login / Sign In"}
          </button>
        </div>
      </div>

      {/* Overlay */}
      {menuOpen && <div className="ln-overlay" onClick={() => setMenuOpen(false)} />}
    </>
  );
};

export default LandingNavbar;