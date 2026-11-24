import { Footer } from "./Footer";

/** The closing section on every page except home, which has the CTA band above the footer. */
export function FooterSection() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div
        className="hb-wrap"
        style={{ position: "relative", maxWidth: "1320px", margin: "0 auto", boxSizing: "border-box", padding: "72px 40px 56px" }}
      >
        <Footer />
      </div>
    </section>
  );
}
