export function System() {
  return (
    <section id="system" style={{ position: "relative", overflow: "hidden" }}>
      <div
        className="hb-orb"
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "1000px",
          height: "1000px",
          left: "-360px",
          top: "120px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(83,48,249,0.26) 0%, rgba(83,48,249,0) 66%)",
        }}
      />
      <div
        className="hb-wrap"
        style={{
          position: "relative",
          maxWidth: "1320px",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "96px 40px",
          display: "flex",
          flexDirection: "column",
          gap: "48px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px 64px", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 560px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <span
              suppressHydrationWarning
              className="hb-reveal"
              style={{
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "12px",
                letterSpacing: "0.16em",
                color: "#856df7",
              }}
            >
              The MedSpa AI Booking Engine
            </span>{" "}
            <h2
              suppressHydrationWarning
              className="hb-reveal"
              style={{
                margin: "0",
                fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                fontWeight: "600",
                fontSize: "clamp(34px, 4vw + 18px, 52px)",
                lineHeight: "1.03",
                letterSpacing: "-0.02em",
                textWrap: "balance",
                maxWidth: "20ch",
              }}
            >
              {"Three P’s That Turn Ad Clicks Into "}
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
                Booked Appointments
              </span>
            </h2>
          </div>{" "}
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
          </a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          <article
            suppressHydrationWarning
            className="hb-reveal hb-lift hb-spot"
            style={{
              background: "#161124",
              border: "1px solid #241e36",
              borderRadius: "24px",
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                className="hb-num"
                style={{
                  width: "48px",
                  height: "48px",
                  flex: "none",
                  borderRadius: "50%",
                  border: "1px solid #322b47",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "16px",
                  color: "#856df7",
                }}
              >
                01
              </span>{" "}
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.16em",
                  color: "#b9a9ff",
                }}
              >
                Pillar 1
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h3
                style={{
                  margin: "0",
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "clamp(32px, 2.6vw + 20px, 44px)",
                  lineHeight: "1.05",
                  letterSpacing: "-0.02em",
                }}
              >
                Prospect
              </h3>{" "}
              <span
                style={{
                  fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: "400",
                  fontSize: "clamp(21px, 1vw + 17px, 26px)",
                  lineHeight: "1.25",
                  letterSpacing: "-0.01em",
                  color: "#856df7",
                }}
              >
                Attract the Right Patients
              </span>
            </div>
            <p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#a79fbf" }}>
              We run highly targeted, Meta ad campaigns that bring local, high-intent med spa prospects directly into the AI-powered booking
              experience we build into your website, ensuring there's a constant stream of opportunities to convert.
            </p>
          </article>
          <article
            suppressHydrationWarning
            className="hb-reveal hb-lift hb-spot"
            style={{
              background: "#161124",
              border: "1px solid #241e36",
              borderRadius: "24px",
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                className="hb-num"
                style={{
                  width: "48px",
                  height: "48px",
                  flex: "none",
                  borderRadius: "50%",
                  border: "1px solid #322b47",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "16px",
                  color: "#856df7",
                }}
              >
                02
              </span>{" "}
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.16em",
                  color: "#b9a9ff",
                }}
              >
                Pillar 2
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h3
                style={{
                  margin: "0",
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "clamp(32px, 2.6vw + 20px, 44px)",
                  lineHeight: "1.05",
                  letterSpacing: "-0.02em",
                }}
              >
                Persuade
              </h3>{" "}
              <span
                style={{
                  fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: "400",
                  fontSize: "clamp(21px, 1vw + 17px, 26px)",
                  lineHeight: "1.25",
                  letterSpacing: "-0.01em",
                  color: "#856df7",
                }}
              >
                Your Own AI Team Member, Trained to Convert
              </span>
            </div>
            <p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#a79fbf" }}>
              We don’t install a generic chatbot. We build and train your very own AI Treatment Coordinator — a digital member of your team
              that speaks in your brand’s voice, understands your treatments, and knows how to guide prospective patients toward booking.
              Just like training a great front desk employee, we give your AI coordinator a personality, knowledge of your services, and an
              approved sales playbook to answer questions, address objections, recommend relevant treatments, and help turn conversations
              into booked appointments — 24/7.
            </p>
          </article>
          <article
            suppressHydrationWarning
            className="hb-reveal hb-lift hb-spot"
            style={{
              background: "#161124",
              border: "1px solid #241e36",
              borderRadius: "24px",
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                className="hb-num"
                style={{
                  width: "48px",
                  height: "48px",
                  flex: "none",
                  borderRadius: "50%",
                  border: "1px solid #322b47",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "16px",
                  color: "#856df7",
                }}
              >
                03
              </span>{" "}
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.16em",
                  color: "#b9a9ff",
                }}
              >
                Pillar 3
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h3
                style={{
                  margin: "0",
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "clamp(32px, 2.6vw + 20px, 44px)",
                  lineHeight: "1.05",
                  letterSpacing: "-0.02em",
                }}
              >
                Perfect
              </h3>{" "}
              <span
                style={{
                  fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: "400",
                  fontSize: "clamp(21px, 1vw + 17px, 26px)",
                  lineHeight: "1.25",
                  letterSpacing: "-0.01em",
                  color: "#856df7",
                }}
              >
                Continuously Improve Your Results
              </span>
            </div>
            <p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#a79fbf" }}>
              We continuously monitor ad performance, AI conversations, and booking data, storing it all in a secure, HIPAA-compliant AI Hub
              that you own. We use this data to create your monthly AI Impact Report, meeting with you to identify missed opportunities,
              improve conversion rates, and optimize your campaigns to generate more appointments from your marketing investment.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
