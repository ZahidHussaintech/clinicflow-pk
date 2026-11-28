import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Stethoscope,
  Wallet,
  Package,
  Mic,
  Printer,
  MessageCircle,
  Search,
  CheckCircle2,
  Plus,
  LogOut,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Trash2,
  X,
  ShieldCheck,
} from 'lucide-react';
import API from '../api';

const QUICK_COMPLAINTS = [
  'Fever / بخار',
  'Cough & Flu / کھانسی زکام',
  'BP / Sugar Check',
  'Stomach / معدہ',
  'Child Checkup / بچہ',
  'Injection / Drip',
];

const QUICK_OUTSIDE_MEDS = [
  'Tab. Augmentin 625mg',
  'Tab. Panadol 500mg',
  'Cap. Risek 20mg',
  'Syp. Brufen',
  'Tab. Rigix 10mg',
];

const TIMING_OPTIONS = [
  { id: '1+0+1', label: 'صبح شام (1+0+1)' },
  { id: '1+1+1', label: 'تینوں ٹائم (1+1+1)' },
  { id: '1+0+0', label: 'صرف صبح (1+0+0)' },
  { id: '0+0+1', label: 'صرف رات (0+0+1)' },
  { id: 'Stat', label: 'فوری / Stat' },
];

const MEAL_OPTIONS = [
  { id: 'after', label: 'کھانے کے بعد' },
  { id: 'empty', label: 'خالی پیٹ' },
  { id: 'before', label: 'کھانے سے پہلے' },
];

function parseRxLineToRow(line, idx) {
  const parts = line.split('•').map((s) => s.trim());
  if (parts.length >= 4) {
    const daysNum = parseInt(parts[3], 10) || 3;
    return {
      uid: `saved-${idx}-${Date.now()}`,
      name: parts[0],
      timing: parts[1],
      meal: parts[2],
      days: daysNum,
      stockItemId: null,
      source: 'Saved',
    };
  }
  return {
    uid: `saved-${idx}-${Date.now()}`,
    name: line,
    timing: 'صبح شام (1+0+1)',
    meal: 'کھانے کے بعد',
    days: 3,
    stockItemId: null,
    source: 'Saved',
  };
}

