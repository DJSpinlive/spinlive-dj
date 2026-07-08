/**
 * Mock data for the SpinLive DJ Studio dashboard.
 * Swap these exports for API calls (RTK Query) when the backend is ready.
 */

export type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "deposit" | "unpaid" | "refunded";

export interface Booking {
  id: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  eventType: string;
  title: string;
  date: string; // ISO date
  time: string;
  duration: string;
  venue: string;
  status: BookingStatus;
  payment: PaymentStatus;
  amount: number;
  notes: string;
  setlist: string[];
}

export interface SongRequest {
  id: string;
  user: string;
  initials: string;
  avatarHue: number;
  song: string;
  artist: string;
  tip: number;
  requestedAgo: string;
}

export interface QueueItem {
  id: string;
  song: string;
  artist: string;
  tip: number;
  user: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  role: "fan" | "mod" | "vip";
  text: string;
  time: string;
}

export interface Notification {
  id: string;
  kind: "booking" | "tip" | "request" | "reminder" | "payout" | "follower";
  title: string;
  detail: string;
  time: string;
  unread: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  customer: string;
  kind: "Booking" | "Tip" | "Song request";
  amount: number;
  status: "completed" | "pending" | "failed";
}

export const kpis = {
  totalEarnings: 24850,
  todaysBookings: 3,
  upcomingEvents: 8,
  followers: 12480,
  pendingPayout: 1240,
  withdrawable: 3420,
  tipsTotal: 4210,
  bookingRevenue: 19100,
};

export const weeklyEarnings = [
  { day: "Sat", amount: 420 },
  { day: "Sun", amount: 380 },
  { day: "Mon", amount: 210 },
  { day: "Tue", amount: 510 },
  { day: "Wed", amount: 690 },
  { day: "Thu", amount: 940 },
  { day: "Fri", amount: 1280 },
];

export const revenueTrend = [
  { month: "Aug", revenue: 1450 },
  { month: "Sep", revenue: 1720 },
  { month: "Oct", revenue: 1610 },
  { month: "Nov", revenue: 2050 },
  { month: "Dec", revenue: 2890 },
  { month: "Jan", revenue: 2140 },
  { month: "Feb", revenue: 2380 },
  { month: "Mar", revenue: 2620 },
  { month: "Apr", revenue: 2510 },
  { month: "May", revenue: 3040 },
  { month: "Jun", revenue: 3310 },
  { month: "Jul", revenue: 1130 },
];

export const earningsBySource = [
  { name: "Bookings", value: 19100 },
  { name: "Tips", value: 4210 },
  { name: "Song requests", value: 1540 },
];

export const monthlyComparison = [
  { month: "Feb", thisYear: 2380, lastYear: 1690 },
  { month: "Mar", thisYear: 2620, lastYear: 1810 },
  { month: "Apr", thisYear: 2510, lastYear: 2050 },
  { month: "May", thisYear: 3040, lastYear: 2210 },
  { month: "Jun", thisYear: 3310, lastYear: 2440 },
  { month: "Jul", thisYear: 1130, lastYear: 980 },
];

