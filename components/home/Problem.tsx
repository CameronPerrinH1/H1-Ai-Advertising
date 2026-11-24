export function Problem() {
  return (
    <section style={{ background: "#f0eef5", color: "#0d0a17" }}>
      <div
        className="hb-wrap"
        style={{
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
          <div style={{ flex: "1 1 520px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <span
              suppressHydrationWarning
              className="hb-reveal"
              style={{
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "12px",
                letterSpacing: "0.16em",
                color: "#5330f9",
              }}
            >
              The Gap Between Click and Booking
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
                maxWidth: "18ch",
              }}
            >
              {"Your Ads Get the Click. Then the Lead "}
              <span
                style={{
                  fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: "400",
                  fontSize: "0.98em",
                  letterSpacing: "-0.02em",
                  color: "#5330f9",
                }}
              >
                Goes Quiet.
              </span>
            </h2>
          </div>
          <p
            suppressHydrationWarning
            className="hb-reveal"
            style={{ flex: "1 1 380px", margin: "0", fontSize: "19px", lineHeight: "1.7", color: "#423c54", maxWidth: "46ch" }}
          >
            You’ve already paid for the attention. The MedSpa AI Booking Engine makes sure more of it turns into appointments — with the ad
            budget and the team you have today.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div
            suppressHydrationWarning
            className="hb-reveal hb-lift hb-spot hb-spot-light"
            style={{
              background: "#ffffff",
              border: "1px solid #dedbe9",
              borderRadius: "24px",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                color: "#5330f9",
              }}
            >
              Issue #1
            </span>{" "}
            <h3
              style={{
                margin: "0",
                fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                fontWeight: "600",
                fontSize: "clamp(22px, 1vw + 18px, 27px)",
                lineHeight: "1.15",
                letterSpacing: "-0.012em",
              }}
            >
              Your Ad Traffic Lands on a Page, Not in a Conversation
            </h3>
            <p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#4c4858" }}>
              Prospects tap your ad with a question in mind, then have to dig through treatment pages or a booking widget to find the
              answer. Many leave before they ever ask.
            </p>
          </div>
          <div
            suppressHydrationWarning
            className="hb-reveal hb-lift hb-spot hb-spot-light"
            style={{
              background: "#ffffff",
              border: "1px solid #dedbe9",
              borderRadius: "24px",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                color: "#5330f9",
              }}
            >
              Issue #2
            </span>{" "}
            <h3
              style={{
                margin: "0",
                fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                fontWeight: "600",
                fontSize: "clamp(22px, 1vw + 18px, 27px)",
                lineHeight: "1.15",
                letterSpacing: "-0.012em",
              }}
            >
              Your Generic Chatbot Recites Your Services. It Doesn’t Sell.
            </h3>
            <p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#4c4858" }}>
              The chat built into most booking software repeats service descriptions, pricing and FAQs. It can’t work through a hesitation,
              upsell an add-on treatment or sound like your team.
            </p>
          </div>
          <div
            suppressHydrationWarning
            className="hb-reveal hb-lift hb-spot hb-spot-light"
            style={{
              background: "#ffffff",
              border: "1px solid #dedbe9",
              borderRadius: "24px",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "11.5px",
                letterSpacing: "0.16em",
                color: "#5330f9",
              }}
            >
              Issue #3
            </span>{" "}
            <h3
              style={{
                margin: "0",
                fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                fontWeight: "600",
                fontSize: "clamp(22px, 1vw + 18px, 27px)",
                lineHeight: "1.15",
                letterSpacing: "-0.012em",
              }}
            >
              Your Ad Clicks Peak After Your Front Desk Goes Home
            </h3>
            <p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#4c4858" }}>
              Prospects research treatments in the evening and on weekends. If no one answers then, their interest cools — and so does the
              return on your ad spend.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
