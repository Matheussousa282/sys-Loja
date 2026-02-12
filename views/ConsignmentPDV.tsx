
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Product, Customer, CartItem, ConsignmentSale, ConsignmentStatus, UserRole, User } from '../types';

interface ConsignmentPDVProps {
  onBack: () => void;
}

const ConsignmentPDV: React.FC<ConsignmentPDVProps> = ({ onBack }) => {
  const { products, customers, users, addConsignmentSale, currentUser, establishments } = useApp();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [observation, setObservation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Consignado');
  const [closingDate, setClosingDate] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentStore = establishments.find(e => e.id === currentUser?.storeId);

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
    <div className="h-screen flex flex-col bg-[#f0f2f5] dark:bg-[#0b1118] overflow-hidden animate-in fade-in duration-500 font-sans">
      {/* BARRA SUPERIOR AZUL */}
      <header className="bg-primary text-white p-3 flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-4">
           <div className="bg-white/20 p-2 rounded-lg"><span className="material-symbols-outlined">inventory</span></div>
           <div>
              <h1 className="text-sm font-black uppercase tracking-tight leading-none">Registro de Pré-Pedido Consignado - Incluir</h1>
              <p className="text-[9px] font-bold opacity-70 mt-1">SISTEMA ERP INTEGRADO GESTÃO NEON</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={handleFinalize} disabled={isFinalizing} className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-md">
             <span className="material-symbols-outlined text-sm">check_circle</span> {isFinalizing ? 'GRAVANDO...' : 'GRAVAR (F1)'}
           </button>
           <button onClick={onBack} className="bg-rose-500 hover:bg-rose-600 px-6 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-md">
             <span className="material-symbols-outlined text-sm">cancel</span> CANCELAR (ESC)
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {/* BLOCO 1: DADOS DO PRÉ-PEDIDO */}
        <Section title="Dados do Pré-Pedido (Alt+1)">
           <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
              <Input label="ID" value="AUTOMÁTICO" disabled className="col-span-1" />
              <Input label="DATA" type="date" value={new Date().toISOString().split('T')[0]} disabled className="col-span-2" />
              <div className="col-span-3 space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">ESTABELECIMENTO:</label>
                 <select disabled className="w-full h-10 bg-slate-50 border border-slate-300 rounded px-3 text-[10px] font-black uppercase"><option>{currentStore?.name}</option></select>
              </div>
              <div className="col-span-2 space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">TABELA DE PREÇO:</label>
                 <select className="w-full h-10 bg-white border border-slate-300 rounded px-3 text-[10px] font-black uppercase"><option>TABELA PADRÃO</option></select>
              </div>
              <div className="col-span-2 space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">FORMA DE PAGTO:</label>
                 <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full h-10 bg-white border border-slate-300 rounded px-3 text-[10px] font-black uppercase"><option value="Consignado">CONSIGNADO</option><option value="Crediario">CREDIÁRIO</option></select>
              </div>
              <div className="col-span-2 space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">DATA FECHAMENTO:</label>
                 <input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} className="w-full h-10 bg-white border border-slate-300 rounded px-3 text-[10px] font-black" />
              </div>
              <div className="col-span-12 space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">OBSERVAÇÕES:</label>
                 <input value={observation} onChange={e => setObservation(e.target.value.toUpperCase())} className="w-full h-10 bg-white border border-slate-300 rounded px-4 text-[10px] font-black uppercase" placeholder="INFORMAÇÕES ADICIONAIS DO CONSIGNADO..." />
              </div>
           </div>
        </Section>

        {/* BLOCO 2: CLIENTE E VENDEDOR */}
        <Section title="Dados do Cliente / Colaborador (Alt+2)">
           <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-6 space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">CLIENTE SOLICITANTE <span className="text-rose-500">*</span></label>
                 <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full h-11 bg-white border border-slate-300 rounded px-4 text-[11px] font-black uppercase shadow-sm focus:ring-1 focus:ring-primary">
                    <option value="">Selecione o Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div className="md:col-span-6 space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">VENDEDOR RESPONSÁVEL <span className="text-rose-500">*</span></label>
                 <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full h-11 bg-white border border-slate-300 rounded px-4 text-[11px] font-black uppercase shadow-sm focus:ring-1 focus:ring-primary">
                    <option value="">Selecione o Vendedor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                 </select>
              </div>
           </div>
        </Section>

        {/* BLOCO 3: ITENS */}
        <div className="bg-white dark:bg-[#101822] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
           <div className="bg-emerald-600 text-white p-2 flex justify-between items-center px-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Itens Vendidos (Consignação)</h3>
              <span className="text-[9px] font-bold opacity-80 uppercase">ALT+3 PARA ITENS</span>
           </div>

           <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
              <button onClick={() => searchInputRef.current?.focus()} className="h-9 px-4 bg-primary text-white rounded text-[9px] font-black uppercase flex items-center gap-2 shadow hover:bg-blue-600 transition-all">
                <span className="material-symbols-outlined text-sm">add_box</span> Incluir por Produto (F4)
              </button>
              <button className="h-9 px-4 bg-slate-800 text-white rounded text-[9px] font-black uppercase flex items-center gap-2 shadow hover:bg-slate-700 transition-all opacity-50 cursor-not-allowed">
                Incluir por SKU (F7)
              </button>
              <button className="h-9 px-4 bg-slate-800 text-white rounded text-[9px] font-black uppercase flex items-center gap-2 shadow hover:bg-slate-700 transition-all opacity-50 cursor-not-allowed">
                Incluir por EAN (F6)
              </button>
           </div>

           <div className="p-4 flex-1 flex flex-col space-y-4">
              <div className="relative group">
                 <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-primary transition-colors">barcode_scanner</span>
                 <input 
                   ref={searchInputRef}
                   value={search} 
                   onChange={e => setSearch(e.target.value)}
                   placeholder="FILTRAGEM RÁPIDA... <CTRL+*>" 
                   className="w-full h-12 bg-white dark:bg-[#0b1118] border border-slate-300 dark:border-slate-700 rounded-lg pl-12 pr-6 text-sm font-black uppercase focus:ring-2 focus:ring-primary/20 outline-none" 
                 />
                 {filteredProducts.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl z-[100] overflow-hidden">
                      {filteredProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="w-full p-3 flex items-center justify-between hover:bg-primary hover:text-white text-left transition-all border-b border-slate-100 dark:border-slate-700">
                           <div className="flex items-center gap-4">
                              <div className="size-8 bg-slate-100 rounded overflow-hidden"><img src={p.image} className="size-full object-cover" /></div>
                              <div><p className="text-[10px] font-black uppercase">{p.name}</p><p className="text-[8px] font-bold text-slate-400 uppercase">Estoque: {p.stock} | SKU: {p.sku}</p></div>
                           </div>
                           <span className="text-xs font-black text-primary tabular-nums">R$ {p.salePrice.toLocaleString('pt-BR')}</span>
                        </button>
                      ))}
                   </div>
                 )}
              </div>

              <div className="overflow-x-auto flex-1 border border-slate-200 dark:border-slate-700 rounded-lg">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-primary text-white text-[9px] font-black uppercase divide-x divide-white/10">
                          <th className="px-4 py-2 text-center w-10"><span className="material-symbols-outlined text-[12px]">settings</span></th>
                          <th className="px-4 py-2">Modelo / Descrição</th>
                          <th className="px-4 py-2 text-center">Un</th>
                          <th className="px-4 py-2 text-right">Estoque</th>
                          <th className="px-4 py-2 text-right">Vr. Unit</th>
                          <th className="px-4 py-2 text-center">Quant.</th>
                          <th className="px-4 py-2 text-right">Sub-Total</th>
                          <th className="px-4 py-2 text-right">Vr. Desc</th>
                          <th className="px-4 py-2 text-right">Vr. Tot Faturar</th>
                          <th className="px-4 py-2 w-10"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {cart.map(item => (
                         <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group text-[10px] font-bold uppercase divide-x divide-slate-100 dark:divide-slate-800 transition-colors">
                            <td className="px-4 py-2 text-center"><span className="size-2 bg-blue-600 rounded-full mx-auto inline-block"></span></td>
                            <td className="px-4 py-2"><p className="font-black text-slate-800 dark:text-slate-200 truncate max-w-[250px]">{item.name}</p><p className="text-[8px] text-slate-400 font-black">{item.sku}</p></td>
                            <td className="px-4 py-2 text-center text-slate-500">{item.unit || 'UN'}</td>
                            <td className="px-4 py-2 text-right text-slate-500 tabular-nums">{item.stock.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">R$ {item.salePrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-2">
                               <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => updateQty(item.id, item.quantity - 1)} className="text-slate-300 hover:text-rose-500"><span className="material-symbols-outlined text-sm">remove_circle</span></button>
                                  <span className="font-black text-slate-900 dark:text-white tabular-nums min-w-[20px] text-center">{item.quantity.toFixed(2)}</span>
                                  <button onClick={() => updateQty(item.id, item.quantity + 1)} className="text-slate-300 hover:text-emerald-500"><span className="material-symbols-outlined text-sm">add_circle</span></button>
                               </div>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-slate-500">R$ {(item.salePrice * item.quantity).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-2 text-right">
                               <input 
                                 type="number" 
                                 value={item.otherCostsPercent || ''} 
                                 onChange={e => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                 className="w-16 h-7 bg-rose-500/5 border border-rose-500/20 rounded text-right text-[10px] font-black text-rose-600 focus:ring-0 outline-none p-1" 
                                 placeholder="0,00"
                               />
                            </td>
                            <td className="px-4 py-2 text-right font-black text-primary tabular-nums">R$ {((item.salePrice - (item.otherCostsPercent || 0)) * item.quantity).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-2 text-center"><button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-rose-600 transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button></td>
                         </tr>
                       ))}
                       {cart.length === 0 && (
                         <tr><td colSpan={10} className="py-20 text-center opacity-20 font-black text-[10px] tracking-widest bg-white dark:bg-transparent uppercase">Nenhum item lançado no consignado</td></tr>
                       )}
                    </tbody>
                    {cart.length > 0 && (
                      <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-black text-[11px] uppercase divide-x divide-slate-200">
                         <tr>
                            <td colSpan={6} className="px-6 py-3 text-right">Totais do Pedido:</td>
                            <td className="px-4 py-3 text-right tabular-nums">R$ {subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-3 text-right text-rose-600 tabular-nums">R$ {totalDiscount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-3 text-right text-primary text-sm tabular-nums font-black">R$ {totalNet.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
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
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-white dark:bg-[#101822] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
     <div className="bg-primary/90 text-white p-2 px-6 flex justify-between items-center">
        <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
        <span className="material-symbols-outlined text-sm">expand_circle_up</span>
     </div>
     <div className="p-6">
        {children}
     </div>
  </div>
);

const Input = ({ label, value, disabled, className, type = 'text', onChange }: any) => (
  <div className={`space-y-1 ${className}`}>
     <label className="text-[9px] font-black text-slate-500 uppercase px-1">{label}:</label>
     <input 
       type={type} 
       value={value} 
       disabled={disabled} 
       onChange={onChange}
       className={`w-full h-10 border border-slate-300 dark:border-slate-700 rounded px-3 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary ${disabled ? 'bg-slate-50 dark:bg-slate-900 text-slate-400' : 'bg-white dark:bg-slate-800'}`} 
     />
  </div>
);

export default ConsignmentPDV;