export const bookings: Booking[] = [
  {
    id: "bk-1042",
    customer: "Marcus Webb",
    customerEmail: "marcus@pulseclub.com",
    customerPhone: "+1 (415) 555-0182",
    eventType: "Club Night",
    title: "Pulse Club — Friday Night Set",
    date: "2026-07-04",
    time: "10:00 PM",
    duration: "4h",
    venue: "Pulse Club, 88 Mission St",
    status: "confirmed",
    payment: "deposit",
    amount: 800,
    notes:
      "Peak-time slot. Crowd skews deep house / melodic techno. CDJ-3000s + DJM-A9 in the booth.",
    setlist: [
      "Warm-up: organic house",
      "Peak: melodic techno",
      "Closer: classics remixes",
    ],
  },
  {
    id: "bk-1043",
    customer: "Ivy & James Carter",
    customerEmail: "ivy.carter@gmail.com",
    customerPhone: "+1 (628) 555-0146",
    eventType: "Wedding",
    title: "Ivy & James — Wedding Reception",
    date: "2026-07-06",
    time: "6:00 PM",
    duration: "5h",
    venue: "The Glasshouse, Napa",
    status: "confirmed",
    payment: "paid",
    amount: 1500,
    notes:
      "First dance at 7:15 PM — 'Lover's Theme'. No explicit lyrics. Bring wireless mic for toasts.",
    setlist: [
      "Cocktail hour: soul & funk",
      "Dinner: acoustic covers",
      "Party: 2000s + disco",
    ],
  },
  {
    id: "bk-1044",
    customer: "Vertex Tech",
    customerEmail: "events@vertex.io",
    customerPhone: "+1 (650) 555-0117",
    eventType: "Corporate",
    title: "Vertex Tech — Summer Launch Party",
    date: "2026-07-09",
    time: "8:00 PM",
    duration: "4h",
    venue: "Skyline Terrace, SoMa",
    status: "pending",
    payment: "unpaid",
    amount: 1100,
    notes:
      "Product launch afterparty, ~300 guests. Requested 'high-energy but conversational' first hour.",
    setlist: ["Nu-disco opener", "House peak set"],
  },
  {
    id: "bk-1045",
    customer: "Lena Ortiz",
    customerEmail: "lena.ortiz@outlook.com",
    customerPhone: "+1 (510) 555-0173",
    eventType: "Birthday",
    title: "Lena's 30th — Rooftop Party",
    date: "2026-07-12",
    time: "7:00 PM",
    duration: "3h",
    venue: "The Ramp Rooftop, Oakland",
    status: "pending",
    payment: "unpaid",
    amount: 650,
    notes: "Latin house + reggaeton requested. Guest of honor loves Peggy Gou.",
    setlist: [],
  },
  {
    id: "bk-1038",
    customer: "Noor Events",
    customerEmail: "hello@noorevents.co",
    customerPhone: "+1 (415) 555-0139",
    eventType: "Festival",
    title: "Bayline Festival — Sunset Stage",
    date: "2026-06-21",
    time: "6:30 PM",
    duration: "1.5h",
    venue: "Bayline Park, SF",
    status: "completed",
    payment: "paid",
    amount: 2200,
    notes:
      "Sunset slot, 2k attendance. Organizers want to rebook for September edition.",
    setlist: ["Melodic house journey set"],
  },
  {
    id: "bk-1036",
    customer: "Harlow Lounge",
    customerEmail: "booking@harlow.bar",
    customerPhone: "+1 (415) 555-0128",
    eventType: "Club Night",
    title: "Harlow Saturdays",
    date: "2026-06-14",
    time: "11:00 PM",
    duration: "3h",
    venue: "Harlow Lounge, North Beach",
    status: "completed",
    payment: "paid",
    amount: 700,
    notes: "",
    setlist: [],
  },
  {
    id: "bk-1031",
    customer: "Dana Kim",
    customerEmail: "dana.kim@me.com",
    customerPhone: "+1 (408) 555-0163",
    eventType: "Private Party",
    title: "Housewarming — Los Altos",
    date: "2026-06-07",
    time: "8:00 PM",
    duration: "3h",
    venue: "Private residence",
    status: "cancelled",
    payment: "refunded",
    amount: 550,
    notes: "Cancelled by customer 5 days out — deposit refunded per policy.",
    setlist: [],
  },
];

export const incomingRequests: SongRequest[] = [
  {
    id: "rq-1",
    user: "@night_owl",
    initials: "NO",
    avatarHue: 200,
    song: "Rhythm Is a Mystery",
    artist: "K-Klass",
    tip: 25,
    requestedAgo: "just now",
  },
  {
    id: "rq-2",
    user: "@lexi.beats",
    initials: "LX",
    avatarHue: 330,
    song: "Voulez-Vous (Remix)",
    artist: "ABBA × Vintage Culture",
    tip: 10,
    requestedAgo: "1m ago",
  },
  {
    id: "rq-3",
    user: "@rave_dad",
    initials: "RV",
    avatarHue: 40,
    song: "Better Off Alone",
    artist: "Alice Deejay",
    tip: 50,
    requestedAgo: "3m ago",
  },
];

export const initialQueue: QueueItem[] = [
  {
    id: "q-1",
    song: "Sandstorm 2K26",
    artist: "Darude, Argy",
    tip: 20,
    user: "@mia.k",
  },
  {
    id: "q-2",
    song: "Cola",
    artist: "CamelPhat & Elderbrook",
    tip: 15,
    user: "@deckhand",
  },
  {
    id: "q-3",
    song: "On My Knees",
    artist: "RÜFÜS DU SOL",
    tip: 30,
    user: "@aurora.fm",
  },
];

