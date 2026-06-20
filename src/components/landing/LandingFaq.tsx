import { useState } from "react";
import { faqData } from "./landingData";

export function LandingFaq() {
  const [faqState, setFaqState] = useState<Record<number, boolean>>({});

  const toggleFaq = (id: number) => {
    setFaqState((prev) => ({ ...prev, [id]: !prev[id] }));
    setTimeout(() => {
      if ((window as any).lucide) (window as any).lucide.createIcons();
    }, 10);
  };

  return (
    <section id="faq" className="py-20 bg-[#090D16] border-t border-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-blue-500 text-xs font-bold tracking-widest font-mono uppercase block mb-2">Baza Wiedzy</span>
          <h2 className="text-3xl font-extrabold text-white m-0">Najczęściej zadawane pytania (FAQ)</h2>
        </div>

        <div className="space-y-4">
          {faqData.map((faq) => (
            <div key={faq.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full text-left p-5 flex justify-between items-center text-white hover:text-amber-500 transition-colors"
              >
                <span className="font-bold text-xs sm:text-sm">{faq.title}</span>
                <i
                  data-lucide="chevron-down"
                  className={`w-4 h-4 text-gray-400 transform transition-transform duration-300 ${
                    faqState[faq.id] ? "rotate-180" : ""
                  }`}
                ></i>
              </button>
              {faqState[faq.id] && (
                <div className="px-5 pb-5 text-xs text-gray-400 leading-relaxed border-t border-slate-800/50 pt-3">
                  {faq.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
