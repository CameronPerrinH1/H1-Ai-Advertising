/** Site header. On the home page the nav links are in-page anchors; elsewhere they go to /#section. */
export function Header({ home = false }: { home?: boolean }) {
  const base = home ? "" : "/";
  return (
    <header suppressHydrationWarning className="hb-header">
      <div
        className="hb-wrap"
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "14px 40px",
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a href="/" style={{ display: "flex" }}>
          <img
            width="95"
            height="58"
            className="hb-logo"
            src="/assets/img/h1-ai-advertising-logo.svg"
            alt="H1 AI Advertising"
            style={{ height: "58px", width: "auto", display: "block" }}
          />
        </a>{" "}
        <nav id="hb-menu" aria-label="Main" style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <a
            suppressHydrationWarning
            className="hb-nav"
            href={`${base}#system`}
            style={{
              color: "#f0eef8",
              textDecoration: "none",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontSize: "12px",
              fontWeight: "300",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "14px 12px",
            }}
          >
            How It Works
          </a>{" "}
          <a
            suppressHydrationWarning
            className="hb-nav"
            href={`${base}#coordinator`}
            style={{
              color: "#f0eef8",
              textDecoration: "none",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontSize: "12px",
              fontWeight: "300",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "14px 12px",
            }}
          >
            The Coordinator
          </a>{" "}
          <a
            suppressHydrationWarning
            className="hb-nav"
            href={`${base}#results`}
            style={{
              ...(home ? {} : { display: "none" }),
              color: "#f0eef8",
              textDecoration: "none",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontSize: "12px",
              fontWeight: "300",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "14px 12px",
            }}
          >
            Results
          </a>{" "}
          <a
            suppressHydrationWarning
            className="hb-nav"
            href={`${base}#faq`}
            style={{
              color: "#f0eef8",
              textDecoration: "none",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontSize: "12px",
              fontWeight: "300",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "14px 12px",
            }}
          >
            FAQ
          </a>{" "}
          <a
            className="hb-primary"
            href="/book"
            style={{
              marginLeft: "8px",
              minHeight: "44px",
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: "999px",
              background: "linear-gradient(105deg, #5330f9, #856df7)",
              color: "#ffffff",
              textDecoration: "none",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontSize: "11.5px",
              fontWeight: "500",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              boxShadow: "0 12px 30px rgba(83,48,249,0.3)",
            }}
          >
            Book a Discovery Call
          </a>
        </nav>{" "}
        <a className="hb-primary hb-bar-cta" href="/book">
          Book a Call
        </a>{" "}
        <button
          suppressHydrationWarning
          className="hb-burger"
          type="button"
          aria-label="Open menu"
          aria-expanded="false"
          aria-controls="hb-menu"
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
