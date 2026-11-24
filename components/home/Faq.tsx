import { FAQ } from "./faq-data";

export function Faq() {
  return (
    <section id="faq" style={{ background: "#ffffff", color: "#0d0a17" }}>
      <div
        className="hb-wrap"
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "96px 40px",
          display: "flex",
          flexWrap: "wrap",
          gap: "64px",
          alignItems: "flex-start",
        }}
      >
        <div
          className="hb-faq-side"
          style={{
            flex: "1 1 320px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            position: "sticky",
            top: "112px",
            alignSelf: "flex-start",
          }}
        >
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
            FAQ
          </span>{" "}
          <h2
            suppressHydrationWarning
            className="hb-reveal"
            style={{
              margin: "0",
              fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
              fontWeight: "600",
              fontSize: "clamp(32px, 2.6vw + 20px, 44px)",
              lineHeight: "1.05",
              letterSpacing: "-0.02em",
            }}
          >
            {"Questions We "}
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
              Hear First
            </span>
          </h2>{" "}
          <a
            className="hb-primary-light"
            href="/book"
            style={{
              alignSelf: "flex-start",
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
              boxShadow: "0 10px 26px rgba(83,48,249,0.22)",
            }}
          >
            Book a Discovery Call
          </a>
        </div>
        <div data-accordion="" style={{ flex: "999 1 560px", minWidth: "0", borderTop: "1px solid #dedbe9" }}>
          {FAQ.map((item, i) => (
            <details
              suppressHydrationWarning
              key={item.q}
              className="hb-reveal"
              open={i === 0}
              style={{ borderBottom: "1px solid #dedbe9", padding: "24px 0" }}
            >
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "24px",
                  alignItems: "center",
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "21px",
                  lineHeight: "1.3",
                  letterSpacing: "-0.005em",
                }}
              >
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  style={{
                    width: "36px",
                    height: "36px",
                    flex: "none",
                    borderRadius: "50%",
                    border: "1px solid #dedbe9",
                    color: "#5330f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              {typeof item.a === "string" ? (
                <p style={{ margin: "14px 0 0", fontSize: "17px", lineHeight: "1.65", color: "#534c67", maxWidth: "78ch" }}>{item.a}</p>
              ) : (
                <ul
                  style={{
                    margin: "14px 0 0",
                    padding: "0",
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    maxWidth: "78ch",
                  }}
                >
                  {item.a.map((point) => (
                    <li key={point} style={{ display: "flex", gap: "12px", fontSize: "17px", lineHeight: "1.6", color: "#534c67" }}>
                      <span aria-hidden="true" style={{ color: "#5330f9", fontWeight: "600" }}>
                        ✓
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
