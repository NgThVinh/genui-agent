export interface Scene {
  id: string;
  icon: string;
  title: string;
  blurb: string;
  /** The evocative prompt sent to the agent when the scene card is clicked. */
  prompt: string;
}

/** The 10 target scenes, surfaced as one-tap demos on the welcome screen. */
export const SCENES: Scene[] = [
  {
    id: "route",
    icon: "🗺️",
    title: "The route that draws itself",
    blurb: "A live map inks the route, ETA ticking — pin it and follow up in place.",
    prompt: "Fastest way from the office to the airport?",
  },
  {
    id: "tls",
    icon: "🔐",
    title: "Watch the idea get built",
    blurb: "The whiteboard assembles the TLS handshake step by step as it narrates.",
    prompt: "Explain the TLS handshake.",
  },
  {
    id: "dashboard",
    icon: "📊",
    title: "Ask a question, get a dashboard",
    blurb: "KPIs count up, bars grow, a table fills in as the figures stream.",
    prompt: "How did Q3 sales go?",
  },
  {
    id: "decision",
    icon: "⚖️",
    title: "Decisions side by side",
    blurb: "Spec cards fan out, a radar overlays strengths, the winner is spotlighted.",
    prompt: "Postgres, Mongo, or DynamoDB for my use case?",
  },
  {
    id: "architecture",
    icon: "🕸️",
    title: "A living map of your system",
    blurb: "Services as nodes, requests animating the edges — explore, don't read.",
    prompt: "Walk me through this service's architecture.",
  },
  {
    id: "play",
    icon: "🎛️",
    title: "Grab it and play",
    blurb: "A visualizer you operate — a speed slider, bars that swap and settle.",
    prompt: "How does quicksort work?",
  },
  {
    id: "form",
    icon: "🧾",
    title: "A form that fills the gaps",
    blurb: "A booking card right in the chat — tap choices, it narrows in real time.",
    prompt: "Book me a flight to Tokyo next month.",
  },
  {
    id: "timeline",
    icon: "🗓️",
    title: "A plan you can push around",
    blurb: "An interactive timeline of milestones — say 'push the beta' and it re-flows.",
    prompt: "Map out our launch over the next 8 weeks.",
  },
  {
    id: "retrieval",
    icon: "🔎",
    title: "See what the AI retrieved",
    blurb: "An embedding map lights up — retrieved chunks pulse, the query at the center.",
    prompt: "What does our knowledge base say about onboarding?",
  },
  {
    id: "controlroom",
    icon: "🚀",
    title: "A control room that updates itself",
    blurb: "A live status panel pins to the side — progress bars, logs, health flipping green.",
    prompt: "Deploy to staging and keep me posted.",
  },
];
