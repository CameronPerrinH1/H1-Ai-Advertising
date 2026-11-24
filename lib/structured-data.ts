import type { FaqItem } from "@/components/home/faq-data";

/*
 * JSON-LD for every page: the business and the website on all of them, plus each page's own
 * nodes. The home page's FAQPage is built from the same list as the FAQ section.
 */

type Node = Record<string, unknown>;

const ORGANIZATION: Node = {
  "@type": "ProfessionalService",
  "@id": "https://h1aiadvertising.com/#organization",
  name: "H1 AI Advertising",
  url: "https://h1aiadvertising.com/",
  logo: {
    "@type": "ImageObject",
    url: "https://h1aiadvertising.com/assets/img/h1-ai-advertising-logo.svg",
  },
  image: "https://h1aiadvertising.com/og-image.jpg",
  description:
    "Meta advertising and custom AI Treatment Coordinators that turn ad clicks into booked appointments for independent med spas.",
  email: "hello@h1aiconsulting.com",
  telephone: "+1-303-225-9372",
  address: {
    "@type": "PostalAddress",
    streetAddress: "201 Columbine Street, Suite 300",
    addressLocality: "Denver",
    addressRegion: "CO",
    postalCode: "80206",
    addressCountry: "US",
  },
  founder: {
    "@type": "Person",
    name: "Erin Silva",
    jobTitle: "President & Founder",
  },
  parentOrganization: {
    "@type": "Organization",
    name: "H1 AI Consulting",
    url: "https://www.h1aiconsulting.com/",
  },
};

const WEBSITE: Node = {
  "@type": "WebSite",
  "@id": "https://h1aiadvertising.com/#website",
  url: "https://h1aiadvertising.com/",
  name: "H1 AI Advertising",
  publisher: {
    "@id": "https://h1aiadvertising.com/#organization",
  },
  inLanguage: "en-US",
};

export const graph = (...nodes: Node[]) => ({ "@context": "https://schema.org", "@graph": [ORGANIZATION, WEBSITE, ...nodes] });

export const faqPage = (items: FaqItem[]): Node => ({
  ...{
    "@type": "FAQPage",
    "@id": "https://h1aiadvertising.com/#faq",
    isPartOf: {
      "@id": "https://h1aiadvertising.com/#webpage",
    },
  },
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: typeof item.a === "string" ? item.a : item.a.join("; ") + "." },
  })),
});

export const HOME: Node[] = [
  {
    "@type": "WebPage",
    "@id": "https://h1aiadvertising.com/#webpage",
    url: "https://h1aiadvertising.com/",
    name: "The MedSpa AI Booking Engine — H1 AI Advertising",
    description:
      "Meta ads that turn into booked appointments. We build independent med spas a custom AI Treatment Coordinator that answers, persuades and books 24/7.",
    isPartOf: {
      "@id": "https://h1aiadvertising.com/#website",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: "https://h1aiadvertising.com/og-image.jpg",
    },
    inLanguage: "en-US",
    about: {
      "@id": "https://h1aiadvertising.com/#organization",
    },
  },
  {
    "@type": "Service",
    "@id": "https://h1aiadvertising.com/#service",
    name: "The MedSpa AI Booking Engine",
    serviceType: "Meta advertising and AI treatment coordinator for med spas",
    provider: {
      "@id": "https://h1aiadvertising.com/#organization",
    },
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Independent med spas",
    },
    description:
      "Targeted Meta ad campaigns that send prospects to a custom AI Treatment Coordinator on your website, which answers questions and objections 24/7 and guides them into your existing booking system.",
  },
];

export const BOOK: Node[] = [
  {
    "@type": ["WebPage", "ContactPage"],
    "@id": "https://h1aiadvertising.com/book#webpage",
    url: "https://h1aiadvertising.com/book",
    name: "Book a Discovery Call — H1 AI Advertising",
    description:
      "Book a 30-minute discovery call with H1 AI Advertising. We’ll review your Meta ads, website and booking flow, and show where leads drop off.",
    isPartOf: {
      "@id": "https://h1aiadvertising.com/#website",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: "https://h1aiadvertising.com/og-image.jpg",
    },
    inLanguage: "en-US",
    breadcrumb: {
      "@id": "https://h1aiadvertising.com/book#breadcrumb",
    },
  },
  {
    "@type": "BreadcrumbList",
    "@id": "https://h1aiadvertising.com/book#breadcrumb",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://h1aiadvertising.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Book a Discovery Call",
        item: "https://h1aiadvertising.com/book",
      },
    ],
  },
];

export const TERMS: Node[] = [
  {
    "@type": "WebPage",
    "@id": "https://h1aiadvertising.com/terms#webpage",
    url: "https://h1aiadvertising.com/terms",
    name: "Terms & Conditions — H1 AI Advertising",
    description:
      "The terms and conditions for the H1 AI Advertising website and services, including fees, data protection and the AI Treatment Coordinator.",
    isPartOf: {
      "@id": "https://h1aiadvertising.com/#website",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: "https://h1aiadvertising.com/og-image.jpg",
    },
    inLanguage: "en-US",
    breadcrumb: {
      "@id": "https://h1aiadvertising.com/terms#breadcrumb",
    },
  },
  {
    "@type": "BreadcrumbList",
    "@id": "https://h1aiadvertising.com/terms#breadcrumb",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://h1aiadvertising.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Terms & Conditions",
        item: "https://h1aiadvertising.com/terms",
      },
    ],
  },
];

export const PRIVACY: Node[] = [
  {
    "@type": "WebPage",
    "@id": "https://h1aiadvertising.com/privacy#webpage",
    url: "https://h1aiadvertising.com/privacy",
    name: "Privacy Policy — H1 AI Advertising",
    description: "How H1 AI Advertising collects, uses and protects information, including data handled by your AI Treatment Coordinator.",
    isPartOf: {
      "@id": "https://h1aiadvertising.com/#website",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: "https://h1aiadvertising.com/og-image.jpg",
    },
    inLanguage: "en-US",
    breadcrumb: {
      "@id": "https://h1aiadvertising.com/privacy#breadcrumb",
    },
  },
  {
    "@type": "BreadcrumbList",
    "@id": "https://h1aiadvertising.com/privacy#breadcrumb",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://h1aiadvertising.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Privacy Policy",
        item: "https://h1aiadvertising.com/privacy",
      },
    ],
  },
];
