import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';
import { 
  Search, Settings, Trash2, Edit2, CheckCircle, Save, X, 
  FileSpreadsheet, Copy, ClipboardPaste, LayoutGrid, 
  ArrowLeft, Package, Combine, Plus, ListOrdered, RefreshCw, Loader2
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE REAL (PCP ITAMONTE) ---
const firebaseConfig = {
  apiKey: "AIzaSyCP0KtP6sL0M69wq3FpC5Tmq_IL9AtbnsY",
  authDomain: "pcp-juncao-itamonte.firebaseapp.com",
  projectId: "pcp-juncao-itamonte",
  storageBucket: "pcp-juncao-itamonte.firebasestorage.app",
  messagingSenderId: "827442336306",
  appId: "1:827442336306:web:653270dc35677b6273e22b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'central-alisson-v1';

// --- MÓDULO 01: JUNÇÃO DE OPs ---
function ModuloJuncao({ onBack, user }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [pasteTarget, setPasteTarget] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [btnLabels, setBtnLabels] = useState(['TR', 'TI', 'TS', 'TL']);

  const [data, setData] = useState(() => 
    Array.from({ length: 600 }, (_, i) => ({
      id: i + 1, checked: false, sequencia: "", tabela: i < 300 ? 'azul' : 'verde', item: "", quantidade: "", data: "", ordemProducao: ""
    }))
  );

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current'), (snap) => {
      if (snap.exists() && !isDataLoaded) setData(snap.data().rows);
      setIsDataLoaded(true);
    });
    return () => unsub();
  }, [user, isDataLoaded]);

  const handleSave = async () => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current'), { rows: data });
    setMessage({ text: "Dados salvos!", type: "info" });
    setTimeout(() => setMessage(null), 3000);
  };

  const p1 = data.filter(r => r.tabela === 'azul' && (String(r.item).toLowerCase().includes(searchTerm.toLowerCase())));
  const p2 = data.filter(r => r.tabela === 'verde' && (String(r.item).toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="flex flex-col h-screen bg-slate-100 animate-in fade-in duration-300">
      <header className="bg-black h-12 flex items-center justify-between px-6 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-4 text-white">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded transition-all"><ArrowLeft size={18} /></button>
          <div className="font-black text-sm uppercase tracking-tighter">Junção de OPs</div>
        </div>
        <button onClick={() => setShowSettings(true)} className="text-white/50 hover:text-white"><Settings size={18} /></button>
      </header>

      <div className="bg-white p-4 border-b border-slate-200 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transformação</span>
          <div className="flex gap-1.5">{btnLabels.map(l => <button key={l} className="px-7 py-1.5 bg-black text-white rounded-lg text-[10px] font-black uppercase shadow-md">{l}</button>)}</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comandos</span>
          <div className="flex gap-1.5">
            <button onClick={() => setShowManualPaste(true)} className="px-5 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Colar Dados</button>
            <button className="px-5 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Gerar Seq.</button>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <button onClick={handleSave} className="px-8 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Salvar</button>
          <button className="px-8 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Limpar</button>
        </div>
      </div>

      <div className="flex-grow flex p-4 gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="bg-black h-10 flex items-center justify-between px-4 text-white">
            <span className="font-black text-[10px] uppercase">Parte 01</span>
            <button className="bg-yellow-400 text-black px-3 py-1 rounded text-[9px] font-black uppercase">Copiar Itens</button>
          </div>
          <div className="flex-grow overflow-auto p-2">
            <table className="w-full text-[10px] text-center border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b font-black uppercase text-slate-500">
                <tr><th className="py-2 w-8"></th><th className="w-12">Seq.</th><th>Item</th><th className="w-24">Qtd.</th><th className="w-32">Data</th></tr>
              </thead>
              <tbody className="divide-y">
                {p1.map(r => (
                  <tr key={r.id} className="h-8 hover:bg-slate-50">
                    <td><input type="checkbox" checked={r.checked} onChange={() => {}} /></td>
                    <td className="font-bold text-slate-400">{r.sequencia}</td>
                    <td className="font-bold">{r.item}</td>
                    <td>{r.quantidade}</td><td>{r.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="bg-black h-10 flex items-center justify-between px-4 text-white">
            <span className="font-black text-[10px] uppercase">Parte 02</span>
            <button className="bg-yellow-400 text-black px-3 py-1 rounded text-[9px] font-black uppercase">Copiar Dados</button>
          </div>
          <div className="flex-grow overflow-auto p-2">
            <table className="w-full text-[10px] text-center border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b font-black uppercase text-slate-500">
                <tr><th className="py-2 w-8"></th><th className="w-12">Seq.</th><th>Item</th><th className="w-24">Qtd.</th><th className="w-32">Data</th></tr>
              </thead>
              <tbody className="divide-y">
                {p2.map(r => (
                  <tr key={r.id} className="h-8 hover:bg-slate-50">
                    <td><input type="checkbox" checked={r.checked} onChange={() => {}} /></td>
                    <td className="font-bold text-slate-400">{r.sequencia}</td>
                    <td className="font-bold">{r.item}</td>
                    <td>{r.quantidade}</td><td>{r.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showManualPaste && <div className="fixed inset-0 z-[500] bg-black/60 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-[2rem] w-full max-w-lg text-center"><h3 className="font-black uppercase mb-4 text-slate-800">Colar Dados</h3><textarea className="w-full h-40 border p-4 mb-4 rounded-xl outline-none" placeholder="Cole aqui..." /><button onClick={() => setShowManualPaste(false)} className="px-6 py-2 bg-slate-100 rounded-xl font-bold uppercase text-xs">Fechar</button></div></div>}
    </div>
  );
}

// --- MÓDULO 02: ALOCAÇÃO MG1 - PCP ---
function ModuloAlocacao({ onBack, user }) {
  const [allocations, setAllocations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lossValue, setLossValue] = useState(200);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [message, setMessage] = useState(null);

  const stateDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'appState', 'snapshot');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const docSnap = await getDoc(stateDocRef);
      if (docSnap.exists() && !isDataLoaded) setAllocations(docSnap.data().allocations || []);
      setIsDataLoaded(true);
    };
    load();
  }, [user, isDataLoaded]);

  const handleSaveToCloud = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(stateDocRef, { allocations, updatedAt: Date.now() });
      setMessage({ text: "Sincronizado com sucesso!", type: "success" });
    } catch (err) { setMessage({ text: "Erro ao salvar", type: "error" }); }
    finally { setIsSaving(false); setTimeout(() => setMessage(null), 3000); }
  };

  const handleClearAll = async () => {
    if (window.confirm("Deseja apagar tudo no ecrã e na nuvem?")) {
      setAllocations([]);
      await deleteDoc(stateDocRef);
      setMessage({ text: "Tudo limpo!", type: "info" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filtered = allocations.filter(item => String(item.maquina || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-screen bg-slate-100 animate-in fade-in duration-300">
      {message && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-6 py-2 rounded-full text-white font-black text-xs uppercase shadow-xl ${message.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>{message.text}</div>}
      
      <header className="bg-black h-12 flex items-center justify-between px-6 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-4 text-white">
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded transition-all"><ArrowLeft size={18} /></button>
          <div className="font-black text-sm uppercase tracking-tighter">Alocação MG1 - PCP</div>
        </div>
        <div className="flex items-center gap-3">
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
             <input type="text" className="bg-white/10 border-none rounded text-xs pl-9 pr-4 py-1.5 text-white outline-none w-48" placeholder="Filtrar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>
           <Settings size={18} className="text-white/50" />
        </div>
      </header>

      <main className="p-6 flex flex-col gap-6 flex-grow overflow-hidden">
        <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-100">+ Nova Alocação</button>
            <button onClick={handleSaveToCloud} disabled={isSaving} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase shadow-lg flex items-center gap-2">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} SALVAR
            </button>
            <button onClick={handleClearAll} className="bg-red-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase shadow-lg">LIMPAR</button>
          </div>
          <div className="flex gap-2">
            <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase">Incluir</button>
            <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase">Sequenciar</button>
            <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase">Junção</button>
            <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase">Copiar Dados</button>
          </div>
        </div>

        <div className="flex-grow bg-white rounded-[2rem] border shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-grow">
            <table className="w-full text-center border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b text-[10px] font-black uppercase text-slate-500">
                <tr className="h-12">
                  <th className="bg-blue-600 text-white w-12">Seq.</th>
                  <th className="bg-blue-600 text-white">Máquina</th>
                  <th className="bg-blue-600 text-white">Item</th>
                  <th className="bg-blue-600 text-white">Item Final</th>
                  <th className="bg-blue-600 text-white w-auto">Descrição</th>
                  <th className="bg-blue-600 text-white">Qtd (kg)</th>
                  <th className="bg-yellow-400 text-black">OP</th>
                  <th className="bg-yellow-400 text-black">Perda</th>
                  <th className="bg-yellow-400 text-black">Status</th>
                  <th className="bg-slate-800 text-white w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[11px]">
                {filtered.length === 0 ? (
                  <tr><td colSpan="10" className="py-20 text-slate-300 font-bold uppercase italic">Nenhum registo encontrado</td></tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item.id} className="h-12 hover:bg-slate-50">
                      <td className="font-black text-blue-600">{item.sequencia}</td>
                      <td className="font-bold">{item.maquina}</td>
                      <td className="font-semibold text-slate-600">{item.item}</td>
                      <td className="font-mono">{item.itemFinal}</td>
                      <td className="text-left px-4 truncate max-w-[200px]">{item.descricao}</td>
                      <td className="font-black text-blue-600 tabular-nums">{item.quantidade}</td>
                      <td className="font-bold text-slate-700">{item.ordemProducao}</td>
                      <td><button className="bg-emerald-500 text-white px-3 py-1 rounded-lg font-black">{lossValue}</button></td>
                      <td><span className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black uppercase text-slate-400">{item.status}</span></td>
                      <td><div className="flex justify-center gap-1"><Edit2 size={14} className="text-yellow-600" /><Trash2 size={14} className="text-red-500" /></div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-6 py-3 border-t text-[10px] font-black uppercase text-slate-400 flex justify-between">
            <span>Total: {filtered.length} / 800</span>
            <span>Salve manualmente para persistir na nuvem</span>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL: DASHBOARD ---
export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [user, setUser] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, setUser);
    signInAnonymously(auth);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.body.appendChild(script);
  }, []);

  if (screen === 'juncao') return <ModuloJuncao user={user} onBack={() => setScreen('dashboard')} />;
  if (screen === 'alocacao') return <ModuloAlocacao user={user} onBack={() => setScreen('dashboard')} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-900">
      <header className="bg-black h-12 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-1.5 rounded cursor-pointer hover:bg-white/20 transition-all"><LayoutGrid size={20} className="text-white" /></div>
          <div className="text-white font-black text-sm uppercase tracking-tight">PÁGINA INICIAL</div>
        </div>
      </header>

      <main className="p-10 max-w-[1400px] mx-auto w-full flex-grow text-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 justify-items-center">
          
          <div onClick={() => setScreen('juncao')} className="bg-white w-56 h-56 rounded-[2rem] shadow hover:shadow-2xl border border-slate-100 p-6 flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-2 group">
            <span className="text-black font-black text-sm uppercase leading-tight text-left">Junção de OPs</span>
            <div className="mt-auto flex items-end justify-between">
              <Combine size={52} className="text-slate-50 group-hover:text-blue-500 transition-colors" />
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 transition-all"><ArrowLeft size={16} className="text-slate-300 rotate-180 group-hover:text-white" /></div>
            </div>
          </div>

          <div onClick={() => setScreen('alocacao')} className="bg-white w-56 h-56 rounded-[2rem] shadow hover:shadow-2xl border border-slate-100 p-6 flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-2 group">
            <span className="text-black font-black text-sm uppercase leading-tight text-left">Alocação MG1 - PCP</span>
            <div className="mt-auto flex items-end justify-between">
              <Package size={52} className="text-slate-50 group-hover:text-emerald-500 transition-colors" />
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-600 transition-all"><ArrowLeft size={16} className="text-slate-300 rotate-180 group-hover:text-white" /></div>
            </div>
          </div>

        </div>
      </main>

      <footer className="p-6 text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] bg-white border-t">
        Gestão Centralizada
      </footer>
    </div>
  );
}
