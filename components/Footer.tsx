/** Contact, logo, footer nav and the copyright row. */
export function Footer({ home = false }: { home?: boolean }) {
  const base = home ? "" : "/";
  return (
    <footer style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
      <div
        className="hb-foot-grid"
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: "40px 48px", alignItems: "center" }}
      >
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span
              style={{
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                color: "#8a7ea8",
              }}
            >
              Contact
            </span>{" "}
            <span style={{ fontSize: "15px", lineHeight: "1.5", color: "#dad5e8" }}>
              201 Columbine Street, Suite 300
              <br />
              Denver, CO 80206
            </span>{" "}
            <a href="tel:+13032259372" style={{ color: "#dad5e8", textDecoration: "none", fontSize: "15px" }}>
              (303) 225-9372
            </a>{" "}
            <a href="mailto:hello@h1aiconsulting.com" style={{ color: "#dad5e8", textDecoration: "none", fontSize: "15px" }}>
              hello@h1aiconsulting.com
            </a>
          </div>
        </div>{" "}
        <a href="/" aria-label="H1 AI Advertising home" style={{ display: "flex", justifyContent: "center" }}>
          <img
            width="216"
            height="132"
            loading="lazy"
            decoding="async"
            src="/assets/img/h1-ai-advertising-logo.svg"
            alt="H1 AI Advertising"
            style={{ height: "132px", width: "auto", display: "block" }}
          />
        </a>{" "}
        <nav
          aria-label="Footer"
          style={{ display: "flex", flexWrap: "wrap", gap: "32px 48px", justifyContent: "flex-end", alignItems: "flex-start" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span
              style={{
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                color: "#8a7ea8",
              }}
            >
              The Engine
            </span>{" "}
            <a href={`${base}#system`} style={{ color: "#dad5e8", textDecoration: "none", fontSize: "15px" }}>
              How It Works
            </a>{" "}
            <a href={`${base}#coordinator`} style={{ color: "#dad5e8", textDecoration: "none", fontSize: "15px" }}>
              AI Treatment Coordinator
            </a>{" "}
            <a href={`${base}#faq`} style={{ color: "#dad5e8", textDecoration: "none", fontSize: "15px" }}>
              FAQ
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span
              style={{
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                color: "#8a7ea8",
              }}
            >
              About
            </span>{" "}
            <a href="https://www.h1aiconsulting.com/about/" style={{ color: "#dad5e8", textDecoration: "none", fontSize: "15px" }}>
              About H1
            </a>{" "}
            <a href="/book" style={{ color: "#dad5e8", textDecoration: "none", fontSize: "15px" }}>
              Book a Call
            </a>
          </div>
        </nav>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px 24px",
          justifyContent: "space-between",
          paddingTop: "24px",
          borderTop: "1px solid #241e36",
          fontSize: "13.5px",
          color: "#8a7ea8",
        }}
      >
        <span>© 2026 H1 AI Consulting · Denver, Colorado</span>{" "}
        <span style={{ display: "flex", gap: "20px" }}>
          <a href="/privacy" style={{ color: "#8a7ea8" }}>
            Privacy Policy
          </a>
          <a href="/terms" style={{ color: "#8a7ea8" }}>
            Terms & Conditions
          </a>
        </span>
      </div>
    </footer>
  );
}
