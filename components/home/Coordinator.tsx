export function Coordinator() {
  return (
    <section id="coordinator" style={{ background: "#f0eef5", color: "#0d0a17" }}>
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
                color: "#5330f9",
              }}
            >
              Meet Your AI Treatment Coordinator
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
              {"From Ad Click to Booked Appointment, "}
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
                in One Conversation
              </span>
            </h2>
          </div>
          <p
            suppressHydrationWarning
            className="hb-reveal"
            style={{ flex: "1 1 380px", margin: "0", fontSize: "19px", lineHeight: "1.7", color: "#423c54", maxWidth: "46ch" }}
          >
            You AI Treatment Coordinator is designed to be a digital member of your team, who is trained to sell your products and services.
            We also install guardrails to ensure conversations always stay in line with your approved sales playbook, and clinical questions
            are handed off to the front desk.
          </p>
        </div>
        {/* Mockups row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "40px 48px", justifyContent: "center", alignItems: "flex-start" }}>
          {/* 1: Meta ad */}
          <figure
            suppressHydrationWarning
            className="hb-reveal"
            style={{ margin: "0", width: "262px", display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <div
              className="hb-phone"
              style={{
                width: "262px",
                height: "544px",
                boxSizing: "border-box",
                padding: "10px",
                borderRadius: "40px",
                background: "#0d0a17",
              }}
            >
              <div style={{ width: "242px", height: "524px", borderRadius: "30px", overflow: "hidden" }}>
                <div
                  style={{
                    width: "390px",
                    height: "844px",
                    transform: "scale(0.62)",
                    transformOrigin: "0 0",
                    boxSizing: "border-box",
                    background: "#F0F2F5",
                    fontFamily: "'DM Sans', 'DM Sans Fallback', sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ background: "#FFFFFF", padding: "16px 16px 12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ height: "12px", width: "38%", borderRadius: "6px", background: "#E4E6EB" }} />
                    <div style={{ height: "40px", borderRadius: "999px", background: "#F0F2F5" }} />
                  </div>{" "}
                  <img
                    width="520"
                    height="621"
                    loading="lazy"
                    decoding="async"
                    src="/assets/img/solenne-ad-post.webp"
                    alt="Solenne Medspa Facebook ad: $549 Lip Filler Special, all November long"
                    style={{ width: "390px", height: "auto", display: "block" }}
                  />{" "}
                  <div style={{ background: "#FFFFFF", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ height: "12px", width: "52%", borderRadius: "6px", background: "#E4E6EB" }} />
                    <div style={{ height: "12px", width: "80%", borderRadius: "6px", background: "#E4E6EB" }} />
                  </div>
                </div>
              </div>
            </div>
            <figcaption style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                STEP 01
              </span>{" "}
              <span
                style={{
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "21px",
                  lineHeight: "1.3",
                  letterSpacing: "-0.005em",
                }}
              >
                A local prospect taps your Meta ad
              </span>
            </figcaption>
          </figure>
          {/* 2: Ad-aware landing chat */}
          <figure
            suppressHydrationWarning
            className="hb-reveal"
            style={{ margin: "0", width: "262px", display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <div
              className="hb-phone"
              style={{
                width: "262px",
                height: "544px",
                boxSizing: "border-box",
                padding: "10px",
                borderRadius: "40px",
                background: "#0d0a17",
              }}
            >
              <div style={{ width: "242px", height: "524px", borderRadius: "30px", overflow: "hidden" }}>
                <div
                  style={{
                    width: "390px",
                    height: "844px",
                    transform: "scale(0.62)",
                    transformOrigin: "0 0",
                    boxSizing: "border-box",
                    background: "#F6F1F8",
                    color: "#1E1530",
                    fontFamily: "'DM Sans', 'DM Sans Fallback', sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderBottom: "1px solid #E6DDEE",
                      padding: "14px 20px 12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <svg
                      width="30"
                      height="26"
                      viewBox="0 0 48 40"
                      fill="none"
                      stroke="#4B1E7A"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M24 4C30.5 12 30.5 26 24 35C17.5 26 17.5 12 24 4Z" />
                      <path d="M21.5 34C13 33 6 26 4 16C11.5 16.5 17.5 20.5 20.5 27" />
                      <path d="M26.5 34C35 33 42 26 44 16C36.5 16.5 30.5 20.5 27.5 27" />
                    </svg>{" "}
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontWeight: "600",
                        fontSize: "24px",
                        lineHeight: "1",
                        letterSpacing: "0.24em",
                        paddingLeft: "0.24em",
                        color: "#4B1E7A",
                      }}
                    >
                      SOLENNE
                    </span>{" "}
                    <span style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.32em", paddingLeft: "0.32em", color: "#4B1E7A" }}>
                      MEDSPA
                    </span>
                  </div>
                  <div
                    style={{
                      flex: "1",
                      minHeight: "0",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        width="44"
                        height="44"
                        loading="lazy"
                        decoding="async"
                        src="/assets/img/ava-avatar.webp"
                        alt=""
                        style={{ width: "44px", height: "44px", borderRadius: "999px", objectFit: "cover", display: "block" }}
                      />{" "}
                      <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.25" }}>
                        <span style={{ fontSize: "15px", fontWeight: "600" }}>Ava from Solenne</span>{" "}
                        <span style={{ fontSize: "12px", color: "#5C5170" }}>Your AI Treatment Coordinator</span>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E6DDEE",
                        borderRadius: "16px",
                        overflow: "hidden",
                        display: "flex",
                      }}
                    >
                      <img
                        width="240"
                        height="235"
                        loading="lazy"
                        decoding="async"
                        src="/assets/img/solenne-ad-lips.webp"
                        alt="Solenne Lip Filler Special ad"
                        style={{ width: "96px", flex: "none", objectFit: "cover", objectPosition: "0% 50%", display: "block" }}
                      />{" "}
                      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#4B1E7A",
                            fontWeight: "600",
                          }}
                        >
                          Your November offer
                        </span>{" "}
                        <span style={{ fontSize: "17px", fontWeight: "600" }}>$549 Lip Filler Special</span>{" "}
                        <span style={{ fontSize: "12px", color: "#5C5170" }}>All November long · Offer details</span>
                      </div>
                    </div>
                    <div
                      style={{
                        maxWidth: "88%",
                        background: "#FFFFFF",
                        border: "1px solid #E6DDEE",
                        padding: "12px 14px",
                        borderRadius: "18px 18px 18px 4px",
                        fontSize: "15px",
                        lineHeight: "1.5",
                      }}
                    >
                      Hi, I’m Ava! Love that you’re thinking about lips. Is this your first time with filler, or are you due for a refresh?
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", marginTop: "4px" }}>
                      <span
                        style={{
                          minHeight: "44px",
                          padding: "0 16px",
                          borderRadius: "999px",
                          border: "1px solid #4B1E7A",
                          background: "#FFFFFF",
                          color: "#4B1E7A",
                          fontSize: "14px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        It’s my first time
                      </span>{" "}
                      <span
                        style={{
                          minHeight: "44px",
                          padding: "0 16px",
                          borderRadius: "999px",
                          border: "1px solid #4B1E7A",
                          background: "#FFFFFF",
                          color: "#4B1E7A",
                          fontSize: "14px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        Due for a refresh
                      </span>{" "}
                      <span
                        style={{
                          minHeight: "44px",
                          padding: "0 16px",
                          borderRadius: "999px",
                          border: "1px solid #4B1E7A",
                          background: "#FFFFFF",
                          color: "#4B1E7A",
                          fontSize: "14px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        What does $549 include?
                      </span>{" "}
                      <span
                        style={{
                          minHeight: "44px",
                          padding: "0 16px",
                          borderRadius: "999px",
                          background: "#4B1E7A",
                          color: "#FFFFFF",
                          fontSize: "14px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        Show me openings
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderTop: "1px solid #E6DDEE",
                      padding: "10px 12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: "1px solid #D9CCE6",
                        borderRadius: "999px",
                        padding: "4px 4px 4px 16px",
                        minHeight: "52px",
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ flex: "1", fontSize: "15px", color: "#5C5170" }}>Ask Ava anything…</span>{" "}
                      <span style={{ width: "44px", height: "44px", flex: "none", borderRadius: "999px", background: "#1E1530" }} />
                    </div>
                    <p style={{ margin: "0", textAlign: "center", fontSize: "11px", color: "#5C5170" }}>
                      Ava is an AI assistant · Talk to a person · Go to website booking
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <figcaption style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                STEP 02
              </span>{" "}
              <span
                style={{
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "21px",
                  lineHeight: "1.3",
                  letterSpacing: "-0.005em",
                }}
              >
                Your coordinator opens with the exact offer they clicked
              </span>
            </figcaption>
          </figure>
          {/* 3: Booking handoff phone */}
          <figure
            suppressHydrationWarning
            className="hb-reveal"
            style={{ margin: "0", width: "262px", display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <div
              className="hb-phone"
              style={{
                width: "262px",
                height: "544px",
                boxSizing: "border-box",
                padding: "10px",
                borderRadius: "40px",
                background: "#0d0a17",
              }}
            >
              <div style={{ width: "242px", height: "524px", borderRadius: "30px", overflow: "hidden" }}>
                <div
                  style={{
                    width: "390px",
                    height: "844px",
                    transform: "scale(0.62)",
                    transformOrigin: "0 0",
                    boxSizing: "border-box",
                    background: "#F6F1F8",
                    color: "#1E1530",
                    fontFamily: "'DM Sans', 'DM Sans Fallback', sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderBottom: "1px solid #E6DDEE",
                      padding: "14px 20px 12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <svg
                      width="30"
                      height="26"
                      viewBox="0 0 48 40"
                      fill="none"
                      stroke="#4B1E7A"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M24 4C30.5 12 30.5 26 24 35C17.5 26 17.5 12 24 4Z" />
                      <path d="M21.5 34C13 33 6 26 4 16C11.5 16.5 17.5 20.5 20.5 27" />
                      <path d="M26.5 34C35 33 42 26 44 16C36.5 16.5 30.5 20.5 27.5 27" />
                    </svg>{" "}
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontWeight: "600",
                        fontSize: "24px",
                        lineHeight: "1",
                        letterSpacing: "0.24em",
                        paddingLeft: "0.24em",
                        color: "#4B1E7A",
                      }}
                    >
                      SOLENNE
                    </span>{" "}
                    <span style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.32em", paddingLeft: "0.32em", color: "#4B1E7A" }}>
                      MEDSPA
                    </span>
                  </div>
                  <div
                    style={{
                      flex: "1",
                      minHeight: "0",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        width="44"
                        height="44"
                        loading="lazy"
                        decoding="async"
                        src="/assets/img/ava-avatar.webp"
                        alt=""
                        style={{ width: "44px", height: "44px", borderRadius: "999px", objectFit: "cover", display: "block" }}
                      />{" "}
                      <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.25" }}>
                        <span style={{ fontSize: "15px", fontWeight: "600" }}>Ava from Solenne</span>{" "}
                        <span style={{ fontSize: "12px", color: "#5C5170" }}>Your AI Treatment Coordinator</span>
                      </div>
                    </div>
                    <div
                      style={{
                        alignSelf: "flex-end",
                        maxWidth: "80%",
                        background: "#4B1E7A",
                        color: "#FFFFFF",
                        padding: "10px 14px",
                        borderRadius: "18px 18px 4px 18px",
                        fontSize: "15px",
                        lineHeight: "1.45",
                      }}
                    >
                      It’s my first time. Anything Thursday?
                    </div>
                    <div
                      style={{
                        maxWidth: "88%",
                        background: "#FFFFFF",
                        border: "1px solid #E6DDEE",
                        padding: "12px 14px",
                        borderRadius: "18px 18px 18px 4px",
                        fontSize: "15px",
                        lineHeight: "1.5",
                      }}
                    >
                      Perfect. First visits include a quick consult with your injector, so plan on about 45 minutes. Here’s what’s open
                      Thursday:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                      <span
                        style={{
                          minHeight: "48px",
                          borderRadius: "14px",
                          border: "1px solid #4B1E7A",
                          background: "#FFFFFF",
                          color: "#4B1E7A",
                          fontSize: "15px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        11:30 AM
                      </span>{" "}
                      <span
                        style={{
                          minHeight: "48px",
                          borderRadius: "14px",
                          border: "0",
                          background: "#4B1E7A",
                          color: "#FFFFFF",
                          fontSize: "15px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        2:15 PM
                      </span>{" "}
                      <span
                        style={{
                          minHeight: "48px",
                          borderRadius: "14px",
                          border: "1px solid #4B1E7A",
                          background: "#FFFFFF",
                          color: "#4B1E7A",
                          fontSize: "15px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        4:00 PM
                      </span>{" "}
                      <span
                        style={{
                          minHeight: "48px",
                          borderRadius: "14px",
                          border: "1px solid #4B1E7A",
                          background: "#FFFFFF",
                          color: "#4B1E7A",
                          fontSize: "15px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        5:45 PM
                      </span>
                    </div>
                    <div
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E6DDEE",
                        borderRadius: "16px",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "#4B1E7A",
                          fontWeight: "600",
                        }}
                      >
                        Your visit
                      </span>{" "}
                      <span style={{ fontSize: "16px", fontWeight: "600" }}>Lip Filler · First visit + consult</span>{" "}
                      <span style={{ fontSize: "13px", color: "#5C5170" }}>Thursday · 2:15 PM · $549 November special applied</span>{" "}
                      <span
                        style={{
                          minHeight: "48px",
                          borderRadius: "999px",
                          background: "#1E1530",
                          color: "#FFFFFF",
                          fontSize: "15px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Let’s Book!
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderTop: "1px solid #E6DDEE",
                      padding: "12px",
                      textAlign: "center",
                      fontSize: "11px",
                      color: "#5C5170",
                    }}
                  >
                    Booked through Solenne’s booking system · No new software
                  </div>
                </div>
              </div>
            </div>
            <figcaption style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                STEP 03
              </span>{" "}
              <span
                style={{
                  fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
                  fontWeight: "600",
                  fontSize: "21px",
                  lineHeight: "1.3",
                  letterSpacing: "-0.005em",
                }}
              >
                It guides them straight into your existing booking system
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
