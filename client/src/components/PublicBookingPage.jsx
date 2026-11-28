import React, { useState, useEffect } from 'react';
import { Stethoscope, Ticket, Clock, CheckCircle2, MessageCircle } from 'lucide-react';
import API from '../api';

export default function PublicBookingPage({ clinicId }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookedData, setBookedData] = useState(null);
  const [form, setForm] = useState({
    patientName: '',
    patientPhone: '',
    complaint: 'General Checkup',
  });

  useEffect(() => {
    API.get(`/clinic/public/${clinicId}`)
      .then((res) => setInfo(res.data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const handleBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await API.post(`/clinic/public/${clinicId}/book`, form);
      setBookedData(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-sm text-slate-600">
        Loading Clinic Online Token Counter...
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm space-y-3">
          <h2 className="font-bold text-slate-900">Invalid Clinic Booking Link</h2>
          <a href="/" className="inline-block text-xs font-bold text-teal-700 underline">
            Go to ClinicFlow PK Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-lg space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
              Online Ghar Baithe Token
            </span>
            <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
              {info.clinic.clinicName}
            </h1>
            <p className="text-xs text-slate-500">
              {info.clinic.doctorName} • {info.clinic.areaSector}
            </p>
          </div>
        </div>

        {!bookedData ? (
          <>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
              <div>
                <div className="text-[11px] text-slate-500">Abhi Waiting Mareez</div>
                <div className="text-2xl font-black text-amber-600 tabular-nums">
                  {info.waitingCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Agla Token Number</div>
                <div className="text-2xl font-black text-teal-700 tabular-nums">
                  #{info.nextTokenNumber}
                </div>
              </div>
            </div>

            <form onSubmit={handleBook} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mareez Ka Naam / Patient Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Apna naam likhein"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="03001234567"
                  value={form.patientPhone}
                  onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Takleef / Complaint
                </label>
                <select
                  value={form.complaint}
                  onChange={(e) => setForm({ ...form, complaint: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                >
                  <option>Fever / بخار</option>
                  <option>Cough &amp; Flu / کھانسی زکام</option>
                  <option>BP / Sugar Check</option>
                  <option>Child Checkup / بچہ</option>
                  <option>General Checkup</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Ticket className="w-4 h-4" />
                {submitting ? 'Booking Token...' : `Book Token #${info.nextTokenNumber} Now`}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4 py-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" /> Online Token Confirmed!
            </div>
            <div className="p-5 rounded-2xl bg-teal-50 border-2 border-dashed border-teal-300">
              <div className="text-xs font-bold uppercase text-teal-800">AAPKA TOKEN NUMBER</div>
              <div className="text-5xl font-black text-slate-900 my-1 tabular-nums">
                #{bookedData.token.tokenNumber}
              </div>
              <div className="text-xs text-slate-600 flex items-center justify-center gap-1 mt-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Aap se pehle{' '}
                <strong>{bookedData.waitingAhead}</strong> mareez waiting mein hain
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Is screen ka screenshot le lein aur apni baari se 10 minute pehle clinic tashreef le aayein.
            </p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Online Token Booked!\nClinic: ${bookedData.clinicName}\nToken: #${bookedData.token.tokenNumber}\nPatient: ${bookedData.token.patientName}\nWaiting Ahead: ${bookedData.waitingAhead}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full h-11 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Save Slip on My WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
