
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Product, Customer, CartItem, ConsignmentSale, ConsignmentStatus, UserRole, User } from '../types';

interface ConsignmentPDVProps {
  onBack: () => void;
}

const ConsignmentPDV: React.FC<ConsignmentPDVProps> = ({ onBack }) => {
  const { products, customers, users, addConsignmentSale, currentUser, establishments } = useApp();
  
  // Identifica a unidade do operador logado
  const currentStore = useMemo(() => 
    establishments.find(e => e.id === currentUser?.storeId), 
  [establishments, currentUser]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(currentUser?.id || ''); // Vendedor padrão é o operador logado
  const [observation, setObservation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Consignado');
  const [closingDate, setClosingDate] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const vendors = useMemo(() => users.filter(u => isAdmin || u.storeId === currentUser?.storeId), [users, isAdmin, currentUser]);

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
  const totalDiscount = useMemo(() => cart.reduce((acc, i) => acc + ((i.otherCostsPercent || 0) * i.quantity), 0), [cart]);
  const totalNet = subtotal - totalDiscount;

  const addToCart = (p: Product) => {
    if (p.stock <= 0 && !p.isService) { alert('Produto sem estoque disponível!'); return; }
    const existing = cart.find(i => i.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...p, quantity: 1, otherCostsPercent: 0 }]);
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
    if (!selectedCustomerId) { alert('Selecione um cliente!'); return; }
    if (!selectedVendorId) { alert('Selecione um vendedor!'); return; }
    if (cart.length === 0) { alert('Carrinho vazio!'); return; }

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
        discount: totalDiscount,
        netValue: totalNet,
        paidValue: 0,
        balance: totalNet,
        status: ConsignmentStatus.OPEN,
        observation: observation + (closingDate ? ` | DATA FECHAMENTO: ${closingDate}` : ''),
        items: cart,
        store: currentStore?.name || 'Matriz'
      };

      await addConsignmentSale(sale);
      onBack();
    } catch (e) {
      alert('Erro ao finalizar.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-[#0b1118] overflow-hidden animate-in fade-in duration-500 font-sans">
      {/* BARRA SUPERIOR AZUL */}
      <header className="bg-primary text-white p-4 flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-4">
           <div className="bg-white/20 p-2.5 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-2xl">inventory</span></div>
           <div>
              <h1 className="text-sm font-black uppercase tracking-tight leading-none">Inclusão de Pré-Pedido Consignado</h1>
              <p className="text-[9px] font-bold opacity-70 mt-1 uppercase tracking-widest">Terminal de Lançamento de Balcão</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={handleFinalize} disabled={isFinalizing} className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-md active:scale-95">
             <span className="material-symbols-outlined text-sm">check_circle</span> {isFinalizing ? 'GRAVANDO...' : 'GRAVAR (F1)'}
           </button>
           <button onClick={onBack} className="bg-rose-500 hover:bg-rose-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-md active:scale-95">
             <span className="material-symbols-outlined text-sm">cancel</span> CANCELAR (ESC)
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
        
        {/* BLOCO 1: DADOS DO PRÉ-PEDIDO */}
        <Section title="Dados Gerais do Movimento (Alt+1)">
           <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5">
              <Input label="ID PEDIDO" value="AUTO-GERADO" disabled className="lg:col-span-2" />
              <Input label="DATA EMISSÃO" type="date" value={new Date().toISOString().split('T')[0]} disabled className="lg:col-span-2" />
              
              <div className="lg:col-span-4 space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">UNIDADE OPERACIONAL:</label>
                 <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-black text-primary flex items-center uppercase">
                    <span className="material-symbols-outlined text-sm mr-2">store</span>
                    {currentStore?.name || 'UNIDADE NÃO IDENTIFICADA'}
                 </div>
              </div>

              <div className="lg:col-span-2 space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">PAGAMENTO:</label>
                 <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-[11px] font-black text-slate-900 dark:text-white uppercase outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="Consignado">CONSIGNADO</option>
                    <option value="Crediario">CREDIÁRIO</option>
                 </select>
              </div>

              <div className="lg:col-span-2 space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">DATA ACERTO:</label>
                 <input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-[11px] font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              <div className="col-span-12 space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">OBSERVAÇÕES DO CONSIGNADO:</label>
                 <input 
                   value={observation} 
                   onChange={e => setObservation(e.target.value.toUpperCase())} 
                   className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-[11px] font-black text-slate-900 dark:text-white uppercase outline-none focus:ring-2 focus:ring-primary/20" 
                   placeholder="DIGITE INFORMAÇÕES ADICIONAIS RELEVANTES..." 
                 />
              </div>
           </div>
        </Section>

        {/* BLOCO 2: CLIENTE E VENDEDOR */}
        <Section title="Vínculo de Cliente e Colaborador (Alt+2)">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">CLIENTE SOLICITANTE <span className="text-rose-500">*</span></label>
                 <select 
                   value={selectedCustomerId} 
                   onChange={e => setSelectedCustomerId(e.target.value)} 
                   className="w-full h-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 text-[12px] font-black text-slate-900 dark:text-white uppercase shadow-sm focus:ring-2 focus:ring-primary transition-all outline-none"
                 >
                    <option value="">Selecione o Cliente na base...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">VENDEDOR / ATENDENTE <span className="text-rose-500">*</span></label>
                 <select 
                   value={selectedVendorId} 
                   onChange={e => setSelectedVendorId(e.target.value)} 
                   className="w-full h-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 text-[12px] font-black text-slate-900 dark:text-white uppercase shadow-sm focus:ring-2 focus:ring-primary transition-all outline-none"
                 >
                    <option value="">Selecione o Vendedor responsável...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                 </select>
              </div>
           </div>
        </Section>

        {/* BLOCO 3: ITENS */}
        <div className="bg-white dark:bg-[#101822] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[450px]">
           <div className="bg-slate-900 text-white p-3 flex justify-between items-center px-8">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Cesta de Itens Consignados</h3>
              <div className="flex items-center gap-2">
                 <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                 <span className="text-[9px] font-bold opacity-70 uppercase">F4 para Pesquisa</span>
              </div>
           </div>

           <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
              <button onClick={() => searchInputRef.current?.focus()} className="h-10 px-6 bg-primary text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                <span className="material-symbols-outlined text-lg">search</span> Adicionar Produto (F4)
              </button>
           </div>

           <div className="p-6 flex-1 flex flex-col space-y-6">
              <div className="relative group">
                 <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-2xl group-focus-within:text-primary transition-colors">barcode_scanner</span>
                 <input 
                   ref={searchInputRef}
                   value={search} 
                   onChange={e => setSearch(e.target.value)}
                   placeholder="BIPE O CÓDIGO OU DIGITE O NOME DO ITEM..." 
                   className="w-full h-16 bg-white dark:bg-[#0b1118] border-2 border-slate-200 dark:border-slate-700 rounded-[1.25rem] pl-16 pr-8 text-lg font-black text-slate-900 dark:text-white uppercase focus:border-primary outline-none shadow-inner" 
                 />
                 {filteredProducts.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[100] overflow-hidden border-t-4 border-t-primary animate-in slide-in-from-top-2">
                      {filteredProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="w-full p-4 flex items-center justify-between hover:bg-primary hover:text-white text-left transition-all border-b border-slate-100 dark:border-slate-700 group">
                           <div className="flex items-center gap-4">
                              <div className="size-10 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden shadow-sm group-hover:scale-110 transition-transform"><img src={p.image} className="size-full object-cover" /></div>
                              <div>
                                 <p className="text-[11px] font-black uppercase group-hover:text-white">{p.name}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-white/60">SKU: {p.sku} | ESTOQUE: {p.stock} {p.unit}</p>
                              </div>
                           </div>
                           <span className="text-sm font-black text-primary tabular-nums group-hover:text-white">R$ {p.salePrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </button>
                      ))}
                   </div>
                 )}
              </div>

              <div className="overflow-x-auto flex-1 rounded-[1.5rem] border border-slate-200 dark:border-slate-800">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                          <th className="px-6 py-4">Item / Modelo</th>
                          <th className="px-4 py-4 text-center">Un</th>
                          <th className="px-4 py-4 text-right">Venda Unit.</th>
                          <th className="px-4 py-4 text-center">Quantidade</th>
                          <th className="px-4 py-4 text-right">Desconto Un.</th>
                          <th className="px-6 py-4 text-right">Total Item</th>
                          <th className="px-4 py-4 w-10"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {cart.map(item => (
                         <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group text-[11px] font-black uppercase transition-colors">
                            <td className="px-6 py-3">
                               <p className="text-slate-800 dark:text-slate-200 truncate max-w-[300px] leading-none">{item.name}</p>
                               <p className="text-[9px] text-slate-400 mt-1">{item.sku}</p>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-500">{item.unit || 'UN'}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-800 dark:text-white">R$ {item.salePrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-3">
                               <div className="flex items-center justify-center gap-3">
                                  <button onClick={() => updateQty(item.id, item.quantity - 1)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-lg">remove_circle</span></button>
                                  <span className="font-black text-slate-900 dark:text-white tabular-nums min-w-[24px] text-center text-sm">{item.quantity}</span>
                                  <button onClick={() => updateQty(item.id, item.quantity + 1)} className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors"><span className="material-symbols-outlined text-lg">add_circle</span></button>
                               </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <div className="flex items-center justify-end">
                                  <span className="text-[9px] mr-1 opacity-40">R$</span>
                                  <input 
                                    type="number" 
                                    value={item.otherCostsPercent || ''} 
                                    onChange={e => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                    className="w-20 h-8 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-lg text-right text-[11px] font-black text-rose-600 dark:text-rose-400 focus:ring-1 focus:ring-rose-500 outline-none p-1 shadow-inner" 
                                    placeholder="0,00"
                                  />
                               </div>
                            </td>
                            <td className="px-6 py-3 text-right font-black text-primary tabular-nums text-sm">R$ {((item.salePrice - (item.otherCostsPercent || 0)) * item.quantity).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-3 text-center">
                               <button onClick={() => removeItem(item.id)} className="text-slate-300 dark:text-slate-700 hover:text-rose-600 transition-colors"><span className="material-symbols-outlined text-xl">delete</span></button>
                            </td>
                         </tr>
                       ))}
                       {cart.length === 0 && (
                         <tr><td colSpan={7} className="py-24 text-center opacity-20 font-black text-[11px] tracking-[0.4em] bg-white dark:bg-transparent uppercase">Aguardando inserção de produtos...</td></tr>
                       )}
                    </tbody>
                    {cart.length > 0 && (
                      <tfoot className="bg-slate-900 text-white font-black text-[12px] uppercase shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                         <tr>
                            <td colSpan={5} className="px-8 py-5 text-right tracking-widest text-slate-400">TOTAIS DO CONSIGNADO:</td>
                            <td className="px-8 py-5 text-right tabular-nums text-xl text-primary">R$ {totalNet.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td></td>
                         </tr>
                      </tfoot>
                    )}
                 </table>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
      `}</style>
    </div>
  );
};

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-white dark:bg-[#101822] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden transition-colors">
     <div className="bg-slate-50 dark:bg-slate-800/80 p-3 px-8 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{title}</h3>
        <span className="material-symbols-outlined text-sm text-slate-300">expand_more</span>
     </div>
     <div className="p-8">
        {children}
     </div>
  </div>
);

const Input = ({ label, value, disabled, className, type = 'text', onChange }: any) => (
  <div className={`space-y-1.5 ${className}`}>
     <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">{label}:</label>
     <input 
       type={type} 
       value={value} 
       disabled={disabled} 
       onChange={onChange}
       className={`w-full h-12 border rounded-xl px-4 text-[11px] font-black uppercase outline-none transition-all ${
         disabled 
           ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600' 
           : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20'
       }`} 
     />
  </div>
);

export default ConsignmentPDV;
