import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

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
const appId = 'juncao-ops-v1';

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [pasteTarget, setPasteTarget] = useState(null);
  const [user, setUser] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [btnLabels, setBtnLabels] = useState(['TR', 'TI', 'TS', 'TL']);
  const fileInputRef = useRef(null);
  const manualPasteRef = useRef(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);

  const [data, setData] = useState(() => 
    Array.from({ length: 600 }, (_, i) => ({
      id: i + 1, checked: false, sequencia: "", tabela: i < 300 ? 'azul' : 'verde', item: "", quantidade: "", data: "", ordemProducao: ""
    }))
  );

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    onAuthStateChanged(auth, setUser);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => setIsLibraryLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!user) return;
    const dataDoc = doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current');
    const unsubscribe = onSnapshot(dataDoc, (docSnap) => {
      if (docSnap.exists() && !isDataLoaded) {
        setData(docSnap.data().rows);
        setIsDataLoaded(true);
      }
    });
    return () => unsubscribe();
  }, [user, isDataLoaded]);

  const showActionMessage = useCallback((msg, type = 'info') => {
    setMessage({ text: String(msg), type });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // --- TODAS AS SUAS FUNÇÕES ORIGINAIS (SEM MUDANÇAS) ---
  const handleManualSave = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current'), { rows: data });
      showActionMessage("Dados guardados!");
    } catch (err) { showActionMessage("Erro ao guardar.", "error"); }
  };

  const handleTransformPrefix = (newPrefix) => {
    setData(prev => prev.map(row => {
      const shouldTransform = prev.some(r => r.checked) ? row.checked : (row.tabela === 'azul');
      if (shouldTransform && row.item) {
        const itemStr = String(row.item).trim();
        if (itemStr.length >= 2) return { ...row, item: newPrefix + itemStr.slice(2) };
      }
      return row;
    }));
    showActionMessage(`Prefixo alterado: ${newPrefix}`);
  };

  const handleSequenciarOPs = () => {
    const opMap = {};
    data.slice(300, 600).forEach(r => { if (r.sequencia && r.ordemProducao) opMap[String(r.sequencia)] = r.ordemProducao; });
    setData(prev => prev.map((r, i) => (i < 300 && r.sequencia && opMap[String(r.sequencia)]) ? { ...r, ordemProducao: opMap[String(r.sequencia)] } : r));
  };

  const handleJuntarQuantidades = () => {
    const part1 = data.slice(0, 300).filter(r => r.item && r.sequencia);
    const groups = {};
    part1.forEach(r => {
      const s = String(r.sequencia);
      if (!groups[s]) groups[s] = { s: r.sequencia, i: r.item, q: 0, d: r.data };
      const raw = String(r.quantidade || "0").replace(/\./g, '').replace(',', '.');
      groups[s].q += parseFloat(raw) || 0;
    });
    const ag = Object.values(groups).sort((a, b) => Number(a.s) - Number(b.s));
    setData(prev => prev.map((r, i) => {
      if (i >= 300) {
        const item = ag[i - 300];
        return item ? { ...r, sequencia: item.s, item: item.i, quantidade: item.q.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), data: item.d } : r;
      }
      return r;
    }));
  };

  const handleGerarSequencia = () => {
    let s = 0, last = null;
    setData(prev => prev.map((r, i) => {
      if (i < 300) {
        const cur = String(r.item || "").trim();
        if (!cur) return r;
        if (cur !== last) { s++; last = cur; }
        return { ...r, sequencia: s };
      }
      return r;
    }));
  };

  const processPastedText = (text, target) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    setData(prev => {
      const next = [...prev];
      if (target === 'geral') {
        lines.slice(0, 300).forEach((line, index) => {
          const cols = line.split(/\t/);
          next[index] = { ...next[index], item: cols[0]?.trim() || "", quantidade: cols[1]?.trim() || "", data: cols[2]?.trim() || "" };
        });
      } else if (target === 'op') {
        lines.forEach((line, i) => { if (i + 300 < 600) next[i+300].ordemProducao = line.trim(); });
      }
      return next;
    });
    setShowManualPaste(false);
  };

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return data.filter(row => 
      (row.sequencia && String(row.sequencia).toLowerCase().includes(term)) ||
      (row.item && String(row.item).toLowerCase().includes(term)) ||
      (row.ordemProducao && String(row.ordemProducao).toLowerCase().includes(term))
    );
  }, [data, searchTerm]);

  const leftTableData = useMemo(() => filteredData.filter(row => row.tabela === 'azul'), [filteredData]);
  const rightTableData = useMemo(() => filteredData.filter(row => row.tabela === 'verde'), [filteredData]);

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-4 font-sans flex flex-col text-slate-900">
      
      {showManualPaste && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="font-black uppercase mb-4 text-slate-900 text-center">Colagem Manual</h3>
            <textarea ref={manualPasteRef} className="w-full h-40 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl outline-none text-xs font-mono mb-4 text-slate-700" placeholder="Pressione Ctrl+V aqui..." onChange={(e) => processPastedText(e.target.value, pasteTarget)}/>
            <button onClick={() => setShowManualPaste(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs">Voltar</button>
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto w-full flex flex-col h-[calc(100vh-2rem)] gap-4">
        
        {/* CABEÇALHO DO PRINT */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">Junção de OPs</h1>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Pesquisar..." className="w-64 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              <button className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400"><Settings size={18} /></button>
            </div>
          </div>

          <div className="flex flex-col gap-6 items-center border-t border-slate-100 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-x-20 gap-y-6">
              {/* TRANSFORMAÇÃO */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transformação</span>
                <div className="flex gap-2">
                  {btnLabels.map((l) => (
                    <button key={l} onClick={() => handleTransformPrefix(l)} className="px-10 py-2 bg-black text-white rounded-lg text-[11px] font-black uppercase shadow-md active:scale-95">{l}</button>
                  ))}
                </div>
              </div>

              {/* COMANDOS */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comandos</span>
                <div className="flex gap-2">
                  <button onClick={() => { setPasteTarget('geral'); setShowManualPaste(true); }} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase shadow-md active:scale-95">Colar Dados</button>
                  <button onClick={handleGerarSequencia} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase shadow-md active:scale-95">Gerar Sequência</button>
                  <button onClick={handleJuntarQuantidades} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase shadow-md active:scale-95">Juntar Quantidades</button>
                  <button onClick={handleSequenciarOPs} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase shadow-md active:scale-95">Sequenciar OPs</button>
                </div>
              </div>
            </div>

            {/* BOTÕES CENTRALIZADOS SALVAR / LIMPAR */}
            <div className="flex gap-2">
              <button onClick={handleManualSave} className="px-14 py-2 bg-green-600 text-white rounded-lg text-[11px] font-black uppercase shadow-md active:scale-95 hover:bg-green-700">Salvar</button>
              <button onClick={() => setShowClearConfirm(true)} className="px-14 py-2 bg-red-600 text-white rounded-lg text-[11px] font-black uppercase shadow-md active:scale-95 hover:bg-red-700">Limpar</button>
            </div>
          </div>
        </div>

        {/* TABELAS IGUAIS AO PRINT */}
        <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
          {/* PARTE 01 */}
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full">
            <div className="bg-black px-4 py-2 flex items-center justify-between text-white relative">
              <h2 className="font-black text-xs uppercase tracking-widest leading-none">Parte 01</h2>
              <div className="absolute left-1/2 -translate-x-1/2 flex gap-2">
                <button className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm">Copiar Item</button>
                <button className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm">Copiar OP</button>
              </div>
              <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded">300 LINHAS</span>
            </div>
            <div className="flex-grow overflow-auto">
              <table className="w-full text-center border-collapse table-fixed">
                <thead className="sticky top-0 bg-slate-50 text-[9px] font-black text-slate-500 uppercase border-b">
                  <tr><th className="w-8"></th><th className="w-8"></th><th className="w-12">Seq.</th><th className="w-28">Item</th><th className="w-28">Qtd.</th><th className="w-32">Data</th></tr>
                </thead>
                <tbody className="divide-y text-[10px]">
                  {leftTableData.map(r => (
                    <tr key={r.id} className="h-8 hover:bg-slate-50">
                      <td><input type="checkbox" checked={r.checked} onChange={() => setData(prev => prev.map(x => x.id === r.id ? {...x, checked: !x.checked} : x))} /></td>
                      <td><Edit size={12} className="text-yellow-600 mx-auto" /></td>
                      <td className="font-black text-slate-400">{r.sequencia}</td>
                      <td className="font-bold">{r.item}</td>
                      <td>{r.quantidade}</td>
                      <td>{r.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PARTE 02 */}
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full">
            <div className="bg-black px-4 py-2 flex items-center justify-between text-white relative">
              <h2 className="font-black text-xs uppercase tracking-widest leading-none">Parte 02</h2>
              <div className="absolute left-1/2 -translate-x-1/2 flex gap-2">
                <button className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm">Colar OPs</button>
                <button className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm">Copiar Dados</button>
              </div>
              <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded">300 LINHAS</span>
            </div>
            <div className="flex-grow overflow-auto">
              <table className="w-full text-center border-collapse table-fixed">
                <thead className="sticky top-0 bg-slate-50 text-[9px] font-black text-slate-500 uppercase border-b">
                  <tr><th className="w-8"></th><th className="w-8"></th><th className="w-12">Seq.</th><th className="w-28">Item</th><th className="w-28">Qtd.</th><th className="w-32">Data</th></tr>
                </thead>
                <tbody className="divide-y text-[10px]">
                  {rightTableData.map(r => (
                    <tr key={r.id} className="h-8 hover:bg-slate-50">
                      <td><input type="checkbox" checked={r.checked} onChange={() => setData(prev => prev.map(x => x.id === r.id ? {...x, checked: !x.checked} : x))} /></td>
                      <td><Edit size={12} className="text-yellow-600 mx-auto" /></td>
                      <td className="font-black text-slate-400">{r.sequencia}</td>
                      <td className="font-bold">{r.item}</td>
                      <td>{r.quantidade}</td>
                      <td>{r.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO PRINT */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-blue-100 shadow-sm">Registos Ativos: {data.filter(r => r.item).length} / 600</span>
            <span className="text-green-600 text-[10px] font-black uppercase flex items-center gap-1.5 italic">● Online</span>
          </div>
          <button onClick={() => fileInputRef.current.click()} className="px-10 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-100 active:scale-95 transition-all">Importar Excel</button>
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
    </div>
  );
}

// Ícones Auxiliares
const Settings = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const Edit = ({size, className}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
