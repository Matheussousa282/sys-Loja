
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Product, Customer, CartItem, ConsignmentSale, ConsignmentStatus, UserRole } from '../types';

interface ConsignmentPDVProps {
  onBack: () => void;
}

const ConsignmentPDV: React.FC<ConsignmentPDVProps> = ({ onBack }) => {
  const { products, customers, addConsignmentSale, currentUser, establishments } = useApp();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [observation, setObservation] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

  const filteredProducts = useMemo(() => {
    if (!search) return [];
    const lower = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.sku.toLowerCase().includes(lower) || 
      p.barcode?.includes(search)
    ).slice(0, 10);
  }, [search, products]);

  const subtotal = useMemo(() => cart.reduce((acc, i) => acc + (i.salePrice * i.quantity), 0), [cart]);
  const totalDiscount = useMemo(() => cart.reduce((acc, i) => acc + ((i.otherCostsPercent || 0) * i.quantity), 0), [cart]); // Reaproveitando campo para desconto por item no cart local
  const totalNet = subtotal - totalDiscount;

  const addToCart = (p: Product) => {
    if (p.stock <= 0 && !p.isService) { alert('Produto sem estoque disponível!'); return; }
    const existing = cart.find(i => i.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...p, quantity: 1, otherCostsPercent: 0 }]); // Reaproveitando otherCostsPercent para desconto monetário por item
    }
    setSearch('');
    searchInputRef.current?.focus();
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart(cart.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const updateItemDiscount = (id: string, discount: number) => {
    setCart(cart.map(i => i.id === id ? { ...i, otherCostsPercent: discount } : i));
  };

  const removeItem = (id: string) => setCart(cart.filter(i => i.id !== id));

  const handleFinalize = async () => {
    if (!selectedCustomerId) { alert('Selecione um cliente para continuar!'); return; }
    if (cart.length === 0) { alert('Carrinho vazio!'); return; }

    setIsFinalizing(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomerId)!;
      const sale: ConsignmentSale = {
        id: `CONS-${Date.now()}`,
        customerId: selectedCustomerId,
        customerName: customer.name,
        date: new Date().toISOString().split('T')[0],
        grossValue: subtotal,
        discount: totalDiscount,
        netValue: totalNet,
        paidValue: 0,
        balance: totalNet,
        status: ConsignmentStatus.OPEN,
        observation,
        items: cart,
        store: currentStore?.name || 'Matriz'
      };

      await addConsignmentSale(sale);
      alert('Venda consignada gerada com sucesso!');
      onBack();
    } catch (e) {
      alert('Erro ao finalizar venda.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-display animate-in slide-in-from-bottom-10 duration-500">
      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all"><span className="material-symbols-outlined">arrow_back</span></button>
           <div><h1 className="text-xl font-black uppercase tracking-tighter">Novo Consignado</h1><p className="text-[10px] font-black text-slate-400 uppercase">Frente de Caixa Balcão</p></div>
        </div>
        <div className="flex items-center gap-4 bg-slate-900 px-6 py-2.5 rounded-2xl text-white">
           <span className="material-symbols-outlined text-primary">store</span>
           <span className="text-[11px] font-black uppercase">{currentStore?.name}</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* LADO ESQUERDO: SELEÇÃO E ITENS */}
        <section className="flex-1 flex flex-col p-8 space-y-6 overflow-hidden">
           {/* CABEÇALHO DA VENDA */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cliente Solicitante <span className="text-rose-500">*</span></label>
                 <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full h-12 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 text-xs font-black uppercase shadow-sm">
                    <option value="">Selecione o Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Observação Interna</label>
                 <input value={observation} onChange={e => setObservation(e.target.value.toUpperCase())} placeholder="OPCIONAL..." className="w-full h-12 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 text-xs font-black uppercase shadow-sm" />
              </div>
           </div>

           {/* BUSCA DE PRODUTOS */}
           <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary"><span className="material-symbols-outlined text-3xl">barcode_scanner</span></div>
              <input 
                ref={searchInputRef}
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="BIPAR CÓDIGO OU BUSCAR POR NOME..." 
                className="w-full h-20 bg-white dark:bg-slate-900 border-none rounded-3xl pl-16 pr-6 text-xl font-black uppercase shadow-xl focus:ring-4 focus:ring-primary/10 transition-all" 
              />
              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                   {filteredProducts.map(p => (
                     <button key={p.id} onClick={() => addToCart(p)} className="w-full p-4 flex items-center justify-between hover:bg-primary hover:text-white transition-all group">
                        <div className="flex items-center gap-4">
                           <img src={p.image} className="size-10 rounded-xl object-cover" />
                           <div className="text-left">
                              <p className="text-xs font-black uppercase leading-none">{p.name}</p>
                              <p className="text-[9px] font-bold opacity-60 mt-1 uppercase">Estoque: {p.stock} {p.unit} | SKU: {p.sku}</p>
                           </div>
                        </div>
                        <span className="text-sm font-black tabular-nums">R$ {p.salePrice.toLocaleString('pt-BR')}</span>
                     </button>
                   ))}
                </div>
              )}
           </div>

           {/* LISTA DE ITENS NO CARRINHO */}
           <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-sm custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10"><tr className="border-b"><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Produto</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-center">Quantidade</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right">Unitário</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right">Desc. Unit</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right">Total Item</th><th className="px-8 py-5 w-16"></th></tr></thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {cart.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                         <td className="px-8 py-4">
                            <p className="text-xs font-black uppercase text-slate-800 dark:text-white">{item.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item.sku}</p>
                         </td>
                         <td className="px-8 py-4 text-center">
                            <div className="inline-flex items-center gap-3">
                               <button onClick={() => updateQty(item.id, item.quantity - 1)} className="size-8 bg-slate-100 rounded-lg text-slate-500"><span className="material-symbols-outlined text-sm">remove</span></button>
                               <span className="text-sm font-black w-8 text-center">{item.quantity}</span>
                               <button onClick={() => updateQty(item.id, item.quantity + 1)} className="size-8 bg-primary/10 text-primary rounded-lg"><span className="material-symbols-outlined text-sm">add</span></button>
                            </div>
                         </td>
                         <td className="px-8 py-4 text-right font-black text-xs tabular-nums">R$ {item.salePrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                         <td className="px-8 py-4 text-right">
                            <input 
                              type="number" 
                              value={item.otherCostsPercent || ''} 
                              onChange={e => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)} 
                              placeholder="0,00" 
                              className="w-20 h-9 bg-rose-500/5 border-none rounded-lg text-right text-xs font-black text-rose-500 focus:ring-1 focus:ring-rose-500" 
                            />
                         </td>
                         <td className="px-8 py-4 text-right font-black text-sm tabular-nums text-primary">
                            R$ {((item.salePrice - (item.otherCostsPercent || 0)) * item.quantity).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                         </td>
                         <td className="px-8 py-4 text-right">
                            <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                         </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr><td colSpan={6} className="py-20 text-center opacity-20 font-black text-[10px] tracking-widest uppercase">Carrinho vazio. BIPE os produtos para consignar.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </section>

        {/* LADO DIREITO: RESUMO E FINALIZAÇÃO */}
        <aside className="w-[450px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-10 flex flex-col space-y-10 shadow-2xl shrink-0">
           <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">Resumo Financeiro</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modalidade: Venda Consignada</p>
           </div>

           <div className="space-y-6">
              <div className="flex justify-between items-center text-slate-500"><span className="text-[11px] font-black uppercase tracking-widest">Total Bruto</span><span className="text-lg font-black tabular-nums">R$ {subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
              <div className="flex justify-between items-center text-rose-500"><span className="text-[11px] font-black uppercase tracking-widest">Total Descontos</span><span className="text-lg font-black tabular-nums">- R$ {totalDiscount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Líquido Estimado</p>
                 <h3 className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">R$ {totalNet.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
              </div>
           </div>

           <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 space-y-4">
              <div className="flex items-center gap-4">
                 <div className="size-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"><span className="material-symbols-outlined">info</span></div>
                 <p className="text-[10px] font-bold text-primary uppercase leading-relaxed">Ao finalizar, o estoque será reservado e um registro de Contas a Receber será criado no nome do cliente.</p>
              </div>
           </div>

           <div className="flex-1 flex flex-col justify-end">
              <button 
                onClick={handleFinalize}
                disabled={cart.length === 0 || !selectedCustomerId || isFinalizing}
                className="w-full py-7 bg-primary hover:bg-blue-600 disabled:opacity-30 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 transition-all active:scale-95"
              >
                {isFinalizing ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined text-2xl">verified_user</span>}
                {isFinalizing ? 'PROCESSANDO...' : 'FINALIZAR CONSIGNADO'}
              </button>
           </div>
        </aside>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default ConsignmentPDV;
