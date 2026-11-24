/** Title band and body. */
export function PrivacyContent() {
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div
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
          className="hb-wrap"
          style={{
            position: "relative",
            maxWidth: "1180px",
            margin: "0 auto",
            boxSizing: "border-box",
            padding: "72px 40px 64px",
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
              color: "#856df7",
            }}
          >
            Legal
          </span>{" "}
          <h1
            style={{
              margin: "0",
              fontWeight: "600",
              fontSize: "clamp(36px, 4.4vw + 20px, 56px)",
              lineHeight: "1.05",
              letterSpacing: "-0.02em",
            }}
          >
            {"Privacy "}
            <span
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontWeight: "400",
                letterSpacing: "-0.02em",
                color: "#856df7",
              }}
            >
              Policy
            </span>
          </h1>{" "}
          <span style={{ fontSize: "15px", color: "#a79fbf" }}>Last updated [DATE]</span>
        </div>
      </section>
      <section style={{ background: "#ffffff", color: "#0d0a17" }}>
        <div
          className="hb-wrap"
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            boxSizing: "border-box",
            padding: "64px 40px 96px",
            display: "flex",
            flexWrap: "wrap",
            gap: "48px 64px",
            alignItems: "flex-start",
          }}
        >
          <aside
            className="toc"
            style={{
              flex: "1 1 240px",
              maxWidth: "300px",
              position: "sticky",
              top: "112px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "22px",
              borderRadius: "20px",
              background: "#f0eef5",
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
              On This Page
            </span>{" "}
            <ol style={{ margin: "0", padding: "0", listStyle: "none" }}>
              <li>
                <a href="#intro" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Introduction
                </a>
              </li>
              <li>
                <a href="#children" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Children
                </a>
              </li>
              <li>
                <a href="#changes" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Changes to Our Privacy Policy
                </a>
              </li>
              <li>
                <a href="#collect" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Information We Collect About You and How We Collect It
                </a>
              </li>
              <li>
                <a href="#use" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  How We Use Your Information
                </a>
              </li>
              <li>
                <a href="#disclosure" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Disclosure of Your Information
                </a>
              </li>
              <li>
                <a href="#communication" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Communication from the Company
                </a>
              </li>
              <li>
                <a href="#security" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Data Security
                </a>
              </li>
              <li>
                <a href="#links" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Third-Party Links
                </a>
              </li>
              <li>
                <a href="#contact" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Contact Information
                </a>
              </li>
            </ol>{" "}
            <a
              href="/terms"
              style={{
                marginTop: "8px",
                paddingTop: "14px",
                borderTop: "1px solid #dedbe9",
                fontSize: "14px",
                fontWeight: "600",
                color: "#5330f9",
              }}
            >
              Terms & Conditions →
            </a>
          </aside>
          <article
            className="legal"
            style={{ flex: "999 1 560px", minWidth: "0", maxWidth: "780px", display: "flex", flexDirection: "column", gap: "32px" }}
          >
            <section
              id="intro"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                Introduction
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                H1 Web Development, LLC, doing business as H1 AI Advertising (the “
                <strong>
                  <em>Company</em>
                </strong>
                ” or “
                <strong>
                  <em>we</em>
                </strong>
                ”), respects your privacy and is committed to protecting it through our compliance with this policy. This policy describes
                the types of information we may collect from you or that you may provide when you visit this website, or its related
                websites, or communicate with us via email (collectively, our “
                <strong>
                  <em>Website</em>
                </strong>
                ”), and our practices for collecting, using, maintaining, protecting, and disclosing that information.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Please read this policy carefully to understand our policies and practices regarding your information and how we will treat
                it. If you do not agree with our policies and practices, you should not use our Website. By accessing or using this Website,
                you agree to this privacy policy. This policy may change from time to time (see Changes to Our Privacy Policy below). Your
                continued use of this Website after we make changes is deemed to be acceptance of those changes.
              </p>
            </section>
            <section
              id="children"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>Children</h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Our Website is not intended for anyone under 13 years of age. No one under age 13 may provide any information to or on the
                Website, or purchase any products described on the Website. If you are under 13, do not use or provide any information on
                this Website or on or through any of its features/register on the Website, or use any of the interactive features of this
                Website or provide any information about yourself to us, including your name, address, telephone number, email address, or
                any screen name or user name you may use.
              </p>
            </section>
            <section
              id="changes"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                Changes to Our Privacy Policy
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We may revise and update this Privacy Policy from time to time in our sole discretion. All modifications and amendments will
                become effective ten (10) days after notification. You agree that the date of notification is the earlier of (i) the date
                the new terms are posted on the Website, or (ii) the date the new terms are emailed or otherwise provided to you. Your
                continued use of the Website following the posting of a revised Privacy Policy means that you accept and agree to the
                changes. You are expected to check this page regularly so you are aware of any changes, as they are binding on you.
              </p>
            </section>
            <section
              id="collect"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                Information We Collect About You and How We Collect It
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We collect several types of information from and about users of our Website, including information (a) by which you may be
                personally identified, such as name, e-mail address, telephone number or any other personal or personally identifiable
                information (“
                <strong>
                  <em>personal information</em>
                </strong>
                ”); (b) that is about you but individually does not identify you; and/or (c) about your internet connection, the equipment
                you use to access our Website and usage details.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We collect this information directly from you when you provide it to us, from third parties and automatically as you
                navigate through the site. Information collected automatically may include usage details, IP addresses, and information
                collected through cookies, tracking codes, and other tracking technologies.
              </p>
              <h3 style={{ margin: "8px 0 0", fontSize: "17px", fontWeight: "600", fontStyle: "italic", color: "#0d0a17" }}>
                Information You Provide to Us
              </h3>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                The information we collect on or through our Website may include:
              </p>
              <ul
                style={{
                  margin: "0",
                  paddingLeft: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "16.5px",
                  lineHeight: "1.7",
                  color: "#423c54",
                }}
              >
                <li>
                  Information that you provide by filling in forms on our Website. This includes information provided at the time of
                  requesting further services, or reporting a problem with our Website.
                </li>
                <li>Records and copies of your correspondence (including email addresses), if you contact us.</li>
              </ul>
              <h3 style={{ margin: "8px 0 0", fontSize: "17px", fontWeight: "600", fontStyle: "italic", color: "#0d0a17" }}>
                Information We Collect Through Automatic Data Collection Technologies
              </h3>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                As you navigate through and interact with our Website, we may use automatic data collection technologies to collect certain
                information about your equipment, browsing actions, and patterns, including:
              </p>
              <ul
                style={{
                  margin: "0",
                  paddingLeft: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "16.5px",
                  lineHeight: "1.7",
                  color: "#423c54",
                }}
              >
                <li>
                  Details of your visits to our Website, including traffic data, location data, logs, and other communication data and the
                  resources that you access and use on the Website.
                </li>
                <li>
                  Information about your computer and internet connection, including your IP address, operating system, and browser type.
                </li>
              </ul>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                The information we collect automatically may include personal information, or we may maintain it or associate it with
                personal information we collect in other ways or receive from third parties. The technologies we use for this automatic data
                collection may include cookies, tracking codes, web beacons and other collection technologies.
              </p>
            </section>
            <section
              id="use"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                How We Use Your Information
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We use information that we collect about you or that you provide to us, including any personal information:
              </p>
              <ul
                style={{
                  margin: "0",
                  paddingLeft: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "16.5px",
                  lineHeight: "1.7",
                  color: "#423c54",
                }}
              >
                <li>
                  To provide you with information, marketing communications, products, or services that you request from us or that may be
                  of interest to you, and to provide you with notices about the services with which you engage with us.
                </li>
                <li>
                  To notify you about changes to, and improve, our Website or any products or services we offer or provide through it.
                </li>
                <li>
                  To better understand how visitors are interacting with the Website and help us improve our Website, products and services.
                </li>
                <li>In any other way we may describe when you provide the information.</li>
              </ul>
            </section>
            <section
              id="disclosure"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                Disclosure of Your Information
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We may disclose aggregated information about our users, and information that does not identify any individual, without
                restriction.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We may disclose personal information that we collect or you provide to us:
              </p>
              <ul
                style={{
                  margin: "0",
                  paddingLeft: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "16.5px",
                  lineHeight: "1.7",
                  color: "#423c54",
                }}
              >
                <li>To our subsidiaries and affiliates.</li>
                <li>To contractors, service providers, and other third parties we use to support our business.</li>
                <li>
                  To a buyer or other successor in the event of a merger, divestiture, restructuring, reorganization, dissolution, or other
                  sale or transfer of some or all of the Company’s assets, whether as a going concern or as part of bankruptcy, liquidation,
                  or similar proceeding, in which personal information about our Website users is among the assets transferred.
                </li>
                <li>For any other purpose disclosed by us when you provide the information.</li>
                <li>With your consent.</li>
              </ul>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We may also disclose your personal information:
              </p>
              <ul
                style={{
                  margin: "0",
                  paddingLeft: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "16.5px",
                  lineHeight: "1.7",
                  color: "#423c54",
                }}
              >
                <li>
                  To comply with any court order, law, or legal process, including to respond to any government or regulatory request.
                </li>
                <li>
                  {"To enforce our "}
                  <a href="/terms">Terms & Conditions</a>
                  {" and other agreements."}
                </li>
                <li>
                  If we believe disclosure is necessary or appropriate to protect the rights, property, or safety of the Company, our
                  customers, or others.
                </li>
              </ul>
            </section>
            <section
              id="communication"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                Communication from the Company
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Whenever we send out commercial or marketing emails, we include an option to stop receiving such messages. If you do not
                desire to receive such communications from us, please exercise this option. In addition, you may contact us at any time to
                request that you be removed from our commercial and marketing email list (see contact information below). Even if you
                opt-out, however, we might send you messages for non-marketing or administrative purposes like notifying you of the status
                of your services, informing you of changes to the Website or providing you with customer service.
              </p>
            </section>
            <section
              id="security"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                Data Security
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access,
                use, alteration, and disclosure. Unfortunately, the transmission of information via the internet is not completely secure.
                Although we do our best to protect your personal information, we cannot guarantee the security of your personal information
                transmitted to our Website. Any transmission of personal information is at your own risk. We are not responsible for
                circumvention of any privacy settings or security measures contained on the Website.
              </p>
            </section>
            <section
              id="links"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                Third-Party Links
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                The Website may contain links to third-party websites. This Privacy Policy does not apply to those websites and we encourage
                you, when you leave the Website, to read the privacy statements of those websites.
              </p>
            </section>
            <section
              id="contact"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                paddingTop: "32px",
                borderTop: "1px solid #f0eef5",
                scrollMarginTop: "24px",
              }}
            >
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>
                Contact Information
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                To contact us about this Privacy Policy and our privacy practices, contact us at:
              </p>
              <ul
                style={{
                  margin: "0",
                  paddingLeft: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "16.5px",
                  lineHeight: "1.7",
                  color: "#423c54",
                }}
              >
                <li>H1 Web Development, LLC d/b/a H1 AI Advertising</li>
                <li>201 Columbine Street, Suite 300</li>
                <li>Denver, CO 80206</li>
                <li>
                  <a href="mailto:hello@h1aiconsulting.com">hello@h1aiconsulting.com</a>
                </li>
              </ul>
            </section>
          </article>
        </div>
      </section>
    </>
  );
}
