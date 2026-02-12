
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { CartItem, Product, Customer, UserRole, User, Establishment, TransactionStatus, PriceTableItem } from '../types';

const PDV: React.FC = () => {
  const { 
    products, customers, users, currentUser, processSale, 
    establishments, addCustomer,
    refreshData, priceTables, getPriceTableItems 
  } = useApp();
  
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');

  // Estados de Tabela de Preço
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [activeTableItems, setActiveTableItems] = useState<PriceTableItem[]>([]);

  // Estados Financeiros Adicionais
  const [shipping, setShipping] = useState<number>(0);
  const [generalDiscount, setGeneralDiscount] = useState<number>(0);

  // Modais
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPriceInquiry, setShowPriceInquiry] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  
  // Estados de Operação
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Controle de Desconto no Modal
  const [discountMode, setDiscountMode] = useState<'VALUE' | 'PERCENT'>('VALUE');
  const [tempDiscount, setTempDiscount] = useState<number>(0);

  // Novo Cliente Profissional
  const [newCustForm, setNewCustForm] = useState({ 
    name: '', cpf: '', phone: '', email: '', city: ''
  });

  const [priceInquirySearch, setPriceInquirySearch] = useState('');
  const [cancelSearchId, setCancelSearchId] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentStore = useMemo(() => establishments.find(e => e.id === currentUser?.storeId) || { id: 'default', name: 'Terminal Local' } as Establishment, [establishments, currentUser]);
  const activeTables = useMemo(() => priceTables.filter(t => t.active), [priceTables]);

  useEffect(() => { refreshData(); }, []);

  useEffect(() => {
    if (selectedTableId) {
      getPriceTableItems(selectedTableId).then(items => {
        setActiveTableItems(items);
        repriceCart(items, selectedLevel);
      });
    } else {
      setActiveTableItems([]);
      repriceCart([], selectedLevel);
    }
  }, [selectedTableId, selectedLevel]);

  const repriceCart = (tableItems: PriceTableItem[], level: number) => {
    setCart(prev => prev.map(item => {
      const pTable = tableItems.find(it => it.product_id === item.id);
      const original = products.find(p => p.id === item.id);
      let newPrice = original?.salePrice || item.salePrice;
      if (pTable) {
        if (level === 1) newPrice = Number(pTable.price_1);
        else if (level === 2) newPrice = Number(pTable.price_2);
        else if (level === 3) newPrice = Number(pTable.price_3);
      }
      return { ...item, salePrice: newPrice, priceLevel: level };
    }));
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const low = search.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(low) || p.sku.toLowerCase().includes(low) || p.barcode?.includes(search);
      let matchesCategory = category === 'Todos' || (category === 'Serviços' ? p.isService : p.category === category);
      return matchesSearch && matchesCategory;
    });
  }, [search, category, products]);

  // Cálculos Financeiros
  const subtotalBruto = useMemo(() => cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0), [cart]);
  const totalLiquido = useMemo(() => Math.max(0, subtotalBruto + shipping - generalDiscount), [subtotalBruto, shipping, generalDiscount]);

  // Prévia do modal de desconto
  const previewDiscountValue = useMemo(() => {
    if (discountMode === 'PERCENT') return subtotalBruto * (tempDiscount / 100);
    return tempDiscount;
  }, [subtotalBruto, tempDiscount, discountMode]);
  
  const previewNetValue = useMemo(() => Math.max(0, subtotalBruto - previewDiscountValue), [subtotalBruto, previewDiscountValue]);

  const addToCart = (product: Product) => {
    if (!product.isService && product.stock <= 0) { alert('Produto sem estoque!'); return; }
    let priceToApply = product.salePrice;
    const pTable = activeTableItems.find(it => it.product_id === product.id);
    if (pTable) {
        if (selectedLevel === 1) priceToApply = Number(pTable.price_1);
        else if (selectedLevel === 2) priceToApply = Number(pTable.price_2);
        else if (selectedLevel === 3) priceToApply = Number(pTable.price_3);
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1, salePrice: priceToApply, priceLevel: selectedLevel } : item);
      return [...prev, { ...product, quantity: 1, salePrice: priceToApply, priceLevel: selectedLevel }];
    });
    setSearch('');
    searchInputRef.current?.focus();
  };

  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `c-${Date.now()}`;
    await addCustomer({
       id: newId,
       name: newCustForm.name.toUpperCase(),
       cpfCnpj: newCustForm.cpf,
       phone: newCustForm.phone,
       email: newCustForm.email.toLowerCase(),
       city: newCustForm.city.toUpperCase(),
       birthDate: '', notes: ''
    });
    setSelectedCustomerId(newId);
    setShowAddCustomerModal(false);
    setNewCustForm({ name: '', cpf: '', phone: '', email: '', city: '' });
  };

  const handleApplyDiscount = () => {
    setGeneralDiscount(previewDiscountValue);
    setShowDiscountModal(false);
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0 || isFinalizing) return;
    if (!selectedVendorId) { alert("Selecione o VENDEDOR!"); return; }
    setIsFinalizing(true);
    try {
      await processSale(cart, totalLiquido, paymentMethod, selectedCustomerId, selectedVendorId, shipping, {});
      setCart([]); setShipping(0); setGeneralDiscount(0); setShowCheckout(false); setShowSuccessModal(true);
    } catch (e) { alert("Erro ao processar."); } finally { setIsFinalizing(false); }
  };

  const inquiryResults = useMemo(() => {
    if (!priceInquirySearch) return [];
    return products.filter(p => p.name.toLowerCase().includes(priceInquirySearch.toLowerCase()) || p.sku.toLowerCase().includes(priceInquirySearch.toLowerCase())).slice(0, 3);
  }, [priceInquirySearch, products]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-background-dark overflow-hidden font-display relative">
      
      {/* HEADER OPERACIONAL */}
      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shrink-0 print:hidden shadow-sm">
        <div className="flex items-center gap-4">
           <div className="size-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined">point_of_sale</span>
           </div>
           <div>
              <h1 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-none">{currentStore.name}</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Terminal em Operação</p>
           </div>
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 ml-4">
              {['TODOS', 'SERVIÇOS', 'GERAL'].map(cat => (
                <button key={cat} onClick={() => setCategory(cat === 'TODOS' ? 'Todos' : cat)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${category === (cat === 'TODOS' ? 'Todos' : cat) ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>{cat}</button>
              ))}
           </div>
        </div>
        
        <div className="flex gap-2">
           <button onClick={() => navigate('/consignados')} className="px-5 py-2.5 bg-blue-900/30 border border-primary/40 text-primary rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-primary hover:text-white transition-all">
              <span className="material-symbols-outlined text-lg">description</span> Módulo Consignado
           </button>
           <button onClick={() => setShowCancelModal(true)} className="px-5 py-2.5 bg-rose-500/10 text-rose-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-rose-500 hover:text-white transition-all"><span className="material-symbols-outlined text-lg">cancel</span> Cancelamento</button>
           <button onClick={() => setShowReturnsModal(true)} className="px-5 py-2.5 bg-amber-500/10 text-amber-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-amber-500 hover:text-white transition-all"><span className="material-symbols-outlined text-lg">history</span> Trocas</button>
           <button onClick={() => setShowPriceInquiry(true)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-primary hover:text-white transition-all"><span className="material-symbols-outlined text-lg">sell</span> Consulta Preço</button>
           <button onClick={() => navigate('/servicos')} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-amber-500 hover:text-white transition-all"><span className="material-symbols-outlined text-lg">construction</span> Serviços / OS</button>
           <button onClick={() => window.history.back()} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest">Sair</button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden print:hidden">
        <section className="flex-1 flex flex-col">
          <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="relative">
               <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">search</span>
               <input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar produto ou bipar código..." className="w-full h-16 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-16 pr-6 text-xl font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 content-start custom-scrollbar">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-3 rounded-3xl border-2 border-transparent hover:border-primary transition-all cursor-pointer shadow-sm group text-left">
                <div className="aspect-square w-full rounded-2xl mb-3 overflow-hidden bg-slate-100 dark:bg-slate-700">
                  <img src={p.image} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 line-clamp-2 min-h-[32px] leading-tight">{p.name}</h4>
                <div className="mt-2 flex justify-between items-end">
                   <span className="text-[14px] font-black text-primary">R$ {p.salePrice.toFixed(2)}</span>
                   <span className="text-[9px] font-black opacity-50">{p.stock} un</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BARRA LATERAL */}
        <aside className="w-[480px] bg-white dark:bg-[#101822] border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl shrink-0">
          
          {/* SELEÇÃO DE TABELA E NÍVEL (ADICIONADO) */}
          <div className="p-6 space-y-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1118]/40">
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-primary uppercase tracking-widest px-2">Tabela de Preço Ativa</label>
                <div className="flex gap-2">
                   <select value={selectedTableId} onChange={e => setSelectedTableId(e.target.value)} className="flex-1 h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-[10px] font-black uppercase text-primary shadow-sm outline-none focus:border-primary transition-all">
                      <option value="">TABELA PADRÃO (SISTEMA)</option>
                      {activeTables.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
                   </select>
                   <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 gap-1 shadow-sm border border-slate-200 dark:border-slate-700">
                      {[1, 2, 3].map(lv => (
                        <button key={lv} onClick={() => setSelectedLevel(lv)} className={`size-8 rounded-lg text-[9px] font-black transition-all ${selectedLevel === lv ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>P{lv}</button>
                      ))}
                   </div>
                </div>
             </div>

             {/* SELEÇÃO DE VENDEDOR E CLIENTE */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Vendedor *</label>
                   <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-[10px] font-black uppercase shadow-sm outline-none focus:border-primary transition-all">
                      <option value="">SELECIONE VENDEDOR</option>
                      {users.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                   </select>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center px-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                      <button onClick={() => setShowAddCustomerModal(true)} className="text-[9px] font-black text-primary uppercase flex items-center gap-1 hover:underline"><span className="material-symbols-outlined text-[12px]">person_add</span> Novo</button>
                   </div>
                   <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-[10px] font-black uppercase shadow-sm outline-none focus:border-primary transition-all">
                      <option value="">CONSUMIDOR FINAL</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <span className="material-symbols-outlined text-7xl">shopping_cart</span>
                  <p className="text-[11px] font-black uppercase mt-4 tracking-widest">Carrinho Vazio</p>
               </div>
             ) : cart.map((item, idx) => (
               <div key={idx} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-transparent hover:border-primary/20 transition-all">
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-[11px] font-black uppercase truncate leading-none flex-1">{item.name}</p>
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-rose-500 ml-2"><span className="material-symbols-outlined text-sm">delete</span></button>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <button onClick={() => setCart(cart.map((i, ix) => ix === idx ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="size-6 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-500 font-bold">-</button>
                           <span className="text-[11px] font-black tabular-nums">{item.quantity}</span>
                           <button onClick={() => setCart(cart.map((i, ix) => ix === idx ? { ...i, quantity: i.quantity + 1 } : i))} className="size-6 bg-primary/10 text-primary rounded-lg font-bold">+</button>
                        </div>
                        <div className="text-right">
                           {item.priceLevel && <span className="text-[8px] font-black bg-primary text-white px-1.5 py-0.5 rounded-md mr-2 tabular-nums">P{item.priceLevel}</span>}
                           <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">R$ {(item.salePrice * item.quantity).toFixed(2)}</span>
                        </div>
                     </div>
                  </div>
               </div>
             ))}
          </div>

          {/* PAINEL DE TOTAIS COM BOTÃO DE DESCONTO CLICÁVEL */}
          <div className="p-8 border-t-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0b1118]/40 space-y-4 shrink-0">
             <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subtotal Bruto</span>
                   <span className="text-sm font-black text-slate-700 dark:text-slate-300 tabular-nums">R$ {subtotalBruto.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center group">
                   <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                      <span className="material-symbols-outlined text-sm">local_shipping</span> Frete (+)
                   </div>
                   <input 
                     type="number" 
                     value={shipping || ''} 
                     onChange={e => setShipping(Math.max(0, parseFloat(e.target.value) || 0))} 
                     className="w-24 h-8 bg-slate-100 dark:bg-slate-800/60 border-none rounded-lg text-right font-black text-[11px] text-primary focus:ring-1 focus:ring-primary outline-none" 
                     placeholder="0"
                   />
                </div>

                <div 
                  onClick={() => { setTempDiscount(0); setShowDiscountModal(true); }}
                  className="flex justify-between items-center group cursor-pointer hover:bg-rose-500/5 p-1 rounded-lg transition-all"
                >
                   <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest">
                      <span className="material-symbols-outlined text-sm">local_offer</span> Desconto Geral (-)
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-rose-400 uppercase group-hover:underline">Aplicar</span>
                      <span className="text-xs font-black text-rose-600 tabular-nums">- R$ {generalDiscount.toFixed(2)}</span>
                   </div>
                </div>
             </div>

             <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline mb-6">
                   <span className="text-xs font-black uppercase text-slate-500">Total Líquido</span>
                   <h3 className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">R$ {totalLiquido.toFixed(2)}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => navigate('/servicos?tab=create')} className="py-4 bg-amber-500/10 text-amber-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all">Gerar OS</button>
                   <button disabled={cart.length === 0} onClick={() => { if(!selectedVendorId) return alert('Selecione o Vendedor'); setShowCheckout(true); }} className="py-4 bg-primary hover:bg-blue-600 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">Vender</button>
                </div>
             </div>
          </div>
        </aside>
      </main>

      {/* NOVO MODAL: APLICAR DESCONTO GERAL (PROFISSIONAL) */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-[550] flex items-center justify-center bg-[#0b1118]/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-[#101822] w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-800">
              <div className="p-8 border-b border-slate-800 bg-[#f43f5e] text-white flex justify-between items-center relative overflow-hidden">
                 <div className="flex items-center gap-4 relative z-10">
                    <span className="material-symbols-outlined text-3xl">local_offer</span>
                    <h3 className="text-xl font-black uppercase tracking-tight leading-none">Aplicar Desconto Geral</h3>
                 </div>
                 <button onClick={() => setShowDiscountModal(false)} className="size-10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors relative z-10">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>

              <div className="p-10 space-y-10">
                 <div className="flex bg-[#0b1118] p-1.5 rounded-2xl border border-slate-800">
                    <button 
                      onClick={() => setDiscountMode('VALUE')}
                      className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${discountMode === 'VALUE' ? 'bg-slate-800 text-primary shadow-lg shadow-black/40' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Em Reais (R$)
                    </button>
                    <button 
                      onClick={() => setDiscountMode('PERCENT')}
                      className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${discountMode === 'PERCENT' ? 'bg-slate-800 text-primary shadow-lg shadow-black/40' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Porcentagem (%)
                    </button>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Valor do Desconto</label>
                    <div className="relative group">
                       <div className="absolute left-8 top-1/2 -translate-y-1/2 text-rose-500 font-black text-2xl group-focus-within:scale-110 transition-transform">
                          {discountMode === 'VALUE' ? 'R$' : '%'}
                       </div>
                       <input 
                         autoFocus
                         type="number" 
                         value={tempDiscount || ''} 
                         onChange={e => setTempDiscount(parseFloat(e.target.value) || 0)} 
                         className="w-full h-24 bg-[#0b1118] border-2 border-slate-800 rounded-[2rem] pl-20 pr-8 text-center text-5xl font-black text-slate-300 placeholder:text-slate-800 outline-none focus:border-rose-500/50 transition-all tabular-nums" 
                         placeholder="0,00"
                       />
                       <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                          <button onClick={() => setTempDiscount(prev => prev + 1)} className="text-slate-600 hover:text-white"><span className="material-symbols-outlined">expand_less</span></button>
                          <button onClick={() => setTempDiscount(prev => Math.max(0, prev - 1))} className="text-slate-600 hover:text-white"><span className="material-symbols-outlined">expand_more</span></button>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-800/40 rounded-[2rem] border border-slate-800 text-center">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Subtotal Bruto</p>
                       <p className="text-xl font-black text-slate-300 tabular-nums">R$ {subtotalBruto.toFixed(2)}</p>
                    </div>
                    <div className="p-6 bg-slate-800/40 rounded-[2rem] border border-slate-800 text-center">
                       <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 text-emerald-500">Valor Final Líquido</p>
                       <p className="text-xl font-black text-emerald-500 tabular-nums">R$ {previewNetValue.toFixed(2)}</p>
                    </div>
                 </div>

                 <button 
                   onClick={handleApplyDiscount}
                   className="w-full h-20 bg-slate-100 hover:bg-white text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                 >
                    Aplicar Desconto Agora
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAIS (MANTIDOS E INTEGRADOS) */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in">
           <div className="bg-white dark:bg-[#101822] w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-primary text-white flex justify-between items-center relative overflow-hidden">
                 <div className="flex items-center gap-4 relative z-10">
                    <div className="size-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                      <span className="material-symbols-outlined text-3xl">person_add</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Novo Cliente</h3>
                      <p className="text-[10px] font-bold text-white/70 uppercase mt-2 tracking-widest">Inclusão rápida no banco de dados</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAddCustomerModal(false)} className="size-12 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors relative z-10">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              <form onSubmit={handleSaveQuickCustomer} className="p-10 space-y-8">
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                       <span className="material-symbols-outlined text-slate-400 text-sm">badge</span>
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dados de Identificação</h4>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Nome Completo / Razão Social</label>
                       <input required autoFocus value={newCustForm.name} onChange={e => setNewCustForm({...newCustForm, name: e.target.value})} placeholder="EX: JOÃO DA SILVA" className="w-full h-14 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-800 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Documento (CPF/CNPJ)</label>
                          <input value={newCustForm.cpf} onChange={e => setNewCustForm({...newCustForm, cpf: e.target.value})} placeholder="000.000.000-00" className="w-full h-14 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-800 dark:text-white" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">WhatsApp / Telefone</label>
                          <input required value={newCustForm.phone} onChange={e => setNewCustForm({...newCustForm, phone: e.target.value})} placeholder="(00) 00000-0000" className="w-full h-14 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 text-sm font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                       </div>
                    </div>
                 </div>
                 <button type="submit" className="w-full h-20 bg-primary hover:bg-blue-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">save</span> Salvar e Selecionar
                 </button>
              </form>
           </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in">
           <div className="bg-white dark:bg-[#101822] w-full max-w-md rounded-[4rem] shadow-2xl p-12 space-y-8 animate-in zoom-in-95">
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Receber</p>
                 <h3 className="text-5xl font-black text-primary tabular-nums">R$ {totalLiquido.toFixed(2)}</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {['Dinheiro', 'Pix', 'Debito', 'Credito'].map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)} className={`p-5 rounded-3xl border-2 transition-all font-black text-[11px] uppercase tracking-widest flex items-center justify-between ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                       <span>{m}</span>
                       <span className="material-symbols-outlined">{m === 'Dinheiro' ? 'payments' : m === 'Pix' ? 'qr_code_2' : 'credit_card'}</span>
                    </button>
                 ))}
              </div>
              <button onClick={handleFinalizeSale} disabled={isFinalizing} className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                 {isFinalizing ? <span className="animate-spin material-symbols-outlined">sync</span> : 'FINALIZAR VENDA (F12)'}
              </button>
              <button onClick={() => setShowCheckout(false)} className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Voltar</button>
           </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4">
           <div className="bg-white dark:bg-[#101822] w-full max-w-md rounded-[4rem] p-12 text-center space-y-8 shadow-2xl animate-in zoom-in-95">
              <div className="size-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce"><span className="material-symbols-outlined text-5xl">check</span></div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Venda Realizada!</h2>
              <button onClick={() => setShowSuccessModal(false)} className="w-full py-5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Novo Pedido</button>
           </div>
        </div>
      )}

      {showPriceInquiry && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-[#101822] w-full max-w-4xl rounded-[4rem] shadow-2xl p-12 space-y-10 animate-in zoom-in-95">
              <div className="flex justify-between items-center">
                 <h3 className="text-3xl font-black uppercase text-primary">Consulta de Preços</h3>
                 <button onClick={() => { setShowPriceInquiry(false); setPriceInquirySearch(''); }} className="size-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-3xl">close</span></button>
              </div>
              <input autoFocus value={priceInquirySearch} onChange={e => setPriceInquirySearch(e.target.value)} placeholder="BIPE O PRODUTO OU DIGITE O NOME..." className="w-full h-24 bg-slate-100 dark:bg-slate-800 border-none rounded-[2rem] px-10 text-3xl font-black text-slate-900 dark:text-white uppercase placeholder:text-slate-400 outline-none" />
              <div className="space-y-6">
                 {inquiryResults.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                       <div className="flex items-center gap-6">
                          <img src={p.image} className="size-20 rounded-2xl object-cover" />
                          <div><h4 className="text-xl font-black uppercase text-slate-900 dark:text-white">{p.name}</h4><p className="text-xs font-black text-slate-400 mt-1 uppercase">SKU: {p.sku} | ESTOQUE: {p.stock} UN</p></div>
                       </div>
                       <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Preço de Venda</p><p className="text-5xl font-black text-emerald-500 tabular-nums">R$ {p.salePrice.toFixed(2)}</p></div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
           <div className="bg-white dark:bg-[#101822] w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
              <div className="text-center space-y-2">
                 <div className="size-20 bg-rose-500/10 text-rose-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4"><span className="material-symbols-outlined text-4xl">cancel</span></div>
                 <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white">Estornar Venda</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase">Insira o ID da venda para prosseguir.</p>
              </div>
              <input value={cancelSearchId} onChange={e => setCancelSearchId(e.target.value)} placeholder="ID DA VENDA" className="w-full h-14 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 text-center font-black text-rose-500 uppercase" />
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowCancelModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Sair</button>
                 <button onClick={() => { alert('Acesso restrito ao gerente.'); setShowCancelModal(false); }} className="py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {showReturnsModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
           <div className="bg-white dark:bg-[#101822] w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Módulo de Troca</h3>
                 <button onClick={() => setShowReturnsModal(false)} className="material-symbols-outlined">close</button>
              </div>
              <div className="p-12 text-center space-y-6">
                 <span className="material-symbols-outlined text-8xl text-amber-500/20">keyboard_return</span>
                 <p className="text-slate-500 font-bold uppercase max-w-md mx-auto">Localize a venda original no menu "DOCUMENTOS" para realizar devoluções.</p>
                 <button onClick={() => navigate('/documentos')} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase">Abrir Documentos</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};

export default PDV;
