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

const CLEAN_MEDICINE_NAMES = [
  'Tab. Panadol 500mg',
  'Cap. Amoxil 500mg',
  'Tab. Brufen 400mg',
  'Tab. Caflam 50mg',
  'Syp. Calpol 120mg',
  'Tab. Risek 20mg',
  'Tab. Augmentin 625mg',
  'Inj. Voren 75mg IM',
  'Normal Saline Drip 500ml',
];

const DOSAGE_SCHEDULES = [
  { id: '1+0+1', label: 'صبح شام (1+0+1)' },
  { id: '1+1+1', label: 'صبح دوپہر شام (1+1+1)' },
  { id: '1+0+0', label: 'صرف صبح (1+0+0)' },
  { id: '0+0+1', label: 'صرف رات (0+0+1)' },
  { id: 'After Meal', label: 'کھانے کے بعد' },
  { id: 'Before Meal', label: 'کھانے سے پہلے' },
  { id: 'Stat', label: 'فوری / Stat' },
];

export default function ClinicWorkspace({ clinic, onLogout }) {
  const [tab, setTab] = useState('counter');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);

  const [tokens, setTokens] = useState([]);
  const [summary, setSummary] = useState({
    totalPatients: 0,
    waitingCount: 0,
    completedCount: 0,
    totalConsultationRs: 0,
    totalProcedureRs: 0,
    grandTotalRs: 0,
  });
  const [stockItems, setStockItems] = useState([]);

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
  const [activeMicField, setActiveMicField] = useState(''); // 'patientName' | 'diagnosis' | 'customMed' | ''
  const [printToken, setPrintToken] = useState(null);

  // Doctor Quick Rx & History State
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [historyPhone, setHistoryPhone] = useState('');
  const [patientHistory, setPatientHistory] = useState([]);
  const [rxForm, setRxForm] = useState({
    bp: '',
    temp: '',
    sugar: '',
    weight: '',
    diagnosis: '',
    prescription: [],
    followUpDays: 3,
  });

  // Modular Medicine Builder State
  const [selectedMedName, setSelectedMedName] = useState('Tab. Panadol 500mg');
  const [customMedInput, setCustomMedInput] = useState('');
  const [selectedTiming, setSelectedTiming] = useState('صبح شام (1+0+1)');
  const [medDays, setMedDays] = useState(3);

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
        API.get('/clinic/today'),
        API.get('/clinic/dispensary'),
      ]);
      const list = todayRes.data.tokens || [];
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
      alert('Voice typing works best in Google Chrome on Android or Desktop.');
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
        setRxForm((prev) => ({
          ...prev,
          diagnosis: prev.diagnosis ? `${prev.diagnosis}, ${spoken}` : spoken,
        }));
      } else if (field === 'customMed') {
        setCustomMedInput(spoken);
        setSelectedMedName('');
      }
      setActiveMicField('');
    };
    recognition.onerror = () => setActiveMicField('');
    recognition.onend = () => setActiveMicField('');
    recognition.start();
  };

  const handleIssueToken = async (e) => {
    e.preventDefault();
    if (!tokenForm.patientName.trim() || !tokenForm.patientPhone.trim()) return;

    try {
      if (!navigator.onLine) {
        const offlineList = JSON.parse(localStorage.getItem('clinicflow_offline_tokens') || '[]');
        offlineList.push(tokenForm);
        localStorage.setItem('clinicflow_offline_tokens', JSON.stringify(offlineList));
        const localToken = {
          _id: `offline-${Date.now()}`,
          tokenNumber: tokens.length + 1,
          ...tokenForm,
          status: 'Waiting',
        };
        setTokens((prev) => [...prev, localToken]);
        setPrintToken(localToken);
      } else {
        const { data } = await API.post('/clinic/tokens', tokenForm);
        setTokens((prev) => [...prev, data]);
        setPrintToken(data);
        refreshAll();
      }
      setTokenForm({
        patientName: '',
        patientPhone: '',
        ageGender: '',
        complaint: 'Fever / بخار',
        consultationFeeRs: clinic?.defaultFeeRs ?? 400,
        procedureFeeRs: 0,
        procedureNote: '',
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Could not issue token.');
    }
  };

  const selectPatientForDoctor = async (tok) => {
    setSelectedTokenId(tok._id);
    setRxSavedSuccess(false);
    setRxForm({
      bp: tok.vitals?.bp || '',
      temp: tok.vitals?.temp || '',
      sugar: tok.vitals?.sugar || '',
      weight: tok.vitals?.weight || '',
      diagnosis: tok.diagnosis || '',
      prescription: tok.prescription || [],
      followUpDays: tok.followUpDays || 3,
    });
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

  const handleAddBuiltMedicine = () => {
    const medBase = customMedInput.trim() || selectedMedName;
    if (!medBase) return;
    const formattedLine = `${medBase} — ${selectedTiming} — ${medDays} ${
      medDays === 1 ? 'Day' : 'Days'
    }`;
    setRxForm((prev) => ({
      ...prev,
      prescription: [...prev.prescription, formattedLine],
    }));
    setCustomMedInput('');
    setRxSavedSuccess(false);
  };

  const removePrescriptionItem = (idx) => {
    setRxForm((prev) => ({
      ...prev,
      prescription: prev.prescription.filter((_, i) => i !== idx),
    }));
    setRxSavedSuccess(false);
  };

  const handleSaveDoctorRx = async () => {
    if (!selectedTokenId) return;
    setSavingRx(true);
    setRxSavedSuccess(false);
    try {
      const { data: updatedToken } = await API.put(`/clinic/tokens/${selectedTokenId}`, {
        status: 'Completed',
        vitals: {
          bp: rxForm.bp,
          temp: rxForm.temp,
          sugar: rxForm.sugar,
          weight: rxForm.weight,
        },
        diagnosis: rxForm.diagnosis,
        prescription: rxForm.prescription,
        followUpDays: Number(rxForm.followUpDays) || 0,
      });

      setTokens((prev) =>
        prev.map((t) => (t._id === selectedTokenId ? updatedToken : t))
      );

      if (updatedToken?.patientPhone) {
        const histRes = await API.get(`/clinic/history/${updatedToken.patientPhone}`);
        setPatientHistory(histRes.data.visits || []);
      }

      setRxSavedSuccess(true);
      refreshAll();
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
      rxForm.prescription.length > 0
        ? rxForm.prescription.map((m, i) => `${i + 1}. ${m}`).join('\n')
        : 'Follow doctor advice.';
    const text = `Assalam-o-Alaikum ${tok.patientName},\n*${clinic.clinicName}* (${clinic.doctorName})\n${
      rxForm.diagnosis ? `Diagnosis: ${rxForm.diagnosis}\n` : ''
    }*Prescription / دوائیاں:*\n${medsList}\nFollow-up after ${medDays} days.`;
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
  const activePatientToken = tokens.find((t) => t._id === selectedTokenId) || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      {/* Top Clinical Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
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
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
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
                  className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Ticket className="w-4 h-4" /> Issue Token &amp; Generate Parchi
                </button>
              </form>
            </div>

            {/* Live Today Queue */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">
                  Today&apos;s Live Queue ({tokens.length} Patients)
                </h2>
                <span className="text-xs font-bold text-teal-700 tabular-nums">
                  Collected: Rs. {summary.grandTotalRs.toLocaleString()}
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DOCTOR QUICK RX & INSTANT MOBILE HISTORY */}
        {tab === 'doctor' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
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
                  value={rxForm.bp}
                  onChange={(e) => setRxForm({ ...rxForm, bp: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  placeholder="Temp (99°F)"
                  value={rxForm.temp}
                  onChange={(e) => setRxForm({ ...rxForm, temp: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  placeholder="Sugar (110)"
                  value={rxForm.sugar}
                  onChange={(e) => setRxForm({ ...rxForm, sugar: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  placeholder="Weight (kg)"
                  value={rxForm.weight}
                  onChange={(e) => setRxForm({ ...rxForm, weight: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
              </div>

              {/* Diagnosis with Voice Mic */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Diagnosis / Clinical Note (e.g. Viral Fever & Throat)"
                  value={rxForm.diagnosis}
                  onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })}
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

              {/* STEP A: Clean Medicine Name Selection */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  1. Select Medicine Name / دوا کا نام منتخب کریں:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CLEAN_MEDICINE_NAMES.map((med) => {
                    const isPicked = selectedMedName === med && !customMedInput;
                    return (
                      <button
                        key={med}
                        type="button"
                        onClick={() => {
                          setSelectedMedName(med);
                          setCustomMedInput('');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          isPicked
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500'
                        }`}
                      >
                        {med}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Medicine + Mic */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Or type / speak any other medicine name..."
                    value={customMedInput}
                    onChange={(e) => setCustomMedInput(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl bg-white border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput('customMed')}
                    title="Speak Medicine Name"
                    className={`px-3 rounded-xl border flex items-center justify-center cursor-pointer ${
                      activeMicField === 'customMed'
                        ? 'bg-red-600 text-white border-red-600 animate-pulse'
                        : 'bg-white text-teal-800 border-slate-300'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                {/* STEP B: Timing / Khurak Filter Buttons */}
                <div className="pt-1">
                  <div className="text-xs font-bold text-slate-800 mb-1.5">
                    2. Khurak / Timing (خوراک):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DOSAGE_SCHEDULES.map((sch) => (
                      <button
                        key={sch.id}
                        type="button"
                        onClick={() => setSelectedTiming(sch.label)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          selectedTiming === sch.label
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {sch.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP C: - Day + Counter & Add Button */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">3. Days (دن):</span>
                    <div className="inline-flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMedDays((d) => Math.max(1, d - 1))}
                        className="w-9 h-9 font-extrabold text-base text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-3 text-xs font-extrabold text-teal-800 tabular-nums">
                        {medDays} {medDays === 1 ? 'Day' : 'Days'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMedDays((d) => d + 1)}
                        className="w-9 h-9 font-extrabold text-base text-teal-700 hover:bg-teal-50 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBuiltMedicine}
                    className="px-4 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Medicine to Parchi
                  </button>
                </div>
              </div>

              {/* Selected Prescription Box */}
              {rxForm.prescription.length > 0 && (
                <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 space-y-2">
                  <div className="text-[11px] font-bold text-teal-900 uppercase">
                    Selected Prescription ({rxForm.prescription.length}):
                  </div>
                  {rxForm.prescription.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 text-xs text-slate-800 bg-white/80 px-2.5 py-1.5 rounded-lg"
                    >
                      <span>
                        <strong>{i + 1}.</strong> {m}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePrescriptionItem(i)}
                        className="text-red-600 hover:text-red-800 p-0.5 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Visible Saved Confirmation Banner */}
              {rxSavedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Saved! Visit &amp; medicines are permanently stored in Patient History.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  disabled={savingRx || !selectedTokenId}
                  onClick={handleSaveDoctorRx}
                  className={`flex-1 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    rxSavedSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-teal-700 hover:bg-teal-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {savingRx
                    ? 'Saving Visit...'
                    : rxSavedSuccess
                    ? 'Saved to History ✓'
                    : 'Complete Visit & Save to History'}
                </button>

                {activePatientToken && (
                  <a
                    href={buildWhatsAppRxUrl(activePatientToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" /> Send Rx on WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Right Column: Instant Mobile Number History Lookup */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
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

              <div className="space-y-3 max-h-[460px] overflow-y-auto">
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
                        <ul className="list-disc list-inside text-[11px] text-slate-700 pt-1 border-t border-slate-200/80">
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
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Token-by-Token Cash Audit Log
              </h3>
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
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1">
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
        </div>
      </nav>
    </div>
  );
}
