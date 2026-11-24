import { FooterSection } from "@/components/FooterSection";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { BookContent } from "@/components/pages/BookContent";
import { pageMetadata } from "@/lib/site";
import { BOOK, graph } from "@/lib/structured-data";
import "./book.css";
import "../motion.css";

export const metadata = pageMetadata({
  path: "/book",
  title: "Book a Discovery Call — H1 AI Advertising",
  description:
    "Book a 30-minute discovery call with H1 AI Advertising. We’ll review your Meta ads, website and booking flow, and show where leads drop off.",
});

export default function Page() {
  return (
    <>
      <JsonLd data={graph(...BOOK)} />
      <div className="hb-page">
        <Header />
        <BookContent />
        <FooterSection />
      </div>
    </>
  );
}
