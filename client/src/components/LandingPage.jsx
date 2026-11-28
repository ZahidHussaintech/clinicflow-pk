import React, { useState } from 'react';
import {
  Stethoscope,
  Ticket,
  Search,
  Wallet,
  MessageCircle,
  WifiOff,
  CheckCircle2,
  ArrowRight,
  Phone,
  ShieldCheck,
  Printer,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import API from '../api';

export default function LandingPage({ onAuthSuccess }) {
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [resetForm, setResetForm] = useState({ phone: '', masterKey: '', newPassword: '' });

  // Interactive Sandbox Demo State (for visitors on landing page)
  const [demoToken, setDemoToken] = useState(14);
  const [demoPatient, setDemoPatient] = useState('Muhammad Imran');
  const [demoComplaint, setDemoComplaint] = useState('Fever & Cough');

  // Auth Form State
  const [form, setForm] = useState({
    doctorName: '',
    clinicName: '',
    areaSector: 'Sector 5C-1, North Karachi',
    phone: '',
    password: '',
    defaultFeeRs: 400,
  });

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = authModal === 'register' ? '/auth/register' : '/auth/login';
      const payload =
        authModal === 'register'
          ? form
          : { phone: form.phone, password: form.password };
      const { data } = await API.post(endpoint, payload);
      localStorage.setItem('clinicflow_token', data.token);
      localStorage.setItem('clinicflow_clinic', JSON.stringify(data.clinic));
      onAuthSuccess(data.clinic);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Clinical Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-none">
                ClinicFlow<span className="text-teal-700">PK</span>
              </span>
              <span className="text-[10px] font-medium text-slate-500 tracking-wide">
                DIGITAL PARCHI &amp; OPD SUITE
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-teal-700 transition">Clinic Solutions</a>
            <a href="#live-demo" className="hover:text-teal-700 transition">Interactive Parchi</a>
            <a href="#pricing" className="hover:text-teal-700 transition">Pricing (Rs. 2,500/mo)</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setError('');
                setAuthModal('login');
              }}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Clinic Sign In
            </button>
            <button
              onClick={() => {
                setError('');
                setAuthModal('register');
              }}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              7-Day Free Trial
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Real Clinic Photography */}
      <section id="top" className="pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              Built for Neighborhood Clinics in Karachi • Zero Laptop Needed
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.14]">
              Digital Parchi, Instant Patient History &amp; Nightly Cash Closing on{' '}
              <span className="text-teal-700">One Phone.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Stop evening waiting-room arguments, lost paper prescriptions, and daily fee miscounts. Run tokens, WhatsApp queue slips, and dispensary stock alerts from a single Android phone—even during load-shedding.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                onClick={() => {
                  setError('');
                  setAuthModal('register');
                }}
                className="px-6 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-teal-900/10 transition cursor-pointer"
              >
                Start 7-Day Free Clinic Trial <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="https://wa.me/923379814592?text=Assalam-o-Alaikum%20Zahid%20bhai%2C%20I%20want%20a%20free%20ClinicFlow%20PK%20demo%20at%20my%20clinic."
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3.5 rounded-xl bg-white border border-slate-300 hover:border-teal-600 text-slate-800 font-semibold text-sm flex items-center gap-2 transition"
              >
                <Phone className="w-4 h-4 text-teal-700" /> Book On-Site Clinic Setup
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 text-xs">
              <div>
                <div className="font-extrabold text-lg text-slate-900 tabular-nums">100%</div>
                <div className="text-slate-500">Works Offline (PWA)</div>
              </div>
              <div>
                <div className="font-extrabold text-lg text-teal-700 tabular-nums">Rs. 0</div>
                <div className="text-slate-500">WhatsApp API Cost</div>
              </div>
              <div>
                <div className="font-extrabold text-lg text-amber-600 tabular-nums">2 Mins</div>
                <div className="text-slate-500">Dispenser Training</div>
              </div>
            </div>
          </div>

          {/* Right Side: Real Clinic Image + Floating Live Queue Card */}
          <div className="lg:col-span-6 relative">
            <div className="rounded-3xl overflow-hidden border border-slate-200/90 bg-white shadow-xl shadow-slate-900/5">
              <img
                src="/images/hero-doctor-clinic.webp"
                alt="Doctor reviewing digital patient history on smartphone in Karachi clinic"
                width="1200"
                height="800"
                className="w-full h-[320px] sm:h-[400px] object-cover"
              />
              <div className="p-5 sm:p-6 bg-white flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/doctor-avatar.webp"
                    alt="Dr. Kamran Siddiqui"
                    width="48"
                    height="48"
                    className="w-12 h-12 rounded-full object-cover border-2 border-teal-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      “Rozana Rs. 1,200 tak ki hisab ki galti ruk gayi — compounder 5 minute mein seekh gaya.”
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dr. Kamran Siddiqui • Family Care Clinic, Sector 5C-1 North Karachi
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Feature Showcase Using Real Reception & Pharmacy Images */}
      <section id="features" className="py-16 px-4 sm:px-6 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Engineered for Ground Reality
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-2">
              No Laptop. No Expensive Hardware. Pure Peace of Mind.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
              Designed specifically for busy evening OPDs in Sector 3, 5C-1, 5C-2, and 5B-3 where doctors use a smartphone and dispensers need simple one-tap Roman-Urdu controls.
            </p>
          </div>

          {/* Two-Column Visual Feature Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-[#F8FAFC] flex flex-col">
              <img
                src="/images/reception-counter-queue.webp"
                alt="Clean clinic reception counter managing digital patient tokens"
                width="900"
                height="600"
                loading="lazy"
                className="w-full h-56 object-cover"
              />
              <div className="p-6 space-y-3 flex-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700">
                  <Ticket className="w-4 h-4" /> ZERO WAITING ROOM ARGUMENTS
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  1-Tap Token Counter + Free WhatsApp Parchi
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Dispenser enters patient name and phone number in 2 taps (with Urdu/English voice mic). Send an instant WhatsApp slip showing token number and live waiting count—or print via a Rs. 4,800 Bluetooth thermal printer.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-[#F8FAFC] flex flex-col">
              <img
                src="/images/pharmacy-dispensary-stock.webp"
                alt="Organized clinic dispensary shelves with low stock and expiry tracking"
                width="900"
                height="600"
                loading="lazy"
                className="w-full h-56 object-cover"
              />
              <div className="p-6 space-y-3 flex-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Wallet className="w-4 h-4" /> 100% CASH &amp; STOCK ACCOUNTABILITY
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Nightly Cash Closing &amp; Low-Stock Alerts
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  At 11 PM, tap once on your phone to see exact consultation fees, injection/drip charges, and total patients. Receive red alerts before syrups, syringes, or injections run out or expire.
                </p>
              </div>
            </div>
          </div>

          {/* 4 Compact Operational Pillars */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2">
              <Search className="w-5 h-5 text-teal-700" />
              <h4 className="font-bold text-slate-900 text-sm">1-Second Mobile Lookup</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Type patient mobile number to view past BP, sugar, temperature, and prescribed medicines immediately.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-slate-900 text-sm">Follow-Up Reminders</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bring back 15–25 repeat BP, sugar &amp; pediatric patients monthly with 1-click WhatsApp reminders.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2">
              <WifiOff className="w-5 h-5 text-amber-600" />
              <h4 className="font-bold text-slate-900 text-sm">Load-Shedding Proof</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Installs like a native Android app and works offline when K-Electric or mobile data drops.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
              <h4 className="font-bold text-slate-900 text-sm">Private Clinic Vault</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every clinic has encrypted login and isolated cloud backups—your patient records belong strictly to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Live Digital Parchi Sandbox */}
      <section id="live-demo" className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Try It Right Now
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              See How Fast Your Counter Issues a Digital Parchi
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Test generating a live token slip below. Your compounder only enters the patient’s name and mobile number—no English typing fluency required.
            </p>
            <div className="space-y-3 pt-2">
              <input
                type="text"
                value={demoPatient}
                onChange={(e) => setDemoPatient(e.target.value)}
                placeholder="Patient Name"
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-300 text-sm"
              />
              <div className="flex gap-2">
                {['Fever & Cough', 'BP / Sugar Check', 'Child Checkup'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setDemoComplaint(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      demoComplaint === tag
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDemoToken((t) => t + 1)}
                className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Issue Next Token (#{demoToken + 1})
              </button>
            </div>
          </div>

          {/* Realistic 58mm Thermal Parchi Card */}
          <div className="md:col-span-6 flex justify-center">
            <div className="w-full max-w-xs bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 shadow-lg text-center space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-widest text-teal-800">
                AL-SHIFA FAMILY CLINIC
              </div>
              <div className="text-[11px] text-slate-500">Sector 5C-1, North Karachi • Evening OPD</div>
              <div className="py-3 my-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">TOKEN NUMBER</div>
                <div className="text-5xl font-black text-slate-900 tabular-nums mt-0.5">
                  #{demoToken}
                </div>
              </div>
              <div className="text-left text-xs space-y-1 border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-900">{demoPatient || 'Walk-in Patient'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Visit Type:</span>
                  <span className="font-semibold text-slate-800">{demoComplaint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee Paid:</span>
                  <span className="font-bold text-teal-700">Rs. 400</span>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-700" /> Est. Wait: ~15 mins • WhatsApp Slip Ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Local Clinic Pricing */}
      <section id="pricing" className="py-16 px-4 sm:px-6 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto text-center space-y-4 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
            Simple Monthly Plan
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
            Less Than Rs. 85 Per Day — Pays for Itself in 2 Days
          </h2>
          <p className="text-sm text-slate-600">
            Start with a 7-day free trial. On-site clinic installation and staff training available across North Karachi.
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="p-7 rounded-3xl bg-[#F8FAFC] border border-slate-200 flex flex-col justify-between space-y-6">
            <div>
              <div className="text-xs font-bold uppercase text-slate-500">Monthly Clinic Plan</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">Rs. 2,500</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                + Rs. 3,000 one-time on-site setup, 50 preset medicines &amp; dispenser training.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" /> Unlimited Daily Tokens &amp; WhatsApp Slips
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" /> Instant Mobile Number Patient History
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" /> Nightly Cash &amp; Injection Closing Ledger
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" /> Dispensary Low-Stock &amp; Expiry Alerts
                </li>
              </ul>
            </div>
            <button
              onClick={() => {
                setError('');
                setAuthModal('register');
              }}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition cursor-pointer"
            >
              Start 7-Day Free Trial
            </button>
          </div>

          <div className="p-7 rounded-3xl bg-teal-900 text-white flex flex-col justify-between space-y-6 shadow-xl shadow-teal-950/15">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold uppercase">
                Save Rs. 3,000 • 6-Month Saver
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">Rs. 2,000</span>
                <span className="text-xs text-teal-200">/ month (billed Rs. 12,000 / 6 mos)</span>
              </div>
              <p className="text-xs text-teal-100 mt-2">
                Includes FREE on-site installation, Bluetooth thermal printer pairing &amp; priority WhatsApp support.
              </p>
              <ul className="mt-5 space-y-2.5 text-xs text-teal-50">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Everything in Monthly Clinic Plan
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> 58mm Bluetooth Thermal Slip Configuration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Offline PWA Mode for Load-Shedding
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Direct On-Site Visit in North Karachi
                </li>
              </ul>
            </div>
            <button
              onClick={() => {
                setError('');
                setAuthModal('register');
              }}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm transition cursor-pointer"
            >
              Activate 6-Month Clinic Plan
            </button>
          </div>
        </div>
      </section>

      {/* Footer with Cross-Domain Ecosystem Links */}
      <footer className="mt-auto bg-slate-950 text-slate-400 py-10 px-4 sm:px-6 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-white">ClinicFlow PK</span> — Engineered by{' '}
            <a
              href="https://zahidhussainofficial.com/"
              target="_blank"
              rel="noreferrer"
              className="text-teal-400 hover:underline font-semibold"
            >
              Zahid Hussain (Full-Stack Web &amp; SaaS Developer)
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://app.zahidhussainofficial.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition"
            >
              RankReady SEO Audit SaaS
            </a>
            <a
              href="https://biztools.zahidhussainofficial.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition"
            >
              BizTools Studio
            </a>
            <a href="tel:+923379814592" className="text-amber-400 font-semibold">
              Helpline: +92 337 9814592
            </a>
          </div>
        </div>
      </footer>

      {/* Clinic Sign In / Registration Modal */}
      {authModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 relative">
            <button
              onClick={() => setAuthModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                {authModal === 'register' ? '7-Day Free Clinic Setup' : 'Welcome Back Doctor'}
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {authModal === 'register' ? 'Create Your Clinic Workspace' : authModal === 'forgot' ? 'Reset Clinic Password' : 'Sign In to ClinicFlow PK'}
              </h3>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            {infoMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {infoMsg}
              </div>
            )}

            {authModal === 'forgot' ? (
              <div className="space-y-3.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Doctors / Compounders:</strong> Enter your registered mobile number and tap WhatsApp Support below—we will reset your password within 2 minutes.
                </p>
                <input
                  type="tel"
                  placeholder="Registered Mobile Number (0300...)"
                  value={resetForm.phone}
                  onChange={(e) => setResetForm({ ...resetForm, phone: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                />
                <a
                  href={`https://wa.me/923379814592?text=${encodeURIComponent(`Assalam-o-Alaikum Zahid bhai, please reset my ClinicFlow PK password for mobile: ${resetForm.phone || "My Clinic"}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  Request Instant Reset on WhatsApp
                </a>

                <div className="border-t border-slate-200 pt-3 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Or Reset Instantly Using Master Recovery Key:
                  </div>
                  <input
                    type="password"
                    placeholder="Master Recovery Key"
                    value={resetForm.masterKey}
                    onChange={(e) => setResetForm({ ...resetForm, masterKey: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={resetForm.newPassword}
                    onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true); setError(''); setInfoMsg('');
                      try {
                        const { data } = await API.post('/auth/reset-with-master-key', resetForm);
                        setInfoMsg(data.message);
                        setForm({ ...form, phone: resetForm.phone, password: '' });
                        setAuthModal('login');
                      } catch (err) {
                        setError(err.response?.data?.message || 'Reset failed.');
                      } finally { setLoading(false); }
                    }}
                    className="w-full h-10 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                  >
                    {loading ? 'Updating...' : 'Reset Password with Master Key'}
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authModal === 'register' && (
                <>
                  <input
                    type="text"
                    required
                    placeholder="Doctor Name (e.g. Dr. Kamran Siddiqui)"
                    value={form.doctorName}
                    onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Clinic Name (e.g. Al-Shifa Family Clinic)"
                    value={form.clinicName}
                    onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Sector / Area"
                      value={form.areaSector}
                      onChange={(e) => setForm({ ...form, areaSector: e.target.value })}
                      className="h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="OPD Fee (Rs.)"
                      value={form.defaultFeeRs}
                      onChange={(e) => setForm({ ...form, defaultFeeRs: Number(e.target.value) })}
                      className="h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
                    />
                  </div>
                </>
              )}

              <input
                type="tel"
                required
                placeholder="Mobile Number (e.g. 03001234567)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition cursor-pointer"
              >
                {loading
                  ? 'Opening Clinic Workspace...'
                  : authModal === 'register'
                  ? 'Launch My Clinic App'
                  : 'Open Clinic Dashboard'}
              </button>
            </form>
            )}

            {authModal === 'login' && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => { setError(''); setInfoMsg(''); setResetForm({ ...resetForm, phone: form.phone }); setAuthModal('forgot'); }}
                  className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <div className="text-center text-xs text-slate-500">
              {authModal === 'register' ? (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthModal('login')}
                    className="text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  New clinic?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthModal('register')}
                    className="text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    Start 7-Day Free Trial
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
