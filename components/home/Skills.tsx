import { SkillsExplorer } from "./SkillsExplorer";

export function Skills() {
  return (
    <section id="skills" style={{ background: "#ffffff", color: "#0d0a17" }}>
      <div
        className="hb-wrap"
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "96px 40px",
          display: "flex",
          flexDirection: "column",
          gap: "56px",
        }}
      >
        {/* Features: interactive explorer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          <h2
            suppressHydrationWarning
            className="hb-reveal"
            style={{
              margin: "0 auto",
              textAlign: "center",
              maxWidth: "20ch",
              fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
              fontWeight: "600",
              fontSize: "clamp(34px, 4vw + 18px, 52px)",
              lineHeight: "1.05",
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            {"Your Own AI Team Member, "}
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
              Trained to Convert
            </span>
          </h2>
          <SkillsExplorer />
        </div>
        {/* Trust strip with icon badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "20px 40px",
            paddingTop: "32px",
            borderTop: "1px solid #dedbe9",
          }}
        >
          <div suppressHydrationWarning className="hb-trust hb-reveal" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span
              className="hb-ring"
              style={{
                width: "44px",
                height: "44px",
                flex: "none",
                boxSizing: "border-box",
                padding: "4px",
                borderRadius: "50%",
                background: "conic-gradient(from var(--hb-a, 210deg), #2a148f, #b47cff 35%, #5330f9 62%, #d7ccff 82%, #2a148f)",
              }}
            >
              <span
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  width="22"
                  height="22"
                  loading="lazy"
                  decoding="async"
                  src="/assets/img/icon-clock.svg"
                  alt=""
                  style={{ width: "22px", height: "22px" }}
                />
              </span>
            </span>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#0d0a17" }}>Converts Customers 24/7</span>
          </div>
          <div suppressHydrationWarning className="hb-trust hb-reveal" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span
              className="hb-ring"
              style={{
                width: "44px",
                height: "44px",
                flex: "none",
                boxSizing: "border-box",
                padding: "4px",
                borderRadius: "50%",
                background: "conic-gradient(from var(--hb-a, 210deg), #2a148f, #b47cff 35%, #5330f9 62%, #d7ccff 82%, #2a148f)",
              }}
            >
              <span
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  width="22"
                  height="22"
                  loading="lazy"
                  decoding="async"
                  src="/assets/img/icon-private.svg"
                  alt=""
                  style={{ width: "22px", height: "22px" }}
                />
              </span>
            </span>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#0d0a17" }}>Data Lives in an Account You Own</span>
          </div>
          <div suppressHydrationWarning className="hb-trust hb-reveal" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span
              className="hb-ring"
              style={{
                width: "44px",
                height: "44px",
                flex: "none",
                boxSizing: "border-box",
                padding: "4px",
                borderRadius: "50%",
                background: "conic-gradient(from var(--hb-a, 210deg), #2a148f, #b47cff 35%, #5330f9 62%, #d7ccff 82%, #2a148f)",
              }}
            >
              <span
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  width="22"
                  height="22"
                  loading="lazy"
                  decoding="async"
                  src="/assets/img/icon-secure.svg"
                  alt=""
                  style={{ width: "22px", height: "22px" }}
                />
              </span>
            </span>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#0d0a17" }}>HIPAA Compliant</span>
          </div>
        </div>
      </div>
    </section>
  );
}
