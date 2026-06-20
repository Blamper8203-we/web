
interface LandingFooterProps {
  onOpenFeedback: () => void;
}

export function LandingFooter({ onOpenFeedback }: LandingFooterProps) {
  return (
    <footer className="bg-[#05080E] border-t border-gray-900 py-12 text-gray-500 text-[11px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden grayscale opacity-70">
            <img src="/favicon-192.png" alt="DinBoard Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-sm font-bold text-white block">DinBoard</span>
            <span className="block text-[10px] text-gray-600">Narzędzie dla nowoczesnych elektryków.</span>
          </div>
        </div>

        <div className="flex gap-6">
          <a href="#" className="hover:text-amber-500 transition-colors">
            Polityka Prywatności
          </a>
          <a href="#" className="hover:text-amber-500 transition-colors">
            Warunki korzystania
          </a>
          <a onClick={onOpenFeedback} className="hover:text-amber-500 transition-colors cursor-pointer">
            Zgłoś błąd / Kontakt
          </a>
        </div>

        <span className="text-gray-600">© 2026 DinBoard.pl. Wszelkie prawa zastrzeżone.</span>
      </div>
    </footer>
  );
}
