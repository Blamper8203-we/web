import { TFunction } from "i18next";

export const SLIDER_IMAGES = [
  "/assets/Nowy.png",
  "/assets/desktop-app.png",
  "/assets/image2.png",
  "/assets/image3.png",
  "/assets/image4.png",
];

export const getKnowledgeBase = (t: TFunction) => ({
  1: {
    title: t("landing.kb.1.title"),
    desc: t("landing.kb.1.desc"),
    content: (
      <>
        <p className="text-xs text-gray-400 leading-relaxed">
          {t("landing.kb.1.p1")}
        </p>
        <p className="text-xs text-gray-400 leading-relaxed mt-4">
          {t("landing.kb.1.p2")}
        </p>
        <div className="border-l-2 border-amber-500 pl-4 py-1 italic text-xs text-gray-300 mt-4">
          {t("landing.kb.1.quote")}
        </div>
      </>
    ),
  },
  2: {
    title: t("landing.kb.2.title"),
    desc: t("landing.kb.2.desc"),
    content: (
      <>
        <p className="text-xs text-gray-400 leading-relaxed">
          {t("landing.kb.2.p1")}
        </p>
        <p className="text-xs text-gray-400 leading-relaxed mt-4">
          {t("landing.kb.2.p2")}
        </p>
      </>
    ),
  },
});

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
