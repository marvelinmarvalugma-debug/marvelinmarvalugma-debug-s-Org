
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Cart } from './components/Cart';
import { AIAssistant } from './components/AIAssistant';
import { erpService } from './services/erpService';
import { Product, CartItem, Order, Customer, SqlQueryLog, BridgeConfig } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<SqlQueryLog[]>([]);
  const [latency, setLatency] = useState<string | null>(null);
  
  const [bridge, setBridge] = useState<BridgeConfig>(() => {
    const saved = localStorage.getItem('erp_bridge_config');
    return saved ? JSON.parse(saved) : { baseUrl: 'http://localhost:3000', status: 'disconnected' };
  });

  const [connectionError, setConnectionError] = useState<{title: string, msg: string} | null>(null);

  useEffect(() => {
    localStorage.setItem('erp_bridge_config', JSON.stringify(bridge));
  }, [bridge]);

  const connectToBridge = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);
    setLatency(null);
    setBridge(prev => ({ ...prev, status: 'checking' }));

    try {
      // 1. Probar Salud del Bridge y SQL Remoto
      const res = await fetch(`${bridge.baseUrl}/health`, { 
        method: 'GET',
        mode: 'cors'
      });
      
      if (res.ok) {
        const data = await res.json();
        setBridge(prev => ({ ...prev, status: 'connected' }));
        setLatency(data.latency);
        
        // 2. Cargar datos iniciales
        const [p, c] = await Promise.all([
          erpService.getProducts(bridge.baseUrl),
          erpService.getCustomers(bridge.baseUrl)
        ]);
        setProducts(p);
        setCustomers(c);
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Site4Now rechazó la conexión.");
      }
    } catch (err: any) {
      setBridge(prev => ({ ...prev, status: 'disconnected' }));
      setConnectionError({
        title: "Fallo de Conexión SQL",
        msg: err.message === 'Failed to fetch' 
          ? "El Bridge local no responde. ¿Ejecutaste 'node server.js'?" 
          : err.message
      });
    } finally {
      setLoading(false);
      setLogs(erpService.getLogs());
    }
  }, [bridge.baseUrl]);

  useEffect(() => {
    // Intento inicial
    connectToBridge();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleCheckout = async () => {
    if (!selectedCustomer) return alert("Seleccione un cliente para continuar");
    setIsProcessing(true);
    try {
      const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
      const res = await erpService.createOrder(
        { customerId: selectedCustomer.id, customerName: selectedCustomer.name, items: cart, total },
        bridge.baseUrl
      );
      setOrders(prev => [res, ...prev]);
      setCart([]);
      setIsCartOpen(false);
      alert("¡Pedido sincronizado en Site4Now correctamente!");
    } catch (e: any) {
      alert(`Error SQL: ${e.message}`);
    } finally {
      setIsProcessing(false);
      setLogs(erpService.getLogs());
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
      toggleCart={() => setIsCartOpen(!isCartOpen)}
      connectionStatus={bridge.status}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        
        {connectionError && activeTab !== 'settings' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-4">
              <div className="text-red-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h4 className="font-black text-red-900 uppercase text-[10px] tracking-widest">{connectionError.title}</h4>
                <p className="text-sm text-red-700">{connectionError.msg}</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('settings')} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-red-700 transition-all">CONFIGURAR SQL</button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6 py-4">
            <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Estado del Enlace Remoto</h2>
                    <p className="text-slate-500 text-sm">Prueba de conectividad con SQL5113.site4now.net</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${bridge.status === 'connected' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {bridge.status === 'connected' ? '● SQL Online' : '○ Desconectado'}
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Puerto de Puente Local</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={bridge.baseUrl}
                        onChange={(e) => setBridge(prev => ({ ...prev, baseUrl: e.target.value }))}
                        className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-mono text-sm focus:border-blue-500 outline-none"
                      />
                      <button 
                        onClick={connectToBridge}
                        disabled={loading}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading && <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                        {loading ? 'Probando...' : 'Re-Probar Conexión'}
                      </button>
                    </div>
                    {latency && (
                      <div className="mt-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Latencia Site4Now: {latency}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 border border-slate-100 rounded-2xl bg-white flex flex-col justify-between">
                       <div>
                         <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest mb-1 text-slate-400">Servidor</h5>
                         <p className="text-xs text-slate-700 font-mono font-bold truncate">SQL5113.site4now.net</p>
                       </div>
                       <div className="mt-3 flex items-center gap-1 text-[9px] text-green-600 font-bold uppercase">
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                         Mínima Latencia
                       </div>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-white flex flex-col justify-between">
                       <div>
                         <h5 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest mb-1 text-slate-400">Database</h5>
                         <p className="text-xs text-slate-700 font-mono font-bold truncate">...enterpriseadmindb</p>
                       </div>
                       <div className="mt-3 flex items-center gap-1 text-[9px] text-blue-600 font-bold uppercase">
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                         Tablas Mapeadas
                       </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-[24px] text-white">
                    <h5 className="font-black text-[10px] uppercase mb-4 text-blue-400 tracking-widest">Logs de comunicación SQL</h5>
                    <div className="space-y-3 font-mono text-[10px] max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {logs.length > 0 ? logs.map((log, i) => (
                        <div key={i} className="flex gap-3 border-b border-white/5 pb-2">
                          <span className="text-white/30">[{log.timestamp}]</span>
                          <span className={log.type === 'ERROR' ? 'text-red-400' : 'text-green-400'}>{log.type}</span>
                          <span className="text-white/60 truncate">{log.query}</span>
                        </div>
                      )) : (
                        <p className="text-white/20 italic">No hay actividad registrada...</p>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                 <div className="flex-1 min-w-[300px] bg-slate-50 border-2 border-transparent focus-within:border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3 transition-all">
                   <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   <input 
                    type="text" 
                    placeholder="Buscar en el catálogo SQL..."
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
                 
                 <div className="flex gap-3 w-full md:w-auto">
                   <select 
                      className="bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-xs font-black text-slate-600 outline-none flex-1 md:flex-none"
                      value={selectedCustomer?.id || ''}
                      onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
                   >
                      <option value="">-- SELECCIONAR CLIENTE --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <button 
                    onClick={connectToBridge}
                    title="Sincronizar con SQL"
                    className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                   >
                    <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                   </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <div key={p.id} className="bg-white rounded-[24px] border border-slate-100 overflow-hidden hover:shadow-xl transition-all group flex flex-col h-full hover:-translate-y-1">
                    <div className="p-6 space-y-4 flex-1">
                       <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{p.code}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${p.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {p.stock > 0 ? 'EN STOCK' : 'AGOTADO'}
                            </span>
                          </div>
                          <h3 className="font-black text-slate-800 text-sm leading-tight uppercase line-clamp-2 h-10">{p.name}</h3>
                          <div className="flex items-center justify-between mt-4 bg-slate-50 p-3 rounded-xl">
                             <span className="text-xl font-black text-slate-900">${p.price.toFixed(2)}</span>
                             <div className="text-[10px] font-bold text-slate-500">Disp: <span className="text-slate-900">{p.stock}</span></div>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => addToCart(p)}
                      disabled={p.stock <= 0}
                      className="w-full bg-slate-900 text-white py-4 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-colors disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      Añadir al Pedido
                    </button>
                  </div>
                ))}
                {products.length === 0 && !loading && (
                   <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                      <div className="mb-4 text-slate-200">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin respuesta de SQL Remoto</p>
                      <button onClick={connectToBridge} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase hover:bg-blue-700 transition-all">Sincronizar Ahora</button>
                   </div>
                )}
              </div>
            </div>

            <div className="hidden lg:block">
               <div className="sticky top-24 space-y-6">
                 <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b pb-4">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad Reciente</div>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {logs.slice(0, 10).map((log, i) => (
                        <div key={i} className="text-[9px] border-l-2 border-slate-100 pl-3 py-1">
                          <div className="flex justify-between font-bold mb-1">
                            <span className={log.type === 'ERROR' ? 'text-red-500' : 'text-blue-500'}>{log.type}</span>
                            <span className="text-slate-300">{log.timestamp}</span>
                          </div>
                          <p className="text-slate-600 line-clamp-1 italic">{log.query}</p>
                        </div>
                      ))}
                      {logs.length === 0 && <p className="text-center text-slate-300 text-[10px] py-10">Esperando queries...</p>}
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-6 text-white shadow-lg shadow-blue-200">
                    <h4 className="font-black text-xs uppercase tracking-widest mb-2">Tip de Conexión</h4>
                    <p className="text-[11px] text-blue-100 leading-relaxed">
                      Si Site4Now da error de "Timeout", asegúrate de que el puerto 1433 esté abierto para tu IP pública en el panel de Site4Now.
                    </p>
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
           <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Pedidos Sincronizados</h2>
                   <p className="text-sm text-slate-500 mt-1">Historial de transacciones insertadas en Site4Now (safact)</p>
                 </div>
                 <div className="bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100 text-[10px] font-black text-slate-400">
                   TOTAL: {orders.length}
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                       <tr>
                          <th className="px-8 py-5">Número Pedido</th>
                          <th className="px-8 py-5">Cliente SQL</th>
                          <th className="px-8 py-5 text-right">Monto (Base)</th>
                          <th className="px-8 py-5 text-center">Estatus SQL</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {orders.map(order => (
                         <tr key={order.id} className="text-sm hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6 font-mono font-bold text-blue-600 tracking-tighter text-base">{order.id}</td>
                            <td className="px-8 py-6">
                              <div className="font-bold text-slate-800">{order.customerName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{order.customerId}</div>
                            </td>
                            <td className="px-8 py-6 text-right font-black text-slate-900 text-base">${order.total.toFixed(2)}</td>
                            <td className="px-8 py-6 text-center">
                               <div className="flex items-center justify-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                 <span className="text-[10px] font-black uppercase text-green-700 tracking-tighter">Insertado OK</span>
                               </div>
                            </td>
                         </tr>
                       ))}
                       {orders.length === 0 && (
                         <tr>
                            <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                              No hay pedidos recientes sincronizados
                            </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

      </div>

      <Cart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cart}
        onRemove={(id) => setCart(prev => prev.filter(i => i.id !== id))}
        onUpdateQty={(id, qty) => setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))}
        onCheckout={handleCheckout}
        isProcessing={isProcessing}
      />

      <AIAssistant products={products} cart={cart} onAddToCart={addToCart} />
    </Layout>
  );
};

export default App;
