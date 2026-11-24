export function Founder() {
  return (
    <section style={{ background: "#0d0a17", color: "#f0eef8", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
        <div style={{ position: "relative", flex: "1 1 380px", minHeight: "420px", overflow: "hidden" }}>
          <img
            suppressHydrationWarning
            width="1024"
            height="1536"
            loading="lazy"
            decoding="async"
            className="hb-kb"
            src="/assets/img/erin-silva.webp"
            alt="Erin Silva, President and Founder"
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 20%",
              display: "block",
            }}
          />{" "}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, rgba(13,10,23,0) 0%, rgba(13,10,23,0) 38%, rgba(83,48,249,0.28) 62%, rgba(53,30,150,0.62) 80%, #0d0a17 100%)",
            }}
          />
        </div>
        <div
          className="hb-pad-founder"
          style={{
            flex: "1 1 560px",
            minWidth: "0",
            boxSizing: "border-box",
            padding: "88px 64px 88px 40px",
            maxWidth: "800px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "18px",
          }}
        >
          <h2
            suppressHydrationWarning
            className="hb-reveal"
            style={{
              margin: "0",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontWeight: "500",
              fontSize: "18px",
              lineHeight: "1.3",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {"A Note "}
            <span style={{ color: "#856df7" }}>From the Founder</span>
          </h2>
          <div
            suppressHydrationWarning
            className="hb-reveal"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              fontSize: "17px",
              lineHeight: "1.65",
              color: "#a79fbf",
              maxWidth: "64ch",
            }}
          >
            <p style={{ margin: "0" }}>
              I’m deeply passionate about helping small businesses thrive. I grew up in a family of small business owners, and have spent
              the past decade running my own small business, so I understand firsthand the challenges—and opportunities—that come with
              building and growing a business.
            </p>
            <p style={{ margin: "0" }}>
              I truly believe that AI can have transformative effects for small business. It can empower growth, innovation and customer
              experiences that were never before possible for small businesses to achieve. But, it has to be implemented thoughtfully and
              carefully. My goal in working with you is to not only help you grow your business using AI, but to also be someone you trust
              as you navigate the complexities that come with adopting this new, ever-changing technology.
            </p>
            <p style={{ margin: "0" }}>Here’s to what’s next,</p>
          </div>{" "}
          <span
            suppressHydrationWarning
            className="hb-reveal"
            style={{
              paddingTop: "10px",
              borderTop: "1px solid #241e36",
              fontFamily: "'WindSong', cursive",
              fontWeight: "500",
              fontSize: "38px",
              lineHeight: "1.3",
              color: "#f0eef8",
            }}
          >
            Erin Silva
          </span>{" "}
          <span
            style={{
              marginTop: "-8px",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontWeight: "500",
              fontSize: "11.5px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#8a7ea8",
            }}
          >
            President & Founder
          </span>
        </div>
      </div>
    </section>
  );
}
