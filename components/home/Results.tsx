export function Results() {
  return (
    <section id="results" style={{ background: "#f3f0fe", color: "#0d0a17" }}>
      <div
        className="hb-wrap"
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "96px 40px 48px",
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
                color: "#5330f9",
              }}
            >
              Results
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
              }}
            >
              {"10 Years in Business. "}
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
                200+ Clients Served.
              </span>
            </h2>
          </div>{" "}
          <a
            className="hb-ghost-light"
            href="/book"
            style={{
              minHeight: "52px",
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              padding: "16px 28px",
              borderRadius: "999px",
              border: "1px solid #dedbe9",
              background: "#ffffff",
              color: "#0d0a17",
              textDecoration: "none",
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontSize: "11.5px",
              fontWeight: "500",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Book a Discovery Call
          </a>
        </div>
      </div>
      <div
        suppressHydrationWarning
        className="hb-marquee hb-reveal"
        role="region"
        aria-label="Client testimonials"
        style={{
          overflow: "hidden",
          padding: "0 0 96px",
          WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0), #000 6%, #000 94%, rgba(0,0,0,0))",
          maskImage: "linear-gradient(90deg, rgba(0,0,0,0), #000 6%, #000 94%, rgba(0,0,0,0))",
        }}
      >
        <div className="hb-track" style={{ display: "flex", alignItems: "stretch", width: "max-content" }}>
          <figure
            style={{
              margin: "0 20px 0 0",
              flex: "none",
              width: "440px",
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #dcd3fb",
              borderRadius: "20px",
              padding: "32px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontSize: "64px",
                lineHeight: "0.6",
                height: "28px",
                color: "#5330f9",
              }}
            >
              “
            </span>{" "}
            <blockquote style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.65", color: "#423c54" }}>
              I highly recommend H1! The process of updating our website was seamless and the end result exceeded all of my expectations.
              The team was professional, responsive, and truly listened to my needs. They took the time to understand my business and its
              goals, and the final product was a perfect representation of my brand. The design and branding they created is truly amazing,
              and has helped to elevate my business to the next level. I am extremely pleased with the final product and have already
              received numerous compliments.
            </blockquote>
            <figcaption
              style={{
                marginTop: "auto",
                paddingTop: "20px",
                borderTop: "1px solid #e6e4ee",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#0d0a17" }}>Christian Dean</span>
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  fontSize: "10.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#5330f9",
                }}
              >
                Stratus
              </span>
            </figcaption>
          </figure>
          <figure
            style={{
              margin: "0 20px 0 0",
              flex: "none",
              width: "440px",
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #dcd3fb",
              borderRadius: "20px",
              padding: "32px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontSize: "64px",
                lineHeight: "0.6",
                height: "28px",
                color: "#5330f9",
              }}
            >
              “
            </span>{" "}
            <blockquote style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.65", color: "#423c54" }}>
              I seriously cannot speak enough about working with H1. It has honestly been the best experience of any company we have ever
              worked with. From the very start of our onboarding meeting to the very final touches, the H1 team were professional, creative,
              responsive and honestly went more than above and beyond to make sure our every need was met. And we had some pretty unique
              needs. I would recommend them to any business out there who is looking for a site set above the rest of their competitors!
            </blockquote>
            <figcaption
              style={{
                marginTop: "auto",
                paddingTop: "20px",
                borderTop: "1px solid #e6e4ee",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#0d0a17" }}>Faye Zandi</span>
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  fontSize: "10.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#5330f9",
                }}
              >
                Zandiland Beauty
              </span>
            </figcaption>
          </figure>
          <figure
            style={{
              margin: "0 20px 0 0",
              flex: "none",
              width: "440px",
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #dcd3fb",
              borderRadius: "20px",
              padding: "32px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontSize: "64px",
                lineHeight: "0.6",
                height: "28px",
                color: "#5330f9",
              }}
            >
              “
            </span>{" "}
            <blockquote style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.65", color: "#423c54" }}>
              One month after going live, we’ve not only seen an uptick in online sales but, more impressively, our offline sales have gone
              way up. This past month has been the best in our business’s history, sales-wise, and it’s clear that H1 has played a
              significant role in this success. Your team’s professionalism and expertise have truly made a difference, and we wanted to
              make sure you knew how much we appreciate it. Thank you for being a key part of our growth story.
            </blockquote>
            <figcaption
              style={{
                marginTop: "auto",
                paddingTop: "20px",
                borderTop: "1px solid #e6e4ee",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#0d0a17" }}>Charlie Beck</span>
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  fontSize: "10.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#5330f9",
                }}
              >
                Abernethy Beck
              </span>
            </figcaption>
          </figure>
          <figure
            aria-hidden="true"
            style={{
              margin: "0 20px 0 0",
              flex: "none",
              width: "440px",
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #dcd3fb",
              borderRadius: "20px",
              padding: "32px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontSize: "64px",
                lineHeight: "0.6",
                height: "28px",
                color: "#5330f9",
              }}
            >
              “
            </span>{" "}
            <blockquote style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.65", color: "#423c54" }}>
              I highly recommend H1! The process of updating our website was seamless and the end result exceeded all of my expectations.
              The team was professional, responsive, and truly listened to my needs. They took the time to understand my business and its
              goals, and the final product was a perfect representation of my brand. The design and branding they created is truly amazing,
              and has helped to elevate my business to the next level. I am extremely pleased with the final product and have already
              received numerous compliments.
            </blockquote>
            <figcaption
              style={{
                marginTop: "auto",
                paddingTop: "20px",
                borderTop: "1px solid #e6e4ee",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#0d0a17" }}>Christian Dean</span>
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  fontSize: "10.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#5330f9",
                }}
              >
                Stratus
              </span>
            </figcaption>
          </figure>
          <figure
            aria-hidden="true"
            style={{
              margin: "0 20px 0 0",
              flex: "none",
              width: "440px",
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #dcd3fb",
              borderRadius: "20px",
              padding: "32px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontSize: "64px",
                lineHeight: "0.6",
                height: "28px",
                color: "#5330f9",
              }}
            >
              “
            </span>{" "}
            <blockquote style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.65", color: "#423c54" }}>
              I seriously cannot speak enough about working with H1. It has honestly been the best experience of any company we have ever
              worked with. From the very start of our onboarding meeting to the very final touches, the H1 team were professional, creative,
              responsive and honestly went more than above and beyond to make sure our every need was met. And we had some pretty unique
              needs. I would recommend them to any business out there who is looking for a site set above the rest of their competitors!
            </blockquote>
            <figcaption
              style={{
                marginTop: "auto",
                paddingTop: "20px",
                borderTop: "1px solid #e6e4ee",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#0d0a17" }}>Faye Zandi</span>
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  fontSize: "10.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#5330f9",
                }}
              >
                Zandiland Beauty
              </span>
            </figcaption>
          </figure>
          <figure
            aria-hidden="true"
            style={{
              margin: "0 20px 0 0",
              flex: "none",
              width: "440px",
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #dcd3fb",
              borderRadius: "20px",
              padding: "32px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontSize: "64px",
                lineHeight: "0.6",
                height: "28px",
                color: "#5330f9",
              }}
            >
              “
            </span>{" "}
            <blockquote style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.65", color: "#423c54" }}>
              One month after going live, we’ve not only seen an uptick in online sales but, more impressively, our offline sales have gone
              way up. This past month has been the best in our business’s history, sales-wise, and it’s clear that H1 has played a
              significant role in this success. Your team’s professionalism and expertise have truly made a difference, and we wanted to
              make sure you knew how much we appreciate it. Thank you for being a key part of our growth story.
            </blockquote>
            <figcaption
              style={{
                marginTop: "auto",
                paddingTop: "20px",
                borderTop: "1px solid #e6e4ee",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#0d0a17" }}>Charlie Beck</span>
              <span
                style={{
                  fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
                  fontWeight: "500",
                  fontSize: "10.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#5330f9",
                }}
              >
                Abernethy Beck
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
