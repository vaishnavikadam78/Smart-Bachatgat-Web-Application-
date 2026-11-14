import "./LandingFooter.css";

const LandingFooter = () => {
  const year = new Date().getFullYear();

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="lf-footer">

      {/* ── CTA Banner ── */}
      <div className="lf-banner">
        <div className="lf-banner-inner">
          <div className="lf-banner-text">
            <h2>Ready to digitize your Bachatgat?</h2>
            <p>Join 500+ groups already managing savings, loans and members smartly.</p>
          </div>
          <div className="lf-banner-actions">
            <a href="tel:+919370930007" className="lf-banner-call">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Call Now: +91 93709 30007
            </a>
            <a href="#contact" onClick={e => handleNavClick(e, "#contact")} className="lf-banner-demo">
              Request a Demo →
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Footer ── */}
      <div className="lf-main">
        <div className="lf-container">

          {/* Brand Column */}
          <div className="lf-col lf-brand-col">
            <div className="lf-logo">
              <div className="lf-logo-mark">B</div>
              <div>
                <div className="lf-logo-name">Bachatgat</div>
                <div className="lf-logo-tag">Smart SHG Platform</div>
              </div>
            </div>
            <p className="lf-brand-desc">
              Empowering Self-Help Groups across India with smart digital tools for savings, loans, and member management.
            </p>
            <div className="lf-contact-info">
              <a href="tel:+919370930007" className="lf-contact-item">
                <span className="lf-contact-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </span>
                +91 93709 30007
              </a>
              <a href="mailto:support@bachatgat.com" className="lf-contact-item">
                <span className="lf-contact-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                support@bachatgat.com
              </a>
              <div className="lf-contact-item">
                <span className="lf-contact-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                Nagpur, Maharashtra, India
              </div>
            </div>

            {/* Social */}
            <div className="lf-socials">
              {[
                { label: "Twitter",   icon: "𝕏", href: "#" },
                { label: "Facebook",  icon: "f",  href: "#" },
                { label: "Instagram", icon: "▣",  href: "#" },
                { label: "LinkedIn",  icon: "in", href: "#" },
                { label: "YouTube",   icon: "▶",  href: "#" },
              ].map(s => (
                <a key={s.label} href={s.href} className="lf-social-btn" title={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lf-col">
            <h4 className="lf-col-title">Quick Links</h4>
            <ul className="lf-links">
              {[
                { label: "Home",       href: "#home"      },
                { label: "About Us",   href: "#about"     },
                { label: "Services",   href: "#services"  },
                { label: "Products",   href: "#products"  },
                { label: "Pricing",    href: "#pricing"   },
                { label: "Contact",    href: "#contact"   },
                { label: "Login",      href: "/login"     },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href}
                    className="lf-link"
                    onClick={l.href.startsWith("#") ? e => handleNavClick(e, l.href) : undefined}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="lf-col">
            <h4 className="lf-col-title">Our Services</h4>
            <ul className="lf-links">
              {[
                "Bachatgat Mobile App",
                "SHG / NGO Admin Panel",
                "Pigmi Collection App",
                "SHG Help Center",
                "Member Management",
                "Loan & Savings Tracker",
                "MIS Report Generator",
                "WhatsApp Notifications",
              ].map(s => (
                <li key={s}><span className="lf-link lf-link-plain">{s}</span></li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div className="lf-col">
            <h4 className="lf-col-title">Products</h4>
            <ul className="lf-links">
              {[
                { name: "Bachatgat / SHG", desc: "Management & Solutions" },
                { name: "E-Seva",          desc: "Business License"       },
                { name: "CNG Tank Service",desc: "Hydro Testing & Kits"   },
                { name: "RSL Pvt. Ltd.",   desc: "Software Development"   },
              ].map(p => (
                <li key={p.name}>
                  <div className="lf-product-item">
                    <span className="lf-product-name">{p.name}</span>
                    <span className="lf-product-desc">{p.desc}</span>
                  </div>
                </li>
              ))}
            </ul>

            <h4 className="lf-col-title" style={{ marginTop: 24 }}>Legal</h4>
            <ul className="lf-links">
              {["Privacy Policy", "Terms of Service", "Refund Policy"].map(l => (
                <li key={l}><a href="#" className="lf-link">{l}</a></li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="lf-bottom">
        <div className="lf-bottom-inner">
          <p className="lf-copyright">
            © {year} Bachatgat. All rights reserved. Made with care for India's SHG communities.
          </p>
          <div className="lf-bottom-badges">
            <span className="lf-badge">🇮🇳 Made in India</span>
            <span className="lf-badge">500+ Groups</span>
            <span className="lf-badge">6,000+ Members</span>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default LandingFooter;