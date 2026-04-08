import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Search, Settings, Trash2, Edit2, CheckCircle, Save, X, FileSpreadsheet, Copy, ClipboardPaste } from 'lucide-react';

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

/**
 * APLICAÇÃO FINAL: JUNÇÃO DE OPs
 * Versão fiel ao print: Cores sólidas, botões agrupados e cabeçalhos pretos.
 */
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
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);

  const [btnLabels, setBtnLabels] = useState(['TR', 'TI', 'TS', 'TL']);
  const fileInputRef = useRef(null);
  const manualPasteRef = useRef(null);

  const [data, setData] = useState(() => 
    Array.from({ length: 600 }, (_, i) => ({
      id: i + 1,
      checked: false,
      sequencia: "", 
      tabela: i < 300 ? 'azul' : 'verde',
      item: "",
      quantidade: "",
      data: "",
      ordemProducao: ""
    }))
  );

  // --- MENSAGENS ---
  const showActionMessage = useCallback((msg, type = 'info') => {
    setMessage({ text: String(msg), type });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // --- UTILITÁRIOS ---
  const formatExcelValue = useCallback((val) => {
    if (val === undefined || val === null) return "";
    if (val instanceof Date) {
      const d = String(val.getUTCDate()).padStart(2, '0');
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const y = val.getUTCFullYear();
      return `${d}/${m}/${y}`;
    }
    if (typeof val === 'number' && val > 30000 && val < 60000) {
      try {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        const d = String(date.getUTCDate()).padStart(2, '0');
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const y = date.getUTCFullYear();
        return `${d}/${m}/${y}`;
      } catch (e) { return String(val); }
    }
    return String(val).trim();
  }, []);

  // --- LOGICA ---
  const handleManualSave = useCallback(async () => {
    if (!user) return;
    try {
      const dataDoc = doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current');
      const configDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'buttonConfigs');
      await Promise.all([setDoc(dataDoc, { rows: data }), setDoc(configDoc, { labels: btnLabels })]);
      showActionMessage("Dados guardados!");
    } catch (err) { showActionMessage("Erro ao salvar.", "error"); }
  }, [data, btnLabels, user, showActionMessage]);

  const handleClearData = useCallback(async () => {
    const emptyRows = Array.from({ length: 600 }, (_, i) => ({ 
      id: i + 1, checked: false, sequencia: "", tabela: i < 300 ? 'azul' : 'verde', item: "", quantidade: "", data: "", ordemProducao: "" 
    }));
    setData(emptyRows);
    setShowClearConfirm(false);
    if (user) {
      try {
        const dataDoc = doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current');
        await setDoc(dataDoc, { rows: emptyRows });
        showActionMessage("Tabela limpa!");
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
    showActionMessage(`Prefixo alterado para ${newPrefix}`);
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
  const handleSaveEdit = useCallback(() => {
    if (!editingRow) return;
    setData(prev => prev.map(row => row.id === editingRow.id ? editingRow : row));
    setEditingRow(null);
    showActionMessage("Editado!");
  }, [editingRow, showActionMessage]);

  const toggleCheck = useCallback((id) => setData(prev => prev.map(row => row.id === id ? { ...row, checked: !row.checked } : row)), []);

  const processPastedText = useCallback((text, target) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    setData(prev => {
      const next = [...prev];
      if (target === 'geral') {
        lines.slice(0, 300).forEach((line, index) => {
          const cols = line.split(/\t/);
          next[index] = { ...next[index], item: formatExcelValue(cols[0]), quantidade: formatExcelValue(cols[1]), data: formatExcelValue(cols[2]) };
        });
      } else if (target === 'op') {
        lines.forEach((line, i) => { if (i + 300 < 600) next[i+300].ordemProducao = formatExcelValue(line); });
      }
      return next;
    });
    setShowManualPaste(false);
  }, [formatExcelValue]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = window.XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
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

  const copyToClipboard = (txt) => {
    const el = document.createElement("textarea"); el.value = txt; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    showActionMessage("Copiado!");
  };

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const configDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'buttonConfigs');
    onSnapshot(configDoc, (docSnap) => { if (docSnap.exists()) { const l = docSnap.data().labels; if (l) setBtnLabels(l); } });
    const dataDoc = doc(db, 'artifacts', appId, 'public', 'data', 'tableContent', 'current');
    const unsubscribeData = onSnapshot(dataDoc, (docSnap) => { 
      if (docSnap.exists() && !isDataLoaded) { 
        const r = docSnap.data().rows; if (r) setData(r); 
      } 
      setIsDataLoaded(true); 
    });
    return () => unsubscribeData();
  }, [user, isDataLoaded]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    script.onload = () => setIsLibraryLoaded(true);
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

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
  const filledCount = useMemo(() => data.filter(row => row.item || row.quantidade || row.data || row.ordemProducao).length, [data]);

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-4 font-sans flex flex-col text-slate-900 overflow-hidden">
      
      {message && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] text-white px-8 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 ${message.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
          <span className="text-sm font-black uppercase tracking-widest">{message.text}</span>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editingRow && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase mb-6 text-center text-slate-800">Editar Registo</h3>
            <div className="grid grid-cols-2 gap-4">
              {['sequencia', 'item', 'quantidade', 'data'].map(k => (
                <div key={k} className="flex flex-col gap-1 text-left text-slate-700">
                  <label className="text-[10px] font-black uppercase">{k}</label>
                  <input type="text" value={editingRow[k]} onChange={(e) => setEditingRow({...editingRow, [k]: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"/>
                </div>
              ))}
              <div className="flex flex-col gap-1 col-span-2 text-left text-slate-700">
                <label className="text-[10px] font-black uppercase">Ordem de Produção</label>
                <input type="text" value={editingRow.ordemProducao} onChange={(e) => setEditingRow({...editingRow, ordemProducao: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"/>
              </div>
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={handleSaveEdit} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Salvar</button>
              <button onClick={() => setEditingRow(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs">Voltar</button>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="max-w-[1900px] mx-auto w-full flex flex-col h-[calc(100vh-2rem)] gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">Junção de OPs</h1>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Pesquisar..." className="w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                <button onClick={() => setShowSettings(true)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-colors">
                   <Settings size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 border-t border-slate-100 pt-4">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transformação</span>
                <div className="flex gap-2">
                  {btnLabels.map((l, idx) => (
                    <button key={l + idx} onClick={() => handleTransformPrefix(l)} className="px-8 py-2 bg-black text-white rounded-xl hover:bg-slate-800 transition-all text-[11px] font-black uppercase min-w-[70px] shadow-md">{l}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comandos</span>
                <div className="flex gap-2">
                  <button onClick={() => { setPasteTarget('geral'); setShowManualPaste(true); }} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase shadow-md transition-all">Colar Dados</button>
                  <button onClick={handleGerarSequencia} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase shadow-md transition-all">Gerar Sequência</button>
                  <button onClick={handleJuntarQuantidades} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase shadow-md transition-all">Juntar Quantidades</button>
                  <button onClick={handleSequenciarOPs} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase shadow-md transition-all">Sequenciar OPs</button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <button onClick={handleManualSave} className="px-8 py-2 bg-green-600 text-white rounded-xl text-[11px] font-black uppercase shadow-md hover:bg-green-700">Salvar</button>
                <div className="relative">
                  {!showClearConfirm ? (
                    <button onClick={() => setShowClearConfirm(true)} className="px-8 py-2 bg-red-600 text-white rounded-xl text-[11px] font-black uppercase shadow-md hover:bg-red-700">Limpar</button>
                  ) : (
                    <div className="flex items-center gap-1 bg-red-600 text-white rounded-xl p-1 shadow-lg animate-in zoom-in-95">
                      <button onClick={handleClearData} className="px-3 py-1.5 hover:bg-red-800 rounded-lg font-black text-[10px]">Sim</button>
                      <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 hover:bg-red-800 rounded-lg font-black text-[10px]">Voltar</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABELAS */}
        <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden px-1 relative">
          {/* Parte 01 */}
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-black h-12 px-6 flex items-center justify-between shadow-md text-white">
              <h2 className="font-black text-xs uppercase tracking-widest">Parte 01</h2>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(data.slice(0, 300).filter(r => r.item).map(r => r.item).join('\n'))} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg shadow-md text-[10px] font-black uppercase">Copiar Item</button>
                <button onClick={() => copyToClipboard(data.slice(0, 300).filter(r => r.ordemProducao).map(r => r.ordemProducao).join('\n'))} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg shadow-md text-[10px] font-black uppercase">Copiar OP</button>
              </div>
              <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black">300 LINHAS</span>
            </div>
            <div className="flex-grow overflow-y-auto scrollbar-thin">
              <table className="w-full border-collapse table-fixed text-center">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-500">
                  <tr className="h-10">
                    <th className="w-8 border-r border-slate-100"></th>
                    <th className="w-8 border-r border-slate-100"></th>
                    <th className="w-10 border-r border-slate-100">Seq.</th>
                    <th className="w-24">Item</th>
                    <th className="w-28 border-x border-slate-100">Qtd.</th>
                    <th className="w-32 border-r border-slate-100">Data</th>
                    <th className="w-auto">Ordem de Produção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {leftTableData.map(r => (
                    <tr key={r.id} className={`h-9 hover:bg-slate-50 ${r.checked ? 'bg-blue-50/40' : ''}`}>
                      <td className="border-r border-slate-50"><input type="checkbox" checked={r.checked} onChange={() => toggleCheck(r.id)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600"/></td>
                      <td className="border-r border-slate-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => handleStartEdit(r)}><Edit2 size={12} className="mx-auto"/></td>
                      <td className="font-black text-slate-400 border-r border-slate-50">{r.sequencia}</td>
                      <td className="font-bold text-slate-700 truncate px-2">{String(r.item || "")}</td>
                      <td className="font-mono text-slate-600">{String(r.quantidade || "")}</td>
                      <td className="text-slate-500">{String(r.data || "")}</td>
                      <td className="text-blue-700 font-black truncate px-2">{String(r.ordemProducao || "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Parte 02 */}
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-black h-12 px-6 flex items-center justify-between shadow-md text-white">
              <h2 className="font-black text-xs uppercase tracking-widest">Parte 02</h2>
              <div className="flex gap-2">
                <button onClick={() => { setPasteTarget('op'); setShowManualPaste(true); }} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg shadow-md text-[10px] font-black uppercase">Colar OPs</button>
                <button onClick={() => copyToClipboard(data.slice(300, 600).filter(r => r.item).map(r => `${r.item}\t${r.quantidade}\t${r.data}`).join('\n'))} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg shadow-md text-[10px] font-black uppercase">Copiar Dados</button>
              </div>
              <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black">300 LINHAS</span>
            </div>
            <div className="flex-grow overflow-y-auto scrollbar-thin">
              <table className="w-full border-collapse table-fixed text-center">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-500">
                  <tr className="h-10">
                    <th className="w-8 border-r border-slate-100"></th>
                    <th className="w-8 border-r border-slate-100"></th>
                    <th className="w-10 border-r border-slate-100">Seq.</th>
                    <th className="w-24">Item</th>
                    <th className="w-28 border-x border-slate-100">Qtd.</th>
                    <th className="w-32 border-r border-slate-100">Data</th>
                    <th className="w-auto">Ordem de Produção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {rightTableData.map(r => (
                    <tr key={r.id} className={`h-9 hover:bg-slate-50 ${r.checked ? 'bg-blue-50/40' : ''}`}>
                      <td className="border-r border-slate-50"><input type="checkbox" checked={r.checked} onChange={() => toggleCheck(r.id)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600"/></td>
                      <td className="border-r border-slate-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => handleStartEdit(r)}><Edit2 size={12} className="mx-auto"/></td>
                      <td className="font-black text-slate-400 border-r border-slate-50">{r.sequencia}</td>
                      <td className="font-bold text-slate-700 truncate px-2">{String(r.item || "")}</td>
                      <td className="font-mono text-slate-600">{String(r.quantidade || "")}</td>
                      <td className="text-slate-500">{String(r.data || "")}</td>
                      <td className="text-blue-700 font-black truncate px-2">{String(r.ordemProducao || "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-blue-700 text-[10px] font-black uppercase">
            <span className="bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-100 shadow-inner flex items-center gap-2">Registos Ativos: {filledCount} / 600</span>
            {isDataLoaded && <span className="text-emerald-600 animate-pulse">● Ligado à Nuvem</span>}
          </div>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="px-10 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg uppercase tracking-widest active:scale-95">Importar Excel</button>
          </div>
        </div>
      </div>

      {/* MODAL CONFIG */}
      {showSettings && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 text-slate-800">
            <h3 className="text-lg font-black uppercase mb-6 text-center">Configurar Botões</h3>
            <div className="space-y-4">
              {btnLabels.map((label, idx) => (
                <div key={label + idx} className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prefixo {idx + 1}</label>
                  <input type="text" value={label} maxLength={5} onChange={(e) => { const n = [...btnLabels]; n[idx] = e.target.value.toUpperCase(); setBtnLabels(n); }} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"/>
                </div>
              ))}
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full py-3 mt-8 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg">Voltar</button>
          </div>
        </div>
      )}

      {/* MODAL PASTE */}
      {showManualPaste && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="font-black uppercase mb-4 text-slate-900">Colagem Manual</h3>
            <textarea ref={manualPasteRef} className="w-full h-48 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl outline-none text-xs font-mono mb-4 text-slate-700" placeholder="Cole as colunas aqui..." onChange={(e) => processPastedText(e.target.value, pasteTarget)}/>
            <button onClick={() => setShowManualPaste(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
