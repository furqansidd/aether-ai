import { Link } from 'react-router-dom'
import { Search, User, ArrowRight, Lock, Database, Network, MessageSquare, BarChart2, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#1f2937] font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-5 py-4 md:px-12 md:py-6">
        <div className="text-xl md:text-2xl font-bold text-[#5D4492]">Aether AI</div>
        
        <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-600">
          <a href="#" className="hover:text-[#5D4492] transition-colors">Home</a>
          <a href="#" className="hover:text-[#5D4492] transition-colors">Features</a>
          <a href="#" className="hover:text-[#5D4492] transition-colors">Integrations</a>
          <a href="#" className="hover:text-[#5D4492] transition-colors">Enterprise</a>
        </div>

        <div className="flex items-center space-x-3 md:space-x-6 text-gray-500">
          <button className="hover:text-[#5D4492] transition-colors">
            <Search size={18} />
          </button>
          {user ? (
            <Link 
              to="/dashboard" 
              className="bg-[#5D4492] text-white px-4 py-2 md:px-5 rounded-full text-sm font-semibold hover:bg-[#4a3675] transition-all"
            >
              Dashboard
            </Link>
          ) : (
            <Link 
              to="/auth" 
              className="text-sm font-semibold text-gray-700 hover:text-[#5D4492] transition-colors flex items-center gap-1 md:gap-2"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-5 md:px-12 mt-8 md:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
        
        <div className="space-y-5 md:space-y-8">
          {/* Pill */}
          <div className="inline-flex items-center space-x-2 bg-[#f0ecfc] text-[#5D4492] px-3 py-1 rounded-full text-sm font-medium">
            <span>⚡ v2.0 Now Live</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-gray-900">
            Your Data,<br />
            <span className="text-[#5D4492]">Conversational.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-lg">
            Aether AI bridges the gap between raw data and human intelligence. Built on LangChain and Supabase, we transform your static databases into living, breathing insights through natural language.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 md:pt-4">
            <Link 
              to={user ? "/dashboard" : "/auth"} 
              className="bg-[#5D4492] hover:bg-[#4a3675] text-white px-6 py-3 md:px-8 md:py-4 rounded-full font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-[#5D4492]/20"
            >
              <span>{user ? 'Open Dashboard' : 'Start Analyzing'}</span>
              <ArrowRight size={18} />
            </Link>
            <button className="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 md:px-8 md:py-4 rounded-full font-semibold transition-colors text-center">
              View Demo
            </button>
          </div>
        </div>

        {/* Hero Graphic - hidden on mobile, visible on lg+ */}
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-[#5D4492]/10 blur-3xl rounded-full translate-y-12 scale-110"></div>
          <img 
            src="/assets/hero_image.png" 
            alt="Data Intelligence Graphic" 
            className="relative z-10 w-full h-auto rounded-3xl shadow-2xl object-cover aspect-square border border-gray-100"
          />
        </div>
      </main>

      {/* Intelligence Built For Scale Section */}
      <section className="max-w-7xl mx-auto px-5 md:px-12 mt-16 md:mt-32 mb-10 md:mb-20">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Intelligence built for scale.</h2>
        <p className="text-gray-500 mb-8 md:mb-12">Seamlessly integrated with your modern data stack.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 mb-5 md:mb-6">
          {/* Natural Language Queries Card */}
          <div className="lg:col-span-2 bg-[#fcfcfc] border border-gray-100 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 shadow-sm relative overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="bg-[#f0ecfc] p-3 md:p-4 rounded-xl text-[#5D4492]">
                <MessageSquare size={24} />
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Natural Language Queries</h3>
            <p className="text-gray-600 max-w-xl mb-8 md:mb-12 text-sm md:text-base">
              Stop writing SQL. Just ask your data questions like "What was our highest growth month last year?" or "Forecast Q4 revenue based on current trends."
            </p>
            
            {/* Mock Chat Input */}
            <div className="bg-[#f5f5f7] rounded-2xl p-4 md:p-5 flex items-center gap-3 md:gap-4 border border-gray-200 mt-auto shadow-inner w-full max-w-2xl">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#5D4492] flex-shrink-0"></div>
               <p className="text-gray-600 text-xs md:text-sm font-medium">Show me regional sales performance...</p>
            </div>
          </div>

          {/* Automated Visualization Card */}
          <div className="bg-[#fcfcfc] border border-gray-100 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="bg-[#fef3c7] p-3 md:p-4 rounded-xl text-[#d97706]">
                <BarChart2 size={24} />
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Automated Visualization</h3>
            <p className="text-gray-600 mb-8 md:mb-12 text-sm md:text-base">
              Aether automatically selects the best chart type for your data, generating beautiful, interactive dashboards on the fly.
            </p>
            
            {/* Mock Chart Area */}
            <div className="mt-auto bg-gray-900 rounded-2xl h-32 md:h-40 w-full overflow-hidden relative shadow-lg">
               <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
               <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,80 Q10,70 20,75 T40,60 T60,80 T80,40 T100,50 L100,100 L0,100 Z" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                 <path d="M0,90 Q15,80 30,85 T50,70 T70,90 T90,50 T100,60 L100,100 L0,100 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
               </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Secure Data */}
          <div className="bg-[#fcfcfc] border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm flex items-center gap-4 md:gap-5">
             <div className="bg-[#f5f5f7] p-3 md:p-4 rounded-xl text-gray-600 flex-shrink-0">
               <Lock size={22} />
             </div>
             <div>
               <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest mb-1">Secure Data</h4>
               <p className="text-gray-500 text-sm">SOC2 Compliant storage.</p>
             </div>
          </div>
          
          {/* Supabase Ready */}
          <div className="bg-[#fcfcfc] border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm flex items-center gap-4 md:gap-5">
             <div className="bg-[#f0ecfc] p-3 md:p-4 rounded-xl text-[#5D4492] flex-shrink-0">
               <Database size={22} />
             </div>
             <div>
               <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest mb-1">Supabase Ready</h4>
               <p className="text-gray-500 text-sm">One-click sync.</p>
             </div>
          </div>
          
          {/* Langchain Powered */}
          <div className="bg-[#fcfcfc] border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm flex items-center gap-4 md:gap-5">
             <div className="bg-[#f5f5f7] p-3 md:p-4 rounded-xl text-gray-600 flex-shrink-0">
               <Network size={22} />
             </div>
             <div>
               <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest mb-1">Langchain Powered</h4>
               <p className="text-gray-500 text-sm">State-of-the-art LLM flows.</p>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-5 md:px-12 mb-12 md:mb-20">
        <div className="bg-gradient-to-br from-[#5D4492] to-[#422c7a] rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 lg:p-20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6 leading-tight">Ready to speak with your data?</h2>
            <p className="text-[#e0d4fc] text-base md:text-lg lg:text-xl mb-6 md:mb-10 max-w-xl leading-relaxed">
              Join 500+ data-driven teams using Aether to turn their data warehouses into knowledge engines.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Link to={user ? "/dashboard" : "/auth"} className="bg-white text-[#5D4492] px-6 py-3 md:px-8 md:py-4 rounded-full font-bold hover:bg-gray-50 transition-colors text-center">
                {user ? 'Go to Dashboard' : 'Get Started Free'}
              </Link>
              <button className="bg-white/10 border border-white/20 text-white px-6 py-3 md:px-8 md:py-4 rounded-full font-bold hover:bg-white/20 transition-colors backdrop-blur-sm">
                Contact Sales
              </button>
            </div>
          </div>
          
          {/* Abstract background graphics for CTA */}
          <div className="absolute right-0 top-0 bottom-0 w-2/3 opacity-30 pointer-events-none overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] rounded-full border-[40px] border-white/5 blur-3xl"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] rounded-full border-[20px] border-white/10 blur-xl"></div>
             <div className="absolute right-0 top-20 flex gap-4 rotate-45">
               <div className="w-1 h-32 bg-white/20 rounded-full blur-sm"></div>
               <div className="w-2 h-48 bg-[#9b7dd4]/40 rounded-full blur-md"></div>
               <div className="w-1 h-64 bg-white/20 rounded-full blur-sm"></div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#fcfcfc] border-t border-gray-100 pt-12 md:pt-20 pb-8 px-5 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-12 md:mb-20">
          <div className="col-span-2 pr-0 md:pr-8">
            <h3 className="text-xl md:text-2xl font-bold text-[#5D4492] mb-3 md:mb-4">Aether AI</h3>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">Defining the future of conversational data intelligence.</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-4 md:mb-6">Product</h4>
            <ul className="space-y-3 md:space-y-4 text-gray-500 text-sm font-medium">
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">API Docs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-4 md:mb-6">Company</h4>
            <ul className="space-y-3 md:space-y-4 text-gray-500 text-sm font-medium">
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">About</a></li>
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-4 md:mb-6">Support</h4>
            <ul className="space-y-3 md:space-y-4 text-gray-500 text-sm font-medium">
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">Status</a></li>
              <li><a href="#" className="hover:text-[#5D4492] transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-gray-400 text-xs pt-6 md:pt-8 border-t border-gray-100">
          <p className="mb-3 md:mb-0">© 2024 Aether AI Inc. All rights reserved.</p>
          <div className="flex gap-6">
             <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
             <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
