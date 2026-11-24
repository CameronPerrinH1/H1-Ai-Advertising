/** Title band and body. */
export function TermsContent() {
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
            {"Terms & "}
            <span
              style={{
                fontFamily: "'DM Serif Display', 'DM Serif Fallback', Georgia, serif",
                fontStyle: "italic",
                fontWeight: "400",
                letterSpacing: "-0.02em",
                color: "#856df7",
              }}
            >
              Conditions
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
                <a href="#use" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Use of This Website
                </a>
              </li>
              <li>
                <a href="#services" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Our Services
                </a>
              </li>
              <li>
                <a href="#fees" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Fees and Payment
                </a>
              </li>
              <li>
                <a href="#term" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Term and Termination
                </a>
              </li>
              <li>
                <a href="#client" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Client Responsibilities
                </a>
              </li>
              <li>
                <a href="#data" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Data Protection and Privacy
                </a>
              </li>
              <li>
                <a href="#ai" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  AI Treatment Coordinator
                </a>
              </li>
              <li>
                <a href="#ip" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Intellectual Property
                </a>
              </li>
              <li>
                <a href="#confidentiality" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Confidentiality
                </a>
              </li>
              <li>
                <a href="#disclaimers" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Disclaimers
                </a>
              </li>
              <li>
                <a href="#indemnification" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Indemnification
                </a>
              </li>
              <li>
                <a href="#liability" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Limitation of Liability
                </a>
              </li>
              <li>
                <a href="#law" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Governing Law and Disputes
                </a>
              </li>
              <li>
                <a href="#changes" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Changes to These Terms
                </a>
              </li>
              <li>
                <a href="#contact" style={{ display: "block", padding: "6px 0", fontSize: "14.5px", lineHeight: "1.4" }}>
                  Contact Us
                </a>
              </li>
            </ol>{" "}
            <a
              href="/privacy"
              style={{
                marginTop: "8px",
                paddingTop: "14px",
                borderTop: "1px solid #dedbe9",
                fontSize: "14px",
                fontWeight: "600",
                color: "#5330f9",
              }}
            >
              Privacy Policy →
            </a>
          </aside>
          <article
            className="legal"
            style={{ flex: "999 1 560px", minWidth: "0", maxWidth: "780px", display: "flex", flexDirection: "column", gap: "32px" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                These Terms & Conditions (these “Terms”) govern your use of this website and describe the general terms on which H1 Web
                Development, LLC, a Colorado limited liability company doing business as H1 AI Advertising (the “Company,” “we,” “us” or
                “our”), provides its services.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Client engagements are governed by a signed Master Services Agreement, which includes a Business Associate Agreement and one
                or more Statements of Work. If these Terms conflict with a signed agreement, the signed agreement controls.
              </p>
            </div>
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
                Use of This Website
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                This website is provided for general information about our services. Nothing on it is an offer to contract or a guarantee of
                any result. You agree not to misuse the website, interfere with its operation, or use it for any unlawful purpose.
              </p>
            </section>
            <section
              id="services"
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
                Our Services
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We perform the services described in each Statement of Work (“SOW”) signed by both parties. Each SOW is governed by and
                incorporated into the Master Services Agreement and becomes effective when signed by both parties.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Any change to the scope, deliverables, schedule or fees under an SOW requires a written change order signed by both parties.
                We are not obligated to perform work outside the scope of an SOW until a change order is signed.
              </p>
            </section>
            <section
              id="fees"
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
                Fees and Payment
              </h2>
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
                <li>Clients pay the fees set out in each SOW. Except as expressly provided in an SOW, all fees are non-refundable.</li>
                <li>
                  Clients authorize us and our payment processor to charge the card or bank account on file for fees as they become due.
                </li>
                <li>
                  Clients pay directly to the applicable provider all cloud hosting and AI model usage charges, all advertising spend, all
                  third-party software fees and all other third-party costs. These costs are not included in our fees.
                </li>
                <li>
                  Amounts not paid within five (5) days after the due date accrue interest at 1.5% per month or the maximum rate permitted
                  by law, whichever is lower. If any amount remains unpaid more than ten (10) days after its due date, we may suspend
                  services on written notice until all past-due amounts are paid.
                </li>
                <li>
                  Billing disputes must be raised in writing within fifteen (15) days after the charge, and resolved in good faith before
                  any chargeback or payment reversal is initiated.
                </li>
                <li>Fees are exclusive of sales, use, value-added and similar taxes, which the client pays where applicable.</li>
              </ul>
            </section>
            <section
              id="term"
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
                Term and Termination
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Our retainers run month-to-month. Either party may terminate the Master Services Agreement or any SOW for convenience on
                thirty (30) days’ prior written notice. Fees for any billing date that falls within the notice period remain due and are not
                prorated.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Either party may terminate for cause if the other party materially breaches the agreement and fails to cure the breach
                within fifteen (15) days after written notice, or within five (5) business days for non-payment.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                On termination, all accrued fees become due; we disable the services and remove our access from the client’s cloud account;
                the client keeps full access to its data, chat transcripts, advertising analytics and knowledge-base data stored in its own
                account; and within thirty (30) days we deliver all advertising creative and copy created for the client.
              </p>
            </section>
            <section
              id="client"
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
                Client Responsibilities
              </h2>
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
                  Clients provide accurate and complete materials and timely approvals, and are solely responsible for the accuracy of their
                  services, pricing, provider information and clinical content, including content we draft and the client approves.
                </li>
                <li>
                  Clients select, license and contract directly with the vendors of their own scheduling, booking, practice-management, CRM,
                  payment and messaging software. We are not responsible for the outages, API changes, data handling or errors of that
                  software.
                </li>
                <li>
                  Clients are responsible for their own compliance with the laws that apply to their business, including any obligations as
                  a covered entity under HIPAA, their notice of privacy practices and website privacy policy, and the consents required for
                  marketing calls, texts and emails.
                </li>
                <li>
                  Clients must hold all rights, licenses and written patient consents for any photos, before-and-after images, testimonials,
                  reviews and provider names they provide for advertising, and are responsible for making sure their offers and treatment
                  claims comply with advertising laws and licensing-board rules.
                </li>
              </ul>
            </section>
            <section
              id="data"
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
                Data Protection and Privacy
              </h2>
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
                  Our services are deployed in a cloud account owned and paid for by the client, using only services the cloud provider
                  designates as HIPAA-eligible.
                </li>
                <li>
                  We access AI models only through the client’s own cloud account, configured so that client data is not used to train
                  third-party foundation models.
                </li>
                <li>
                  We maintain administrative, physical and technical safeguards consistent with the HIPAA Security Rule, including
                  encryption in transit and at rest, role-based access, multi-factor authentication and audit logging.
                </li>
                <li>
                  Chat transcripts are deleted automatically thirty (30) days after creation. Transcripts flagged for quality review may be
                  kept for up to ninety (90) days, solely to improve the services, or longer only as the client directs in writing.
                </li>
                <li>
                  As between us and the client, the client owns all client data. We may use de-identified, aggregated performance metrics
                  that do not identify the client or any individual.
                </li>
                <li>
                  We configure advertising tracking so that no protected health information, including conversation content or
                  treatment-specific booking details tied to an individual, is sent to Meta or any other advertising platform.
                </li>
                <li>Protected health information is governed by the Business Associate Agreement signed with each client.</li>
              </ul>
            </section>
            <section
              id="ai"
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
                AI Treatment Coordinator
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                The AI Treatment Coordinator provides general information about a client’s services only. It does not provide medical
                advice, diagnosis, individualized treatment plans or prescriptions, and no provider-patient relationship is created between
                the Company and any visitor. Visitors with medical questions are directed to the client’s licensed staff, and visitors
                describing a medical emergency are directed to emergency services.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                The Coordinator tells every visitor at the start of each conversation that they are talking with an AI system, and a visitor
                may ask to reach the client’s staff at any time.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                AI systems can produce inaccurate or incomplete responses. We use guardrails, testing and conversation review to reduce
                errors and correct identified errors promptly.
              </p>
            </section>
            <section
              id="ip"
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
                Intellectual Property
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Clients keep all rights in their materials and data. Once fees are paid in full, we assign to the client the advertising
                copy, creative, scripts, campaign assets and knowledge-base content we create specifically for that client.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We keep all rights in our own software, chat widget code, prompts, model configurations, frameworks, templates, tools and
                methods (our “Company Technology”), including any deployed in a client’s account. During the engagement, clients receive a
                limited, non-exclusive, non-transferable license to use the Company Technology as embedded in the deliverables for their
                internal business operations. Clients may not copy, modify, reverse engineer, resell or use the Company Technology after
                that license ends.
              </p>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                The content, design and branding of this website are owned by the Company and may not be copied without our written
                permission.
              </p>
            </section>
            <section
              id="confidentiality"
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
                Confidentiality
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                Each party protects the other’s non-public business, technical and financial information with at least reasonable care, uses
                it only to perform the agreement, and shares it only with people who need to know it and are bound by similar obligations.
                These obligations continue for three (3) years after the agreement ends, and for as long as information remains a trade
                secret.
              </p>
            </section>
            <section
              id="disclaimers"
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
                Disclaimers
              </h2>
              <p
                style={{
                  margin: "0",
                  fontSize: "14.5px",
                  lineHeight: "1.75",
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
                  color: "#423c54",
                }}
              >
                Except as expressly set forth in a signed agreement, the services, deliverables, Company Technology and this website are
                provided “as is,” and the Company disclaims all other warranties, express or implied, including any implied warranties of
                merchantability, fitness for a particular purpose and non-infringement. Advertising results depend on factors outside the
                Company’s control, including advertising platform auctions, algorithms and policy decisions and the client’s offers, pricing
                and follow-up. Except for any performance guarantee expressly set forth in a Statement of Work, the Company does not
                guarantee any cost per lead, return on advertising spend, revenue or other result, and any case studies or examples are
                illustrative only and not typical results.
              </p>
            </section>
            <section
              id="indemnification"
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
                Indemnification
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We defend and indemnify clients against third-party claims arising from our breach of the Business Associate Agreement or
                from an allegation that our Company Technology infringes a third party’s intellectual property rights. Clients defend and
                indemnify us against third-party claims arising from their materials, their clinical or professional services, their
                software, their breach of the agreement or their violation of applicable law.
              </p>
            </section>
            <section
              id="liability"
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
                Limitation of Liability
              </h2>
              <p
                style={{
                  margin: "0",
                  fontSize: "14.5px",
                  lineHeight: "1.75",
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
                  color: "#423c54",
                }}
              >
                In no event shall either party be liable for any indirect, incidental, consequential, special, exemplary or punitive
                damages, or for any lost profits or revenue, however caused and under any theory of liability. Each party’s total cumulative
                liability shall not exceed the fees paid by the client in the twelve (12) months immediately preceding the event giving rise
                to the claim. These limitations do not apply to the client’s payment obligations or to either party’s gross negligence or
                willful misconduct.
              </p>
            </section>
            <section
              id="law"
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
                Governing Law and Disputes
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                These Terms are governed by the laws of the State of Colorado, without regard to its conflict-of-laws principles. The
                parties will first try to resolve any dispute through good-faith negotiation for thirty (30) days and then, if unresolved,
                through non-binding mediation. Any dispute not resolved that way will be settled by binding arbitration in [Denver County],
                Colorado. Either party may seek injunctive relief in court to protect its confidential information, intellectual property or
                protected health information.
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
                Changes to These Terms
              </h2>
              <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.75", color: "#423c54" }}>
                We may update these Terms from time to time. Changes take effect when posted on this page, and the “Last updated” date above
                will show when they were last revised. Changes to these Terms do not alter a signed Master Services Agreement.
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
              <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "600", lineHeight: "1.25", letterSpacing: "-0.01em" }}>Contact Us</h2>
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
