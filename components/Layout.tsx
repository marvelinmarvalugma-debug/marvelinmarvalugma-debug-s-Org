
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  toggleCart: () => void;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, cartCount, toggleCart, connectionStatus }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-blue-400">ERP Connect</h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">SQL Bridge Edition</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'catalog', label: 'Catálogo', icon: 'M4 6h16M4 12h16M4 18h16' },
            { id: 'history', label: 'Pedidos', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'settings', label: 'Config SQL', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${activeTab === item.id ? 'bg-blue-600 shadow-lg shadow-blue-900/20 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-300">
                {connectionStatus === 'connected' ? 'SQL ONLINE' : 'SQL OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
             <h2 className="text-lg font-bold text-slate-800 tracking-tight">
               {activeTab === 'catalog' ? 'Terminal de Ventas' : activeTab === 'history' ? 'Historial Sincronizado' : 'Configuración de Puente SQL'}
             </h2>
          </div>
          
          <button 
            onClick={toggleCart}
            className="relative p-2.5 text-slate-600 hover:text-blue-600 transition-all bg-slate-100 hover:bg-blue-50 rounded-xl border border-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};
