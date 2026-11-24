export type Skill = {
  title: string;
  desc: string;
  /** Timestamp shown in the chat card's header. */
  time: string;
  messages: { who: "ava" | "you"; text: string }[];
  chips: string[];
};

export const SKILLS: Skill[] = [
  {
    title: "Engages Leads Immediately",
    desc: "Prospects land in a conversation, not a menu. Your coordinator knows which ad brought them in and opens with that exact offer.",
    time: "Just now",
    messages: [
      {
        who: "ava",
        text: "Hi, I’m Ava! Glad you caught our $549 Lip Filler Special. Is this your first time with filler, or are you due for a refresh?",
      },
      { who: "you", text: "First time, a little nervous!" },
      { who: "ava", text: "Totally normal. I’ll walk you through what to expect, then we can find a time that works." },
    ],
    chips: ["What should I expect?", "Show me openings"],
  },
  {
    title: "Answers Treatment Questions 24/7",
    desc: "Pricing, timing, downtime and what to expect, answered in seconds. Nights and weekends included.",
    time: "Sun · 10:42 PM",
    messages: [
      { who: "you", text: "How long does a HydraFacial take, and is there downtime?" },
      { who: "ava", text: "About 45–60 minutes, and most guests head right back to their day. Want me to find a time before your event?" },
    ],
    chips: ["Yes, find a time", "What does it cost?"],
  },
  {
    title: "Handles Objections",
    desc: "Works through hesitations about cost, comfort and results using the sales playbook you approve.",
    time: "Tue · 8:15 PM",
    messages: [
      { who: "you", text: "Honestly, it feels a little expensive." },
      {
        who: "ava",
        text: "That’s fair. A lot of guests start with a half-syringe lip refresh, and we offer monthly financing or our Solenne Glow Membership to spread the cost. Want me to walk you through both?",
      },
    ],
    chips: ["Tell me more", "Book a consult"],
  },
  {
    title: "Recommends and Promotes",
    desc: "Suggests relevant treatments based on client concerns, highlights higher-value services and features your current events and specials.",
    time: "Wed · 1:30 PM",
    messages: [
      { who: "you", text: "I’m booking Botox. Anything else I should know about?" },
      {
        who: "ava",
        text: "This month, guests who pair Botox with a HydraFacial get 20% off their HydraFacial. Want me to add it to the same visit?",
      },
    ],
    chips: ["Add it", "Just Botox"],
  },
  {
    title: "Books in Your Existing System",
    desc: "Guides prospects straight into the booking software you already use. No switching, no new calendar.",
    time: "Thu · 7:05 AM",
    messages: [
      { who: "you", text: "Do you have anything Thursday afternoon?" },
      {
        who: "ava",
        text: "I do! What time works best for you on Thursday? We also require a credit card to hold the time so if you can have that ready, that would be great!",
      },
    ],
    chips: ["1:00 PM", "2:15 PM", "4:00 PM"],
  },
  {
    title: "Speaks in Your Brand’s Voice",
    desc: "A name, a personality and a tone that sound like your team, fully customized to your med spa.",
    time: "Fri · 6:48 PM",
    messages: [
      { who: "you", text: "What’s it like at Solenne?" },
      {
        who: "ava",
        text: "Calm, unhurried and zero pressure. Think warm tea, soft music and injectors who explain everything before they start.",
      },
    ],
    chips: ["Meet the team", "Show me openings"],
  },
  {
    title: "Hands Off to Your Team",
    desc: "When a client requests a person, or asks a medical or clinical question, it immediately routes the conversation to your staff.",
    time: "Mon · 11:20 AM",
    messages: [
      { who: "you", text: "Can I talk to a real person?" },
      {
        who: "ava",
        text: "Of course. I’ve passed your question to our front desk, and they’ll reach out shortly. You can also call us directly.",
      },
    ],
    chips: ["Call Solenne"],
  },
  {
    title: "Never Gives Medical Advice",
    desc: "Guardrails keep it out of clinical territory, and your medical director approves everything it’s trained on.",
    time: "Sat · 9:10 PM",
    messages: [
      { who: "you", text: "I take a blood thinner. Is Botox safe for me?" },
      {
        who: "ava",
        text: "That’s an important question for one of our injectors, so I won’t guess. I can book a consult where they’ll review your health history with you.",
      },
    ],
    chips: ["Book a consult"],
  },
  {
    title: "HIPAA-Aligned Data Storage You Own",
    desc: "Your data lives in a secure, HIPAA-aligned AI Hub in your name, and visitors always know they’re chatting with AI.",
    time: "Tue · 3:02 PM",
    messages: [
      { who: "you", text: "Wait, am I talking to a real person?" },
      {
        who: "ava",
        text: "I’m Ava, Solenne’s AI assistant. Your conversation stays with Solenne’s team, and I can connect you with a person anytime.",
      },
    ],
    chips: ["Talk to a person", "Keep chatting"],
  },
];
