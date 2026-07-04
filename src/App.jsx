import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import {
  LayoutDashboard, Receipt, Package, FileText, Settings, LogOut,
  Plus, Search, Download, TrendingUp, TrendingDown, X, Menu,
  Sprout, ChevronRight, Wallet, ArrowDownCircle, ArrowUpCircle,
  Boxes, ScrollText, BookOpen, Waves, Landmark, Trash2, Pencil,
  Paperclip, ChevronDown, Check, Loader2,
} from "lucide-react";
import { signIn, signOut, getSession, getProfile, onAuthStateChange } from "@/services/auth";
import { fetchTransactions, createTransaction, updateTransaction, deleteTransaction } from "@/services/transactions";
import { fetchInventory, createInventory, updateInventory, deleteInventory } from "@/services/inventory";

/* ============================================================
   DJAYA MURSHODOH GROUP — Sistem Finansial Internal
   Palet: putih dominan, aksen sage-green (brand pertanian jamur),
   tipografi sistem ala Apple, kartu rounded + shadow halus.
   ============================================================ */

const INK = "#1D1D1F";
const SUB = "#86868B";
const LINE = "#E8E8ED";
const PANEL = "#FAFAFA";
const BRAND = "#3F6B4F";
const BRAND_DK = "#2E5140";
const BRAND_BG = "#EEF4EF";
const DANGER = "#D64545";
const DANGER_BG = "#FCEDED";
const GOLD = "#B8863B";

const PEMASUKAN_KATEGORI = ["Penjualan", "Pendapatan Lain", "Investasi", "Lainnya"];
const PENGELUARAN_KATEGORI = ["Operasional", "Pembelian Bahan", "Gaji", "Transportasi", "Pajak", "Lainnya"];

const ACCOUNT_CODES = {
  "Penjualan": "4000", "Pendapatan Lain": "4100", "Investasi": "4200", "Lainnya-in": "4900",
  "Operasional": "5000", "Pembelian Bahan": "5100", "Gaji": "5200",
  "Transportasi": "5300", "Pajak": "5400", "Lainnya-out": "5900",
};

function accCode(kategori, jenis) {
  if (kategori === "Lainnya") return jenis === "pemasukan" ? ACCOUNT_CODES["Lainnya-in"] : ACCOUNT_CODES["Lainnya-out"];
  return ACCOUNT_CODES[kategori] || "0000";
}

const rupiah = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const rupiahShort = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + " M";
  if (abs >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + " Jt";
  if (abs >= 1e3) return (v / 1e3).toFixed(0) + " rb";
  return String(v);
};
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};
const monthLabel = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

/* ============================================================
   Small building blocks
   ============================================================ */

function Card({ children, className = "", pad3 = false }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#EEEEF0] transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${pad3 ? "p-3" : "p-5 sm:p-6"} ${className}`}
    >
      {children}
    </div>
  );
}

