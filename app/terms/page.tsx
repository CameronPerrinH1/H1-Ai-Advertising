import { FooterSection } from "@/components/FooterSection";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { TermsContent } from "@/components/pages/TermsContent";
import { pageMetadata } from "@/lib/site";
import { TERMS, graph } from "@/lib/structured-data";
import "../legal.css";
import "../motion.css";

export const metadata = pageMetadata({
  path: "/terms",
  title: "Terms & Conditions — H1 AI Advertising",
  description:
    "The terms and conditions for the H1 AI Advertising website and services, including fees, data protection and the AI Treatment Coordinator.",
});

export default function Page() {
  return (
    <>
      <JsonLd data={graph(...TERMS)} />
      <div className="hb-page">
        <Header />
        <TermsContent />
        <FooterSection />
      </div>
    </>
  );
}
