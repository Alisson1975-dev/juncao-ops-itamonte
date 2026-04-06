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

// Definição manual de ícones SVG
const Icons = {
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" cy="21" x2="16.65" y2="16.65"></line></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Pending: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Import: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
  Layers: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Save: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  Loader2: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
};

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
  const [isSaving, setIsSaving] = useState(false);
  const [btnLabels, setBtnLabels] = useState(['TR', 'TI', 'TS', 'TL']);
  const fileInputRef = useRef(null);
  const manualPasteRef = useRef(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);

  const [data, setData] = useState(() => 
    Array.from({ length: 600 }, (_, i) => ({
      id: i + 1, checked: false, sequencia: "", tabela: i < 300 ? 'azul' : 'verde', item: "", quantidade: "", data: "", ordemProducao: ""
    }))
  );

  const showActionMessage = useCallback((msg, type = 'info') => {
    setMessage({ text: String(msg), type });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const formatExcelValue = (val) => {
    if (!val) return "";
    if (typeof val === 'number' && val > 30000 && val < 60000) {
      try {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
      } catch (e) { return String(val); }
    }
    return String(val).trim();
  };

  const handleManualSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const dataDoc = doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current');
      const configDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'buttonConfigs');
      await Promise.all([setDoc(dataDoc, { rows: data }), setDoc(configDoc, { labels: btnLabels })]);
      showActionMessage("Dados guardados!");
    } catch (err) { showActionMessage("Erro ao guardar.", "error"); }
    finally { setIsSaving(false); }
  }, [data, btnLabels, user, showActionMessage]);

  const handleClearData = useCallback(async () => {
    const emptyRows = Array.from({ length: 600 }, (_, i) => ({ 
      id: i + 1, checked: false, sequencia: "", tabela: i < 300 ? 'azul' : 'verde', item: "", quantidade: "", data: "", ordemProducao: "" 
    }));
    setData(emptyRows);
    setShowClearConfirm(false);
    if (user) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current'), { rows: emptyRows });
        showActionMessage("Limpo!");
      } catch (err) { console.error(err); }
    }
  }, [user, showActionMessage]);

  const handleTransformPrefix = useCallback((newPrefix) => {
    setData(prev => {
      const anyChecked = prev.some(r => r.checked);
      return prev.map(row => {
        const shouldTransform = anyChecked ? row.checked : (row.tabela === 'azul');
        if (shouldTransform && row.item) {
          const itemStr = String(row.item).trim();
          if (itemStr.length >= 2) return { ...row, item: newPrefix + itemStr.slice(2) };
        }
        return row;
      });
    });
    showActionMessage(`Prefixo alterado: ${newPrefix}`);
  }, [showActionMessage]);

  const handleSequenciarOPs = useCallback(() => {
    const opMap = {};
    data.slice(300, 600).forEach(r => { if (r.sequencia && r.ordemProducao) opMap[String(r.sequencia)] = r.ordemProducao; });
    setData(prev => prev.map((r, i) => (i < 300 && r.sequencia && opMap[String(r.sequencia)]) ? { ...r, ordemProducao: opMap[String(r.sequencia)] } : r));
    showActionMessage("Sincronizado!");
  }, [data, showActionMessage]);

  const handleJuntarQuantidades = useCallback(() => {
    const part1 = data.slice(0, 300).filter(r => r.item && r.sequencia);
    if (part1.length === 0) return showActionMessage("Gere as sequências primeiro!", "error");
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
        return item ? { ...r, sequencia: item.s, item: item.i, quantidade: item.q.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), data: item.d, ordemProducao: "" } : { ...r, sequencia: "", item: "", quantidade: "", data: "", ordemProducao: "" };
      }
      return r;
    }));
    showActionMessage("Somado!");
  }, [data, showActionMessage]);

  const handleGerarSequencia = useCallback(() => {
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
    showActionMessage("Sequências geradas!");
  }, [showActionMessage]);

  const handleStartEdit = (row) => setEditingRow({ ...row });
  const handleSaveEdit = () => {
    if (!editingRow) return;
    setData(prev => prev.map(row => row.id === editingRow.id ? editingRow : row));
    setEditingRow(null);
    showActionMessage("Atualizado!");
  };

  const toggleCheck = (id) => setData(prev => prev.map(row => row.id === id ? { ...row, checked: !row.checked } : row));

  const processPastedText = useCallback((text, target) => {
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
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = window.XLSX.read(evt.target.result, { type: 'binary' });
        const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        setData(prev => {
          const next = [...prev];
          rows.slice(0, 300).forEach((r, i) => { if (Array.isArray(r)) next[i] = { ...next[i], item: formatExcelValue(r[0]), quantidade: formatExcelValue(r[1]), data: formatExcelValue(r[2]) }; });
          return next;
        });
        showActionMessage("Excel importado!");
      } catch (err) { showActionMessage("Erro no ficheiro.", "error"); }
    };
    reader.readAsBinaryString(file);
  };

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
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'buttonConfigs'), (d) => d.exists() && setBtnLabels(d.data().labels));
    const unsubscribeData = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current'), (d) => {
      if (d.exists() && !isDataLoaded) { setData(d.data().rows); setIsDataLoaded(true); }
    });
    return () => unsubscribeData();
  }, [user, isDataLoaded]);

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

  const copyColumn = (sliceStart, sliceEnd, mapFn, msg) => {
    const txt = data.slice(sliceStart, sliceEnd).filter(r => r.item || r.ordemProducao).map(mapFn).join('\n');
    if (!txt) return;
    const el = document.createElement("textarea"); el.value = txt; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    showActionMessage(msg);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-4 font-sans flex flex-col text-slate-900 text-sm">
      {message && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}><span className="text-xs font-black uppercase tracking-widest">{message.text}</span></div>}

      {editingRow && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase mb-6 text-center">Editar</h3>
            <div className="grid grid-cols-2 gap-4">
              {['sequencia', 'item', 'quantidade', 'data'].map(field => (
                <div key={field} className="flex flex-col gap-1 text-left"><label className="text-[10px] font-black uppercase text-slate-400">{field}</label><input type="text" value={editingRow[field]} onChange={(e) => setEditingRow({...editingRow, [field]: e.target.value})} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"/></div>
              ))}
              <div className="flex flex-col gap-1 col-span-2 text-left"><label className="text-[10px] font-black uppercase text-slate-400">OP</label><input type="text" value={editingRow.ordemProducao} onChange={(e) => setEditingRow({...editingRow, ordemProducao: e.target.value})} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"/></div>
            </div>
            <div className="flex gap-2 mt-8"><button onClick={handleSaveEdit} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg">Salvar</button><button onClick={() => setEditingRow(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs">Voltar</button></div>
          </div>
        </div>
      )}

      {showManualPaste && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="font-black uppercase mb-4">Colar do Excel</h3>
            <textarea ref={manualPasteRef} className="w-full h-40 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl outline-none text-xs font-mono mb-4" placeholder="Ctrl+V aqui..." onChange={(e) => processPastedText(e.target.value, pasteTarget)}/>
            <button onClick={() => setShowManualPaste(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs">Sair</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black uppercase mb-6 text-center">Prefixos</h3>
            <div className="space-y-4">
              {btnLabels.map((label, idx) => (
                <div key={idx} className="flex flex-col gap-1 text-left"><label className="text-[10px] font-black text-slate-400 uppercase">Botão {idx + 1}</label><input type="text" value={label} maxLength={5} onChange={(e) => { const n = [...btnLabels]; n[idx] = e.target.value.toUpperCase(); setBtnLabels(n); }} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"/></div>
              ))}
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full mt-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Voltar</button>
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto w-full flex flex-col h-[calc(100vh-2rem)] gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">Junção de OPs</h1>
            <div className="flex gap-2">
              <input type="text" placeholder="Filtrar..." className="w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              <button onClick={() => setShowSettings(true)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600"><Icons.Plus /></button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 border-t pt-4">
            <div className="flex flex-col items-center gap-1.5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transformar</span><div className="flex gap-2">{btnLabels.map((l, idx) => (<button key={idx} onClick={() => handleTransformPrefix(l)} className="px-8 py-1.5 bg-black text-white rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-md">{l}</button>))}</div></div>
            <div className="flex flex-col items-center gap-1.5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comandos</span><div className="flex gap-2"><button onClick={() => { setPasteTarget('geral'); setShowManualPaste(true); }} className="px-6 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Colar</button><button onClick={handleGerarSequencia} className="px-6 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Sequência</button><button onClick={handleJuntarQuantidades} className="px-6 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Somar</button><button onClick={handleSequenciarOPs} className="px-6 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Sinc. OPs</button></div></div>
            <div className="flex gap-2 mt-4"><button onClick={handleManualSave} className="px-6 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">{isSaving ? <Icons.Loader2 className="animate-spin" /> : 'Salvar'}</button><button onClick={() => setShowClearConfirm(true)} className="px-6 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Limpar</button></div>
          </div>
          {showClearConfirm && <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase text-red-600 animate-bounce">Confirmar limpeza? <button onClick={handleClearData} className="underline">SIM</button> <button onClick={() => setShowClearConfirm(false)} className="underline">NÃO</button></div>}
        </div>

        <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden px-1 relative">
          {[ {title: 'Parte 01', color: 'blue', data: leftTableData, isRight: false}, {title: 'Parte 02', color: 'green', data: rightTableData, isRight: true} ].map(table => (
            <div key={table.title} className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full min-w-[450px]">
              <div className="bg-black px-4 py-2 flex items-center justify-between text-white relative shadow-md z-20 uppercase font-black text-xs">
                <span>{table.title}</span>
                <div className="absolute left-1/2 -translate-x-1/2 flex gap-2">
                  {!table.isRight ? (
                    <><button onClick={() => copyColumn(0, 300, r => r.item, "Itens Copiados!")} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-md">Copiar Item</button><button onClick={() => copyColumn(0, 300, r => r.ordemProducao, "OPs Copiadas!")} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-md">Copiar OP</button></>
                  ) : (
                    <><button onClick={() => { setPasteTarget('op'); setShowManualPaste(true); }} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-md">Colar OPs</button><button onClick={() => copyColumn(300, 600, r => `${r.item}\t${r.quantidade}\t${r.data}`, "Dados Copiados!")} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-md">Copiar Dados</button></>
                  )}
                </div>
                <span className="text-[9px] opacity-50">300 LINHAS</span>
              </div>
              <div className="flex-grow overflow-y-auto scrollbar-thin">
                <table className="w-full border-collapse table-fixed">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase text-center">
                    <tr><th className="w-8"></th><th className="w-8"></th><th className="w-10">Seq.</th><th className="w-28">Item</th><th className="w-32">Qtd.</th><th className="w-48">Data</th><th className={`w-auto ${table.isRight ? 'bg-green-50' : 'bg-blue-50'}`}>Ordem de Produção</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-center text-[10px]">
                    {table.data.map(r => (
                      <tr key={r.id} className={`hover:bg-slate-50/50 h-8 ${r.checked ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-1"><input type="checkbox" checked={r.checked} onChange={() => toggleCheck(r.id)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600"/></td>
                        <td className="px-1"><button onClick={() => handleStartEdit(r)} className="text-yellow-600"><Icons.Edit /></button></td>
                        <td className="font-black text-slate-600 bg-slate-50/30">{r.sequencia}</td>
                        <td className="px-1 text-slate-700 font-bold truncate">{String(r.item || "-")}</td>
                        <td className="font-mono">{String(r.quantidade)}</td>
                        <td>{String(r.data)}</td>
                        <td className={`font-black ${table.isRight ? 'text-green-700 bg-green-50/10' : 'text-blue-700 bg-blue-50/10'}`}>{String(r.ordemProducao || "-")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-blue-700 text-[10px] font-black uppercase">
            <span className="bg-blue-50 px-4 py-1.5 rounded-xl">Registos: {data.filter(r => r.item).length} / 600</span>
            {isDataLoaded && <span className="text-green-600 animate-pulse">● Online</span>}
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={!isLibraryLoaded} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-100 uppercase active:scale-95 disabled:bg-slate-300">Importar Excel</button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
        </div>
      </div>
      <style>{`.scrollbar-thin::-webkit-scrollbar { width: 4px; } .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
}
