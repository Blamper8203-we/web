import { TFunction } from "i18next";

export const SLIDER_IMAGES = [
  "/assets/Nowy.png",
  "/assets/desktop-app.png",
  "/assets/image2.png",
  "/assets/image3.png",
  "/assets/image4.png",
];

// WHY: getKnowledgeBase zostało usunięte razem z LandingKnowledgeBase.tsx —
// fikcyjny teaser marketingowy zastąpiła realna sekcja LandingTutorials
// linkująca do /poradniki/<slug>. Klucze landing.kb.* w translation.json
// są teraz dead, ale ich usuwanie to osobny krok (mogą być referencjonowane
// w raportach lub cache'ach i18n).

export const getFaqData = (t: TFunction) => [
  {
    id: 1,
    title: t("landing.faq.q1.title"),
    desc: t("landing.faq.q1.desc"),
  },
  {
    id: 2,
    title: t("landing.faq.q2.title"),
    desc: t("landing.faq.q2.desc"),
  },
  {
    id: 3,
    title: t("landing.faq.q3.title"),
    desc: t("landing.faq.q3.desc"),
  },
];
