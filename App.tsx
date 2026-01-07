
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
      const res = await fetch(`${bridge.baseUrl}/health`, { 
        method: 'GET',
        mode: 'cors'
      });
      
      if (res.ok) {
        const data = await res.json();
        setBridge(prev => ({ ...prev, status: 'connected' }));
        setLatency(data.latency);
        
        const [p, c] = await Promise.all([
          erpService.getProducts(bridge.baseUrl),
          erpService.getCustomers(bridge.baseUrl)
        ]);
        setProducts(p);
        setCustomers(c);
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Error en el servidor bridge");
      }
    } catch (err: any) {
      setBridge(prev => ({ ...prev, status: 'disconnected' }));
      setConnectionError({
        title: "Error de Enlace SQL",
        msg: err.message || "No se pudo contactar con el Bridge local."
      });
    } finally {
      setLoading(false);
      setLogs(erpService.getLogs());
    }
  }, [bridge.baseUrl]);

  useEffect(() => {
    if (bridge.status === 'connected') connectToBridge();
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
      alert("Pedido sincronizado en Site4Now");
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
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-red-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h4 className="font-black text-red-900 uppercase text-[10px] tracking-widest">{connectionError.title}</h4>
                <p className="text-sm text-red-700">{connectionError.msg}</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('settings')} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-red-700 transition-all">REVISAR CONEXIÓN</button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6 py-4">
            <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Enlace Site4Now</h2>
                    <p className="text-slate-500 text-sm">Gestiona la comunicación con SQL Server Remoto</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${bridge.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {bridge.status === 'connected' ? '● En Línea' : '○ Desconectado'}
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Dirección Local del Bridge (Port 3000)</label>
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
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-blue-600 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Verificando...' : 'Probar'}
                      </button>
                    </div>
                    {latency && (
                      <div className="mt-3 text-[10px] font-bold text-blue-600 uppercase">
                        Latencia de respuesta: {latency}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 border border-slate-100 rounded-2xl bg-white">
                       <h5 className="font-bold text-slate-800 text-xs mb-2">Servidor Remoto</h5>
                       <p className="text-xs text-slate-500 font-mono">SQL5113.site4now.net</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-white">
                       <h5 className="font-bold text-slate-800 text-xs mb-2">Base de Datos</h5>
                       <p className="text-xs text-slate-500 font-mono">db_ac3772_enterpriseadmindb</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                    <h5 className="font-black text-amber-900 text-[10px] uppercase mb-2">Checklist de Solución</h5>
                    <ul className="text-xs text-amber-700 space-y-2 list-disc pl-4">
                      <li>¿El archivo <b>server.js</b> está ejecutándose en tu PC?</li>
                      <li>¿Activaste <b>"Contenido no seguro"</b> en el candado de la URL?</li>
                      <li>Prueba abrir <a href={`${bridge.baseUrl}/health`} target="_blank" className="underline font-bold">esta URL</a> manualmente.</li>
                    </ul>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
                 <div className="flex-1 bg-slate-50 border-2 border-transparent focus-within:border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3 transition-all">
                   <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   <input 
                    type="text" 
                    placeholder="Filtrar productos de SQL Remoto..."
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
                 <select 
                    className="bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-xs font-black text-slate-600 outline-none w-full md:w-auto"
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
                 >
                    <option value="">SELECCIONAR CLIENTE</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <div key={p.id} className="bg-white rounded-[24px] border border-slate-100 overflow-hidden hover:shadow-xl transition-all group flex flex-col h-full">
                    <div className="p-6 space-y-4 flex-1">
                       <div>
                          <div className="text-[10px] font-black text-blue-500 uppercase mb-1 tracking-tighter">{p.code}</div>
                          <h3 className="font-black text-slate-800 text-sm leading-tight uppercase line-clamp-2 h-10">{p.name}</h3>
                          <div className="flex items-center justify-between mt-4">
                             <span className="text-2xl font-black text-slate-900">${p.price.toFixed(2)}</span>
                             <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500">Stock: {p.stock}</div>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => addToCart(p)}
                      className="w-full bg-slate-900 text-white py-4 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-colors"
                    >
                      Añadir al Pedido
                    </button>
                  </div>
                ))}
                {products.length === 0 && !loading && (
                   <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin conexión con Site4Now</p>
                      <button onClick={connectToBridge} className="mt-4 text-blue-600 font-black text-xs hover:underline">Intentar Reconectar</button>
                   </div>
                )}
              </div>
            </div>

            <div className="hidden lg:block">
               <div className="sticky top-24 bg-white rounded-[32px] p-6 h-[500px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-4">Actividad SQL</div>
                  <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[9px]">
                    {logs.map((log, i) => (
                      <div key={i} className="p-2 bg-slate-50 rounded-lg">
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span className={log.type === 'ERROR' ? 'text-red-500' : 'text-blue-500'}>{log.type}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <p className="text-slate-700 break-all">{log.query}</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
           <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                 <h2 className="text-xl font-black text-slate-800">Sincronización Histórica</h2>
                 <p className="text-sm text-slate-500">Pedidos registrados en SQL Server Site4Now</p>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-8 py-4">ID</th>
                          <th className="px-8 py-4">Cliente</th>
                          <th className="px-8 py-4 text-right">Monto</th>
                          <th className="px-8 py-4 text-center">Estado</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {orders.map(order => (
                         <tr key={order.id} className="text-sm">
                            <td className="px-8 py-6 font-mono font-bold text-blue-600">{order.id}</td>
                            <td className="px-8 py-6 font-bold text-slate-700">{order.customerName}</td>
                            <td className="px-8 py-6 text-right font-black">${order.total.toFixed(2)}</td>
                            <td className="px-8 py-6 text-center">
                               <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">Sincronizado</span>
                            </td>
                         </tr>
                       ))}
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
