import { Footer } from "../Footer";

/** The "book a call" band, then the footer. */
export function CtaFooter() {
  return (
    <section id="book" style={{ position: "relative", overflow: "hidden", background: "#0d0a17", color: "#f0eef8" }}>
      <div
        suppressHydrationWarning
        className="hb-orb hb-glow-late"
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "900px",
          height: "900px",
          left: "50%",
          bottom: "-520px",
          marginLeft: "-450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(83,48,249,0.3) 0%, rgba(83,48,249,0) 66%)",
        }}
      />
      <div
        className="hb-wrap"
        style={{
          position: "relative",
          maxWidth: "1320px",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "96px 40px 64px",
          display: "flex",
          flexDirection: "column",
          gap: "80px",
        }}
      >
        <div
          suppressHydrationWarning
          className="hb-reveal hb-band"
          style={{
            borderRadius: "32px",
            background: "linear-gradient(115deg, #5330f9, #856df7)",
            padding: "56px",
            display: "flex",
            flexWrap: "wrap",
            gap: "32px 48px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: "1 1 520px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2
              suppressHydrationWarning
              className="hb-reveal"
              style={{
                margin: "0",
                fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                fontWeight: "600",
                fontSize: "clamp(33px, 3.8vw + 18px, 50px)",
                lineHeight: "1.03",
                letterSpacing: "-0.02em",
                color: "#ffffff",
                textWrap: "balance",
                maxWidth: "18ch",
              }}
            >
              {"Turn More of Your Ad Spend Into "}
              <span
                style={{
                  fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: "400",
                  fontSize: "0.98em",
                  letterSpacing: "-0.02em",
                }}
              >
                Booked Appointments
              </span>
            </h2>
            <p style={{ margin: "0", fontSize: "19px", lineHeight: "1.6", color: "#e6e0fe", maxWidth: "48ch" }}>
              Book a 30-minute discovery call. We’ll talk through your current Meta ads, your website and your booking flow.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <a
              className="hb-night"
              href="/book"
              style={{
                minHeight: "52px",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px 28px",
                borderRadius: "999px",
                background: "#0d0a17",
                color: "#ffffff",
                textDecoration: "none",
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontSize: "11.5px",
                fontWeight: "500",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Book a Discovery Call
            </a>{" "}
            <a
              className="hb-onband"
              href="mailto:hello@h1aiconsulting.com"
              style={{
                minHeight: "52px",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px 28px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.5)",
                color: "#ffffff",
                textDecoration: "none",
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontSize: "11.5px",
                fontWeight: "500",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              hello@h1aiconsulting.com
            </a>
          </div>
        </div>
        <Footer home />
      </div>
    </section>
  );
}
