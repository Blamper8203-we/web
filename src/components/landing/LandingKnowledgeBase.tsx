import { useState } from "react";
import { knowledgeBase } from "./landingData";

export function LandingKnowledgeBase() {
  const [activeArticle, setActiveArticle] = useState<number>(1);

  return (
    <section id="artykuly" className="py-20 bg-[#070A12] border-t border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-amber-500 text-xs font-bold tracking-widest font-mono uppercase">KOMPENDIUM WIEDZY</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white m-0 min-h-[72px]">
              {knowledgeBase[activeArticle as keyof typeof knowledgeBase].title}
            </h2>

            <div className="min-h-[160px]">
              {knowledgeBase[activeArticle as keyof typeof knowledgeBase].content}
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest block">Baza wiedzy:</span>

            <div className="space-y-3">
              {[1, 2].map((id) => (
                <button
                  key={id}
                  onClick={() => setActiveArticle(id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all group flex items-start gap-3 ${
                    activeArticle === id
                      ? "bg-slate-900 border-blue-500/80 ring-1 ring-blue-500/20"
                      : "bg-slate-950/50 border-slate-800/80 hover:border-blue-500/40"
                  }`}
                >
                  <i
                    data-lucide="arrow-right"
                    className={`w-4 h-4 mt-0.5 transition-transform ${
                      activeArticle === id ? "text-amber-500 translate-x-1" : "text-blue-500 group-hover:translate-x-1"
                    }`}
                  ></i>
                  <div>
                    <span
                      className={`text-sm font-bold block ${
                        activeArticle === id ? "text-white" : "text-blue-400 group-hover:text-blue-300"
                      }`}
                    >
                      {knowledgeBase[id as keyof typeof knowledgeBase].title}
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-1">
                      {knowledgeBase[id as keyof typeof knowledgeBase].desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