export const chatSeed: ChatMessage[] = [
  {
    id: "c-1",
    user: "@modsquad_ken",
    role: "mod",
    text: "Welcome everyone! Song requests are open 🎶",
    time: "10:01",
  },
  {
    id: "c-2",
    user: "@mia.k",
    role: "vip",
    text: "That intro was SMOOTH",
    time: "10:02",
  },
  {
    id: "c-3",
    user: "@deckhand",
    role: "fan",
    text: "greetings from Lisbon 🇵🇹",
    time: "10:02",
  },
  {
    id: "c-4",
    user: "@aurora.fm",
    role: "fan",
    text: "drop the bassline already 😤🔥",
    time: "10:03",
  },
  {
    id: "c-5",
    user: "@night_owl",
    role: "vip",
    text: "just tipped — play K-Klass!!",
    time: "10:04",
  },
  {
    id: "c-6",
    user: "@lexi.beats",
    role: "fan",
    text: "this mix >>> everything",
    time: "10:04",
  },
];

export const chatAmbient: Pick<ChatMessage, "user" | "role" | "text">[] = [
  {
    user: "@bassline_bee",
    role: "fan",
    text: "the transitions tonight are criminal 🔥",
  },
  { user: "@kj_move", role: "fan", text: "shoutout from Berlin!" },
  { user: "@mia.k", role: "vip", text: "someone clip that blend" },
  {
    user: "@modsquad_ken",
    role: "mod",
    text: "keep it friendly in here folks",
  },
  { user: "@vinyl.vera", role: "fan", text: "ok THAT track id please??" },
  {
    user: "@deckhand",
    role: "fan",
    text: "volume at max, neighbors upset, worth it",
  },
  { user: "@aurora.fm", role: "fan", text: "🔥🔥🔥🔥" },
  {
    user: "@rave_dad",
    role: "vip",
    text: "tipping again if you play Alice Deejay",
  },
];

export const notifications: Notification[] = [
  {
    id: "n-1",
    kind: "booking",
    title: "New booking request",
    detail: "Vertex Tech — Summer Launch Party, Jul 9",
    time: "2h ago",
    unread: true,
  },
  {
    id: "n-2",
    kind: "payout",
    title: "Payout processed",
    detail: "$2,150 sent to •••• 4821",
    time: "9h ago",
    unread: true,
  },
  {
    id: "n-3",
    kind: "tip",
    title: "@rave_dad tipped $50",
    detail: "“Friday sets keep me alive”",
    time: "1d ago",
    unread: true,
  },
  {
    id: "n-4",
    kind: "request",
    title: "Song request",
    detail: "@night_owl requested K-Klass — $25 tip attached",
    time: "1d ago",
    unread: true,
  },
  {
    id: "n-5",
    kind: "reminder",
    title: "Booking reminder",
    detail: "Pulse Club set starts today at 10:00 PM",
    time: "1d ago",
    unread: false,
  },
  {
    id: "n-6",
    kind: "follower",
    title: "New followers",
    detail: "@mia.k and 183 others followed you this week",
    time: "2d ago",
    unread: false,
  },
];

export const transactions: Transaction[] = [
  {
    id: "tx-1",
    date: "Jul 3, 2026",
    customer: "Livestream tips (32)",
    kind: "Tip",
    amount: 342,
    status: "completed",
  },
  {
    id: "tx-2",
    date: "Jul 1, 2026",
    customer: "Harlow Lounge",
    kind: "Booking",
    amount: 700,
    status: "completed",
  },
  {
    id: "tx-3",
    date: "Jun 28, 2026",
    customer: "Livestream requests (11)",
    kind: "Song request",
    amount: 165,
    status: "completed",
  },
  {
    id: "tx-4",
    date: "Jun 24, 2026",
    customer: "Ivy & James Carter",
    kind: "Booking",
    amount: 1500,
    status: "completed",
  },
  {
    id: "tx-5",
    date: "Jun 21, 2026",
    customer: "Noor Events",
    kind: "Booking",
    amount: 2200,
    status: "completed",
  },
  {
    id: "tx-6",
    date: "Jun 20, 2026",
    customer: "Livestream tips (18)",
    kind: "Tip",
    amount: 204,
    status: "completed",
  },
  {
    id: "tx-7",
    date: "Jul 4, 2026",
    customer: "Marcus Webb (deposit)",
    kind: "Booking",
    amount: 400,
    status: "pending",
  },
];

export const genres = [
  "Deep House",
  "Melodic Techno",
  "Nu-Disco",
  "Afro House",
  "2000s Throwbacks",
];

export const equipment = [
  "Pioneer CDJ-3000 (×2)",
  "Pioneer DJM-A9 mixer",
  "Shure SM58 wireless mic",
  "QSC K12.2 speakers (×2)",
  "Nanlite tube lighting rig",
];

export const languages = ["English", "Spanish", "Portuguese"];
