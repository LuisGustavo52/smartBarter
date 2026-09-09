import HubNav from "@/components/HubNav";
import HubNotifications from "@/components/HubNotifications";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAF9] text-gray-900 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* Barra de Navegação Global do Hub */}
      <div className="bg-[#0A1A14] text-white border-b border-emerald-900/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <HubNav />
          <HubNotifications />
        </div>
      </div>

      {/* Conteúdo específico da página */}
      <main>
        {children}
      </main>
    </div>
  );
}