export default function ClinicWorkspace({ clinic, onLogout }) {
  const [tab, setTab] = useState('counter');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);

  const [tokens, setTokens] = useState(() => {
    try { return JSON.parse(localStorage.getItem("clinicflow_cache_today") || "null")?.tokens || []; } catch { return []; }
  });
  const [issuingToken, setIssuingToken] = useState(false);
  const [summary, setSummary] = useState({
    totalPatients: 0,
    waitingCount: 0,
    completedCount: 0,
    totalConsultationRs: 0,
    totalProcedureRs: 0,
    grandTotalRs: 0,
  });
  const [stockItems, setStockItems] = useState([]);
  const [adminClinics, setAdminClinics] = useState([]);
  const [adminResetPasswords, setAdminResetPasswords] = useState({});

  // Counter Token Form
  const [tokenForm, setTokenForm] = useState({
    patientName: '',
    patientPhone: '',
    ageGender: '',
    complaint: 'Fever / بخار',
    consultationFeeRs: clinic?.defaultFeeRs ?? 400,
    procedureFeeRs: 0,
    procedureNote: '',
  });
  const [activeMicField, setActiveMicField] = useState('');
  const [printToken, setPrintToken] = useState(null);

  // Doctor Quick Rx & Multi-Row Prescription State
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [historyPhone, setHistoryPhone] = useState('');
  const [patientHistory, setPatientHistory] = useState([]);
  const [vitalsAndDx, setVitalsAndDx] = useState({
    bp: '',
    temp: '',
    sugar: '',
    weight: '',
    diagnosis: '',
  });

  // Array of independent medicine rows: { uid, name, timing, meal, days, stockItemId, source }
  const [rxRows, setRxRows] = useState([]);
  const [outsideMedInput, setOutsideMedInput] = useState('');

  const [savingRx, setSavingRx] = useState(false);
  const [rxSavedSuccess, setRxSavedSuccess] = useState(false);

  // Dispensary Add Form
  const [newStock, setNewStock] = useState({
    itemName: '',
    category: 'Syrup / Tablet',
    stockQty: 20,
    lowStockThreshold: 10,
    expiryDate: '2027-12-31',
    unitPriceRs: 100,
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refreshAll();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineQueue = async () => {
    try {
      const queued = JSON.parse(localStorage.getItem('clinicflow_offline_tokens') || '[]');
      if (queued.length === 0) return;
      for (const item of queued) {
        await API.post('/clinic/tokens', item);
      }
      localStorage.removeItem('clinicflow_offline_tokens');
      refreshAll();
    } catch (_) {}
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [todayRes, stockRes] = await Promise.all([
        API.get(selectedDate ? `/clinic/today?date=${selectedDate}` : `/clinic/today`),
        API.get('/clinic/dispensary'),
      ]);
      const list = todayRes.data.tokens || [];
      if (!selectedDate && todayRes.data.dateKey) setSelectedDate(todayRes.data.dateKey);
      setTokens(list);
      setSummary(todayRes.data.summary || summary);
      setStockItems(stockRes.data || []);
      localStorage.setItem('clinicflow_cache_today', JSON.stringify(todayRes.data));

      const nextWaiting = list.find((t) => t.status === 'Waiting') || list[list.length - 1];
      if (nextWaiting && !selectedTokenId) {
        selectPatientForDoctor(nextWaiting);
      }
    } catch (_) {
      const cached = JSON.parse(localStorage.getItem('clinicflow_cache_today') || 'null');
      if (cached) {
        setTokens(cached.tokens || []);
        setSummary(cached.summary || summary);
      }
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice typing works in Google Chrome on Android or Desktop.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-PK';
    recognition.interimResults = false;
    setActiveMicField(field);
    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      if (field === 'patientName') {
        setTokenForm((prev) => ({ ...prev, patientName: spoken }));
      } else if (field === 'diagnosis') {
        setVitalsAndDx((prev) => ({
          ...prev,
          diagnosis: prev.diagnosis ? `${prev.diagnosis}, ${spoken}` : spoken,
        }));
      } else if (field === 'outsideMed') {
        setOutsideMedInput(spoken);
      }
      setActiveMicField('');
    };
    recognition.onerror = () => setActiveMicField('');
    recognition.onend = () => setActiveMicField('');
    recognition.start();
  };

  const handleIssueToken = async (e) => {
    e.preventDefault();
    if (issuingToken) return;
    if (!tokenForm.patientName.trim() || !tokenForm.patientPhone.trim()) return;

    setIssuingToken(true);
    const snapshot = { ...tokenForm };
    const nextNum = tokens.length > 0 ? Math.max(...tokens.map((t) => t.tokenNumber)) + 1 : 1;
    const tempId = `temp-${Date.now()}`;
    const optimisticToken = {
      _id: tempId,
      tokenNumber: nextNum,
      ...snapshot,
      status: 'Waiting',
    };

    // Instant 0ms UI update & form reset
    setTokens((prev) => [...prev, optimisticToken]);
    setPrintToken(optimisticToken);
    setTokenForm({
      patientName: '',
      patientPhone: '',
      ageGender: '',
      complaint: 'Fever / بخار',
      consultationFeeRs: clinic?.defaultFeeRs ?? 400,
      procedureFeeRs: 0,
      procedureNote: '',
    });

    try {
      if (!navigator.onLine) {
        const offlineList = JSON.parse(localStorage.getItem('clinicflow_offline_tokens') || '[]');
        offlineList.push(snapshot);
        localStorage.setItem('clinicflow_offline_tokens', JSON.stringify(offlineList));
      } else {
        const { data } = await API.post('/clinic/tokens', snapshot);
        if (data.dateKey) setSelectedDate(data.dateKey);
        setTokens((prev) => prev.map((t) => (t._id === tempId ? data : t)));
        setPrintToken(data);
        setSelectedTokenId(data._id);
        setSummary((prev) => ({
          ...prev,
          totalPatients: prev.totalPatients + 1,
          waitingCount: prev.waitingCount + 1,
          totalConsultationRs: prev.totalConsultationRs + (data.consultationFeeRs || 0),
          totalProcedureRs: prev.totalProcedureRs + (data.procedureFeeRs || 0),
          grandTotalRs: prev.grandTotalRs + (data.consultationFeeRs || 0) + (data.procedureFeeRs || 0),
        }));
      }
    } catch (err) {
      setTokens((prev) => prev.filter((t) => t._id !== tempId));
      setTokenForm(snapshot);
      alert(err.response?.data?.message || 'Could not issue token.');
    } finally {
      setIssuingToken(false);
    }
  };

  const handleDeleteToken = async (tok) => {
    setTokens((prev) => prev.filter((t) => t._id !== tok._id));
    if (!String(tok._id).startsWith('temp-') && !String(tok._id).startsWith('offline-')) {
      try { await API.delete(`/clinic/tokens/${tok._id}`); } catch (_) {}
    }
  };

  const selectPatientForDoctor = async (tok) => {
    setSelectedTokenId(tok._id);
    setRxSavedSuccess(false);
    setVitalsAndDx({
      bp: tok.vitals?.bp || '',
      temp: tok.vitals?.temp || '',
      sugar: tok.vitals?.sugar || '',
      weight: tok.vitals?.weight || '',
      diagnosis: tok.diagnosis || '',
    });
    const parsedRows = (tok.prescription || []).map((line, idx) => parseRxLineToRow(line, idx));
    setRxRows(parsedRows);
    setHistoryPhone(tok.patientPhone);
    try {
      const { data } = await API.get(`/clinic/history/${tok.patientPhone}`);
      setPatientHistory(data.visits || []);
    } catch (_) {
      setPatientHistory([]);
    }
  };

  const handleLookupPhoneHistory = async (e) => {
    e.preventDefault();
    if (!historyPhone.trim()) return;
    try {
      const { data } = await API.get(`/clinic/history/${historyPhone.trim()}`);
      setPatientHistory(data.visits || []);
    } catch (_) {}
  };

  // Add a medicine from Clinic Dispensary Stock (will auto-deduct on Save)
  const addClinicStockMedRow = (item) => {
    setRxRows((prev) => [
      ...prev,
      {
        uid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.itemName,
        timing: 'صبح شام (1+0+1)',
        meal: 'کھانے کے بعد',
        days: 3,
        stockItemId: item._id,
        source: 'Clinic Stock',
      },
    ]);
    setRxSavedSuccess(false);
  };

  // Add an outside medical store medicine (does not touch clinic stock)
  const addOutsideMedRow = (medName) => {
    const clean = (medName || outsideMedInput).trim();
    if (!clean) return;
    setRxRows((prev) => [
      ...prev,
      {
        uid: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: clean,
        timing: 'صبح شام (1+0+1)',
        meal: 'کھانے کے بعد',
        days: 3,
        stockItemId: null,
        source: 'Outside Store',
      },
    ]);
    if (!medName) setOutsideMedInput('');
    setRxSavedSuccess(false);
  };

  const updateRxRow = (uid, patch) => {
    setRxRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
    setRxSavedSuccess(false);
  };

  const removeRxRow = (uid) => {
    setRxRows((prev) => prev.filter((r) => r.uid !== uid));
    setRxSavedSuccess(false);
  };

  const formatRxRowText = (r) =>
    `${r.name} • ${r.timing} • ${r.meal} • ${r.days} ${r.days === 1 ? 'Day' : 'Days'}`;

  const handleSaveDoctorRx = async () => {
    if (!selectedTokenId) return;
    setSavingRx(true);
    setRxSavedSuccess(false);
    try {
      const formattedPrescription = rxRows.map(formatRxRowText);
      const dispensedItemIds = rxRows
        .filter((r) => Boolean(r.stockItemId))
        .map((r) => r.stockItemId);

      const { data: updatedToken } = await API.put(`/clinic/tokens/${selectedTokenId}`, {
        status: 'Completed',
        vitals: {
          bp: vitalsAndDx.bp,
          temp: vitalsAndDx.temp,
          sugar: vitalsAndDx.sugar,
          weight: vitalsAndDx.weight,
        },
        diagnosis: vitalsAndDx.diagnosis,
        prescription: formattedPrescription,
        dispensedItemIds,
      });

      setTokens((prev) =>
        prev.map((t) => (t._id === selectedTokenId ? updatedToken : t))
      );

      if (updatedToken?.patientPhone) {
        const histRes = await API.get(`/clinic/history/${updatedToken.patientPhone}`);
        setPatientHistory(histRes.data.visits || []);
      }

      setRxSavedSuccess(true);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save visit. Please check connection.');
    } finally {
      setSavingRx(false);
    }
  };

  const buildWhatsAppSlipUrl = (tok) => {
    let digits = (tok.patientPhone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
    const waitingAhead = tokens.filter(
      (t) => t.status === 'Waiting' && t.tokenNumber < tok.tokenNumber
    ).length;
    const text = `Assalam-o-Alaikum ${tok.patientName},\n*${clinic.clinicName}* (${clinic.areaSector})\nToken Number: *#${tok.tokenNumber}*\nPatients Ahead: ${waitingAhead}\nFee Paid: Rs. ${(tok.consultationFeeRs || 0) + (tok.procedureFeeRs || 0)}\nPlease arrive near your turn.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  const buildWhatsAppRxUrl = (tok) => {
    let digits = (tok.patientPhone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
    const medsList =
      rxRows.length > 0
        ? rxRows.map((r, i) => `${i + 1}. ${formatRxRowText(r)}`).join('\n')
        : 'Follow doctor advice.';
    const text = `Assalam-o-Alaikum ${tok.patientName},\n*${clinic.clinicName}* (${clinic.doctorName})\n${
      vitalsAndDx.diagnosis ? `Diagnosis: ${vitalsAndDx.diagnosis}\n` : ''
    }*Prescription / دوائیاں:*\n${medsList}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  const triggerThermalPrint = (tok) => {
    setPrintToken(tok);
    setTimeout(() => window.print(), 150);
  };

  const handleAddStockItem = async (e) => {
    e.preventDefault();
    if (!newStock.itemName.trim()) return;
    const { data } = await API.post('/clinic/dispensary', newStock);
    setStockItems((prev) => [data, ...prev]);
    setNewStock({
      itemName: '',
      category: 'Syrup / Tablet',
      stockQty: 20,
      lowStockThreshold: 10,
      expiryDate: '2027-12-31',
      unitPriceRs: 100,
    });
  };

  const adjustStockQty = async (item, delta) => {
    const nextQty = Math.max(0, (item.stockQty || 0) + delta);
    const { data } = await API.put(`/clinic/dispensary/${item._id}`, { stockQty: nextQty });
    setStockItems((prev) => prev.map((i) => (i._id === item._id ? data : i)));
  };

  const handleDeleteStockItem = async (item) => {
    try {
      await API.delete(`/clinic/dispensary/${item._id}`);
      setStockItems((prev) => prev.filter((i) => i._id !== item._id));
    } catch (_) {
      alert('Could not delete item.');
    }
  };

  const lowStockCount = stockItems.filter((i) => i.stockQty <= i.lowStockThreshold).length;
  const isSuperAdmin = Boolean(clinic?.isSuperAdmin || ["03379814592", "03462228005"].some((p) => String(clinic?.phone || "").endsWith(p.slice(-10))));

  const loadAdminClinics = async () => {
    try {
      const { data } = await API.get("/auth/admin/clinics");
      setAdminClinics(data || []);
    } catch (_) {}
  };

  const handleAdminClinicAction = async (clinicId, payload) => {
    try {
      const { data } = await API.put(`/auth/admin/clinics/${clinicId}`, payload);
      alert(data.message);
      loadAdminClinics();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed.");
    }
  };
  const activePatientToken = tokens.find((t) => t._id === selectedTokenId) || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Top Clinical Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {clinic.clinicName}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                }`}
              >
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Synced' : 'Offline Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {clinic.doctorName} • {clinic.areaSector}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
              title="Refresh Queue"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: COUNTER TOKEN & PARCHI GENERATOR */}
        {tab === 'counter' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase text-teal-700">
                    Counter Parchi Mode
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Issue Token #{tokens.length + 1}
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                  Waiting: {summary.waitingCount}
                </span>
              </div>

              <form onSubmit={handleIssueToken} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Name / مریض کا نام
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ayesha Bibi"
                      value={tokenForm.patientName}
                      onChange={(e) =>
                        setTokenForm({ ...tokenForm, patientName: e.target.value })
                      }
                      className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => startVoiceInput('patientName')}
                      title="Speak Patient Name"
                      className={`px-3.5 rounded-xl border flex items-center justify-center cursor-pointer ${
                        activeMicField === 'patientName'
                          ? 'bg-red-600 text-white border-red-600 animate-pulse'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number (For History &amp; WhatsApp)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="03001234567"
                    value={tokenForm.patientPhone}
                    onChange={(e) =>
                      setTokenForm({ ...tokenForm, patientPhone: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quick Complaint / مرض کی نوعیت
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_COMPLAINTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTokenForm({ ...tokenForm, complaint: c })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          tokenForm.complaint === c
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      OPD Fee (Rs.)
                    </label>
                    <input
                      type="number"
                      value={tokenForm.consultationFeeRs}
                      onChange={(e) =>
                        setTokenForm({
                          ...tokenForm,
                          consultationFeeRs: Number(e.target.value),
                        })
                      }
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Injection / Drip (Rs.)
                    </label>
                    <input
                      type="number"
                      value={tokenForm.procedureFeeRs}
                      onChange={(e) =>
                        setTokenForm({
                          ...tokenForm,
                          procedureFeeRs: Number(e.target.value),
                        })
                      }
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold tabular-nums"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={issuingToken}
                  className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition cursor-pointer"
                >
                  <Ticket className="w-4 h-4" /> {issuingToken ? 'Generating Token...' : 'Issue Token & Generate Parchi'}
                </button>
              </form>
            </div>

            {/* Live Today Queue */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800">Queue ({tokens.length})</h2>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-8 px-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold" />
                  <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?book=${clinic.id}`); setCopiedBookingLink(true); setTimeout(() => setCopiedBookingLink(false), 2500); }} className="h-8 px-2.5 rounded-lg bg-teal-50 border border-teal-300 text-teal-800 text-[11px] font-bold cursor-pointer">
                    {copiedBookingLink ? "Copied Online Link ✓" : "Copy Ghar-Se-Token Link"}
                  </button>
                </div>
                <span className="text-xs font-bold text-teal-700 tabular-nums">
                  Date: {selectedDate} • Rs. {summary.grandTotalRs.toLocaleString()}
                </span>
              </div>

              {tokens.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                  No tokens issued yet today. Issue Token #1 on the left to begin evening OPD.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[...tokens].reverse().map((tok) => (
                    <div
                      key={tok._id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-black text-lg flex items-center justify-center tabular-nums">
                          #{tok.tokenNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {tok.patientName}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tok.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {tok.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {tok.patientPhone} • {tok.complaint} •{' '}
                            <strong className="text-slate-700">
                              Rs. {(tok.consultationFeeRs || 0) + (tok.procedureFeeRs || 0)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={buildWhatsAppSlipUrl(tok)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Slip
                        </a>
                        <button
                          onClick={() => triggerThermalPrint(tok)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Print 58mm Thermal Parchi"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            selectPatientForDoctor(tok);
                            setTab('doctor');
                          }}
                          className="px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Examine
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteToken(tok)}
                          title="Delete Duplicate Token"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DOCTOR MULTI-MEDICINE PARCHI & AUTO STOCK DEDUCTION */}
        {tab === 'doctor' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase text-teal-700">
                    Doctor Consultation Pad
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {activePatientToken
                      ? `Token #${activePatientToken.tokenNumber} — ${activePatientToken.patientName}`
                      : 'Select a Patient from Queue'}
                  </h2>
                </div>
                {tokens.length > 0 && (
                  <select
                    value={selectedTokenId}
                    onChange={(e) => {
                      const found = tokens.find((t) => t._id === e.target.value);
                      if (found) selectPatientForDoctor(found);
                    }}
                    className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold"
                  >
                    {tokens.map((t) => (
                      <option key={t._id} value={t._id}>
                        #{t.tokenNumber} — {t.patientName} ({t.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Vitals Row */}
              <div className="grid grid-cols-4 gap-2.5">
                <input
                  type="text"
                  placeholder="BP (120/80)"
                  value={vitalsAndDx.bp}
                  onChange={(e) => setVitalsAndDx({ ...vitalsAndDx, bp: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  placeholder="Temp (99°F)"
                  value={vitalsAndDx.temp}
                  onChange={(e) => setVitalsAndDx({ ...vitalsAndDx, temp: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  placeholder="Sugar (110)"
                  value={vitalsAndDx.sugar}
                  onChange={(e) => setVitalsAndDx({ ...vitalsAndDx, sugar: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  placeholder="Weight (kg)"
                  value={vitalsAndDx.weight}
                  onChange={(e) => setVitalsAndDx({ ...vitalsAndDx, weight: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
              </div>

              {/* Diagnosis with Voice Mic */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Diagnosis / مرض کی تفصیل (e.g. Acute Viral Fever)"
                  value={vitalsAndDx.diagnosis}
                  onChange={(e) => setVitalsAndDx({ ...vitalsAndDx, diagnosis: e.target.value })}
                  className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                />
                <button
                  type="button"
                  onClick={() => startVoiceInput('diagnosis')}
                  title="Speak Diagnosis"
                  className={`px-3.5 rounded-xl border flex items-center justify-center cursor-pointer ${
                    activeMicField === 'diagnosis'
                      ? 'bg-red-600 text-white border-red-600 animate-pulse'
                      : 'bg-teal-50 text-teal-800 border-teal-200'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>

              {/* SECTION 1: CLINIC DISPENSARY STOCK MEDICINES (AUTO-DEDUCTS ON SAVE) */}
              <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-teal-900">
                    1. Dawakhana Stock Medicines (Tap to Add — Auto Stock Less):
                  </span>
                  <span className="text-[10px] font-bold text-teal-700">Live Inventory</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stockItems.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      disabled={item.stockQty <= 0}
                      onClick={() => addClinicStockMedRow(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        item.stockQty <= 0
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white hover:bg-teal-700 hover:text-white text-slate-800 border-teal-300'
                      }`}
                    >
                      <span>+ {item.itemName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                          item.stockQty <= item.lowStockThreshold
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.stockQty}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: OUTSIDE MEDICAL STORE MEDICINES */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="text-xs font-extrabold text-slate-800">
                  2. Bahar Medical Store Ki Dawa (Outside Rx):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_OUTSIDE_MEDS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => addOutsideMedRow(m)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-900 hover:text-white border border-slate-300 text-xs font-medium text-slate-700 transition cursor-pointer"
                    >
                      + {m}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type or speak any outside medicine name..."
                    value={outsideMedInput}
                    onChange={(e) => setOutsideMedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOutsideMedRow();
                      }
                    }}
                    className="flex-1 h-10 px-3 rounded-xl bg-white border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput('outsideMed')}
                    title="Speak Medicine Name"
                    className={`px-3 rounded-xl border flex items-center justify-center cursor-pointer ${
                      activeMicField === 'outsideMed'
                        ? 'bg-red-600 text-white border-red-600 animate-pulse'
                        : 'bg-white text-teal-800 border-slate-300'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => addOutsideMedRow()}
                    className="px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* SECTION 3: MULTI-ROW PARCHI (EVERY MEDICINE HAS ITS OWN TIMING, MEAL & DAYS CONTROLS) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                    Active Parchi Medicines ({rxRows.length}) — Set Timing, Meal &amp; Days Per Medicine:
                  </span>
                </div>

                {rxRows.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    Tap any medicine above (from Clinic Stock or Outside Store). Every selected medicine opens its own timing, empty/after-meal, and day counter row here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rxRows.map((row, idx) => (
                      <div
                        key={row.uid}
                        className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 shadow-2xs space-y-2.5"
                      >
                        {/* Row Header: Number + Medicine Name + Source Badge + Remove */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-extrabold text-sm text-slate-900">
                              {row.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.stockItemId
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {row.stockItemId ? 'Clinic Stock (-1)' : row.source}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRxRow(row.uid)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            title="Remove Medicine"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Timing Pills (Subha Sham / Teeno Time / Subha / Raat) */}
                        <div className="flex flex-wrap gap-1.5">
                          {TIMING_OPTIONS.map((tOpt) => (
                            <button
                              key={tOpt.id}
                              type="button"
                              onClick={() => updateRxRow(row.uid, { timing: tOpt.label })}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                row.timing === tOpt.label
                                  ? 'bg-teal-700 text-white border-teal-700'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {tOpt.label}
                            </button>
                          ))}
                        </div>

                        {/* Meal Pills (Khali Pait / Khane Ke Baad) + Day Counter */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex flex-wrap gap-1.5">
                            {MEAL_OPTIONS.map((mOpt) => (
                              <button
                                key={mOpt.id}
                                type="button"
                                onClick={() => updateRxRow(row.uid, { meal: mOpt.label })}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                  row.meal === mOpt.label
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {mOpt.label}
                              </button>
                            ))}
                          </div>

                          {/* - Day + Counter */}
                          <div className="inline-flex items-center bg-slate-50 border border-slate-300 rounded-xl overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                updateRxRow(row.uid, { days: Math.max(1, row.days - 1) })
                              }
                              className="w-8 h-8 font-extrabold text-sm text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2.5 text-xs font-extrabold text-teal-800 tabular-nums">
                              {row.days} {row.days === 1 ? 'Day' : 'Days'}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateRxRow(row.uid, { days: row.days + 1 })}
                              className="w-8 h-8 font-extrabold text-sm text-teal-700 hover:bg-teal-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved Confirmation Banner */}
              {rxSavedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Saved! Prescription recorded in Patient History &amp; clinic stock automatically updated.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  disabled={savingRx || !selectedTokenId}
                  onClick={handleSaveDoctorRx}
                  className={`flex-1 h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    rxSavedSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-teal-700 hover:bg-teal-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {savingRx
                    ? 'Saving & Updating Stock...'
                    : rxSavedSuccess
                    ? 'Saved to History ✓'
                    : 'Complete Visit & Save to History'}
                </button>

                {activePatientToken && (
                  <a
                    href={buildWhatsAppRxUrl(activePatientToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" /> Send Rx on WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Right Column: Instant Mobile Number History Lookup */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-amber-700">
                  Zero Lost Parchi
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Patient Visit History by Mobile #
                </h3>
              </div>

              <form onSubmit={handleLookupPhoneHistory} className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Enter patient mobile (0300...)"
                  value={historyPhone}
                  onChange={(e) => setHistoryPhone(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs tabular-nums"
                />
                <button
                  type="submit"
                  className="px-4 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" /> Search
                </button>
              </form>

              <div className="space-y-3 max-h-[560px] overflow-y-auto">
                {patientHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No prior visits found for this number yet. Completed visits appear here automatically.
                  </p>
                ) : (
                  patientHistory.map((v) => (
                    <div
                      key={v._id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>
                          {v.dateKey} • Token #{v.tokenNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            v.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-teal-700">{v.complaint}</div>
                      {(v.vitals?.bp || v.vitals?.temp || v.vitals?.sugar) && (
                        <div className="text-[11px] text-slate-600">
                          BP: {v.vitals.bp || '-'} | Temp: {v.vitals.temp || '-'} | Sugar:{' '}
                          {v.vitals.sugar || '-'}
                        </div>
                      )}
                      {v.diagnosis && (
                        <div className="font-semibold text-slate-800">Dx: {v.diagnosis}</div>
                      )}
                      {v.prescription?.length > 0 ? (
                        <ul className="list-disc list-inside text-[11px] text-slate-700 pt-1 border-t border-slate-200/80 space-y-1">
                          {v.prescription.map((med, idx) => (
                            <li key={idx}>{med}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">
                          No medicines saved on this visit yet.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NIGHTLY CASH & FEE CLOSING LEDGER */}
        {tab === 'closing' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="text-xs font-semibold text-slate-500">Total Patients Today</div>
                <div className="text-3xl font-black text-slate-900 mt-1 tabular-nums">
                  {summary.totalPatients}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  {summary.completedCount} examined • {summary.waitingCount} waiting
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="text-xs font-semibold text-slate-500">OPD Consultation Fees</div>
                <div className="text-3xl font-black text-teal-700 mt-1 tabular-nums">
                  Rs. {summary.totalConsultationRs.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Locked per token</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="text-xs font-semibold text-slate-500">Injections / Drips</div>
                <div className="text-3xl font-black text-amber-600 mt-1 tabular-nums">
                  Rs. {summary.totalProcedureRs.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Dispensary procedures</div>
              </div>

              <div className="bg-teal-900 text-white rounded-2xl p-5 shadow-md">
                <div className="text-xs font-semibold text-teal-200">Net Cash in Counter Box</div>
                <div className="text-3xl font-black mt-1 tabular-nums">
                  Rs. {summary.grandTotalRs.toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-300 mt-1">100% Token-Verified Total</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-slate-900">Cash Audit Log ({selectedDate}) • All-Time: {summary.allTimePatients || 0} Patients / Rs. {(summary.allTimeRevenueRs || 0).toLocaleString()}</h3>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold" />
              </div>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5">Token</th>
                    <th className="py-2.5">Patient</th>
                    <th className="py-2.5">Complaint</th>
                    <th className="py-2.5">OPD Fee</th>
                    <th className="py-2.5">Inj/Drip</th>
                    <th className="py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {tokens.map((t) => (
                    <tr key={t._id}>
                      <td className="py-2.5 font-bold">#{t.tokenNumber}</td>
                      <td className="py-2.5 font-semibold text-slate-900">{t.patientName}</td>
                      <td className="py-2.5 text-slate-600">{t.complaint}</td>
                      <td className="py-2.5">Rs. {t.consultationFeeRs || 0}</td>
                      <td className="py-2.5">Rs. {t.procedureFeeRs || 0}</td>
                      <td className="py-2.5 text-right font-bold text-teal-700">
                        Rs. {(t.consultationFeeRs || 0) + (t.procedureFeeRs || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DISPENSARY STOCK & DELETE CARD OPTION */}
        {tab === 'stock' && (
          <div className="space-y-6">
            <form
              onSubmit={handleAddStockItem}
              className="bg-white border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-4 gap-3"
            >
              <input
                type="text"
                required
                placeholder="Medicine / Syringe Name"
                value={newStock.itemName}
                onChange={(e) => setNewStock({ ...newStock, itemName: e.target.value })}
                className="sm:col-span-2 h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
              />
              <input
                type="number"
                placeholder="Qty in Stock"
                value={newStock.stockQty}
                onChange={(e) => setNewStock({ ...newStock, stockQty: Number(e.target.value) })}
                className="h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
              />
              <button
                type="submit"
                className="h-11 rounded-xl bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Stock
              </button>
            </form>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockItems.map((item) => {
                const isLow = item.stockQty <= item.lowStockThreshold;
                return (
                  <div
                    key={item._id}
                    className={`p-5 rounded-2xl border bg-white space-y-3 ${
                      isLow ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          {item.category}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.itemName}</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isLow && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-extrabold">
                            <AlertTriangle className="w-3 h-3" /> LOW STOCK
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteStockItem(item)}
                          title="Delete Card"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-600">
                        Remaining: <strong className="text-slate-900 text-base">{item.stockQty}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => adjustStockQty(item, -1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <button
                          onClick={() => adjustStockQty(item, 1)}
                          className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* TAB 5: SUPER ADMIN CONTROL PANEL (ONLY FOR ZAHID HUSSAIN) */}
        {tab === 'admin' && isSuperAdmin && (
          <div className="space-y-5">
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Founder &amp; Developer Control
                </span>
                <h2 className="text-xl font-extrabold">
                  All Registered Clinics ({adminClinics.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={loadAdminClinics}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-xs font-bold cursor-pointer"
              >
                Refresh Clinics
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {adminClinics.map((c) => {
                const expDate = c.subscriptionEndsAt ? new Date(c.subscriptionEndsAt).toLocaleDateString() : "N/A";
                const isExpired = c.subscriptionEndsAt && new Date(c.subscriptionEndsAt) < new Date() && !c.isSuperAdmin;
                return (
                  <div key={c._id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base">{c.clinicName}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.isSuperAdmin ? "bg-amber-100 text-amber-900" : isExpired || c.subscriptionStatus === "paused" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {c.isSuperAdmin ? "Super Admin" : isExpired ? "Expired" : c.subscriptionStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{c.doctorName} • {c.areaSector}</p>
                        <p className="text-xs font-bold text-teal-700 mt-0.5">Mobile: {c.phone}</p>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-extrabold text-slate-900">{c.totalTokens} Tokens</div>
                        <div className="text-slate-500">Rs. {(c.totalRevenueRs || 0).toLocaleString()}</div>
                        <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Valid till: {expDate}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleAdminClinicAction(c._id, { addDays: 30 })}
                        className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold cursor-pointer"
                      >
                        +30 Days (Rs. 2,500)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdminClinicAction(c._id, { addDays: 180 })}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold cursor-pointer"
                      >
                        +180 Days (6-Mo)
                      </button>
                      {!c.isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleAdminClinicAction(c._id, { subscriptionStatus: c.subscriptionStatus === "paused" ? "active" : "paused" })}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold cursor-pointer"
                        >
                          {c.subscriptionStatus === "paused" ? "Unpause" : "Pause"}
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Set new password..."
                        value={adminResetPasswords[c._id] || ""}
                        onChange={(e) => setAdminResetPasswords({ ...adminResetPasswords, [c._id]: e.target.value })}
                        className="flex-1 h-9 px-3 rounded-lg bg-slate-50 border border-slate-300 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!adminResetPasswords[c._id]) return;
                          handleAdminClinicAction(c._id, { newPassword: adminResetPasswords[c._id] });
                          setAdminResetPasswords({ ...adminResetPasswords, [c._id]: "" });
                        }}
                        className="px-3 h-9 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Hidden 58mm Thermal Printer Receipt Layout */}
      {printToken && (
        <div id="thermal-slip-print" className="hidden print:block text-center text-xs">
          <div className="font-bold text-sm">{clinic.clinicName}</div>
          <div>{clinic.areaSector}</div>
          <div className="my-2 border-y border-black py-2">
            <div>TOKEN NUMBER</div>
            <div className="text-3xl font-black">#{printToken.tokenNumber}</div>
          </div>
          <div className="text-left space-y-1">
            <div>Patient: {printToken.patientName}</div>
            <div>Phone: {printToken.patientPhone}</div>
            <div>Complaint: {printToken.complaint}</div>
            <div>
              Paid: Rs. {(printToken.consultationFeeRs || 0) + (printToken.procedureFeeRs || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Mobile Thumb Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5">
        <div className={`max-w-lg mx-auto grid ${isSuperAdmin ? "grid-cols-5" : "grid-cols-4"} gap-1`}>
          <button
            onClick={() => setTab('counter')}
            className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer ${
              tab === 'counter' ? 'bg-teal-50 text-teal-800' : 'text-slate-500'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Counter</span>
          </button>

          <button
            onClick={() => setTab('doctor')}
            className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer ${
              tab === 'doctor' ? 'bg-teal-50 text-teal-800' : 'text-slate-500'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Rx</span>
          </button>

          <button
            onClick={() => setTab('closing')}
            className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer ${
              tab === 'closing' ? 'bg-teal-50 text-teal-800' : 'text-slate-500'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Cash Closing</span>
          </button>

          <button
            onClick={() => setTab('stock')}
            className={`relative py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer ${
              tab === 'stock' ? 'bg-teal-50 text-teal-800' : 'text-slate-500'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock</span>
            {lowStockCount > 0 && (
              <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-red-600" />
            )}
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => { setTab('admin'); loadAdminClinics(); }}
              className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer ${
                tab === 'admin' ? 'bg-amber-50 text-amber-800' : 'text-slate-500'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
