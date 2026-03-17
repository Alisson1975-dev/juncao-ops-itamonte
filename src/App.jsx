import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURAÇÃO FIREBASE REAL (JUNÇÃO DE OPs - ITAMONTE) ---
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
const appId = 'juncao-ops-itamonte-v1';

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pasteTarget, setPasteTarget] = useState(null);
  const [user, setUser] = useState(null);
  
  const [btnLabels, setBtnLabels] = useState(['TR', 'TI', 'TS', 'TL']);
  
  const fileInputRef = useRef(null);
  const manualPasteRef = useRef(null);
  
  const [data, setData] = useState(() => 
    Array.from({ length: 600 }, (_, i) => ({
      id: i + 1,
      sequencia: "", 
      tabela: i < 300 ? 'azul' : 'verde',
      item: "",
      quantidade: "",
      data: "",
      ordemProducao: ""
    }))
  );

  const showActionMessage = useCallback((msg, type = 'info') => {
    setMessage({ text: String(msg), type });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // --- LÓGICA DE NEGÓCIO ---

  const handleJuntarQuantidades = useCallback(() => {
    const part1 = data.slice(0, 300).filter(r => r.item && r.sequencia);
    if (part1.length === 0) return showActionMessage("Gere as sequências primeiro!", "error");
    
    const groups = {};
    part1.forEach(r => {
      const s = String(r.sequencia);
      if (!groups[s]) groups[s] = { s: r.sequencia, i: r.item, q: 0, d: r.data };
      
      const rawValue = String(r.quantidade || "0");
      const cleanValue = rawValue.replace(/\./g, '').replace(',', '.');
      const val = parseFloat(cleanValue) || 0;
      
      groups[s].q += val;
    });

    const ag = Object.values(groups).sort((a, b) => Number(a.s) - Number(b.s));
    
    const newData = data.map((r, i) => {
      if (i >= 300) {
        const item = ag[i - 300];
        return item ? { 
          ...r, 
          sequencia: item.s, 
          item: item.i, 
          quantidade: item.q.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
          data: item.d, 
          ordemProducao: "" 
        } : { ...r, sequencia: "", item: "", quantidade: "", data: "", ordemProducao: "" };
      }
      return r;
    });
    
    setData(newData);
    showActionMessage("Somas concluídas com sucesso!");
  }, [data, showActionMessage]);

  const handleGerarSequencia = useCallback(() => {
    let s = 0, last = null;
    const newData = data.map((r, i) => {
      if (i < 300) {
        const cur = String(r.item || "").trim();
        if (!cur) return r;
        if (cur !== last) { s++; last = cur; }
        return { ...r, sequencia: s };
      }
      return r;
    });
    setData(newData);
    showActionMessage("Sequência gerada!");
  }, [data, showActionMessage]);

  const handleCopiarItemP1 = useCallback(() => {
    const items = data.slice(0, 300).filter(r => r.item).map(r => r.item).join('\n');
    if (!items) return;
    const el = document.createElement("textarea"); el.value = items; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    showActionMessage("Itens copiados!");
  }, [data, showActionMessage]);

  const handleCopiarOPP1 = useCallback(() => {
    const ops = data.slice(0, 300).filter(r => r.ordemProducao).map(r => r.ordemProducao).join('\n');
    if (!ops) return;
    const el = document.createElement("textarea"); el.value = ops; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    showActionMessage("OPs copiadas!");
  }, [data, showActionMessage]);

  const handleCopiarPart02 = useCallback(() => {
    const txt = data.slice(300, 600).filter(r => r.item).map(r => `${r.item}\t${r.quantidade}\t${r.data}`).join('\n');
    if (!txt) return;
    const el = document.createElement("textarea"); el.value = txt; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    showActionMessage("Dados P2 copiados!");
  }, [data, showActionMessage]);

  const handleSequenciarOPs = useCallback(() => {
    const opMap = {};
    data.slice(300, 600).forEach(r => { if (r.sequencia && r.ordemProducao) opMap[String(r.sequencia)] = r.ordemProducao; });
    const newData = data.map((r, i) => (i < 300 && r.sequencia && opMap[String(r.sequencia)]) ? { ...r, ordemProducao: opMap[String(r.sequencia)] } : r);
    setData(newData);
    showActionMessage("OPs Sincronizadas!");
  }, [data, showActionMessage]);

  const handleTransformPrefix = useCallback((newPrefix) => {
    const newData = data.map(row => {
      if (row.tabela === 'azul' && row.item) {
        const itemStr = String(row.item).trim();
        if (itemStr.length >= 2) return { ...row, item: newPrefix + itemStr.slice(2) };
      }
      return row;
    });
    setData(newData);
    showActionMessage(`Transformado para ${newPrefix}`);
  }, [data, showActionMessage]);

  const handleClearData = useCallback(() => {
    setData(Array.from({ length: 600 }, (_, i) => ({ id: i + 1, sequencia: "", tabela: i < 300 ? 'azul' : 'verde', item: "", quantidade: "", data: "", ordemProducao: "" })));
    setShowClearConfirm(false);
    showActionMessage("Limpeza concluída.");
  }, [showActionMessage]);

  const processPastedText = useCallback((text, target) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    const newData = [...data];
    if (target === 'geral') {
      lines.slice(0, 300).forEach((line, index) => {
        const cols = line.split(/\t/);
        newData[index] = { ...newData[index], item: cols[0]?.trim() || "", quantidade: cols[1]?.trim() || "", data: cols[2]?.trim() || "" };
      });
    } else if (target === 'op') {
      lines.forEach((line, i) => { if (i + 300 < 600) newData[i+300].ordemProducao = line.trim(); });
    }
    setData(newData);
    setShowManualPaste(false);
  }, [data]);

  const handlePasteAction = async (target) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) processPastedText(text, target);
      else showActionMessage("Vazio.", "error");
    } catch (err) {
      setPasteTarget(target);
      setShowManualPaste(true);
      setTimeout(() => manualPasteRef.current?.focus(), 100);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = window.XLSX.read(bstr, { type: 'binary' });
        const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const newData = [...data];
        rows.slice(0, 300).forEach((r, i) => { 
          if (Array.isArray(r)) {
            newData[i] = { 
              ...newData[i], 
              item: r[0] ? String(r[0]).trim() : "", 
              quantidade: r[1] ? String(r[1]).trim() : "", 
              data: r[2] ? String(r[2]).trim() : "" 
            }; 
          }
        });
        setData(newData);
        showActionMessage("Excel importado!");
      } catch (err) { showActionMessage("Erro no ficheiro.", "error"); }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const configDoc = doc(db, 'settings', 'buttonConfigs');
    const unsubscribe = onSnapshot(configDoc, (docSnap) => {
      if (docSnap.exists()) {
        const cloudLabels = docSnap.data().labels;
        if (cloudLabels) setBtnLabels(cloudLabels);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const saveConfig = async (newLabels) => {
    if (!user) return;
    try {
      const configDoc = doc(db, 'settings', 'buttonConfigs');
      await setDoc(configDoc, { labels: newLabels });
      showActionMessage("Salvo!");
      setShowSettings(false);
    } catch (err) { console.error(err); }
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
  const filledCount = useMemo(() => data.filter(row => row.item || row.quantidade || row.data || row.ordemProducao).length, [data]);

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-4 font-sans flex flex-col text-slate-900">
      
      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
          <span className="text-xs font-black uppercase">{message.text}</span>
        </div>
      )}

      {showManualPaste && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-center text-slate-900">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="font-black uppercase mb-4">Colagem Manual</h3>
            <textarea 
              ref={manualPasteRef} 
              className="w-full h-40 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl outline-none text-xs font-mono mb-4" 
              placeholder="Pressione Ctrl+V aqui..." 
              onChange={(e) => processPastedText(e.target.value, pasteTarget)}
            />
            <button onClick={() => setShowManualPaste(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs">Voltar</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-slate-900">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black uppercase mb-6 text-center">Configurações</h3>
            <div className="space-y-4 text-left">
              {btnLabels.map((label, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Prefixo {idx + 1}</label>
                  <input 
                    type="text" 
                    value={label} 
                    maxLength={5} 
                    onChange={(e) => { 
                      const n = [...btnLabels]; 
                      n[idx] = e.target.value.toUpperCase(); 
                      setBtnLabels(n); 
                    }} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => saveConfig(btnLabels)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs">Salvar</button>
              <button onClick={() => setShowSettings(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs">Voltar</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto w-full flex flex-col h-[calc(100vh-2rem)] gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h1 className="text-xl font-black uppercase tracking-tight shrink-0">Junção de OPs</h1>
            
            <div className="flex flex-wrap items-center justify-center gap-2 flex-grow">
              <button onClick={handleGerarSequencia} className="px-4 py-1.5 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-[10px] font-black uppercase hover:bg-sky-100 transition-all">Gerar Sequência</button>
              <button onClick={handleJuntarQuantidades} className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 transition-all">Juntar Quantidades</button>
              <button onClick={handleSequenciarOPs} className="px-4 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px] font-black uppercase hover:bg-amber-100 transition-all">Sequenciar OPs</button>
              <div className="relative">
                {!showClearConfirm ? (
                  <button onClick={() => setShowClearConfirm(true)} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm">Limpar</button>
                ) : (
                  <div className="flex items-center gap-1 bg-red-600 text-white rounded-lg p-0.5 shadow-lg">
                    <button onClick={handleClearData} className="px-2 py-1 hover:bg-red-700 rounded font-bold text-[10px]">Sim</button>
                    <button onClick={() => setShowClearConfirm(false)} className="px-2 py-1 hover:bg-red-700 rounded font-bold text-[10px]">Voltar</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0 items-center">
              <input type="text" placeholder="Pesquisar..." className="w-full lg:w-48 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              <button onClick={() => setShowSettings(true)} className="w-full lg:w-48 py-1 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 text-[10px] font-black uppercase">
                Configurações
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 pt-4 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transformação</span>
            <div className="flex flex-wrap justify-center gap-2">
              {btnLabels.map((l, idx) => (
                <button key={idx} onClick={() => handleTransformPrefix(l)} className="px-8 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-black transition-all text-[10px] font-black uppercase min-w-[80px]">{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden px-1 relative">
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full min-w-[450px]">
            <div className="bg-blue-600 px-4 py-2 flex items-center justify-between shadow-md z-20 relative text-white">
              <h2 className="font-black text-xs uppercase">Parte 01</h2>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                <button onClick={() => handlePasteAction('geral')} className="bg-amber-400 text-amber-900 px-3 py-1.5 rounded-lg shadow-md hover:bg-amber-500 transition-all border-2 border-white text-[10px] font-black uppercase">Colar Dados</button>
                <button onClick={handleCopiarItemP1} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-orange-600 transition-all border-2 border-white text-[10px] font-black uppercase">Copiar Item</button>
                <button onClick={handleCopiarOPP1} className="bg-pink-500 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-pink-600 transition-all border-2 border-white text-[10px] font-black uppercase">Copiar OP</button>
              </div>
              <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded uppercase">300 Linhas</span>
            </div>
            <div className="flex-grow overflow-y-auto scrollbar-thin">
              <table className="w-full border-collapse table-fixed">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase">
                  <tr className="text-center">
                    <th className="px-2 py-2 w-10 border-r border-slate-100">Seq.</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-2 py-2 w-20 border-x border-slate-100">Qtd.</th>
                    <th className="px-3 py-2 w-24 border-r border-slate-100">Data</th>
                    <th className="px-3 py-2 w-32 bg-blue-50/50">Ordem de Produção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-center text-[10px]">
                  {leftTableData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 h-8">
                      <td className="font-black text-slate-600 border-r border-slate-50 bg-slate-50/30">{r.sequencia}</td>
                      <td className="px-3 text-slate-700 font-bold truncate">{String(r.item || "-")}</td>
                      <td className="font-mono">{String(r.quantidade)}</td>
                      <td>{String(r.data)}</td>
                      <td className="text-blue-700 font-black bg-blue-50/20">{String(r.ordemProducao || "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden md:block w-1 bg-slate-200 rounded-full opacity-30 shadow-inner"></div>

          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full min-w-[450px]">
            <div className="bg-green-600 px-4 py-2 flex items-center justify-between shadow-md z-20 relative text-white">
              <h2 className="font-black text-xs uppercase">Parte 02</h2>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                <button onClick={() => handlePasteAction('op')} className="bg-amber-400 text-amber-900 px-3 py-1.5 rounded-lg shadow-md hover:bg-amber-500 border-2 border-white text-[10px] font-black uppercase">Colar OPs</button>
                <button onClick={handleCopiarPart02} className="bg-pink-500 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-pink-600 border-2 border-white text-[10px] font-black uppercase">Copiar Dados</button>
              </div>
              <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded uppercase">300 Linhas</span>
            </div>
            <div className="flex-grow overflow-y-auto scrollbar-thin">
              <table className="w-full border-collapse table-fixed">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase">
                  <tr className="text-center">
                    <th className="px-2 py-2 w-10 border-r border-slate-100">Seq.</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-2 py-2 w-20 border-x border-slate-100">Qtd.</th>
                    <th className="px-3 py-2 w-24 border-r border-slate-100">Data</th>
                    <th className="px-3 py-2 w-32 bg-green-50/50">Ordem de Produção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-center text-[10px]">
                  {rightTableData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 h-8">
                      <td className="font-black text-slate-600 border-r border-slate-50 bg-slate-50/30">{r.sequencia}</td>
                      <td className="px-3 text-slate-700 font-bold truncate">{String(r.item || "-")}</td>
                      <td className="font-mono">{String(r.quantidade)}</td>
                      <td>{String(r.data)}</td>
                      <td className="text-indigo-700 font-black bg-green-50/20">{String(r.ordemProducao || "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-indigo-700 text-[10px] font-black uppercase">
            <span className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">Registos: {filledCount} / 600</span>
          </div>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-xs shadow-lg shadow-indigo-100 uppercase tracking-widest">Importar Excel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
