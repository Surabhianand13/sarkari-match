export const supportedLocales = ["en", "hi", "kn", "te", "ta", "mr"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const localeLabels: Record<SupportedLocale, string> = {
  en: "English",
  hi: "हिन्दी",
  kn: "ಕನ್ನಡ",
  te: "తెలుగు",
  ta: "தமிழ்",
  mr: "मराठी"
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export function resolveLocale(value: string | undefined | null): SupportedLocale {
  if (value && isSupportedLocale(value)) return value;
  return "en";
}

export type StaticLabelKey =
  | "find_matches"
  | "latest_jobs"
  | "profile"
  | "nav_sign_in"
  | "nav_dashboard"
  | "hero_eyebrow"
  | "hero_title"
  | "hero_subtitle"
  | "cta_browse"
  | "cta_view_series"
  | "cta_free_sample"
  | "proof_verified"
  | "proof_eligibility"
  | "proof_reminders"
  | "trust_strip"
  | "demo_tagline"
  | "eligibility_headline"
  | "eligibility_subtitle"
  | "eligibility_step1"
  | "eligibility_step2"
  | "eligibility_step3"
  | "cta_continue"
  | "cta_review_profile"
  | "cta_view_matches"
  | "results_headline"
  | "stat_strong"
  | "stat_possible"
  | "stat_missing"
  | "cta_view_notification"
  | "cta_browse_more"
  | "cta_unlock_explanation"
  | "pricing_headline"
  | "plan_free"
  | "plan_founding"
  | "plan_pro"
  | "plan_pro_plus"
  | "cta_start_free"
  | "cta_claim_founding"
  | "cta_choose_pro"
  | "price_anchor"
  | "badge_no_autodebit"
  | "footer_disclaimer"
  | "cta_share_whatsapp"
  | "redirects_to";

const staticLabels: Record<StaticLabelKey, Record<SupportedLocale, string>> = {
  find_matches: { en: "Find My Matches", hi: "मेरे मैच खोजें", kn: "ನನ್ನ ಹೊಂದಾಣಿಕೆಗಳು", te: "నా మ్యాచులు", ta: "என் பொருத்தங்கள்", mr: "माझे मॅच शोधा" },
  latest_jobs: { en: "Latest Govt Job Notifications", hi: "नई सरकारी नौकरी अधिसूचनाएं", kn: "ಹೊಸ ಸರ್ಕಾರಿ ಉದ್ಯೋಗ ಅಧಿಸೂಚನೆಗಳು", te: "తాజా ప్రభుత్వ ఉద్యోగ నోటిఫికేషన్లు", ta: "புதிய அரசு வேலை அறிவிப்புகள்", mr: "नवीन सरकारी नोकरी अधिसूचना" },
  profile: { en: "Profile", hi: "प्रोफाइल", kn: "ಪ್ರೊಫೈಲ್", te: "ప్రొఫైల్", ta: "சுயவிவரம்", mr: "प्रोफाइल" },
  nav_sign_in: { en: "Sign In", hi: "साइन इन करें", kn: "Sign In", te: "Sign In", ta: "Sign In", mr: "Sign In" },
  nav_dashboard: { en: "Dashboard", hi: "डैशबोर्ड", kn: "Dashboard", te: "Dashboard", ta: "Dashboard", mr: "Dashboard" },
  hero_eyebrow: {
    en: "SSC CGL Tier I mock test series",
    hi: "SSC CGL टियर I मॉक टेस्ट सीरीज़",
    kn: "SSC CGL Tier I mock test series",
    te: "SSC CGL Tier I mock test series",
    ta: "SSC CGL Tier I mock test series",
    mr: "SSC CGL Tier I mock test series"
  },
  hero_title: {
    en: "SSC CGL mock tests written by experts and checked by AI.",
    hi: "विशेषज्ञों द्वारा लिखे और AI से जांचे गए SSC CGL मॉक टेस्ट।",
    kn: "SSC CGL mock tests written by experts and checked by AI.",
    te: "SSC CGL mock tests written by experts and checked by AI.",
    ta: "SSC CGL mock tests written by experts and checked by AI.",
    mr: "SSC CGL mock tests written by experts and checked by AI."
  },
  hero_subtitle: {
    en: "Practice on the real exam pattern with full solutions and analysis after every test. Try a free sample test first.",
    hi: "असली परीक्षा पैटर्न पर अभ्यास करें, हर टेस्ट के बाद पूरे समाधान और विश्लेषण के साथ। पहले एक फ्री सैंपल टेस्ट दें।",
    kn: "Practice on the real exam pattern with full solutions and analysis after every test. Try a free sample test first.",
    te: "Practice on the real exam pattern with full solutions and analysis after every test. Try a free sample test first.",
    ta: "Practice on the real exam pattern with full solutions and analysis after every test. Try a free sample test first.",
    mr: "Practice on the real exam pattern with full solutions and analysis after every test. Try a free sample test first."
  },
  cta_view_series: { en: "View the test series", hi: "टेस्ट सीरीज़ देखें", kn: "View the test series", te: "View the test series", ta: "View the test series", mr: "View the test series" },
  cta_free_sample: { en: "Free sample test", hi: "फ्री सैंपल टेस्ट", kn: "Free sample test", te: "Free sample test", ta: "Free sample test", mr: "Free sample test" },
  cta_browse: { en: "Browse Notifications", hi: "सूचनाएं देखें", kn: "Browse Notifications", te: "Browse Notifications", ta: "Browse Notifications", mr: "Browse Notifications" },
  proof_verified: { en: "Verified notifications", hi: "सत्यापित सूचनाएं", kn: "Verified notifications", te: "Verified notifications", ta: "Verified notifications", mr: "Verified notifications" },
  proof_eligibility: { en: "Eligibility checks", hi: "पात्रता जांच", kn: "Eligibility checks", te: "Eligibility checks", ta: "Eligibility checks", mr: "Eligibility checks" },
  proof_reminders: { en: "Deadline reminders", hi: "समय सीमा अनुस्मारक", kn: "Deadline reminders", te: "Deadline reminders", ta: "Deadline reminders", mr: "Deadline reminders" },
  trust_strip: {
    en: "Independent notification-matching platform — not affiliated with any government. We never charge for applications.",
    hi: "स्वतंत्र सूचना-मिलान प्लेटफ़ॉर्म — किसी भी सरकार से संबद्ध नहीं। हम आवेदन के लिए कभी शुल्क नहीं लेते।",
    kn: "Independent notification-matching platform — not affiliated with any government. We never charge for applications.",
    te: "Independent notification-matching platform — not affiliated with any government. We never charge for applications.",
    ta: "Independent notification-matching platform — not affiliated with any government. We never charge for applications.",
    mr: "Independent notification-matching platform — not affiliated with any government. We never charge for applications."
  },
  demo_tagline: {
    en: "No clutter. Only clean, verified notifications.",
    hi: "कोई अव्यवस्था नहीं। सिर्फ़ स्वच्छ, सत्यापित सूचनाएं।",
    kn: "No clutter. Only clean, verified notifications.",
    te: "No clutter. Only clean, verified notifications.",
    ta: "No clutter. Only clean, verified notifications.",
    mr: "No clutter. Only clean, verified notifications."
  },
  eligibility_headline: {
    en: "Let's find the right notifications for you.",
    hi: "आइए आपके लिए सही सूचनाएं खोजें।",
    kn: "Let's find the right notifications for you.",
    te: "Let's find the right notifications for you.",
    ta: "Let's find the right notifications for you.",
    mr: "Let's find the right notifications for you."
  },
  eligibility_subtitle: {
    en: "Build a candidate profile once. SarkariMatch checks it against post-level govt job and exam notification rules.",
    hi: "एक बार उम्मीदवार प्रोफ़ाइल बनाएं। सरकारीमैच इसे पद-स्तरीय सरकारी नौकरी और परीक्षा सूचना नियमों के विरुद्ध जांचता है।",
    kn: "Build a candidate profile once. SarkariMatch checks it against post-level govt job and exam notification rules.",
    te: "Build a candidate profile once. SarkariMatch checks it against post-level govt job and exam notification rules.",
    ta: "Build a candidate profile once. SarkariMatch checks it against post-level govt job and exam notification rules.",
    mr: "Build a candidate profile once. SarkariMatch checks it against post-level govt job and exam notification rules."
  },
  eligibility_step1: { en: "Step 1: Basic details", hi: "चरण 1: बुनियादी जानकारी", kn: "Step 1: Basic details", te: "Step 1: Basic details", ta: "Step 1: Basic details", mr: "Step 1: Basic details" },
  eligibility_step2: { en: "Step 2: Location and preferences", hi: "चरण 2: स्थान और प्राथमिकताएं", kn: "Step 2: Location and preferences", te: "Step 2: Location and preferences", ta: "Step 2: Location and preferences", mr: "Step 2: Location and preferences" },
  eligibility_step3: { en: "Step 3: Review profile", hi: "चरण 3: प्रोफ़ाइल की समीक्षा करें", kn: "Step 3: Review profile", te: "Step 3: Review profile", ta: "Step 3: Review profile", mr: "Step 3: Review profile" },
  cta_continue: { en: "Continue", hi: "जारी रखें", kn: "Continue", te: "Continue", ta: "Continue", mr: "Continue" },
  cta_review_profile: { en: "Review profile", hi: "प्रोफ़ाइल समीक्षा करें", kn: "Review profile", te: "Review profile", ta: "Review profile", mr: "Review profile" },
  cta_view_matches: { en: "View Matches", hi: "मैच देखें", kn: "View Matches", te: "View Matches", ta: "View Matches", mr: "View Matches" },
  results_headline: {
    en: "Profile submitted. Matching notifications are ready.",
    hi: "प्रोफ़ाइल सबमिट की गई। मिलान सूचनाएं तैयार हैं।",
    kn: "Profile submitted. Matching notifications are ready.",
    te: "Profile submitted. Matching notifications are ready.",
    ta: "Profile submitted. Matching notifications are ready.",
    mr: "Profile submitted. Matching notifications are ready."
  },
  stat_strong: { en: "strong matches", hi: "पक्के मैच", kn: "strong matches", te: "strong matches", ta: "strong matches", mr: "strong matches" },
  stat_possible: { en: "possible match", hi: "संभावित मैच", kn: "possible match", te: "possible match", ta: "possible match", mr: "possible match" },
  stat_missing: { en: "missing info", hi: "जानकारी अधूरी", kn: "missing info", te: "missing info", ta: "missing info", mr: "missing info" },
  cta_view_notification: { en: "View notification", hi: "सूचना देखें", kn: "View notification", te: "View notification", ta: "View notification", mr: "View notification" },
  cta_browse_more: { en: "Browse more", hi: "और देखें", kn: "Browse more", te: "Browse more", ta: "Browse more", mr: "Browse more" },
  cta_unlock_explanation: {
    en: "See the full rule-by-rule breakdown — unlock with the Founding Pass",
    hi: "पूरी नियम-दर-नियम जानकारी देखें — फाउंडिंग पास से अनलॉक करें",
    kn: "See the full rule-by-rule breakdown — unlock with the Founding Pass",
    te: "See the full rule-by-rule breakdown — unlock with the Founding Pass",
    ta: "See the full rule-by-rule breakdown — unlock with the Founding Pass",
    mr: "See the full rule-by-rule breakdown — unlock with the Founding Pass"
  },
  pricing_headline: {
    en: "Simple plans for serious notification matching",
    hi: "गंभीर सूचना मिलान के लिए सरल योजनाएं",
    kn: "Simple plans for serious notification matching",
    te: "Simple plans for serious notification matching",
    ta: "Simple plans for serious notification matching",
    mr: "Simple plans for serious notification matching"
  },
  plan_free: { en: "Free", hi: "मुफ़्त", kn: "Free", te: "Free", ta: "Free", mr: "Free" },
  plan_founding: { en: "Founding Pro Pass", hi: "फाउंडिंग प्रो पास", kn: "Founding Pro Pass", te: "Founding Pro Pass", ta: "Founding Pro Pass", mr: "Founding Pro Pass" },
  plan_pro: { en: "Pro", hi: "प्रो", kn: "Pro", te: "Pro", ta: "Pro", mr: "Pro" },
  plan_pro_plus: { en: "Pro Plus", hi: "प्रो प्लस", kn: "Pro Plus", te: "Pro Plus", ta: "Pro Plus", mr: "Pro Plus" },
  cta_start_free: { en: "Start free", hi: "मुफ़्त शुरू करें", kn: "Start free", te: "Start free", ta: "Start free", mr: "Start free" },
  cta_claim_founding: { en: "Claim Founding Pass", hi: "फाउंडिंग पास पाएं", kn: "Claim Founding Pass", te: "Claim Founding Pass", ta: "Claim Founding Pass", mr: "Claim Founding Pass" },
  cta_choose_pro: { en: "Choose Pro", hi: "प्रो चुनें", kn: "Choose Pro", te: "Choose Pro", ta: "Choose Pro", mr: "Choose Pro" },
  price_anchor: {
    en: "Just ₹16/month — less than a single mobile recharge pack.",
    hi: "सिर्फ़ ₹16/महीना — एक मोबाइल रिचार्ज पैक से भी कम।",
    kn: "Just ₹16/month — less than a single mobile recharge pack.",
    te: "Just ₹16/month — less than a single mobile recharge pack.",
    ta: "Just ₹16/month — less than a single mobile recharge pack.",
    mr: "Just ₹16/month — less than a single mobile recharge pack."
  },
  badge_no_autodebit: { en: "No auto-debit", hi: "कोई ऑटो-डेबिट नहीं", kn: "No auto-debit", te: "No auto-debit", ta: "No auto-debit", mr: "No auto-debit" },
  footer_disclaimer: {
    en: "Govt job and exam notifications matched to your eligibility profile. SarkariMatch is an independent notification-matching platform and is not affiliated with the Government of India or any state government.",
    hi: "आपकी पात्रता प्रोफ़ाइल से मिलान की गई सरकारी नौकरी और परीक्षा सूचनाएं। सरकारीमैच एक स्वतंत्र सूचना-मिलान प्लेटफ़ॉर्म है और भारत सरकार या किसी राज्य सरकार से संबद्ध नहीं है।",
    kn: "Govt job and exam notifications matched to your eligibility profile. SarkariMatch is an independent notification-matching platform and is not affiliated with the Government of India or any state government.",
    te: "Govt job and exam notifications matched to your eligibility profile. SarkariMatch is an independent notification-matching platform and is not affiliated with the Government of India or any state government.",
    ta: "Govt job and exam notifications matched to your eligibility profile. SarkariMatch is an independent notification-matching platform and is not affiliated with the Government of India or any state government.",
    mr: "Govt job and exam notifications matched to your eligibility profile. SarkariMatch is an independent notification-matching platform and is not affiliated with the Government of India or any state government."
  },
  cta_share_whatsapp: { en: "Share on WhatsApp", hi: "व्हाट्सएप पर शेयर करें", kn: "Share on WhatsApp", te: "Share on WhatsApp", ta: "Share on WhatsApp", mr: "Share on WhatsApp" },
  redirects_to: { en: "Redirects to", hi: "यहां पुनर्निर्देशित करता है", kn: "Redirects to", te: "Redirects to", ta: "Redirects to", mr: "Redirects to" }
};

export function localizeStaticLabel(key: StaticLabelKey, locale: SupportedLocale) {
  return staticLabels[key][locale] ?? staticLabels[key].en;
}
