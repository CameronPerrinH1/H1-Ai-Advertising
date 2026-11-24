import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { Coordinator } from "@/components/home/Coordinator";
import { CtaFooter } from "@/components/home/CtaFooter";
import { Faq } from "@/components/home/Faq";
import { FAQ } from "@/components/home/faq-data";
import { Founder } from "@/components/home/Founder";
import { Hero } from "@/components/home/Hero";
import { Problem } from "@/components/home/Problem";
import { Results } from "@/components/home/Results";
import { Skills } from "@/components/home/Skills";
import { System } from "@/components/home/System";
import { pageMetadata } from "@/lib/site";
import { HOME, faqPage, graph } from "@/lib/structured-data";
// Page styles before motion.css, the order the static page had them in.
import "./home.css";
import "./motion.css";

export const metadata = pageMetadata({
  path: "/",
  title: "The MedSpa AI Booking Engine — H1 AI Advertising",
  description:
    "Meta ads that turn into booked appointments. We build independent med spas a custom AI Treatment Coordinator that answers, persuades and books 24/7.",
});

export default function Home() {
  return (
    <>
      <JsonLd data={graph(...HOME, faqPage(FAQ))} />
      <div className="hb-page">
        <Header home />
        <Hero />
        <Problem />
        <System />
        <Coordinator />
        <Skills />
        <Founder />
        <Results />
        <Faq />
        <CtaFooter />
      </div>
    </>
  );
}