function Pill({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-[#F2F2F4] text-[#5B5B60]",
    good: "bg-[#EAF6EE] text-[#1E7A44]",
    bad: "bg-[#FCEDED] text-[#C0392B]",
    brand: "bg-[#EEF4EF] text-[#3F6B4F]",
  };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

function Sparkline({ data, positive = true }) {
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, left: 0, right: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${positive ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={positive ? BRAND : DANGER} stopOpacity={0.35} />
              <stop offset="100%" stopColor={positive ? BRAND : DANGER} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={positive ? BRAND : DANGER} strokeWidth={2}
            fill={`url(#spark-${positive ? "up" : "down"})`} isAnimationActive={true} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, trendData, trendPositive, tone = "default" }) {
  return (
    <Card className="flex flex-col justify-between min-h-[152px]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: tone === "danger" ? DANGER_BG : BRAND_BG }}>
            <Icon size={17} color={tone === "danger" ? DANGER : BRAND} strokeWidth={2} />
          </div>
          <span className="text-[13px] font-medium text-[#6E6E73]">{label}</span>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-[22px] sm:text-[24px] font-semibold tracking-tight" style={{ color: INK }}>{value}</div>
        {sub && (
          <div className="mt-1 flex items-center gap-1 text-[12.5px]">
            {trendPositive ? <TrendingUp size={13} color={BRAND} /> : <TrendingDown size={13} color={DANGER} />}
            <span style={{ color: trendPositive ? BRAND : DANGER }}>{sub}</span>
          </div>
        )}
      </div>
      {trendData && <div className="mt-2 -mb-1"><Sparkline data={trendData} positive={trendPositive} /></div>}
    </Card>
  );
}

function NavItem({ icon: Icon, label, active, onClick, nested = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-left
        ${nested ? "pl-11 pr-3 py-2 text-[13px]" : "px-3 py-2.5 text-[14px]"}
        ${active ? "bg-[#EEF4EF] text-[#2E5140] font-medium" : "text-[#4B4B4E] hover:bg-[#F5F5F7]"}`}
    >
      {Icon && <Icon size={nested ? 15 : 18} strokeWidth={2} color={active ? BRAND_DK : "#8E8E93"} />}
      <span>{label}</span>
    </button>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeup_0.25s_ease]">
      <div className="bg-[#1D1D1F] text-white text-[13px] px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
        <Check size={14} color={BRAND === "#3F6B4F" ? "#8FD9A8" : "#fff"} />
        {message}
      </div>
    </div>
  );
}

function downloadCSV(filename, rows) {
  try {
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) { return false; }
}

/* ============================================================
   LOGIN
   ============================================================ */
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !pass) { setErr("Email dan kata sandi wajib diisi."); return; }
    setErr("");
    setLoading(true);
    try {
      await signIn(email, pass);
      onLogin();
    } catch (error) {
      setErr(error.message === "Invalid login credentials"
        ? "Email atau kata sandi salah."
        : error.message || "Gagal masuk. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center px-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" }}>
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: BRAND_BG }}>
            <Sprout size={26} color={BRAND} strokeWidth={2} />
          </div>
          <div className="text-[17px] font-semibold tracking-tight" style={{ color: INK }}>DJAYA MURSHODOH GROUP</div>
          <div className="text-[13px] text-[#8E8E93] mt-1">Sistem Finansial Internal</div>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@djayamushroom.co.id"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F7] border border-transparent text-[14px]
                focus:outline-none focus:bg-white focus:border-[#3F6B4F] transition-all duration-200"
            />
          </div>
          <div>
            <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Kata sandi</label>
            <input
              type="password" value={pass} onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F7] border border-transparent text-[14px]
                focus:outline-none focus:bg-white focus:border-[#3F6B4F] transition-all duration-200"
            />
          </div>
          {err && <div className="text-[12.5px] text-[#C0392B]">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-[14px] font-medium mt-2 transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: INK }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Memeriksa..." : "Masuk"}
          </button>
        </form>

        <div className="text-center text-[12px] text-[#B0B0B5] mt-8">
          © {new Date().getFullYear()} DJAYA MURSHODOH GROUP. Akses internal terbatas.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ transactions, inventory }) {
  const todayISO = toISO(new Date());
  const yesterdayISO = toISO(new Date(Date.now() - 86400000));

  const cashSeries = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    let running = 0;
    const byDay = {};
    sorted.forEach((t) => {
      running += t.jenis === "pemasukan" ? t.nominal : -t.nominal;
      byDay[t.tanggal] = running;
    });
    return { byDay, finalRunning: running };
  }, [transactions]);

  const kasUntilDate = (iso) => {
    const keys = Object.keys(cashSeries.byDay).filter((k) => k <= iso).sort();
    if (keys.length === 0) return 0;
    return cashSeries.byDay[keys[keys.length - 1]];
  };

  const kasHariIni = kasUntilDate(todayISO);
  const kasKemarin = kasUntilDate(yesterdayISO);
  const kasDelta = kasHariIni - kasKemarin;

  const todayTx = transactions.filter((t) => t.tanggal === todayISO);
  const pemasukanHariIni = todayTx.filter((t) => t.jenis === "pemasukan").reduce((s, t) => s + t.nominal, 0);
  const pengeluaranHariIni = todayTx.filter((t) => t.jenis === "pengeluaran").reduce((s, t) => s + t.nominal, 0);
  const labaHariIni = pemasukanHariIni - pengeluaranHariIni;
  const nilaiStok = inventory.reduce((s, i) => s + i.stok * i.hargaModal, 0);

  const last14 = useMemo(() => {
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = toISO(d);
      arr.push({ day: iso.slice(8, 10), v: kasUntilDate(iso) });
    }
    return arr;
  }, [transactions]);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}`;

  const monthTx = (key) => transactions.filter((t) => t.tanggal.startsWith(key));
  const sumJenis = (arr, jenis) => arr.filter((t) => t.jenis === jenis).reduce((s, t) => s + t.nominal, 0);

  const thisMonthTx = monthTx(monthKey);
  const prevMonthTx = monthTx(prevMonthKey);

  const pemasukanBulan = sumJenis(thisMonthTx, "pemasukan");
  const pengeluaranBulan = sumJenis(thisMonthTx, "pengeluaran");
  const cogsBulan = thisMonthTx.filter((t) => t.kategori === "Pembelian Bahan").reduce((s, t) => s + t.nominal, 0);
  const grossProfit = pemasukanBulan - cogsBulan;
  const netProfit = pemasukanBulan - pengeluaranBulan;

  const netProfitPrev = sumJenis(prevMonthTx, "pemasukan") - sumJenis(prevMonthTx, "pengeluaran");
  const growthPct = netProfitPrev !== 0 ? ((netProfit - netProfitPrev) / Math.abs(netProfitPrev)) * 100 : 100;

  const monthlyTrend = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const tx = monthTx(key);
      arr.push({
        bulan: d.toLocaleDateString("id-ID", { month: "short" }),
        Pemasukan: sumJenis(tx, "pemasukan"),
        Pengeluaran: sumJenis(tx, "pengeluaran"),
      });
    }
    return arr;
  }, [transactions]);

  const expenseByCategory = useMemo(() => {
    const map = {};
    thisMonthTx.filter((t) => t.jenis === "pengeluaran").forEach((t) => {
      map[t.kategori] = (map[t.kategori] || 0) + t.nominal;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const DONUT_COLORS = ["#3F6B4F", "#6B9080", "#A4C3A2", "#B8863B", "#CBB279", "#D9D9D9"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: INK }}>Statistik Hari Ini</h2>
        <p className="text-[13px] text-[#8E8E93] mt-0.5">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Wallet} label="Uang Kas" value={rupiah(kasHariIni)}
          sub={`${kasDelta >= 0 ? "+" : ""}${rupiahShort(kasDelta)} dari kemarin`}
          trendData={last14} trendPositive={kasDelta >= 0} />
        <StatCard icon={ArrowDownCircle} label="Pemasukan Hari Ini" value={rupiah(pemasukanHariIni)}
          sub={`${todayTx.filter((t) => t.jenis === "pemasukan").length} transaksi`} trendPositive={true} />
        <StatCard icon={ArrowUpCircle} label="Pengeluaran Hari Ini" value={rupiah(pengeluaranHariIni)}
          sub={`${todayTx.filter((t) => t.jenis === "pengeluaran").length} transaksi`} trendPositive={false} tone="danger" />
        <StatCard icon={TrendingUp} label="Laba Bersih Hari Ini" value={rupiah(labaHariIni)}
          sub={labaHariIni >= 0 ? "Surplus hari ini" : "Defisit hari ini"} trendPositive={labaHariIni >= 0} />
        <StatCard icon={Boxes} label="Nilai Stok" value={rupiah(nilaiStok)}
          sub={`${inventory.length} jenis produk`} trendPositive={true} />
      </div>

      <div>
        <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: INK }}>Statistik Bulanan</h2>
        <p className="text-[13px] text-[#8E8E93] mt-0.5">{now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-[12.5px] text-[#8E8E93] mb-1">Pemasukan Bulan Ini</div>
          <div className="text-[19px] font-semibold" style={{ color: INK }}>{rupiah(pemasukanBulan)}</div>
        </Card>
        <Card>
          <div className="text-[12.5px] text-[#8E8E93] mb-1">Pengeluaran Bulan Ini</div>
          <div className="text-[19px] font-semibold" style={{ color: INK }}>{rupiah(pengeluaranBulan)}</div>
        </Card>
        <Card>
          <div className="text-[12.5px] text-[#8E8E93] mb-1">Gross Profit</div>
          <div className="text-[19px] font-semibold" style={{ color: BRAND }}>{rupiah(grossProfit)}</div>
        </Card>
        <Card>
          <div className="text-[12.5px] text-[#8E8E93] mb-1">Net Profit</div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[19px] font-semibold" style={{ color: netProfit >= 0 ? BRAND : DANGER }}>{rupiah(netProfit)}</div>
            <Pill tone={growthPct >= 0 ? "good" : "bad"}>{growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%</Pill>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Tren Pemasukan vs Pengeluaran</h3>
            <span className="text-[12px] text-[#8E8E93]">6 bulan terakhir</span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} barGap={6}>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: SUB }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: SUB }} axisLine={false} tickLine={false} tickFormatter={rupiahShort} width={54} />
                <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12.5 }} />
                <Bar dataKey="Pemasukan" fill={BRAND} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#D6A5A0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-[15px] font-semibold mb-4" style={{ color: INK }}>Komposisi Pengeluaran</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {expenseByCategory.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-[#4B4B4E]">{c.name}</span>
                </div>
                <span className="text-[#8E8E93]">{rupiahShort(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Tren Saldo Kas — 14 Hari Terakhir</h3>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last14}>
              <defs>
                <linearGradient id="cashfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={LINE} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: SUB }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: SUB }} axisLine={false} tickLine={false} tickFormatter={rupiahShort} width={54} />
              <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12.5 }} />
              <Area type="monotone" dataKey="v" stroke={BRAND} strokeWidth={2.5} fill="url(#cashfill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TRANSAKSI (form + riwayat gabungan)
   ============================================================ */
