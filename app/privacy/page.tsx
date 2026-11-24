import { FooterSection } from "@/components/FooterSection";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { PrivacyContent } from "@/components/pages/PrivacyContent";
import { pageMetadata } from "@/lib/site";
import { PRIVACY, graph } from "@/lib/structured-data";
import "../legal.css";
import "../motion.css";

export const metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy Policy — H1 AI Advertising",
  description: "How H1 AI Advertising collects, uses and protects information, including data handled by your AI Treatment Coordinator.",
});

export default function Page() {
  return (
    <>
      <JsonLd data={graph(...PRIVACY)} />
      <div className="hb-page">
        <Header />
        <PrivacyContent />
        <FooterSection />
      </div>
    </>
  );
}
