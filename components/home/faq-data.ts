/**
 * The FAQ. The section and the FAQPage structured data are both built from this list,
 * so the two always match. An answer is a paragraph, or a list of points.
 */
export type FaqItem = { q: string; a: string | string[] };

export const FAQ: FaqItem[] = [
  {
    q: "Do we have to switch booking software?",
    a: "No. If available, we’ll integrate your AI Treatment Coordinator with your existing booking system’s API so it can book directly for clients. If that’s not available, the Coordinator will show guests available times in the chat and set up the booking page for them based on their requests, then push them there to confirm. Your team keeps the same calendar, the same workflows and the same front-desk process.",
  },
  {
    q: "Our booking software already has a chatbot. How is this different?",
    a: "Most built-in chatbots repeat service descriptions, pricing and FAQs. Your AI Treatment Coordinator is custom-built and trained on your brand voice, your treatments and an approved sales playbook, so it can handle objections, recommend relevant treatments, promote your specials and guide people to book. It also knows which ad brought each prospect in.",
  },
  {
    q: "Will it give medical advice to prospects?",
    a: "No. It is designed never to give medical or clinical advice. When a question needs a clinician, or when it isn’t sure of the answer, it hands the conversation to your team. Your medical director approves the content it’s trained on before launch.",
  },
  {
    q: "How do you protect patient privacy?",
    a: "The AI Treatment Coordinator is designed with patient privacy and data security in mind. Your knowledge base, sales playbook and conversation data live in a secure, HIPAA-compliant AI Hub set up under your name, and we sign a Business Associate Agreement with you. Every conversation also tells visitors they’re chatting with AI.",
  },
  {
    q: "Do we need to be running Meta ads already?",
    a: "No, it’s not required. If you are, it’s an ideal starting point, because we can see what your ads produce today. If you aren’t, we’ll build your campaigns from the ground up. Either way, we run highly targeted Meta campaigns as part of the program, so your coordinator always has a steady stream of local, high-intent prospects to talk to.",
  },
  {
    q: "What’s in the monthly AI Impact Report?",
    a: "Your ad performance, AI conversations and booking data in one view. Each month we meet with you to walk through it, identify missed opportunities and decide what to optimize next, so every recommendation ties back to booked appointments.",
  },
  {
    q: "Who owns our data?",
    a: "You do. Your AI Hub is set up in your name from day one, so your conversation and booking data stay yours.",
  },
  {
    q: "What will I get when I work with you?",
    a: [
      "Monthly AI Impact Report with full analytics",
      "Monthly strategy meeting with a dedicated account coordinator",
      "Full monthly Meta ad creative development and management",
      "An AI Treatment Coordinator chat installed on your website and continuously optimized based on patient conversations",
    ],
  },
  {
    q: "What does it cost?",
    a: "We walk through pricing during our Discovery Call once we understand your current ads, website traffic and goals. Our retainers are a fixed monthly cost and run month-to-month with a 30-day cancellation notice.",
  },
];
