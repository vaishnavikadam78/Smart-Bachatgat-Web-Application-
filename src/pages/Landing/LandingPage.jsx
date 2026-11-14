import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import "./LandingPage.css";

/* ── Animated Counter ── */
const Counter = ({ end, prefix = "", suffix = "" }) => {
  const [val, setVal] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let cur = 0;
        const step = end / 60;
        const t = setInterval(() => {
          cur += step;
          if (cur >= end) { setVal(end); clearInterval(t); }
          else setVal(Math.floor(cur));
        }, 16);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{prefix}{val.toLocaleString("en-IN")}{suffix}</span>;
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [activeNav, setActiveNav] = useState("#home");
  const [faqOpen, setFaqOpen]     = useState(null);
  const [formData, setFormData]   = useState({ name: "", phone: "", message: "" });
  const [formSent, setFormSent]   = useState(false);

  const { t } = useLanguage();

  const navLinks = [
    { label: t("home"),     href: "#home"     },
    { label: t("about"),    href: "#about"    },
    { label: t("features"), href: "#features" },
    { label: t("reviews"),  href: "#reviews"  },
    { label: t("pricing"),  href: "#pricing"  },
    { label: t("contact"),  href: "#contact"  },
  ];

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      for (let i = navLinks.length - 1; i >= 0; i--) {
        const el = document.getElementById(navLinks[i].href.slice(1));
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActiveNav(navLinks[i].href); break;
        }
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (e, href) => {
    e.preventDefault();
    setActiveNav(href);
    setMenuOpen(false);
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContact = (e) => {
    e.preventDefault();
    setFormSent(true);
    setFormData({ name: "", phone: "", message: "" });
    setTimeout(() => setFormSent(false), 3500);
  };

  return (
    <div className="lp-root">

      {/* ══════════ NAVBAR ══════════ */}
      <nav className={`lp-nav ${scrolled ? "lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-logo">🌸 SmartBachatgat</div>

        <ul className="lp-nav-center">
          {navLinks.map(l => (
            <li key={l.href}>
              <a href={l.href}
                className={`lp-nav-link ${activeNav === l.href ? "lp-nav-link--active" : ""}`}
                onClick={e => scrollTo(e, l.href)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="lp-nav-links">
          <a href="tel:+919370930007" className="lp-nav-phone">📞 +91 93709 30007</a>
          <LanguageSwitcher compact={true} />
          <button onClick={() => navigate("/login")}    className="lp-nav-login">{t("login") || "Login"}</button>
          <button onClick={() => navigate("/register")} className="lp-nav-register">{t("createAccount") || "Get Started"}</button>
        </div>

        <button className={`lp-hamburger ${menuOpen ? "lp-hamburger--open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </nav>

      <div className={`lp-mobile-menu ${menuOpen ? "lp-mobile-menu--open" : ""}`}>
        {navLinks.map(l => (
          <a key={l.href} href={l.href} className="lp-mobile-link"
            onClick={e => scrollTo(e, l.href)}>{l.label}</a>
        ))}
        <a href="tel:+919370930007" className="lp-mobile-phone">📞 +91 93709 30007</a>
        <div className="lp-mobile-btns">
          <button onClick={() => { navigate("/login");    setMenuOpen(false); }} className="lp-nav-login">Login</button>
          <button onClick={() => { navigate("/register"); setMenuOpen(false); }} className="lp-nav-register">Get Started</button>
        </div>
      </div>
      {menuOpen && <div className="lp-overlay" onClick={() => setMenuOpen(false)} />}

      {/* ══════════ HERO ══════════ */}
      <section id="home" className="lp-hero">
        <div className="lp-hero-blob lp-blob1" />
        <div className="lp-hero-blob lp-blob2" />
        <div className="lp-hero-content">
          <span className="lp-hero-tag">🏆 {t("trustedBy")}</span>
          <h1 className="lp-hero-title">
            {t("heroTitle1")}<br />
            <span className="lp-gradient-text">{t("heroTitle2")}</span>
          </h1>
          <p className="lp-hero-desc">
            {t("heroDesc1")}<br />{t("heroDesc2")}
          </p>
          <div className="lp-hero-btns">
            <button onClick={() => navigate("/register")} className="lp-btn-primary">
              {t("startFreeToday")}
            </button>
            <button onClick={() => navigate("/login")} className="lp-btn-secondary">
              {t("loginToDashboard")}
            </button>
          </div>
          <div className="lp-hero-trust">
            <div className="lp-trust-avatars">
              {["SK","RP","MJ","AP","KM"].map((a,i) => (
                <div key={i} className="lp-trust-avatar" style={{ zIndex: 5-i }}>{a}</div>
              ))}
            </div>
            <span>{t("lp_trustJoinText")}</span>
          </div>
        </div>

        <div className="lp-hero-card">
          <div className="lp-stat-card">
            <p className="lp-stat-label">Total Savings</p>
            <h2 className="lp-stat-value">₹4,82,500</h2>
            <span className="lp-stat-up">↑ 12% this month</span>
          </div>
          <div className="lp-mini-cards">
            <div className="lp-mini"><span>👩</span><div><p>Members</p><b>248</b></div></div>
            <div className="lp-mini"><span>🏦</span><div><p>Active Loans</p><b>34</b></div></div>
            <div className="lp-mini"><span>📅</span><div><p>Meetings</p><b>12</b></div></div>
            <div className="lp-mini"><span>🏘️</span><div><p>Groups</p><b>18</b></div></div>
          </div>
        </div>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <div className="lp-stats-bar">
        {[
          { n: 500,  prefix: "",  suffix: "+",  l: "Active Members"    },
          { n: 25,   prefix: "₹", suffix: "L+", l: "Total Savings"     },
          { n: 18,   prefix: "",  suffix: "",   l: "Bachatgat Groups"   },
          { n: 99,   prefix: "",  suffix: "%",  l: "Collection Rate"    },
        ].map(s => (
          <div key={s.l} className="lp-stat-item">
            <h3><Counter end={s.n} prefix={s.prefix} suffix={s.suffix} /></h3>
            <p>{s.l}</p>
          </div>
        ))}
      </div>

      {/* ══════════ ABOUT ══════════ */}
      <section id="about" className="lp-about">
        <div className="lp-about-inner">
          <div className="lp-about-left">
            <span className="lp-section-eyebrow">{t("lp_about_who")}</span>
            <h2 className="lp-section-title">{t("lp_about_title")}</h2>
            <p className="lp-about-desc">{t("lp_about_desc1")}</p>
            <p className="lp-about-desc">{t("lp_about_desc2")}</p>
            <div className="lp-about-checks">
              {[
                t("lp_about_check1"),
                t("lp_about_check2"),
                t("lp_about_check3"),
                t("lp_about_check4"),
              ].map((c,i) => (
                <div key={i} className="lp-about-check">
                  <span className="lp-check-icon">✓</span> {c}
                </div>
              ))}
            </div>
            <button className="lp-btn-primary" onClick={() => navigate("/register")}> 
              {t("lp_about_cta")}
            </button>
          </div>
          <div className="lp-about-right">
            <div className="lp-about-stats">
              {[
                { val: "2019",  label: "Founded"   },
                { val: "500+",  label: "Groups"    },
                { val: "₹2Cr+", label: "Managed"   },
                { val: "4.9★",  label: "App Rating"},
              ].map((s,i) => (
                <div key={i} className="lp-about-stat-card">
                  <div className="lp-about-stat-val">{s.val}</div>
                  <div className="lp-about-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="lp-about-quote">
              <div className="lp-quote-mark">"</div>
              <p>Earlier I used 3 notebooks for our group. Now everything is in one app — savings, loans, reports. My bank manager is very impressed!</p>
              <div className="lp-quote-author">
                <div className="lp-quote-avatar">PP</div>
                <div>
                  <div className="lp-quote-name">Priya Patil</div>
                  <div className="lp-quote-role">Group Leader, Sahyadri Bachatgat</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="lp-features">
        <span className="lp-section-eyebrow">{t("lp_features_eyebrow")}</span>
        <h2>{t("lp_features_title")}</h2>
        <p className="lp-features-sub">{t("lp_features_sub")}</p>
        <div className="lp-features-grid">
          {[
            { icon: "💰", title: "Savings Tracking",  desc: "Record and track every member's monthly savings easily. View history and generate reports instantly." },
            { icon: "🏦", title: "Loan Management",   desc: "Manage loans, repayments and overdue accounts with automated reminders to members." },
            { icon: "📊", title: "MIS Reports",       desc: "Download Excel and PDF reports with one click — ready for bank submission and NABARD audits." },
            { icon: "📅", title: "Meeting Records",   desc: "Schedule meetings, track attendance and share minutes digitally with all members." },
            { icon: "👑", title: "Role Based Access", desc: "Admin, Leader and Member roles with proper permissions. Everyone sees only what they need." },
            { icon: "🔒", title: "Secure & Private",  desc: "Your data is encrypted, backed up daily and fully protected at all times." },
          ].map(f => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="lp-how">
        <div className="lp-how-inner">
          <span className="lp-section-eyebrow">{t("lp_how_eyebrow")}</span>
          <h2 className="lp-section-title">{t("lp_how_title")}</h2>
          <div className="lp-how-steps">
            {[
              { step: "01", title: "Register Your Group",   desc: "Create your SmartBachatgat account and add your group details. Takes less than 5 minutes." },
              { step: "02", title: "Add Members & Leaders", desc: "Invite your leader and add all members with their phone numbers and savings details." },
              { step: "03", title: "Start Recording",       desc: "Begin recording savings, loans and repayments. Reports and alerts generate automatically." },
            ].map((s,i) => (
              <div key={i} className="lp-how-step">
                <div className="lp-how-num">{s.step}</div>
                <h3 className="lp-how-title">{s.title}</h3>
                <p className="lp-how-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ REVIEWS ══════════ */}
      <section id="reviews" className="lp-reviews">
        <div className="lp-reviews-inner">
          <span className="lp-section-eyebrow">Customer Reviews</span>
          <h2 className="lp-section-title">What our users say</h2>
          <p className="lp-reviews-sub">Trusted by group leaders and members across Maharashtra</p>
          <div className="lp-reviews-grid">
            {[
              { name: "Sunita Kadam",  role: "Group Leader, Nashik",     rating: 5, text: "This app changed everything for our group. No more register books! Everything is digital and my members love getting WhatsApp updates.", avatar: "SK" },
              { name: "Rekha Shinde",  role: "Group Leader, Pune",       rating: 5, text: "MIS reports download in one click. Earlier it took me 2 days. Now I walk into the bank with a perfect printed report!", avatar: "RS" },
              { name: "Meena Patil",   role: "Member, Aurangabad",       rating: 5, text: "I can check my savings and loan balance anytime from my phone. Very easy to use, even for someone not tech-savvy.", avatar: "MP" },
              { name: "Anita Jadhav",  role: "NGO Coordinator, Nagpur",  rating: 5, text: "We manage 12 groups with this platform. The admin dashboard gives me a complete picture of all groups in one screen.", avatar: "AJ" },
              { name: "Kavita More",   role: "Group Leader, Kolhapur",   rating: 5, text: "Loan tracking is so simple now. I get reminders when someone's EMI is due. No more awkward phone calls to members!", avatar: "KM" },
              { name: "Priti Desai",   role: "Group Leader, Solapur",    rating: 4, text: "Very good app overall. The Marathi language support is a big plus for our village group members. Support team is also very helpful.", avatar: "PD" },
            ].map((r,i) => (
              <div key={i} className="lp-review-card">
                <div className="lp-review-stars">{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</div>
                <p className="lp-review-text">"{r.text}"</p>
                <div className="lp-review-author">
                  <div className="lp-review-avatar">{r.avatar}</div>
                  <div>
                    <div className="lp-review-name">{r.name}</div>
                    <div className="lp-review-role">{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="lp-pricing">
        <span className="lp-section-eyebrow">Pricing</span>
        <h2 className="lp-section-title">Simple, honest pricing</h2>
        <p className="lp-pricing-sub">No hidden charges. Cancel anytime.</p>
        <div className="lp-pricing-grid">
          {[
            {
              name: "Basic", price: "Free", period: "forever",
              desc: "Perfect to get started",
              features: ["1 Group","Up to 20 Members","Savings Tracking","Basic Reports","Email Support"],
              cta: "Get Started", highlight: false,
            },
            {
              name: "Standard", price: "₹299", period: "per month",
              desc: "Most popular for active groups",
              features: ["5 Groups","Unlimited Members","Loan Management","MIS Reports + PDF","WhatsApp Alerts","Priority Support"],
              cta: "Start Free Trial", highlight: true,
            },
            {
              name: "NGO / Federation", price: "₹999", period: "per month",
              desc: "For large federations & NGOs",
              features: ["Unlimited Groups","Unlimited Members","All Features","Custom Branding","Dedicated Manager","API Access"],
              cta: "Contact Sales", highlight: false,
            },
          ].map((p,i) => (
            <div key={i} className={`lp-price-card ${p.highlight ? "lp-price-card--highlight" : ""}`}>
              {p.highlight && <div className="lp-price-badge">Most Popular</div>}
              <div className="lp-price-name">{p.name}</div>
              <div className="lp-price-amount">{p.price}<span className="lp-price-period"> / {p.period}</span></div>
              <div className="lp-price-desc">{p.desc}</div>
              <hr className="lp-price-divider" />
              <ul className="lp-price-features">
                {p.features.map((f,j) => (
                  <li key={j}><span className="lp-price-check">✓</span> {f}</li>
                ))}
              </ul>
              <button
                className={p.highlight ? "lp-btn-primary lp-btn-full" : "lp-btn-outline lp-btn-full"}
                onClick={() => navigate("/register")}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className="lp-faq">
        <div className="lp-faq-inner">
          <span className="lp-section-eyebrow">{t("lp_faq_eyebrow")}</span>
          <h2 className="lp-section-title">{t("lp_faq_title")}</h2>
          <div className="lp-faq-list">
            {[
              { q: "Is SmartBachatgat available in Marathi?", a: "Yes! The app fully supports Marathi and English. You can switch languages from settings anytime." },
              { q: "Can members view their own savings?",      a: "Yes. Members get a separate login to view their savings, loan status and complete transaction history." },
              { q: "Do I need internet all the time?",        a: "Basic features work offline. Data syncs automatically when you reconnect to the internet." },
              { q: "Is our group's data safe?",               a: "All data is encrypted and backed up daily. We follow RBI-recommended data security practices." },
              { q: "Can I export reports for the bank?",      a: "Yes! One-click MIS report export as PDF or Excel — ready for bank submission and NABARD audits." },
              { q: "How many members can I add?",             a: "Free plan supports up to 20 members. Standard and NGO plans have unlimited member capacity." },
            ].map((item,i) => (
              <div key={i} className={`lp-faq-item ${faqOpen === i ? "lp-faq-item--open" : ""}`}>
                <button className="lp-faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <span>{item.q}</span>
                  <span className="lp-faq-arrow">{faqOpen === i ? "−" : "+"}</span>
                </button>
                {faqOpen === i && <div className="lp-faq-a">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CONTACT ══════════ */}
      <section id="contact" className="lp-contact">
        <div className="lp-contact-inner">
          <div className="lp-contact-left">
            <span className="lp-section-eyebrow">{t("lp_contact_eyebrow")}</span>
            <h2 className="lp-section-title">{t("lp_contact_title")}</h2>
            <p className="lp-contact-desc">{t("lp_contact_desc")}</p>
            <div className="lp-contact-info">
              {[
                { icon: "📞", label: t("phone"),   val: "+91 93709 30007",        href: "tel:+919370930007"            },
                { icon: "✉",  label: t("email"),   val: "support@bachatgat.com",  href: "mailto:support@bachatgat.com" },
                { icon: "📍", label: t("address"), val: "AITRC Vita, Maharashtra", href: null },
              ].map((c,i) => (
                <div key={i} className="lp-contact-row">
                  <div className="lp-contact-icon">{c.icon}</div>
                  <div>
                    <div className="lp-contact-label">{c.label}</div>
                    {c.href
                      ? <a href={c.href} className="lp-contact-val lp-contact-val--link">{c.val}</a>
                      : <div className="lp-contact-val">{c.val}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-contact-right">
            {formSent ? (
              <div className="lp-form-success">
                <div className="lp-success-icon">✓</div>
                <h3>Message Sent!</h3>
                <p>We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form className="lp-contact-form" onSubmit={handleContact}>
                <h3 className="lp-form-title">Send us a message</h3>
                <div className="lp-form-group">
                  <label>Your Name</label>
                  <input placeholder="e.g. Priya Patil" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="lp-form-group">
                  <label>Phone Number</label>
                  <input placeholder="+91 XXXXX XXXXX" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                </div>
                <div className="lp-form-group">
                  <label>Message</label>
                  <textarea placeholder="Tell us about your group…" rows={4}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })} required />
                </div>
                <button type="submit" className="lp-btn-primary lp-btn-full">Send Message →</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-banner">
          <div className="lp-footer-banner-inner">
            <div>
              <h3>{t("lp_footer_ready_title")}</h3>
              <p>{t("lp_footer_ready_text")}</p>
            </div>
            <div className="lp-footer-banner-btns">
              <a href="tel:+919370930007" className="lp-footer-call-btn">{t("lp_footer_call_now")}</a>
              <button className="lp-btn-outline-white" onClick={() => navigate("/register")}>{t("lp_footer_get_started")}</button>
            </div>
          </div>
        </div>

        <div className="lp-footer-main">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">🌸 SmartBachatgat</div>
              <p>{t("lp_footer_brand_desc")}</p>
              <div className="lp-footer-socials">
              <div className="lp-footer-socials">
                {["𝕏","f","in","▶","📷"].map((s,i) => (
                  <a key={i} href="#" className="lp-footer-social">{s}</a>
                ))}
              </div>
            </div>

            <div className="lp-footer-col">
              <div className="lp-footer-col-title">{t("lp_footer_quick_links")}</div>
              <ul className="lp-footer-links">
                {[
                  { label: t("home"),     href: "#home"     },
                  { label: t("about"),    href: "#about"    },
                  { label: t("features"), href: "#features" },
                  { label: t("reviews"),  href: "#reviews"  },
                  { label: t("pricing"),  href: "#pricing"  },
                  { label: t("contact"),  href: "#contact"  },
                ].map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="lp-footer-link"
                      onClick={e => scrollTo(e, l.href)}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lp-footer-col">
              <div className="lp-footer-col-title">{t("lp_footer_services")}</div>
              <ul className="lp-footer-links">
                {["Savings Management","Loan Tracking","MIS Report Generator","Meeting Scheduler","Member Portal","WhatsApp Alerts","Role Based Access","Mobile App"].map(s => (
                  <li key={s}><span className="lp-footer-link">{s}</span></li>
                ))}
              </ul>
            </div>

            <div className="lp-footer-col">
              <div className="lp-footer-col-title">{t("lp_footer_contact_us")}</div>
              <div className="lp-footer-contact">
                <a href="tel:+919370930007"            className="lp-footer-contact-item">📞 +91 93709 30007</a>
                <a href="mailto:support@bachatgat.com" className="lp-footer-contact-item">✉ support@bachatgat.com</a>
                <div className="lp-footer-contact-item">📍 AITRC Vita, Maharashtra</div>
              </div>
              <div className="lp-footer-col-title" style={{ marginTop: 22 }}>{t("lp_footer_legal")}</div>
              <ul className="lp-footer-links">
                {["Privacy Policy","Terms of Service","Refund Policy"].map(l => (
                  <li key={l}><a href="#" className="lp-footer-link">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p>🌸 SmartBachatgat — AITRC Vita, Dept. CSE, 2025-26</p>
          <p className="lp-footer-team">Sakshi Budhe · Sneha Kumbhar · Vaishnavi Kadam · Sanjivani Mane</p>
          <div className="lp-footer-badges">
            <span>🇮🇳 Made in India</span>
            <span>500+ Groups</span>
            <span>6,000+ Members</span>
          </div>
        </div>
      </footer>
    </div>
  );
}