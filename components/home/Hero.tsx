export function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div
        className="hb-orb"
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "900px",
          height: "900px",
          right: "-220px",
          top: "-260px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(83,48,249,0.38) 0%, rgba(83,48,249,0) 68%)",
        }}
      />
      <div
        className="hb-wrap"
        style={{
          position: "relative",
          maxWidth: "1320px",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "88px 40px 96px",
          display: "flex",
          flexWrap: "wrap",
          gap: "64px",
          alignItems: "center",
        }}
      >
        <div className="hb-hero-in" style={{ flex: "999 1 560px", minWidth: "0", display: "flex", flexDirection: "column", gap: "28px" }}>
          <span
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 16px",
              border: "1px solid #322b47",
              borderRadius: "999px",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontSize: "10.5px",
              fontWeight: "500",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#a79fbf",
            }}
          >
            <span
              className="hb-pulse"
              aria-hidden="true"
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#856df7" }}
            />
            For Independent Med Spas<span className="hb-badge-extra">{" · Meta Ads + AI"}</span>
          </span>{" "}
          <h1
            style={{
              margin: "0",
              fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
              fontWeight: "600",
              fontSize: "clamp(40px, 6vw + 16px, 68px)",
              lineHeight: "1",
              letterSpacing: "-0.02em",
              textWrap: "balance",
              maxWidth: "15ch",
            }}
          >
            {"Increase Your Ad Conversions "}
            <span
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontWeight: "400",
                fontSize: "0.98em",
                letterSpacing: "-0.02em",
                color: "#856df7",
              }}
            >
              Without Spending More on Ads or Hiring More Staff
            </span>
          </h1>
          <p
            style={{
              margin: "0",
              fontSize: "clamp(18px, 0.6vw + 16px, 21px)",
              lineHeight: "1.55",
              fontWeight: "300",
              color: "#a79fbf",
              maxWidth: "54ch",
            }}
          >
            We push traffic from targeted Meta Ads directly into your custom-built website AI Treatment Coordinator to engage leads
            immediately, answer treatment questions and objections 24/7, and guide prospects directly into your existing booking system.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <a
              className="hb-primary"
              href="/book"
              style={{
                minHeight: "52px",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                padding: "16px 28px",
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
            </a>{" "}
            <a
              className="hb-ghost"
              href="#coordinator"
              style={{
                minHeight: "52px",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                padding: "16px 28px",
                borderRadius: "999px",
                border: "1px solid #322b47",
                color: "#f0eef8",
                textDecoration: "none",
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontSize: "11.5px",
                fontWeight: "500",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              See the AI Treatment Coordinator
            </a>
          </div>
          <ul
            style={{
              margin: "8px 0 0",
              padding: "24px 0 0",
              listStyle: "none",
              borderTop: "1px solid #241e36",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "16px 28px",
            }}
          >
            <li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#f0eef8" }}>
              <span aria-hidden="true" style={{ color: "#856df7", fontWeight: "600" }}>
                ✓
              </span>
              No switching booking software
            </li>
            <li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#f0eef8" }}>
              <span aria-hidden="true" style={{ color: "#856df7", fontWeight: "600" }}>
                ✓
              </span>
              Fully customized to your med spa’s brand and personality
            </li>
            <li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#f0eef8" }}>
              <span aria-hidden="true" style={{ color: "#856df7", fontWeight: "600" }}>
                ✓
              </span>
              HIPAA-Compliant Data Storage You Own
            </li>
          </ul>
        </div>
        {/* Hero phone: ad-aware landing chat */}
        <div style={{ flex: "1 1 324px", display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
            <img
              suppressHydrationWarning
              width="430"
              height="876"
              fetchPriority="high"
              className="hb-float"
              src="/assets/img/ai-coordinator-demo-poster.webp"
              data-anim="/assets/img/ai-coordinator-demo.webp"
              alt="Animated demo on a phone: a prospect taps Solenne Medspa’s $549 Lip Filler ad, chats with Ava the AI Treatment Coordinator, picks Thursday at 2:15 PM and taps Let’s Book!"
              style={{
                width: "340px",
                maxWidth: "100%",
                height: "auto",
                display: "block",
                filter: "drop-shadow(0 40px 60px rgba(83,48,249,0.35))",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
