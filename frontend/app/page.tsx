import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1A14] flex flex-col justify-center items-center text-center selection:bg-emerald-500/30 selection:text-emerald-100 relative overflow-hidden">
      
      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 pointer-events-none">
        <div className="w-[800px] h-[800px] bg-emerald-900/30 rounded-full blur-[120px]"></div>
      </div>
      
      <div className="relative z-10 max-w-4xl px-6 flex flex-col items-center">
        
        {/* Badge Status */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/30 border border-emerald-700/50 mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
          <span className="text-emerald-300 text-xs font-bold tracking-widest uppercase">Smart Barter MVP • Online</span>
        </div>
        
        {/* Título Hero */}
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
          O Futuro do <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Agronegócio</span> na Web3
        </h1>
        
        {/* Subtítulo / Proposta de Valor */}
        <p className="text-lg md:text-xl text-emerald-100/70 mb-12 max-w-2xl mx-auto leading-relaxed">
          A ponte direta entre o campo e a blockchain. Tokenize suas safras em <strong>Cédulas de Produto Rural (CPR)</strong> digitais e negocie com segurança criptográfica absoluta.
        </p>
        
        {/* Call to Action (Joga para o Onboarding) */}
        <Link 
          href="/cadastro" 
          className="group relative inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 px-10 rounded-2xl shadow-2xl shadow-emerald-900/50 transition-all hover:scale-105 hover:-translate-y-1"
        >
          <span className="text-lg tracking-wide">Acessar Plataforma</span>
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          
          {/* Brilho decorativo no botão */}
          <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></div>
        </Link>

        {/* Informação adicional para a banca do TCC */}
        <p className="mt-16 text-emerald-800 text-sm font-medium uppercase tracking-widest">
          Projeto de TCC • Engenharia de Software
        </p>
      </div>
    </div>
  );
}
