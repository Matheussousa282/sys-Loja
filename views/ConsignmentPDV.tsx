
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Product, CartItem, ConsignmentSale, ConsignmentStatus, UserRole } from '../types';

interface ConsignmentPDVProps { onBack: () => void; }

const ConsignmentPDV: React.FC<ConsignmentPDVProps> = ({ onBack }) => {
  const { products, customers, users, addConsignmentSale, currentUser, establishments } = useApp();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(currentUser?.id || '');
  const [observation, setObservation] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [dueDate, setDueDate] = useState('');
  
  // Controle de Desconto Global
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'VALUE' | 'PERCENT'>('VALUE');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentStore = useMemo(() => establishments.find(e => e.id === currentUser?.storeId), [establishments, currentUser]);
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const vendors = useMemo(() => users.filter(u => isAdmin || u.storeId === currentUser?.storeId), [users, isAdmin, currentUser]);

  const subtotal = useMemo(() => cart.reduce((acc, i) => acc + (i.salePrice * i.quantity), 0), [cart]);
  
  const discountCalc = useMemo(() => {
    if (discountType === 'PERCENT') return (subtotal * (globalDiscount / 100));
    return globalDiscount;
  }, [subtotal, globalDiscount, discountType]);
  
  const totalNet = Math.max(0, subtotal - discountCalc);

  const filteredProducts = useMemo(() => {
    if (!search) return [];
    const low = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(low) || 
      p.sku.toLowerCase().includes(low) || 
      p.barcode?.includes(search)
    ).slice(0, 8);
  }, [search, products]);

  const addToCart = (p: Product) => {
    const existing = cart.find(i => i.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...p, quantity: 1 }]);
    }
    setSearch('');
    searchInputRef.current?.focus();
  };

  const handleFinalize = async () => {
    if (!selectedCustomerId) { alert('Selecione um cliente!'); return; }
    if (cart.length === 0) { alert('A cesta está vazia!'); return; }

    setIsFinalizing(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomerId)!;
      const sale: ConsignmentSale = {
        id: `CONS-${Date.now()}`,
        customerId: selectedCustomerId,
        customerName: customer.name,
        vendorId: selectedVendorId,
        date: new Date().toISOString().split('T')[0],
        grossValue: subtotal,
        discount: discountCalc,
        netValue: totalNet,
        paidValue: 0,
        balance: totalNet,
        status: ConsignmentStatus.OPEN,
        observation: observation.toUpperCase(),
        items: cart,
        store: currentStore?.name || 'UNIDADE NÃO IDENTIFICADA'
      };

      await addConsignmentSale(sale);
      onBack();
    } catch (e) {
      alert('Erro ao gravar consignado.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100 font-display flex flex-col overflow-hidden">
      {/* HEADER AZUL - CONFORME IMAGEM */}
      <header className="bg-primary p-4 flex justify-between items-center shadow-2xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2 rounded-lg">
            <span className="material-symbols-outlined text-3xl text-white">description</span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight leading-none text-white">Inclusão de Pré-Pedido Consignado</h1>
            <p className="text-[9px] font-bold text-white/70 mt-1 uppercase tracking-widest">Terminal de Lançamento de Balcão</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleFinalize} disabled={isFinalizing} className="bg-[#00c985] hover:bg-[#00b377] text-slate-900 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
            {isFinalizing ? <span className="size-3 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-sm">check_circle</span>}
            Gravar (F1)
          </button>
          <button onClick={onBack} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg">
            <span className="material-symbols-outlined text-sm">cancel</span> Cancelar (ESC)
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* SEÇÃO 1: DADOS GERAIS */}
        <section className="bg-[#101822] rounded-2xl border border-slate-800/50 overflow-hidden shadow-sm">
           <div className="bg-slate-800/30 px-6 py-3 border-b border-slate-800/50 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dados Gerais do Movimento (ALT+1)</h3>
              <span className="material-symbols-outlined text-slate-600 text-sm">expand_more</span>
           </div>
           <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">ID Pedido:</label>
                 <input disabled value="AUTO-GERADO" className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-bold text-slate-600 uppercase" />
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Data Emissão:</label>
                 <input disabled value={new Date().toLocaleDateString('pt-BR')} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-bold text-slate-400" />
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Unidade Operacional:</label>
                 <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-sm">store</span>
                    <input disabled value={currentStore?.name || 'UNIDADE NÃO IDENTIFICADA'} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl pl-10 pr-4 text-[9px] font-black text-primary uppercase" />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Pagamento:</label>
                 <select className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-black uppercase text-slate-300 outline-none focus:border-primary">
                    <option>CONSIGNADO</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Data Acerto:</label>
                 <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-bold text-slate-300 outline-none focus:border-primary" />
              </div>
              <div className="md:col-span-5 space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Observações do Consignado:</label>
                 <input value={observation} onChange={e => setObservation(e.target.value)} placeholder="DIGITE INFORMAÇÕES ADICIONAIS RELEVANTES..." className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-bold text-slate-300 uppercase outline-none focus:border-primary" />
              </div>
           </div>
        </section>

        {/* SEÇÃO 2: VÍNCULO CLIENTE E COLABORADOR */}
        <section className="bg-[#101822] rounded-2xl border border-slate-800/50 overflow-hidden shadow-sm">
           <div className="bg-slate-800/30 px-6 py-3 border-b border-slate-800/50 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vínculo de Cliente e Colaborador (ALT+2)</h3>
              <span className="material-symbols-outlined text-slate-600 text-sm">expand_more</span>
           </div>
           <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Cliente Solicitante <span className="text-rose-500">*</span></label>
                 <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-black text-slate-300 uppercase outline-none focus:border-primary">
                    <option value="">SELECIONE O CLIENTE NA BASE...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Vendedor / Atendente <span className="text-rose-500">*</span></label>
                 <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full h-11 bg-[#0b1118] border border-slate-800 rounded-xl px-4 text-[10px] font-black text-slate-300 uppercase outline-none focus:border-primary">
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                 </select>
              </div>
           </div>
        </section>

        {/* SEÇÃO 3: CESTA DE ITENS */}
        <section className="bg-[#101822] rounded-2xl border border-slate-800/50 overflow-hidden shadow-sm flex flex-col min-h-[400px]">
           <div className="bg-slate-800/30 px-6 py-4 border-b border-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-6">
                 <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Cesta de Itens Consignados</h3>
                 <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all">
                    <span className="material-symbols-outlined text-sm">search</span>
                    Adicionar Produto (F4)
                 </button>
              </div>
              <div className="flex items-center gap-2">
                 <span className="size-2 bg-[#00c985] rounded-full"></span>
                 <span className="text-[9px] font-black text-slate-500 uppercase">F4 para pesquisa</span>
              </div>
           </div>
           
           <div className="p-6 space-y-6 flex-1 flex flex-col">
              {/* BUSCA */}
              <div className="relative">
                 <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">barcode_scanner</span>
                 <input 
                   ref={searchInputRef}
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   placeholder="Bipe o código ou digite o nome do item..." 
                   className="w-full h-14 bg-[#0b1118] border border-slate-800 rounded-xl pl-14 pr-6 text-[11px] font-black text-slate-300 uppercase outline-none focus:border-primary/50 transition-all" 
                 />
                 
                 {filteredProducts.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-[#101822] border border-slate-700 shadow-2xl rounded-xl overflow-hidden z-50">
                      {filteredProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="w-full p-4 flex items-center justify-between hover:bg-primary transition-all border-b border-slate-800 last:border-none group text-left">
                           <div className="flex items-center gap-3">
                              <img src={p.image} className="size-8 rounded-lg object-cover" />
                              <div><p className="text-[10px] font-black uppercase">{p.name}</p><p className="text-[8px] text-slate-500 group-hover:text-white/70">SKU: {p.sku} | STOCK: {p.stock}</p></div>
                           </div>
                           <span className="text-xs font-black">R$ {p.salePrice.toLocaleString('pt-BR')}</span>
                        </button>
                      ))}
                   </div>
                 )}
              </div>

              {/* TABELA DE ITENS */}
              <div className="flex-1 overflow-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                          <th className="px-4 py-4 w-1/3">Item / Modelo</th>
                          <th className="px-4 py-4 text-center">Un</th>
                          <th className="px-4 py-4 text-right">Venda Unit.</th>
                          <th className="px-4 py-4 text-center">Quantidade</th>
                          <th className="px-4 py-4 text-right">Desconto Un.</th>
                          <th className="px-4 py-4 text-right">Total Item</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                       {cart.map((item, idx) => (
                         <tr key={idx} className="group hover:bg-slate-800/20 text-[10px] font-bold text-slate-300">
                            <td className="px-4 py-4 uppercase">
                               <div className="flex justify-between items-center">
                                  <span>{item.name}</span>
                                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-sm">delete</span></button>
                               </div>
                            </td>
                            <td className="px-4 py-4 text-center uppercase text-slate-500">{item.unit || 'UN'}</td>
                            <td className="px-4 py-4 text-right tabular-nums">R$ {item.salePrice.toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-4 text-center">
                               <div className="flex items-center justify-center gap-3">
                                  <button onClick={() => setCart(cart.map((i, ix) => ix === idx ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="size-6 bg-slate-800 rounded flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all">-</button>
                                  <span className="tabular-nums w-4">{item.quantity}</span>
                                  <button onClick={() => setCart(cart.map((i, ix) => ix === idx ? { ...i, quantity: i.quantity + 1 } : i))} className="size-6 bg-slate-800 rounded flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all">+</button>
                               </div>
                            </td>
                            <td className="px-4 py-4 text-right text-rose-500">R$ 0,00</td>
                            <td className="px-4 py-4 text-right text-primary font-black tabular-nums">R$ {(item.quantity * item.salePrice).toLocaleString('pt-BR')}</td>
                         </tr>
                       ))}
                       {cart.length === 0 && (
                         <tr><td colSpan={6} className="py-32 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.3em]">Aguardando inserção de produtos...</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* RODAPÉ DE CÁLCULO E DESCONTO GERAL */}
           <div className="bg-slate-900/50 p-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
              <div className="space-y-4">
                 <div className="flex items-center gap-3 text-rose-500 mb-2">
                    <span className="material-symbols-outlined">local_offer</span>
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Desconto Geral no Pedido</h4>
                 </div>
                 <div className="flex gap-2">
                    <div className="flex-1 relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 font-black text-xs">{discountType === 'VALUE' ? 'R$' : '%'}</span>
                       <input 
                         type="number" 
                         value={globalDiscount || ''} 
                         onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)} 
                         className="w-full h-12 bg-[#0b1118] border border-slate-800 rounded-xl pl-10 pr-4 text-sm font-black text-rose-500 focus:border-rose-500/50 outline-none" 
                         placeholder="0,00"
                       />
                    </div>
                    <button 
                      onClick={() => setDiscountType(discountType === 'VALUE' ? 'PERCENT' : 'VALUE')}
                      className="px-4 bg-slate-800 rounded-xl text-[9px] font-black uppercase hover:bg-slate-700 transition-all border border-slate-700"
                    >
                      {discountType === 'VALUE' ? 'Real' : 'Perc'}
                    </button>
                 </div>
              </div>

              <div className="flex flex-col items-center md:items-end justify-center">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Subtotal Bruto:</p>
                 <p className="text-xl font-black text-slate-300 tabular-nums">R$ {subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                 <p className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest mt-2">Desconto Aplicado (-):</p>
                 <p className="text-sm font-black text-rose-500 tabular-nums">R$ {discountCalc.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20 flex flex-col items-center justify-center">
                 <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-2">Total Líquido do Pré-Pedido</p>
                 <h2 className="text-5xl font-black text-white tabular-nums tracking-tighter">R$ {totalNet.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
              </div>
           </div>
        </section>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default ConsignmentPDV;
