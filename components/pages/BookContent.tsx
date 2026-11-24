import Script from "next/script";

/** Title band and body. */
export function BookContent() {
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div
          className="hb-orb"
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "760px",
            height: "760px",
            right: "-200px",
            top: "-380px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(83,48,249,0.36) 0%, rgba(83,48,249,0) 66%)",
          }}
        />
        <div
          className="hb-hero-in hb-wrap"
          style={{
            position: "relative",
            maxWidth: "1180px",
            margin: "0 auto",
            boxSizing: "border-box",
            padding: "72px 40px 64px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <span
            style={{
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontWeight: "500",
              textTransform: "uppercase",
              fontSize: "11.5px",
              letterSpacing: "0.16em",
              color: "#856df7",
            }}
          >
            Discovery Call · 30 Minutes
          </span>{" "}
          <h1
            style={{
              margin: "0",
              fontWeight: "600",
              fontSize: "clamp(36px, 4.4vw + 20px, 56px)",
              lineHeight: "1.05",
              letterSpacing: "-0.02em",
              textWrap: "balance",
              maxWidth: "18ch",
            }}
          >
            {"Book Your "}
            <span
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontWeight: "400",
                letterSpacing: "-0.02em",
                color: "#856df7",
              }}
            >
              Discovery Call
            </span>
          </h1>
          <p style={{ margin: "0", fontSize: "clamp(17px, 0.5vw + 15px, 19px)", lineHeight: "1.6", color: "#a79fbf", maxWidth: "52ch" }}>
            Pick a time that works for you. We’ll talk through your current Meta ads, your website and your booking flow.
          </p>
        </div>
      </section>
      <section style={{ background: "#f0eef5", color: "#0d0a17" }}>
        <div
          className="hb-wrap"
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            boxSizing: "border-box",
            padding: "64px 40px 96px",
            display: "flex",
            flexWrap: "wrap",
            gap: "32px 48px",
            alignItems: "flex-start",
          }}
        >
          <div
            suppressHydrationWarning
            className="hb-reveal hb-cal-card"
            style={{
              flex: "999 1 600px",
              minWidth: "0",
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #dedbe9",
              borderRadius: "28px",
              padding: "12px",
              boxShadow: "0 30px 70px -40px rgba(83,48,249,0.35)",
            }}
          >
            <iframe
              src="https://go.h1aiadvertising.com/widget/booking/ODinOKGs8B7E1o8tgiKn"
              allow="payment"
              title="Book a discovery call with H1 AI Advertising"
              style={{ width: "100%", border: "none", overflow: "hidden", display: "block", borderRadius: "18px" }}
              scrolling="no"
              id="ODinOKGs8B7E1o8tgiKn_1794937038098"
            />
            <Script src="https://go.h1aiadvertising.com/js/form_embed.js" strategy="afterInteractive" />
          </div>
          <aside style={{ flex: "1 1 280px", minWidth: "0", display: "flex", flexDirection: "column", gap: "28px" }}>
            <div suppressHydrationWarning className="hb-reveal" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2
                style={{
                  margin: "0",
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.16em",
                  color: "#5330f9",
                }}
              >
                What We’ll Cover
              </h2>
              <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
                <li style={{ display: "flex", gap: "12px", fontSize: "17px", lineHeight: "1.55", color: "#423c54" }}>
                  <span aria-hidden="true" style={{ color: "#5330f9", fontWeight: "600" }}>
                    ✓
                  </span>
                  <span>What your Meta ads produce today</span>
                </li>
                <li style={{ display: "flex", gap: "12px", fontSize: "17px", lineHeight: "1.55", color: "#423c54" }}>
                  <span aria-hidden="true" style={{ color: "#5330f9", fontWeight: "600" }}>
                    ✓
                  </span>
                  <span>Where leads drop off between the click and a booking</span>
                </li>
                <li style={{ display: "flex", gap: "12px", fontSize: "17px", lineHeight: "1.55", color: "#423c54" }}>
                  <span aria-hidden="true" style={{ color: "#5330f9", fontWeight: "600" }}>
                    ✓
                  </span>
                  <span>How an AI Treatment Coordinator would fit your booking system</span>
                </li>
                <li style={{ display: "flex", gap: "12px", fontSize: "17px", lineHeight: "1.55", color: "#423c54" }}>
                  <span aria-hidden="true" style={{ color: "#5330f9", fontWeight: "600" }}>
                    ✓
                  </span>
                  <span>Pricing, once we understand your goals</span>
                </li>
              </ul>
            </div>
            <div
              suppressHydrationWarning
              className="hb-reveal"
              style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "24px", borderTop: "1px solid #dedbe9" }}
            >
              <h2
                style={{
                  margin: "0",
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.16em",
                  color: "#5330f9",
                }}
              >
                Prefer to Reach Out Directly?
              </h2>{" "}
              <a className="hb-textlink" href="mailto:hello@h1aiconsulting.com" style={{ fontSize: "16px" }}>
                hello@h1aiconsulting.com
              </a>{" "}
              <a className="hb-textlink" href="tel:+13032259372" style={{ fontSize: "16px" }}>
                (303) 225-9372
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