function TransaksiForm({ onSave, onClose, editing, inventory = [] }) {
  const [jenis, setJenis] = useState(editing?.jenis || "pemasukan");
  const [tanggal, setTanggal] = useState(editing?.tanggal || toISO(new Date()));
  const [kategori, setKategori] = useState(editing?.kategori || PEMASUKAN_KATEGORI[0]);
  const [nama, setNama] = useState(editing?.nama || "");
  const [deskripsi, setDeskripsi] = useState(editing?.deskripsi || "");
  const [nominal, setNominal] = useState(editing?.nominal ? String(editing.nominal) : "");
  const [bukti, setBukti] = useState(!!editing?.bukti);
  const [error, setError] = useState("");
  const [inventoryId, setInventoryId] = useState(editing?.inventory_id || "");
  const [quantity, setQuantity] = useState(editing?.quantity ? String(editing.quantity) : "1");

  const katOptions = jenis === "pemasukan" ? PEMASUKAN_KATEGORI : PENGELUARAN_KATEGORI;

  useEffect(() => { if (!katOptions.includes(kategori)) setKategori(katOptions[0]); }, [jenis]);

  useEffect(() => {
    if (kategori !== "Penjualan" && kategori !== "Pembelian Bahan") {
      setInventoryId("");
    }
  }, [kategori]);

  useEffect(() => {
    if (!inventoryId || !quantity || (kategori !== "Penjualan" && kategori !== "Pembelian Bahan")) return;
    const item = inventory.find((i) => i.id === inventoryId);
    if (!item) return;
    const qty = Number(quantity) || 0;
    if (kategori === "Penjualan") {
      setNama(`Penjualan ${item.nama} - ${qty} ${item.satuan}`);
      setNominal(String(qty * item.hargaJual));
    } else {
      setNama(`Pembelian ${item.nama} - ${qty} ${item.satuan}`);
      setNominal(String(qty * item.hargaModal));
    }
  }, [inventoryId, quantity, kategori, inventory]);

  const submit = (e) => {
    e.preventDefault();
    if (!nama.trim() || !nominal || Number(nominal) <= 0) {
      setError("Lengkapi nama transaksi dan nominal yang valid.");
      return;
    }
    if (kategori === "Penjualan" && inventoryId) {
      const item = inventory.find((i) => i.id === inventoryId);
      const qty = Number(quantity) || 0;
      if (item && qty > item.stok) {
        setError(`Stok ${item.nama} tidak mencukupi. Tersedia: ${item.stok} ${item.satuan}`);
        return;
      }
    }
    onSave({
      id: editing?.id || ("TRX" + Date.now().toString().slice(-6)),
      tanggal, jenis, kategori, nama: nama.trim(), deskripsi: deskripsi.trim(),
      nominal: Number(nominal), status: "Selesai", bukti,
      inventory_id: inventoryId || null,
      quantity: inventoryId ? Number(quantity) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-[480px] sm:rounded-2xl rounded-t-2xl p-6 max-h-[92vh] overflow-y-auto animate-[fadeup_0.25s_ease]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-semibold" style={{ color: INK }}>{editing ? "Edit Transaksi" : "Tambah Transaksi"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F7]">
            <X size={17} color={SUB} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F5F7] rounded-xl">
            {["pemasukan", "pengeluaran"].map((j) => (
              <button type="button" key={j} onClick={() => setJenis(j)}
                className={`py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${jenis === j ? "bg-white shadow-sm" : "text-[#8E8E93]"}`}
                style={jenis === j ? { color: j === "pemasukan" ? BRAND : DANGER } : {}}>
                {j === "pemasukan" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Tanggal</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent text-[13.5px] focus:outline-none focus:bg-white focus:border-[#3F6B4F]" />
            </div>
            <div>
              <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Kategori</label>
              <select value={kategori} onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent text-[13.5px] focus:outline-none focus:bg-white focus:border-[#3F6B4F]">
                {katOptions.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>

          {(kategori === "Penjualan" || kategori === "Pembelian Bahan") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Produk</label>
                <select value={inventoryId} onChange={(e) => setInventoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent text-[13.5px] focus:outline-none focus:bg-white focus:border-[#3F6B4F]">
                  <option value="">-- Pilih Produk --</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>{item.nama} (stok: {item.stok} {item.satuan})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Quantity</label>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent text-[13.5px] focus:outline-none focus:bg-white focus:border-[#3F6B4F]" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Nama Transaksi</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Penjualan jamur ke Pasar Wonokromo"
              className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent text-[13.5px] focus:outline-none focus:bg-white focus:border-[#3F6B4F]" />
          </div>

          <div>
            <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Deskripsi</label>
            <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} placeholder="Catatan tambahan (opsional)"
              className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent text-[13.5px] focus:outline-none focus:bg-white focus:border-[#3F6B4F] resize-none" />
          </div>

          <div>
            <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Nominal (Rp)</label>
            <input type="number" min="0" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="0"
              readOnly={!!inventoryId && (kategori === "Penjualan" || kategori === "Pembelian Bahan")}
              className={`w-full px-3 py-2.5 rounded-xl border border-transparent text-[13.5px] focus:outline-none focus:bg-white focus:border-[#3F6B4F] ${!!inventoryId && (kategori === "Penjualan" || kategori === "Pembelian Bahan") ? "bg-[#EEEEF0] text-[#8E8E93] cursor-not-allowed" : "bg-[#F5F5F7]"}`} />
          </div>

          <button type="button" onClick={() => setBukti((b) => !b)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[13.5px]">
            <span className="flex items-center gap-2 text-[#4B4B4E]"><Paperclip size={15} color={SUB} /> Bukti transaksi</span>
            <span className={`text-[12px] px-2.5 py-1 rounded-full ${bukti ? "bg-[#EAF6EE] text-[#1E7A44]" : "bg-white text-[#8E8E93] border border-[#E5E5E7]"}`}>
              {bukti ? "Terlampir" : "Tandai terlampir"}
            </span>
          </button>

          {error && <div className="text-[12.5px] text-[#C0392B]">{error}</div>}

          <button type="submit"
            className="w-full py-3 rounded-xl text-white text-[14px] font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.99]"
            style={{ background: INK }}>
            {editing ? "Simpan Perubahan" : "Simpan Transaksi"}
          </button>
        </form>
      </div>
    </div>
  );
}

function TransaksiPage({ transactions, inventory, onAdd, onUpdate, onDelete, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("semua");
  const [filterKategori, setFilterKategori] = useState("semua");
  const [sortBy, setSortBy] = useState("tanggal_desc");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const allKategori = ["semua", ...PEMASUKAN_KATEGORI, ...PENGELUARAN_KATEGORI.filter((k) => !PEMASUKAN_KATEGORI.includes(k))];

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.nama.toLowerCase().includes(q) || t.deskripsi.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    if (filterJenis !== "semua") list = list.filter((t) => t.jenis === filterJenis);
    if (filterKategori !== "semua") list = list.filter((t) => t.kategori === filterKategori);
    list.sort((a, b) => {
      if (sortBy === "tanggal_desc") return b.tanggal.localeCompare(a.tanggal);
      if (sortBy === "tanggal_asc") return a.tanggal.localeCompare(b.tanggal);
      if (sortBy === "nominal_desc") return b.nominal - a.nominal;
      if (sortBy === "nominal_asc") return a.nominal - b.nominal;
      return 0;
    });
    return list;
  }, [transactions, search, filterJenis, filterKategori, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [search, filterJenis, filterKategori, sortBy]);

  const handleSave = (tx) => {
    if (editing) { onUpdate(tx); notify("Transaksi berhasil diperbarui"); }
    else { onAdd(tx); notify("Transaksi berhasil disimpan"); }
    setShowForm(false); setEditing(null);
  };

  const exportExcel = () => {
    const rows = [["ID", "Tanggal", "Jenis", "Kategori", "Nama", "Deskripsi", "Nominal", "Status"]];
    filtered.forEach((t) => rows.push([t.id, t.tanggal, t.jenis, t.kategori, t.nama, t.deskripsi, t.nominal, t.status]));
    const ok = downloadCSV("riwayat-transaksi.csv", rows);
    notify(ok ? "File Excel (CSV) berhasil diunduh" : "Gagal mengekspor file");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: INK }}>Transaksi</h2>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">Catat dan kelola seluruh aktivitas keuangan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5E5E7] text-[13px] font-medium text-[#4B4B4E] hover:bg-[#F5F5F7] transition-colors">
            <Download size={15} /> Export Excel
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: INK }}>
            <Plus size={16} /> Tambah Transaksi
          </button>
        </div>
      </div>

      <Card pad3>
        <div className="flex flex-col lg:flex-row gap-2.5">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5F5F7]">
            <Search size={15} color={SUB} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari transaksi, deskripsi, atau ID..."
              className="bg-transparent flex-1 text-[13.5px] focus:outline-none" />
          </div>
          <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:outline-none">
            <option value="semua">Semua Jenis</option>
            <option value="pemasukan">Pemasukan</option>
            <option value="pengeluaran">Pengeluaran</option>
          </select>
          <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:outline-none">
            {allKategori.map((k) => <option key={k} value={k}>{k === "semua" ? "Semua Kategori" : k}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:outline-none">
            <option value="tanggal_desc">Tanggal Terbaru</option>
            <option value="tanggal_asc">Tanggal Terlama</option>
            <option value="nominal_desc">Nominal Terbesar</option>
            <option value="nominal_asc">Nominal Terkecil</option>
          </select>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-[#EEEEF0] text-[#8E8E93] text-[12px] uppercase tracking-wide">
                <th className="text-left font-medium py-3 px-5">Tanggal</th>
                <th className="text-left font-medium py-3 px-3">Jenis</th>
                <th className="text-left font-medium py-3 px-3">Kategori</th>
                <th className="text-left font-medium py-3 px-3 hidden md:table-cell">Deskripsi</th>
                <th className="text-right font-medium py-3 px-3">Nominal</th>
                <th className="text-right font-medium py-3 px-5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr><td colSpan={6} className="text-center py-14 text-[#B0B0B5] text-[13.5px]">Tidak ada transaksi yang cocok.</td></tr>
              )}
              {paged.map((t) => (
                <tr key={t.id} className="border-b border-[#F5F5F7] hover:bg-[#FAFAFA] transition-colors group">
                  <td className="py-3.5 px-5 whitespace-nowrap text-[#4B4B4E]">{fmtDate(t.tanggal)}</td>
                  <td className="py-3.5 px-3">
                    <Pill tone={t.jenis === "pemasukan" ? "good" : "bad"}>{t.jenis === "pemasukan" ? "Masuk" : "Keluar"}</Pill>
                  </td>
                  <td className="py-3.5 px-3 text-[#4B4B4E] whitespace-nowrap">{t.kategori}</td>
                  <td className="py-3.5 px-3 text-[#8E8E93] hidden md:table-cell max-w-[240px] truncate">{t.nama}</td>
                  <td className="py-3.5 px-3 text-right font-medium whitespace-nowrap" style={{ color: t.jenis === "pemasukan" ? BRAND : DANGER }}>
                    {t.jenis === "pemasukan" ? "+" : "−"}{rupiah(t.nominal)}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditing(t); setShowForm(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#EEEEF0]">
                        <Pencil size={14} color={SUB} />
                      </button>
                      <button onClick={() => { onDelete(t.id); notify("Transaksi dihapus"); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#FCEDED]">
                        <Trash2 size={14} color={DANGER} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#EEEEF0]">
            <span className="text-[12.5px] text-[#8E8E93]">
              Menampilkan {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} dari {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1.5 rounded-lg text-[12.5px] border border-[#E5E5E7] disabled:opacity-40 hover:bg-[#F5F5F7]">Sebelumnya</button>
              <span className="text-[12.5px] text-[#4B4B4E] px-2">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1.5 rounded-lg text-[12.5px] border border-[#E5E5E7] disabled:opacity-40 hover:bg-[#F5F5F7]">Berikutnya</button>
            </div>
          </div>
        )}
      </Card>

      {showForm && <TransaksiForm inventory={inventory} editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} />}
    </div>
  );
}

/* ============================================================
   INVENTORY
   ============================================================ */
function InventoryPage({ inventory, onAdd, onUpdate, onDelete, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const totalNilai = inventory.reduce((s, i) => s + i.stok * i.hargaModal, 0);

  const InvForm = () => {
    const [nama, setNama] = useState(editing?.nama || "");
    const [stok, setStok] = useState(editing?.stok ?? "");
    const [satuan, setSatuan] = useState(editing?.satuan || "kg");
    const [hargaModal, setHargaModal] = useState(editing?.hargaModal ?? "");
    const [hargaJual, setHargaJual] = useState(editing?.hargaJual ?? "");

    const submit = (e) => {
      e.preventDefault();
      if (!nama.trim() || stok === "" || hargaModal === "" || hargaJual === "") return;
      const item = { id: editing?.id || ("INV" + Date.now().toString().slice(-5)), nama: nama.trim(), stok: Number(stok), satuan, hargaModal: Number(hargaModal), hargaJual: Number(hargaJual) };
      if (editing) { onUpdate(item); notify("Data stok diperbarui"); } else { onAdd(item); notify("Produk ditambahkan"); }
      setShowForm(false); setEditing(null);
    };

    return (
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={() => setShowForm(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-2xl p-6 animate-[fadeup_0.25s_ease]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-semibold" style={{ color: INK }}>{editing ? "Edit Produk" : "Tambah Produk"}</h3>
            <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F7]"><X size={17} color={SUB} /></button>
          </div>
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Nama Produk</label>
              <input value={nama} onChange={(e) => setNama(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[13.5px] focus:outline-none focus:ring-1 focus:ring-[#3F6B4F]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Jumlah Stok</label>
                <input type="number" value={stok} onChange={(e) => setStok(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[13.5px] focus:outline-none focus:ring-1 focus:ring-[#3F6B4F]" />
              </div>
              <div>
                <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Satuan</label>
                <select value={satuan} onChange={(e) => setSatuan(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[13.5px] focus:outline-none">
                  <option value="kg">kg</option><option value="unit">unit</option><option value="botol">botol</option><option value="pcs">pcs</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Harga Modal</label>
                <input type="number" value={hargaModal} onChange={(e) => setHargaModal(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[13.5px] focus:outline-none focus:ring-1 focus:ring-[#3F6B4F]" />
              </div>
              <div>
                <label className="text-[12.5px] font-medium text-[#6E6E73] block mb-1.5">Harga Jual</label>
                <input type="number" value={hargaJual} onChange={(e) => setHargaJual(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[13.5px] focus:outline-none focus:ring-1 focus:ring-[#3F6B4F]" />
              </div>
            </div>
            <button type="submit" className="w-full py-3 rounded-xl text-white text-[14px] font-medium hover:opacity-90" style={{ background: INK }}>Simpan</button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: INK }}>Inventory / Stok</h2>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">Nilai total inventory hari ini: <span className="font-medium" style={{ color: BRAND }}>{rupiah(totalNilai)}</span></p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[13px] font-medium hover:opacity-90 active:scale-[0.99] self-start"
          style={{ background: INK }}>
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map((i) => (
          <Card key={i.id} className="group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BRAND_BG }}>
                  <Package size={16} color={BRAND} />
                </div>
                <div>
                  <div className="text-[14px] font-medium" style={{ color: INK }}>{i.nama}</div>
                  <div className="text-[12px] text-[#8E8E93]">{i.id}</div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditing(i); setShowForm(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#EEEEF0]"><Pencil size={13} color={SUB} /></button>
                <button onClick={() => { onDelete(i.id); notify("Produk dihapus"); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#FCEDED]"><Trash2 size={13} color={DANGER} /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#F0F0F2]">
              <div><div className="text-[11px] text-[#8E8E93]">Stok</div><div className="text-[13.5px] font-medium mt-0.5">{i.stok.toLocaleString("id-ID")} {i.satuan}</div></div>
              <div><div className="text-[11px] text-[#8E8E93]">Modal</div><div className="text-[13.5px] font-medium mt-0.5">{rupiahShort(i.hargaModal)}</div></div>
              <div><div className="text-[11px] text-[#8E8E93]">Jual</div><div className="text-[13.5px] font-medium mt-0.5">{rupiahShort(i.hargaJual)}</div></div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#F0F0F2] flex items-center justify-between">
              <span className="text-[12px] text-[#8E8E93]">Nilai Stok</span>
              <span className="text-[14px] font-semibold" style={{ color: BRAND }}>{rupiah(i.stok * i.hargaModal)}</span>
            </div>
          </Card>
        ))}
      </div>

      {showForm && <InvForm />}
    </div>
  );
}

/* ============================================================
   LAPORAN
   ============================================================ */
function LaporanLabaRugi({ transactions }) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
  const monthTx = (k) => transactions.filter((t) => t.tanggal.startsWith(k));
  const thisTx = monthTx(monthKey), prevTx = monthTx(prevKey);
  const sumBy = (arr, jenis, kategori) => arr.filter((t) => t.jenis === jenis && (!kategori || t.kategori === kategori)).reduce((s, t) => s + t.nominal, 0);

  const pendapatan = PEMASUKAN_KATEGORI.map((k) => ({ kategori: k, nominal: sumBy(thisTx, "pemasukan", k) })).filter((r) => r.nominal > 0);
  const totalPendapatan = pendapatan.reduce((s, r) => s + r.nominal, 0);
  const cogs = sumBy(thisTx, "pengeluaran", "Pembelian Bahan");
  const grossProfit = totalPendapatan - cogs;
  const biayaOperasional = PENGELUARAN_KATEGORI.filter((k) => k !== "Pembelian Bahan").map((k) => ({ kategori: k, nominal: sumBy(thisTx, "pengeluaran", k) })).filter((r) => r.nominal > 0);
  const totalBiayaOp = biayaOperasional.reduce((s, r) => s + r.nominal, 0);
  const netProfit = grossProfit - totalBiayaOp;

  const netProfitPrev = (sumBy(prevTx, "pemasukan")) - (prevTx.filter((t) => t.jenis === "pengeluaran").reduce((s, t) => s + t.nominal, 0));
  const trend6 = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const tx = monthTx(k);
      const pend = tx.filter((t) => t.jenis === "pemasukan").reduce((s, t) => s + t.nominal, 0);
      const beb = tx.filter((t) => t.jenis === "pengeluaran").reduce((s, t) => s + t.nominal, 0);
      arr.push({ bulan: d.toLocaleDateString("id-ID", { month: "short" }), Laba: pend - beb });
    }
    return arr;
  }, [transactions]);

  const exportExcel = () => {
    const rows = [["Laporan Laba Rugi", monthLabel(toISO(now))], [], ["Pendapatan"]];
    pendapatan.forEach((r) => rows.push([r.kategori, r.nominal]));
    rows.push(["Total Pendapatan", totalPendapatan], [], ["Harga Pokok Penjualan (Pembelian Bahan)", cogs], ["Gross Profit", grossProfit], [], ["Biaya Operasional"]);
    biayaOperasional.forEach((r) => rows.push([r.kategori, r.nominal]));
    rows.push(["Total Biaya Operasional", totalBiayaOp], [], ["Net Profit", netProfit]);
    downloadCSV("laporan-laba-rugi.csv", rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold" style={{ color: INK }}>Laporan Laba Rugi</h3>
          <p className="text-[13px] text-[#8E8E93]">Periode {now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E7] text-[13px] font-medium hover:bg-[#F5F5F7]"><Download size={14} /> Excel</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E7] text-[13px] font-medium hover:bg-[#F5F5F7]"><FileText size={14} /> PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <table className="w-full text-[13.5px]">
            <tbody>
              <tr><td className="py-1.5 font-semibold" style={{ color: INK }}>Pendapatan</td><td></td></tr>
              {pendapatan.map((r) => (
                <tr key={r.kategori}><td className="py-1 pl-4 text-[#6E6E73]">{r.kategori}</td><td className="py-1 text-right">{rupiah(r.nominal)}</td></tr>
              ))}
              <tr className="border-t border-[#EEEEF0]"><td className="py-2 font-medium">Total Pendapatan</td><td className="py-2 text-right font-medium">{rupiah(totalPendapatan)}</td></tr>

              <tr><td className="pt-4 pb-1.5 font-semibold" style={{ color: INK }}>Harga Pokok Penjualan</td><td></td></tr>
              <tr><td className="py-1 pl-4 text-[#6E6E73]">Pembelian Bahan</td><td className="py-1 text-right">({rupiah(cogs)})</td></tr>
              <tr className="border-t border-[#EEEEF0]"><td className="py-2 font-medium" style={{ color: BRAND }}>Gross Profit</td><td className="py-2 text-right font-medium" style={{ color: BRAND }}>{rupiah(grossProfit)}</td></tr>

              <tr><td className="pt-4 pb-1.5 font-semibold" style={{ color: INK }}>Biaya Operasional</td><td></td></tr>
              {biayaOperasional.map((r) => (
                <tr key={r.kategori}><td className="py-1 pl-4 text-[#6E6E73]">{r.kategori}</td><td className="py-1 text-right">({rupiah(r.nominal)})</td></tr>
              ))}
              <tr className="border-t border-[#EEEEF0]"><td className="py-2 font-medium">Total Biaya Operasional</td><td className="py-2 text-right font-medium">({rupiah(totalBiayaOp)})</td></tr>

              <tr className="border-t-2" style={{ borderColor: INK }}>
                <td className="py-3 font-semibold text-[15px]" style={{ color: netProfit >= 0 ? BRAND : DANGER }}>Net Profit</td>
                <td className="py-3 text-right font-semibold text-[15px]" style={{ color: netProfit >= 0 ? BRAND : DANGER }}>{rupiah(netProfit)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <h4 className="text-[13.5px] font-semibold mb-1" style={{ color: INK }}>Perbandingan Bulan Lalu</h4>
          <div className="flex items-center gap-2 mb-3">
            <Pill tone={netProfit >= netProfitPrev ? "good" : "bad"}>
              {netProfit >= netProfitPrev ? "+" : ""}{rupiahShort(netProfit - netProfitPrev)}
            </Pill>
            <span className="text-[12px] text-[#8E8E93]">vs {rupiah(netProfitPrev)}</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend6}>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: SUB }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: SUB }} axisLine={false} tickLine={false} tickFormatter={rupiahShort} width={44} />
                <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
                <Line type="monotone" dataKey="Laba" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3, fill: BRAND }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function LaporanNeraca({ transactions, inventory }) {
  const kas = useMemo(() => transactions.reduce((s, t) => s + (t.jenis === "pemasukan" ? t.nominal : -t.nominal), 0), [transactions]);
  const nilaiStok = inventory.reduce((s, i) => s + i.stok * i.hargaModal, 0);
  const piutang = 0;
  const totalAset = kas + nilaiStok + piutang;
  const hutang = 0;
  const totalLiabilitas = hutang;
  const modal = totalAset - totalLiabilitas;

  const exportExcel = () => {
    const rows = [["Neraca Keuangan"], [], ["ASET"], ["Kas", kas], ["Inventory", nilaiStok], ["Piutang", piutang], ["Total Aset", totalAset],
      [], ["LIABILITAS"], ["Hutang", hutang], ["Total Liabilitas", totalLiabilitas],
      [], ["EKUITAS"], ["Modal", modal]];
    downloadCSV("neraca-keuangan.csv", rows);
  };

  const Row = ({ label, value, bold }) => (
    <div className={`flex items-center justify-between py-2 ${bold ? "border-t border-[#EEEEF0] mt-1 pt-3" : ""}`}>
      <span className={bold ? "font-medium text-[14px]" : "text-[13.5px] text-[#6E6E73] pl-3"}>{label}</span>
      <span className={bold ? "font-semibold text-[14px]" : "text-[13.5px]"}>{rupiah(value)}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold" style={{ color: INK }}>Neraca Keuangan</h3>
          <p className="text-[13px] text-[#8E8E93]">Per {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E7] text-[13px] font-medium hover:bg-[#F5F5F7]"><Download size={14} /> Excel</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E7] text-[13px] font-medium hover:bg-[#F5F5F7]"><FileText size={14} /> PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h4 className="text-[14px] font-semibold mb-1 flex items-center gap-2" style={{ color: INK }}><Landmark size={15} color={BRAND} /> Aset</h4>
          <Row label="Kas" value={kas} />
          <Row label="Inventory" value={nilaiStok} />
          <Row label="Piutang" value={piutang} />
          <Row label="Total Aset" value={totalAset} bold />
        </Card>
        <div className="space-y-5">
          <Card>
            <h4 className="text-[14px] font-semibold mb-1 flex items-center gap-2" style={{ color: INK }}><ScrollText size={15} color={DANGER} /> Liabilitas</h4>
            <Row label="Hutang" value={hutang} />
            <Row label="Total Liabilitas" value={totalLiabilitas} bold />
          </Card>
          <Card>
            <h4 className="text-[14px] font-semibold mb-1 flex items-center gap-2" style={{ color: INK }}><Wallet size={15} color={GOLD} /> Ekuitas</h4>
            <Row label="Modal" value={modal} />
            <Row label="Total Ekuitas" value={modal} bold />
          </Card>
        </div>
      </div>
      <div className="text-[12.5px] text-[#8E8E93] px-1">Aset ({rupiahShort(totalAset)}) = Liabilitas ({rupiahShort(totalLiabilitas)}) + Ekuitas ({rupiahShort(modal)})</div>
    </div>
  );
}

function LaporanBukuBesar({ transactions }) {
  const sorted = useMemo(() => [...transactions].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id)), [transactions]);
  let running = 0;
  const rows = sorted.map((t) => {
    const debit = t.jenis === "pemasukan" ? t.nominal : 0;
    const kredit = t.jenis === "pengeluaran" ? t.nominal : 0;
    running += debit - kredit;
    return { ...t, debit, kredit, saldo: running };
  }).reverse();

  const exportExcel = () => {
    const r = [["Tanggal", "Kode Akun", "Nama Akun", "Debit", "Kredit", "Saldo"]];
    [...rows].reverse().forEach((row) => r.push([row.tanggal, accCode(row.kategori, row.jenis), row.kategori, row.debit, row.kredit, row.saldo]));
    downloadCSV("buku-besar.csv", r);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold" style={{ color: INK }}>Buku Besar — Akun Kas</h3>
          <p className="text-[13px] text-[#8E8E93]">Seluruh transaksi terurut kronologis dengan saldo berjalan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E7] text-[13px] font-medium hover:bg-[#F5F5F7]"><Download size={14} /> Excel</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E7] text-[13px] font-medium hover:bg-[#F5F5F7]"><FileText size={14} /> PDF</button>
        </div>
      </div>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[#EEEEF0] text-[#8E8E93] text-[11.5px] uppercase tracking-wide">
                <th className="text-left font-medium py-3 px-5">Tanggal</th>
                <th className="text-left font-medium py-3 px-3">Kode Akun</th>
                <th className="text-left font-medium py-3 px-3">Nama Akun</th>
                <th className="text-right font-medium py-3 px-3">Debit</th>
                <th className="text-right font-medium py-3 px-3">Kredit</th>
                <th className="text-right font-medium py-3 px-5">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-b border-[#F5F5F7] hover:bg-[#FAFAFA]">
                  <td className="py-2.5 px-5 whitespace-nowrap text-[#4B4B4E]">{fmtDate(r.tanggal)}</td>
                  <td className="py-2.5 px-3 text-[#8E8E93]">{accCode(r.kategori, r.jenis)}</td>
                  <td className="py-2.5 px-3 text-[#4B4B4E]">{r.kategori}</td>
                  <td className="py-2.5 px-3 text-right" style={{ color: r.debit ? BRAND : "#D0D0D5" }}>{r.debit ? rupiah(r.debit) : "—"}</td>
                  <td className="py-2.5 px-3 text-right" style={{ color: r.kredit ? DANGER : "#D0D0D5" }}>{r.kredit ? rupiah(r.kredit) : "—"}</td>
                  <td className="py-2.5 px-5 text-right font-medium">{rupiah(r.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function LaporanArusKas({ transactions }) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const sorted = [...transactions].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const beforeMonth = sorted.filter((t) => t.tanggal < `${monthKey}-01`);
  const saldoAwal = beforeMonth.reduce((s, t) => s + (t.jenis === "pemasukan" ? t.nominal : -t.nominal), 0);
  const thisMonth = sorted.filter((t) => t.tanggal.startsWith(monthKey));

  const operating = thisMonth.filter((t) => t.kategori !== "Investasi");
  const investing = thisMonth.filter((t) => t.kategori === "Investasi");
  const financing = [];

  const netOf = (arr) => arr.reduce((s, t) => s + (t.jenis === "pemasukan" ? t.nominal : -t.nominal), 0);
  const opNet = netOf(operating), invNet = netOf(investing), finNet = netOf(financing);
  const perubahan = opNet + invNet + finNet;
  const saldoAkhir = saldoAwal + perubahan;

  const exportExcel = () => {
    const rows = [["Laporan Arus Kas", monthLabel(toISO(now))], [], ["Saldo Awal", saldoAwal], [], ["Arus Kas Operasi", opNet], ["Arus Kas Investasi", invNet], ["Arus Kas Pendanaan", finNet], [], ["Perubahan Kas", perubahan], ["Saldo Akhir", saldoAkhir]];
    downloadCSV("arus-kas.csv", rows);
  };

  const Block = ({ title, value, items, icon: Icon }) => (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: INK }}><Icon size={15} color={BRAND} /> {title}</h4>
        <span className="text-[14px] font-semibold" style={{ color: value >= 0 ? BRAND : DANGER }}>{value >= 0 ? "+" : ""}{rupiah(value)}</span>
      </div>
      <div className="text-[12px] text-[#8E8E93] mt-1">{items} transaksi periode ini</div>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold" style={{ color: INK }}>Laporan Arus Kas</h3>
          <p className="text-[13px] text-[#8E8E93]">Periode {now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E7] text-[13px] font-medium hover:bg-[#F5F5F7]"><Download size={14} /> Excel</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E5E7] text-[13px] font-medium hover:bg-[#F5F5F7]"><FileText size={14} /> PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Block title="Operating" value={opNet} items={operating.length} icon={Waves} />
        <Block title="Investing" value={invNet} items={investing.length} icon={TrendingUp} />
        <Block title="Financing" value={finNet} items={financing.length} icon={Landmark} />
      </div>

      <Card>
        <div className="flex items-center justify-between py-2">
          <span className="text-[13.5px] text-[#6E6E73]">Saldo Awal</span>
          <span className="text-[13.5px] font-medium">{rupiah(saldoAwal)}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-[#F0F0F2]">
          <span className="text-[13.5px] text-[#6E6E73]">Perubahan Kas</span>
          <span className="text-[13.5px] font-medium" style={{ color: perubahan >= 0 ? BRAND : DANGER }}>{perubahan >= 0 ? "+" : ""}{rupiah(perubahan)}</span>
        </div>
        <div className="flex items-center justify-between py-3 border-t-2 mt-1" style={{ borderColor: INK }}>
          <span className="text-[15px] font-semibold">Saldo Akhir</span>
          <span className="text-[15px] font-semibold">{rupiah(saldoAkhir)}</span>
        </div>
      </Card>
    </div>
  );
}

function LaporanPage({ transactions, inventory }) {
  const [tab, setTab] = useState("labarugi");
  const tabs = [
    { id: "labarugi", label: "Laba Rugi", icon: FileText },
    { id: "neraca", label: "Neraca", icon: Landmark },
    { id: "bukubesar", label: "Buku Besar", icon: BookOpen },
    { id: "aruskas", label: "Arus Kas", icon: Waves },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: INK }}>Laporan Keuangan</h2>
        <p className="text-[13px] text-[#8E8E93] mt-0.5">Analisis lengkap performa finansial perusahaan</p>
      </div>
      <div className="flex gap-1.5 p-1 bg-[#F5F5F7] rounded-xl w-full sm:w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${tab === t.id ? "bg-white shadow-sm" : "text-[#8E8E93] hover:text-[#4B4B4E]"}`}
            style={tab === t.id ? { color: BRAND_DK } : {}}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "labarugi" && <LaporanLabaRugi transactions={transactions} />}
      {tab === "neraca" && <LaporanNeraca transactions={transactions} inventory={inventory} />}
      {tab === "bukubesar" && <LaporanBukuBesar transactions={transactions} />}
      {tab === "aruskas" && <LaporanArusKas transactions={transactions} />}
    </div>
  );
}

/* ============================================================
   SETTINGS (placeholder ringan)
   ============================================================ */
function SettingsPage({ user, onLogout }) {
  return (
    <div className="space-y-5 max-w-[560px]">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: INK }}>Pengaturan</h2>
        <p className="text-[13px] text-[#8E8E93] mt-0.5">Kelola akun dan preferensi sistem</p>
      </div>
      <Card>
        <div className="flex items-center gap-3.5 pb-4 border-b border-[#F0F0F2]">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-[16px]" style={{ background: BRAND }}>
            {user?.[0]?.toUpperCase() || "D"}
          </div>
          <div>
            <div className="text-[14.5px] font-medium" style={{ color: INK }}>{user}</div>
            <div className="text-[12.5px] text-[#8E8E93]">Administrator Keuangan</div>
          </div>
        </div>
        <div className="pt-4 space-y-3">
          {["Perusahaan:  GROUP DJAYA MURSHODOH", "Mata uang: Rupiah (IDR)", "Zona waktu: Asia/Jakarta (WIB)"].map((s) => (
            <div key={s} className="text-[13.5px] text-[#4B4B4E]">{s}</div>
          ))}
        </div>
      </Card>
      <button onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#F0D0D0] text-[#C0392B] text-[13.5px] font-medium hover:bg-[#FCEDED] transition-colors">
        <LogOut size={15} /> Keluar dari akun
      </button>
    </div>
  );
}

/* ============================================================
   SHELL — sidebar, topbar, routing
   ============================================================ */
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transaksi", label: "Transaksi", icon: Receipt },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "laporan", label: "Laporan", icon: FileText },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [view, setView] = useState("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [ready, setReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [toast, setToast] = useState(null);
  const [userId, setUserId] = useState(null);

  const notify = useCallback((msg) => setToast(msg), []);

  // Muat data transaksi & inventory dari Supabase setelah user berhasil login
  const loadData = useCallback(async () => {
    setReady(false);
    try {
      const [tx, inv] = await Promise.all([fetchTransactions(), fetchInventory()]);
      setTransactions(tx);
      setInventory(inv);
    } catch (error) {
      notify("Gagal memuat data: " + error.message);
    } finally {
      setReady(true);
    }
  }, [notify]);

  // Cek sesi Supabase yang sedang aktif saat aplikasi pertama kali dibuka
  // (supaya user tidak perlu login ulang setiap refresh halaman), dan
  // dengarkan perubahan status login (login/logout) selanjutnya.
  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session?.user) {
        setUserId(session.user.id);
        try {
          const profile = await getProfile(session.user.id);
          setUser(profile.full_name || session.user.email.split("@")[0]);
        } catch {
          setUser(session.user.email.split("@")[0]);
        }
        setLoggedIn(true);
      }
      setAuthChecked(true);
    })();

    const unsubscribe = onAuthStateChange((session) => {
      if (!session?.user) {
        setLoggedIn(false);
        setUser("");
        setUserId(null);
        setTransactions([]);
        setInventory([]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loggedIn) loadData();
  }, [loggedIn, loadData]);

  const handleLogin = useCallback(async () => {
    const session = await getSession();
    if (session?.user) {
      setUserId(session.user.id);
      try {
        const profile = await getProfile(session.user.id);
        setUser(profile.full_name || session.user.email.split("@")[0]);
      } catch {
        setUser(session.user.email.split("@")[0]);
      }
    }
    setLoggedIn(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    setLoggedIn(false);
    setUser("");
    setView("dashboard");
  }, []);

  // --- Transaksi: setiap aksi langsung ke Supabase, lalu sinkronkan state lokal ---
  const addTx = async (t) => {
    try {
      const created = await createTransaction(t, userId);
      setTransactions((prev) => [created, ...prev]);
      if (t.inventory_id && t.quantity) {
        const delta = t.jenis === "pemasukan" ? -Number(t.quantity) : Number(t.quantity);
        const item = inventory.find((i) => i.id === t.inventory_id);
        if (item) {
          const updatedItem = await updateInventory({ ...item, stok: Math.max(0, item.stok + delta) });
          setInventory((prev) => prev.map((x) => (x.id === updatedItem.id ? updatedItem : x)));
        }
      }
    } catch (error) {
      notify("Gagal menyimpan transaksi: " + error.message);
    }
  };
  const updateTx = async (t) => {
    try {
      const oldTx = transactions.find((x) => x.id === t.id);
      const updated = await updateTransaction(t);
      setTransactions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      const updatedInvMap = {};
      if (oldTx?.inventory_id && oldTx?.quantity) {
        const reverseDelta = oldTx.jenis === "pemasukan" ? Number(oldTx.quantity) : -Number(oldTx.quantity);
        const item = inventory.find((i) => i.id === oldTx.inventory_id);
        if (item) {
          const updatedItem = await updateInventory({ ...item, stok: Math.max(0, item.stok + reverseDelta) });
          updatedInvMap[updatedItem.id] = updatedItem;
        }
      }
      if (t.inventory_id && t.quantity) {
        const delta = t.jenis === "pemasukan" ? -Number(t.quantity) : Number(t.quantity);
        const base = updatedInvMap[t.inventory_id] || inventory.find((i) => i.id === t.inventory_id);
        if (base) {
          const updatedItem = await updateInventory({ ...base, stok: Math.max(0, base.stok + delta) });
          updatedInvMap[updatedItem.id] = updatedItem;
        }
      }
      const invValues = Object.values(updatedInvMap);
      if (invValues.length > 0) {
        setInventory((prev) => {
          let next = [...prev];
          invValues.forEach((ui) => { next = next.map((x) => (x.id === ui.id ? ui : x)); });
          return next;
        });
      }
    } catch (error) {
      notify("Gagal memperbarui transaksi: " + error.message);
    }
  };
  const deleteTx = async (id) => {
    const prevState = transactions;
    const deletedTx = transactions.find((x) => x.id === id);
    setTransactions((prev) => prev.filter((x) => x.id !== id)); // optimistic
    try {
      await deleteTransaction(id);
      if (deletedTx?.inventory_id && deletedTx?.quantity) {
        const reverseDelta = deletedTx.jenis === "pemasukan" ? Number(deletedTx.quantity) : -Number(deletedTx.quantity);
        const item = inventory.find((i) => i.id === deletedTx.inventory_id);
        if (item) {
          const updatedItem = await updateInventory({ ...item, stok: Math.max(0, item.stok + reverseDelta) });
          setInventory((prev) => prev.map((x) => (x.id === updatedItem.id ? updatedItem : x)));
        }
      }
    } catch (error) {
      setTransactions(prevState); // rollback jika gagal
      notify("Gagal menghapus transaksi: " + error.message);
    }
  };

  // --- Inventory: sama pola dengan transaksi ---
  const addInv = async (i) => {
    try {
      const created = await createInventory(i, userId);
      setInventory((prev) => [created, ...prev]);
    } catch (error) {
      notify("Gagal menyimpan produk: " + error.message);
    }
  };
  const updateInv = async (i) => {
    try {
      const updated = await updateInventory(i);
      setInventory((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (error) {
      notify("Gagal memperbarui produk: " + error.message);
    }
  };
  const deleteInv = async (id) => {
    const prevState = inventory;
    setInventory((prev) => prev.filter((x) => x.id !== id)); // optimistic
    try {
      await deleteInventory(id);
    } catch (error) {
      setInventory(prevState); // rollback jika gagal
      notify("Gagal menghapus produk: " + error.message);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <Loader2 size={22} className="animate-spin" color={SUB} />
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const pageTitle = NAV.find((n) => n.id === view)?.label || "";

  return (
    <div className="min-h-screen w-full bg-white flex" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" }}>
      <style>{`
        @keyframes fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-[240px] border-r border-[#F0F0F2] px-4 py-6 no-print shrink-0">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BRAND_BG }}>
            <Sprout size={18} color={BRAND} />
          </div>
          <div>
            <div className="text-[12.5px] font-semibold leading-tight" style={{ color: INK }}>DJAYA MURSHODOH</div>
            <div className="text-[10.5px] text-[#B0B0B5] leading-tight">GROUP · FINANCE</div>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map((n) => <NavItem key={n.id} icon={n.icon} label={n.label} active={view === n.id} onClick={() => setView(n.id)} />)}
        </nav>
        <div className="pt-4 border-t border-[#F0F0F2]">
          <div className="flex items-center gap-2.5 px-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-medium" style={{ background: BRAND }}>
              {user?.[0]?.toUpperCase() || "D"}
            </div>
            <div className="text-[12.5px] font-medium truncate" style={{ color: INK }}>{user}</div>
          </div>
          <NavItem icon={LogOut} label="Keluar" onClick={() => { handleLogout(); setView("dashboard"); }} />
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenu && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden no-print" onClick={() => setMobileMenu(false)}>
          <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-0 bottom-0 w-[260px] bg-white p-5 animate-[fadeup_0.2s_ease]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BRAND_BG }}><Sprout size={18} color={BRAND} /></div>
                <div className="text-[12.5px] font-semibold" style={{ color: INK }}>DJAYA MURSHODOH</div>
              </div>
              <button onClick={() => setMobileMenu(false)}><X size={20} color={SUB} /></button>
            </div>
            <nav className="space-y-1">
              {NAV.map((n) => <NavItem key={n.id} icon={n.icon} label={n.label} active={view === n.id} onClick={() => { setView(n.id); setMobileMenu(false); }} />)}
              <div className="pt-3 mt-3 border-t border-[#F0F0F2]">
                <NavItem icon={LogOut} label="Keluar" onClick={() => { handleLogout(); }} />
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-[#F5F5F7] lg:hidden no-print">
          <button onClick={() => setMobileMenu(true)}><Menu size={22} color={INK} /></button>
          <div className="text-[14px] font-semibold" style={{ color: INK }}>{pageTitle}</div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-medium" style={{ background: BRAND }}>
            {user?.[0]?.toUpperCase() || "D"}
          </div>
        </header>

        <main className="flex-1 px-5 sm:px-8 py-6 sm:py-8 max-w-[1400px] w-full mx-auto">
          {!ready ? (
            <div className="flex items-center justify-center h-[60vh] text-[13.5px] text-[#8E8E93]">Memuat data keuangan...</div>
          ) : (
            <>
              {view === "dashboard" && <Dashboard transactions={transactions} inventory={inventory} />}
              {view === "transaksi" && <TransaksiPage transactions={transactions} inventory={inventory} onAdd={addTx} onUpdate={updateTx} onDelete={deleteTx} notify={notify} />}
              {view === "inventory" && <InventoryPage inventory={inventory} onAdd={addInv} onUpdate={updateInv} onDelete={deleteInv} notify={notify} />}
              {view === "laporan" && <LaporanPage transactions={transactions} inventory={inventory} />}
              {view === "settings" && <SettingsPage user={user} onLogout={handleLogout} />}
            </>
          )}
        </main>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
