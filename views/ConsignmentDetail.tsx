
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../AppContext';
import { ConsignmentSale, ConsignmentStatus, TransactionStatus } from '../types';

interface MultiPayment {
  method: string;
  value: number;
  details?: { installments?: number; operatorName?: string; brandName?: string; cardOperatorId?: string; cardBrandId?: string; };
}

const ConsignmentDetail: React.FC<{ sale: ConsignmentSale; onBack: () => void; }> = ({ sale, onBack }) => {
  const { addTransaction, updateConsignmentSale, cardOperators, cardBrands } = useApp();
  const [showCheckout, setShowCheckout] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [payments, setPayments] = useState<MultiPayment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [currentPaymentValue, setCurrentPaymentValue] = useState(sale.balance);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [cardInstallments, setCardInstallments] = useState(1);

  const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + p.value, 0), [payments]);
  const remainingValue = useMemo(() => Math.max(0, sale.balance - totalPaid), [sale.balance, totalPaid]);
  const changeValue = useMemo(() => Math.max(0, totalPaid - sale.balance), [sale.balance, totalPaid]);
  const filteredBrands = useMemo(() => cardBrands.filter(b => b.operatorId === selectedOperatorId), [cardBrands, selectedOperatorId]);

  useEffect(() => { if (showCheckout) setCurrentPaymentValue(remainingValue); }, [showCheckout, remainingValue]);

  const handleAddPayment = () => {
    if (currentPaymentValue <= 0) return;
    const isCard = ['Debito', 'Credito'].includes(paymentMethod);
    const op = cardOperators.find(o => o.id === selectedOperatorId);
    const br = cardBrands.find(b => b.id === selectedBrandId);
    setPayments([...payments, { method: paymentMethod, value: currentPaymentValue, details: isCard ? { installments: cardInstallments, operatorName: op?.name, brandName: br?.name, cardOperatorId: selectedOperatorId, cardBrandId: selectedBrandId } : undefined }]);
    const nextRemaining = sale.balance - (totalPaid + currentPaymentValue);
    setCurrentPaymentValue(nextRemaining > 0 ? nextRemaining : 0);
  };

  const handleProcessPayment = async () => {
    if (totalPaid <= 0 || isFinalizing) return;
    setIsFinalizing(true);
    const methodsList = Array.from(new Set(payments.map(p => p.method)));
    const methodStr = methodsList.length > 1 ? `Múltiplo (${methodsList.join(', ')})` : methodsList[0];
    
    await addTransaction({
      id: `REC-${Date.now()}`, date: new Date().toISOString().split('T')[0], description: `Recebimento Consignado #${sale.id.slice(-6)}`,
      store: sale.store, category: 'Venda', status: TransactionStatus.PAID, value: Math.min(totalPaid, sale.balance), type: 'INCOME',
      method: methodStr, client: sale.customerName, clientId: sale.customerId, consignmentId: sale.id, items: sale.items
    });

    const newPaid = sale.paidValue + Math.min(totalPaid, sale.balance);
    const newBalance = Math.max(0, sale.balance - totalPaid);
    await updateConsignmentSale({ ...sale, paidValue: newPaid, balance: newBalance, status: newBalance <= 0 ? ConsignmentStatus.PAID : ConsignmentStatus.PARTIAL });
    onBack();
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-24 font-sans">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="size-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><span className="material-symbols-outlined">arrow_back</span></button>
           <div><h1 className="text-3xl font-black uppercase text-slate-900 dark:text-white">Detalhes do Consignado</h1><p className="text-[10px] font-black text-slate-400 uppercase mt-1">ID: {sale.id} • Data: {sale.date}</p></div>
        </div>
        <button onClick={() => setShowCheckout(true)} disabled={sale.status === ConsignmentStatus.PAID} className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-30"><span className="material-symbols-outlined">payments</span> Receber Pagamento</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 size-32 bg-primary/20 blur-3xl group-hover:bg-primary/40 transition-all"></div>
               <div className="relative z-10 space-y-6">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente Solicitante</p><h3 className="text-2xl font-black uppercase leading-tight">{sale.customerName}</h3></div>
                  <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                     <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status Atual</p><p className={`text-[11px] font-black uppercase mt-1 ${sale.status === ConsignmentStatus.PAID ? 'text-emerald-400' : 'text-amber-400'}`}>{sale.status}</p></div>
                     <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unidade</p><p className="text-[11px] font-black uppercase text-white mt-1">{sale.store}</p></div>
                  </div>
               </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 text-slate-900 dark:text-white uppercase font-black text-[11px]">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">Extrato da Conta</h4>
               <div className="space-y-4"><div className="flex justify-between items-center"><span>Bruto</span><span>R$ {sale.grossValue.toLocaleString('pt-BR')}</span></div><div className="flex justify-between items-center text-rose-500"><span>Descontos (-)</span><span>R$ {sale.discount.toLocaleString('pt-BR')}</span></div><div className="flex justify-between items-center text-emerald-500"><span>Recebido (+)</span><span>R$ {sale.paidValue.toLocaleString('pt-BR')}</span></div><div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline"><span>Saldo Devedor</span><span className="text-3xl font-black text-rose-600">R$ {sale.balance.toLocaleString('pt-BR')}</span></div></div>
            </div>
         </div>
         <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full uppercase font-black">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">Itens do Pedido</h3><span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full">{sale.items.length} PRODUTOS</span></div>
            <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 dark:bg-slate-800/20 text-[10px] text-slate-400 border-b"><tr><th className="px-8 py-5">Item</th><th className="px-8 py-5 text-center">Qtd</th><th className="px-8 py-5 text-right">Unitário</th><th className="px-8 py-5 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {sale.items.map(item => (
                 <tr key={item.id} className="hover:bg-slate-50/50 text-[11px] text-slate-800 dark:text-slate-200"><td className="px-8 py-4">{item.name}</td><td className="px-8 py-4 text-center">{item.quantity}</td><td className="px-8 py-4 text-right">R$ {item.salePrice.toLocaleString('pt-BR')}</td><td className="px-8 py-4 text-right text-primary">R$ {(item.quantity * item.salePrice).toLocaleString('pt-BR')}</td></tr>
               ))}
            </tbody></table></div>
         </div>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <div><h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Quitar Consignado</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sale.customerName}</p></div>
                 <button onClick={() => setShowCheckout(false)} className="size-12 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl flex items-center justify-center transition-all hover:bg-rose-500 hover:text-white shadow-sm"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                 <div className="lg:col-span-4 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                       {['Dinheiro', 'Pix', 'Debito', 'Credito'].map(m => (
                         <button key={m} onClick={() => setPaymentMethod(m)} className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary shadow-lg' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                            <span className="material-symbols-outlined text-3xl">{m === 'Dinheiro' ? 'payments' : m === 'Pix' ? 'qr_code_2' : 'credit_card'}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                         </button>
                       ))}
                    </div>
                    <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Valor Pago (R$)</label><input type="number" value={currentPaymentValue} onChange={e => setCurrentPaymentValue(parseFloat(e.target.value) || 0)} className="w-full h-16 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 text-2xl font-black text-primary outline-none focus:ring-4 focus:ring-primary/10" /></div>
                       {(paymentMethod === 'Debito' || paymentMethod === 'Credito') && (
                          <div className="space-y-3 animate-in slide-in-from-top-2">
                             <div className="grid grid-cols-2 gap-2">
                                <select value={selectedOperatorId} onChange={e => { setSelectedOperatorId(e.target.value); setSelectedBrandId(''); }} className="w-full h-11 bg-white dark:bg-slate-900 rounded-xl px-4 text-[9px] font-black uppercase text-slate-900 dark:text-white shadow-sm"><option value="">Operadora</option>{cardOperators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}</select>
                                <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)} className="w-full h-11 bg-white dark:bg-slate-900 rounded-xl px-4 text-[9px] font-black uppercase text-slate-900 dark:text-white shadow-sm"><option value="">Bandeira</option>{filteredBrands.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}</select>
                             </div>
                             {paymentMethod === 'Credito' && <div className="grid grid-cols-6 gap-1">{[1,2,3,4,5,6].map(p => (<button key={p} onClick={() => setCardInstallments(p)} className={`h-8 rounded-lg text-[9px] font-black border-2 ${cardInstallments === p ? 'border-primary bg-primary text-white' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>{p}X</button>))}</div>}
                          </div>
                       )}
                       <button onClick={handleAddPayment} className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"><span className="material-symbols-outlined">add_circle</span> ADICIONAR PAGAMENTO</button>
                    </div>
                 </div>
                 <div className="lg:col-span-5 flex flex-col space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Pagamentos Adicionados</h4>
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] custom-scrollbar pr-2 uppercase font-black">
                       {payments.map((p, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center text-slate-900 dark:text-white">
                             <div className="flex items-center gap-4">
                                <div className="size-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400"><span className="material-symbols-outlined">{p.method === 'Dinheiro' ? 'payments' : 'qr_code_2'}</span></div>
                                <div><p className="text-xs font-black uppercase text-slate-800 dark:text-white leading-none">{p.method} {p.details?.installments > 1 ? `(${p.details.installments}x)` : ''}</p><p className="text-[9px] text-slate-400 mt-1">{p.details?.operatorName} {p.details?.brandName}</p></div>
                             </div>
                             <div className="flex items-center gap-6"><span className="text-lg font-black text-primary tabular-nums">R$ {p.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span><button onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="size-8 text-rose-500 material-symbols-outlined">delete</button></div>
                          </div>
                       ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-blue-500/5 p-5 rounded-3xl"><p className="text-[9px] font-black text-blue-400 uppercase mb-1">Restante</p><p className="text-2xl font-black text-blue-600">R$ {remainingValue.toLocaleString('pt-BR')}</p></div>
                       <div className="bg-emerald-500/5 p-5 rounded-3xl"><p className="text-[9px] font-black text-emerald-500 uppercase mb-1">Troco</p><p className="text-2xl font-black text-emerald-600">R$ {changeValue.toLocaleString('pt-BR')}</p></div>
                    </div>
                 </div>
                 <div className="lg:col-span-3"><div className="bg-slate-900 text-white p-8 rounded-[3rem] space-y-6 shadow-2xl h-full flex flex-col justify-between"><h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Resumo Baixa</h4><div className="space-y-4 text-slate-400 font-bold uppercase text-[10px]"><div className="flex justify-between"><span>Saldo Original</span><span>R$ {sale.balance.toLocaleString('pt-BR')}</span></div><div className="pt-4 border-t border-white/10 flex justify-between items-baseline"><span className="text-xs text-slate-500">Total Pago</span><span className="text-3xl font-black text-white tabular-nums">R$ {totalPaid.toLocaleString('pt-BR')}</span></div></div><button disabled={totalPaid < sale.balance && remainingValue > 0 || isFinalizing} onClick={handleProcessPayment} className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3">{isFinalizing ? <span className="animate-spin material-symbols-outlined">sync</span> : 'FINALIZAR BAIXA'}</button></div></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ConsignmentDetail;
