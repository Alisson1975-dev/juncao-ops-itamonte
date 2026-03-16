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

  const handleJuntarQuantidades = useCallback(() => {
    const part1 = data.slice(0, 300).filter(r => r.item && r.sequencia);
    if (part1.length === 0) return showActionMessage("Gere as sequências primeiro!", "error");
    const groups = {};
    part1.forEach(r => {
      const s = String(r.sequencia);
      if (!groups[s]) groups[s] = { s: r.sequencia, i: r.item, q: 0, d: r.data };
      const val = parseFloat(String(r.quantidade).replace(',', '.')) || 0;
      groups[s].q += val;
    });
    const ag = Object.values(groups).sort((a, b) => Number(a.s) - Number(b.s));
    const newData = data.map((r, i) => {
      if (i >= 300) {
        const item = ag[i - 300];
        return item ? { ...r, sequencia: item.s, item: item.i, quantidade: item.q.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), data: item.d, ordemProducao: "" } : { ...r, sequencia: "", item: "", quantidade: "", data: "", ordemProducao: "" };
      }
      return r;
    });
    setData(newData);
    showActionMessage("Quantidades unificadas!");
  }, [data, showActionMessage]);

  const handleSequenciarOPs = useCallback(() => {
    const opMap = {};
    data.slice(300, 600).forEach(r => { if (r.sequencia && r.ordemProducao) opMap[String(r.sequencia)] = r.ordemProducao; });
    const newData = data.map((r, i) => (i < 300 && r.sequencia && opMap[String(r.sequencia)]) ? { ...r, ordemProducao: opMap[String(r.sequencia)] } : r);
    setData(newData);
    showActionMessage("OPs sincronizadas!");
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
    showActionMessage(`Prefixo alterado para ${newPrefix}`);
  }, [data, showActionMessage]);

  const handlePasteAction = async (target) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) processPastedText(text, target);
      else { setPasteTarget(target); setShowManualPaste(true); }
    } catch (err) { setPasteTarget(target); setShowManualPaste(true); }
  };

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
    showActionMessage("Dados colados!");
  }, [data, showActionMessage]);

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
      await setDoc(doc(db, 'settings', 'buttonConfigs'), { labels: newLabels });
      showActionMessage("Configurações salvas!");
      setShowSettings(false);
    } catch (err) { showActionMessage("Erro ao salvar.", "error"); }
  };

  const leftTableData = useMemo(() => data.filter(r => r.tabela === 'azul' && (String(r.item).toLowerCase().includes(searchTerm.toLowerCase()) || String(r.ordemProducao).toLowerCase().includes(searchTerm.toLowerCase()))), [data, searchTerm]);
  const rightTableData = useMemo(() => data.filter(r => r.tabela === 'verde' && (String(r.item).toLowerCase().includes(searchTerm.toLowerCase()) || String(r.ordemProducao).toLowerCase().includes(searchTerm.toLowerCase()))), [data, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900">
      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-2 rounded-full shadow-2xl ${message.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
          <span className="text-xs font-black uppercase tracking-widest">{message.text}</span>
        </div>
      )}

      {showManualPaste && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full">
            <h3 className="font-black uppercase mb-4">Colagem Manual</h3>
            <textarea ref={manualPasteRef} className="w-full h-40 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl outline-none text-xs font-mono" placeholder="Cole aqui..." onChange={(e) => processPastedText(e.target.value, pasteTarget)} />
            <button onClick={() => setShowManualPaste(false)} className="mt-4 w-full py-2 bg-slate-100 rounded-xl font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto flex flex-col gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <h1 className="text-2xl font-black uppercase tracking-tighter">Junção de OPs</h1>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleGerarSequencia} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100">Gerar Sequência</button>
              <button onClick={handleJuntarQuantidades} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100">Juntar Quantidades</button>
              <button onClick={handleSequenciarOPs} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-amber-100">Sequenciar OPs</button>
              <button onClick={() => { setData(Array.from({ length: 600 }, (_, i) => ({ id: i + 1, sequencia: "", tabela: i < 300 ? 'azul' : 'verde', item: "", quantidade: "", data: "", ordemProducao: "" }))); showActionMessage("Limpo!"); }} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase border border-red-100">Limpar</button>
            </div>
            <input type="text" placeholder="Filtrar..." className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-6 pt-6 border-t border-slate-100">
            {btnLabels.map((l, idx) => (
              <button key={idx} onClick={() => handleTransformPrefix(l)} className="px-10 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all">{l}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px]">
          {/* Parte 01 */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <span className="font-black uppercase text-xs">Parte 01 - Dados Originais</span>
              <button onClick={() => handlePasteAction('geral')} className="px-4 py-1.5 bg-white text-blue-600 rounded-lg text-[10px] font-black uppercase">Colar Dados</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 sticky top-0 font-black uppercase text-slate-400">
                  <tr><th className="p-2">Seq</th><th className="p-2">Item</th><th className="p-2">Qtd</th><th className="p-2">Data</th><th className="p-2 bg-blue-50 text-blue-600">OP</th></tr>
                </thead>
                <tbody className="divide-y text-center font-medium">
                  {leftTableData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 font-black text-slate-300">{r.sequencia}</td>
                      <td className="p-2 font-bold">{r.item || "-"}</td>
                      <td className="p-2">{r.quantidade}</td>
                      <td className="p-2">{r.data}</td>
                      <td className="p-2 bg-blue-50/30 font-black text-blue-700">{r.ordemProducao || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Parte 02 */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm">
            <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
              <span className="font-black uppercase text-xs">Parte 02 - Junção / OPs</span>
              <button onClick={() => handlePasteAction('op')} className="px-4 py-1.5 bg-white text-emerald-600 rounded-lg text-[10px] font-black uppercase">Colar OPs</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 sticky top-0 font-black uppercase text-slate-400">
                  <tr><th className="p-2">Seq</th><th className="p-2">Item</th><th className="p-2">Qtd</th><th className="p-2">Data</th><th className="p-2 bg-emerald-50 text-emerald-600">OP</th></tr>
                </thead>
                <tbody className="divide-y text-center font-medium">
                  {rightTableData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 font-black text-slate-300">{r.sequencia}</td>
                      <td className="p-2 font-bold">{r.item || "-"}</td>
                      <td className="p-2">{r.quantidade}</td>
                      <td className="p-2">{r.data}</td>
                      <td className="p-2 bg-emerald-50/30 font-black text-emerald-700">{r.ordemProducao || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
