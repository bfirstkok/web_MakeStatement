import React, { useState, useMemo, useRef, useEffect } from 'react';
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { auth, db, loginWithGoogle, logout } from "./firebase";

export default function App() {
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayDateStr = today.toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "light");

  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayDateStr);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  const [viewImageModal, setViewImageModal] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) setDisplayNameInput(user.displayName || "");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    setTransactionsLoading(true);
    const transactionsRef = collection(db, "users", user.uid, "transactions");
    const q = query(transactionsRef, orderBy("date", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setTransactions(items);
        setTransactionsLoading(false);
      },
      (error) => {
        console.error(error);
        setTransactionsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const themeStyles = {
    light: {
      app: "bg-slate-50 text-slate-900",
      card: "bg-white/95 border-slate-200/80 shadow-sm",
      soft: "bg-slate-50 border-slate-200",
      muted: "text-slate-500",
      text: "text-slate-900",
      nav: "bg-slate-100",
      activeNav: "bg-white text-blue-600 shadow-sm",
      input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
      accent: "blue",
      hero: "from-blue-500 to-indigo-500",
      ring: "ring-blue-100 border-blue-500",
    },
    dark: {
      app: "bg-[#07111f] text-slate-100",
      card: "bg-slate-900/85 border-slate-700/80 shadow-lg shadow-black/10",
      soft: "bg-slate-800/80 border-slate-700",
      muted: "text-slate-400",
      text: "text-slate-100",
      nav: "bg-slate-800/90",
      activeNav: "bg-slate-700 text-cyan-300 shadow-sm",
      input: "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500",
      accent: "cyan",
      hero: "from-cyan-500 to-blue-500",
      ring: "ring-cyan-400/20 border-cyan-400",
    },
    sky: {
      app: "bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-900",
      card: "bg-white/90 border-sky-100 shadow-sm",
      soft: "bg-sky-50 border-sky-100",
      muted: "text-slate-500",
      text: "text-slate-900",
      nav: "bg-sky-100/80",
      activeNav: "bg-white text-sky-600 shadow-sm",
      input: "bg-white border-sky-200 text-slate-900 placeholder:text-slate-400",
      accent: "sky",
      hero: "from-sky-400 to-blue-500",
      ring: "ring-sky-100 border-sky-500",
    },
    mint: {
      app: "bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-slate-900",
      card: "bg-white/90 border-emerald-100 shadow-sm",
      soft: "bg-emerald-50 border-emerald-100",
      muted: "text-slate-500",
      text: "text-slate-900",
      nav: "bg-emerald-100/80",
      activeNav: "bg-white text-emerald-600 shadow-sm",
      input: "bg-white border-emerald-200 text-slate-900 placeholder:text-slate-400",
      accent: "emerald",
      hero: "from-emerald-400 to-teal-500",
      ring: "ring-emerald-100 border-emerald-500",
    },
    rose: {
      app: "bg-gradient-to-br from-rose-50 via-white to-pink-50 text-slate-900",
      card: "bg-white/90 border-rose-100 shadow-sm",
      soft: "bg-rose-50 border-rose-100",
      muted: "text-slate-500",
      text: "text-slate-900",
      nav: "bg-rose-100/80",
      activeNav: "bg-white text-rose-600 shadow-sm",
      input: "bg-white border-rose-200 text-slate-900 placeholder:text-slate-400",
      accent: "rose",
      hero: "from-rose-400 to-pink-500",
      ring: "ring-rose-100 border-rose-500",
    },
  };

  const currentTheme = themeStyles[theme] || themeStyles.light;
  const accentMap = {
    blue: {
      primaryText: "text-blue-600",
      primaryBg: "bg-blue-600 hover:bg-blue-700",
      primarySoft: "bg-blue-50 text-blue-600",
      primaryBorder: "border-blue-100",
    },
    cyan: {
      primaryText: "text-cyan-300",
      primaryBg: "bg-cyan-500 hover:bg-cyan-600",
      primarySoft: "bg-cyan-500/10 text-cyan-300",
      primaryBorder: "border-cyan-400/20",
    },
    sky: {
      primaryText: "text-sky-600",
      primaryBg: "bg-sky-500 hover:bg-sky-600",
      primarySoft: "bg-sky-50 text-sky-600",
      primaryBorder: "border-sky-100",
    },
    emerald: {
      primaryText: "text-emerald-600",
      primaryBg: "bg-emerald-500 hover:bg-emerald-600",
      primarySoft: "bg-emerald-50 text-emerald-600",
      primaryBorder: "border-emerald-100",
    },
    rose: {
      primaryText: "text-rose-600",
      primaryBg: "bg-rose-500 hover:bg-rose-600",
      primarySoft: "bg-rose-50 text-rose-600",
      primaryBorder: "border-rose-100",
    },
  };
  const accent = accentMap[currentTheme.accent] || accentMap.blue;

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter((t) => t.date?.startsWith(selectedMonth))
      .sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
  }, [transactions, selectedMonth]);

  const monthlyTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') acc.income += curr.amount;
        else acc.expense += curr.amount;
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );
  }, [filteredTransactions]);

  const allTimeStats = useMemo(() => {
    return transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') acc.income += curr.amount;
        else acc.expense += curr.amount;
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );
  }, [transactions]);

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    const stats = {};
    transactions.forEach((t) => {
      const mStr = t.date.slice(0, 7);
      if (!stats[mStr]) stats[mStr] = { month: mStr, income: 0, expense: 0 };
      stats[mStr][t.type] += t.amount;
    });

    return Object.values(stats)
      .map((item) => ({ ...item, balance: item.income - item.expense }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [transactions]);

  const maxChartValue = Math.max(...chartData.flatMap((d) => [d.income, d.expense]), 100);

  const monthlyBalanceData = useMemo(() => {
    const stats = {};
    transactions.forEach((t) => {
      const mStr = t.date.slice(0, 7);
      if (!stats[mStr]) stats[mStr] = { month: mStr, income: 0, expense: 0 };
      stats[mStr][t.type] += t.amount;
    });

    return Object.values(stats)
      .map((item) => ({ ...item, balance: item.income - item.expense }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  const formatThaiMonth = (monthStr) => {
    if (!monthStr) return "";
    return new Date(monthStr + "-01").toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    });
  };

  const thaiMonths = [
    { value: "01", label: "มกราคม" },
    { value: "02", label: "กุมภาพันธ์" },
    { value: "03", label: "มีนาคม" },
    { value: "04", label: "เมษายน" },
    { value: "05", label: "พฤษภาคม" },
    { value: "06", label: "มิถุนายน" },
    { value: "07", label: "กรกฎาคม" },
    { value: "08", label: "สิงหาคม" },
    { value: "09", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ];

  const yearOptions = Array.from({ length: 31 }, (_, i) => 2550 + i);

  const selectedYearAD = selectedMonth.slice(0, 4);
  const selectedMonthNumber = selectedMonth.slice(5, 7);
  const selectedYearBE = Number(selectedYearAD) + 543;

  const handleMonthChange = (newMonth) => {
    setSelectedMonth(`${selectedYearAD}-${newMonth}`);
  };

  const handleYearChange = (newYearBE) => {
    const newYearAD = Number(newYearBE) - 543;
    setSelectedMonth(`${newYearAD}-${selectedMonthNumber}`);
  };

  const selectedDay = date?.slice(8, 10) || "01";
  const daysInSelectedMonth = new Date(Number(selectedYearAD), Number(selectedMonthNumber), 0).getDate();
  const dayOptions = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1).padStart(2, "0"));

  const handleDayChange = (newDay) => {
    setDate(`${selectedMonth}-${newDay}`);
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(num || 0);
  };

  const formatDate = (dateValue, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
    if (!dateValue) return '-';
    return new Date(dateValue).toLocaleDateString('th-TH', options);
  };

  const userInitial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachment(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description || !user) return;

    // ใช้เดือน/ปีที่เลือกด้านบนเป็นหลักเสมอ
    // กันปัญหาวันที่ในฟอร์มยังค้างเป็นเดือนเก่า เช่น พฤษภาคม
    const submitDate = `${selectedMonth}-${selectedDay}`;

    const newTransaction = {
      type,
      amount: parseFloat(amount),
      description,
      date: submitDate,
      attachment,
      createdAt: Date.now(),
      createdAtServer: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), newTransaction);
      setAmount('');
      setDescription('');
      clearAttachment();

      // ไม่เปลี่ยน selectedMonth หลังบันทึก เพื่อให้หน้าอยู่เดือนที่ผู้ใช้เลือกไว้
      setDate(submitDate);
    } catch (error) {
      console.error(error);
      alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    if (window.confirm('ยืนยันการลบรายการนี้?')) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "transactions", id));
      } catch (error) {
        console.error(error);
        alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมด?')) {
      try {
        const transactionsRef = collection(db, "users", user.uid, "transactions");
        const snapshot = await getDocs(transactionsRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      } catch (error) {
        console.error(error);
        alert("ลบข้อมูลทั้งหมดไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await updateProfile(auth.currentUser, { displayName: displayNameInput });
      setUser({ ...auth.currentUser, displayName: displayNameInput });
      setProfileMessage("บันทึกข้อมูลบัญชีเรียบร้อยแล้ว");
    } catch (error) {
      console.error(error);
      setProfileMessage("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  const Icons = {
    Wallet: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    TrendingUp: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    TrendingDown: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    Table: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    PaperClip: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
    Image: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    ChartBar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    Document: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    Cog: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.827 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.827 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.827-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.827-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  };

  const ShellCard = useMemo(() => {
    return function ShellCard({ children, className = "" }) {
      return (
        <div className={`rounded-3xl border backdrop-blur-xl ${currentTheme.card} ${className}`}>
          {children}
        </div>
      );
    };
  }, [currentTheme.card]);

  const EmptyState = useMemo(() => {
    return function EmptyState({ title, subtitle }) {
      return (
        <div className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed ${currentTheme.soft} p-8 text-center`}>
          <div className={`mb-3 rounded-2xl p-3 ${accent.primarySoft}`}><Icons.Calendar /></div>
          <p className={`font-bold ${currentTheme.text}`}>{title}</p>
          <p className={`mt-1 text-sm ${currentTheme.muted}`}>{subtitle}</p>
        </div>
      );
    };
  }, [currentTheme.soft, currentTheme.text, currentTheme.muted, accent.primarySoft]);

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${currentTheme.app}`}>
        <div className="text-center">
          <div className={`mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br ${currentTheme.hero}`} />
          <p className={`font-medium ${currentTheme.muted}`}>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${currentTheme.app}`}>
        <div className={`w-full max-w-md rounded-3xl border p-8 text-center ${currentTheme.card}`}>
          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${currentTheme.hero} text-white shadow-lg`}>
            <Icons.Wallet />
          </div>
          <h1 className={`text-2xl font-black ${currentTheme.text}`}>ระบบบัญชีรายรับ-รายจ่าย</h1>
          <p className={`mt-2 text-sm ${currentTheme.muted}`}>เข้าสู่ระบบด้วย Google เพื่อจัดการข้อมูลการเงินของคุณ</p>
          <button onClick={loginWithGoogle} className={`mt-7 flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 font-bold text-white transition ${accent.primaryBg}`}>
            <span className="rounded-full bg-white/20 px-2 py-0.5">G</span>
            เข้าสู่ระบบด้วย Google
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'ยอดคงเหลือสุทธิ',
      value: allTimeStats.balance,
      icon: <Icons.Wallet />,
      color: allTimeStats.balance >= 0 ? accent.primaryText : 'text-rose-500',
      featured: true,
    },
    {
      label: 'รายรับรวม',
      value: allTimeStats.income,
      icon: <Icons.TrendingUp />,
      color: 'text-emerald-500',
      soft: 'bg-emerald-500/10',
    },
    {
      label: 'รายจ่ายรวม',
      value: allTimeStats.expense,
      icon: <Icons.TrendingDown />,
      color: 'text-rose-500',
      soft: 'bg-rose-500/10',
    },
  ];

  return (
    <div className={`min-h-screen p-4 font-sans md:p-8 ${currentTheme.app}`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className={`sticky top-4 z-30 rounded-3xl border backdrop-blur-xl ${currentTheme.card}`}>
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${currentTheme.hero} text-white shadow-lg`}>
                <Icons.Wallet />
              </div>
              <div>
                <h1 className={`text-xl font-black md:text-2xl ${currentTheme.text}`}>ระบบบัญชีรายรับ-รายจ่าย</h1>
                <p className={`text-xs md:text-sm ${currentTheme.muted}`}>จัดการรายรับ รายจ่าย และสรุปรายเดือนได้ในที่เดียว</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <nav className={`grid grid-cols-3 rounded-2xl p-1 ${currentTheme.nav}`}>
                {[
                  { id: 'dashboard', label: 'แดชบอร์ด', icon: <Icons.ChartBar /> },
                  { id: 'transactions', label: 'รายการ', icon: <Icons.Document /> },
                  { id: 'settings', label: 'ตั้งค่า', icon: <Icons.Cog /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${activeTab === item.id ? currentTheme.activeNav : currentTheme.muted}`}
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${currentTheme.soft}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${currentTheme.hero} text-sm font-black text-white`}>
                  {userInitial}
                </div>
                <div className="hidden min-w-0 md:block">
                  <p className={`truncate text-sm font-bold ${currentTheme.text}`}>{user.displayName || 'Member'}</p>
                  <p className={`truncate text-xs ${currentTheme.muted}`}>{user.email}</p>
                </div>
                <button onClick={logout} className="rounded-xl border border-rose-300 px-3 py-2 text-xs font-bold text-rose-500 transition hover:bg-rose-500 hover:text-white">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <main className="space-y-6">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {statCards.map((card) => (
                <ShellCard key={card.label} className={`p-5 ${card.featured ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${card.featured ? 'bg-white/10 text-white' : card.soft || accent.primarySoft}`}>
                      {card.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${card.featured ? 'text-slate-300' : currentTheme.muted}`}>{card.label}</p>
                      <p className={`mt-1 truncate text-2xl font-black ${card.featured ? 'text-white' : card.color}`}>{formatCurrency(card.value)}</p>
                    </div>
                  </div>
                </ShellCard>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <ShellCard className="p-6 lg:col-span-3">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className={`text-lg font-black ${currentTheme.text}`}>แนวโน้ม 6 เดือนล่าสุด</h2>
                    <p className={`text-sm ${currentTheme.muted}`}>เปรียบเทียบรายรับและรายจ่าย</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${accent.primarySoft}`}><Icons.ChartBar /></div>
                </div>

                <div className={`flex h-72 items-end justify-around gap-3 rounded-2xl border p-5 ${currentTheme.soft}`}>
                  {chartData.length === 0 ? (
                    <p className={`${currentTheme.muted}`}>ยังไม่มีข้อมูลสำหรับสร้างกราฟ</p>
                  ) : (
                    chartData.map((data) => {
                      const heightInc = maxChartValue > 0 ? (data.income / maxChartValue) * 100 : 0;
                      const heightExp = maxChartValue > 0 ? (data.expense / maxChartValue) * 100 : 0;
                      return (
                        <div key={data.month} className="flex h-full flex-1 flex-col items-center justify-end gap-3">
                          <div className="flex h-[82%] items-end gap-2">
                            <div className="w-5 rounded-t-xl bg-emerald-400 shadow-sm transition hover:bg-emerald-500" style={{ height: `${Math.max(heightInc, 2)}%` }} title={`รายรับ ${formatCurrency(data.income)}`} />
                            <div className="w-5 rounded-t-xl bg-rose-400 shadow-sm transition hover:bg-rose-500" style={{ height: `${Math.max(heightExp, 2)}%` }} title={`รายจ่าย ${formatCurrency(data.expense)}`} />
                          </div>
                          <span className={`rounded-lg px-2 py-1 text-xs font-bold ${currentTheme.card}`}>{formatDate(data.month + '-01', { month: 'short', year: '2-digit' })}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className={`mt-4 flex justify-center gap-6 text-sm font-bold ${currentTheme.muted}`}>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" /> รายรับ</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-400" /> รายจ่าย</span>
                </div>
              </ShellCard>

              <ShellCard className="p-6 lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className={`text-lg font-black ${currentTheme.text}`}>ทำรายการล่าสุด</h2>
                    <p className={`text-sm ${currentTheme.muted}`}>รายการล่าสุดจากบัญชีนี้</p>
                  </div>
                  <button onClick={() => setActiveTab('transactions')} className={`text-sm font-bold ${accent.primaryText}`}>ดูทั้งหมด</button>
                </div>

                {recentTransactions.length === 0 ? (
                  <EmptyState title="ยังไม่มีรายการ" subtitle="เริ่มเพิ่มรายรับหรือรายจ่ายแรกของคุณ" />
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className={`flex items-center justify-between rounded-2xl border p-4 ${currentTheme.soft}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {tx.type === 'income' ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
                          </div>
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-bold ${currentTheme.text}`}>{tx.description}</p>
                            <p className={`text-xs ${currentTheme.muted}`}>{formatDate(tx.date)}</p>
                          </div>
                        </div>
                        <span className={`ml-3 shrink-0 text-sm font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ShellCard>
            </section>

            <ShellCard className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className={`text-lg font-black ${currentTheme.text}`}>สรุปยอดคงเหลือรายเดือน</h2>
                  <p className={`text-sm ${currentTheme.muted}`}>ดูภาพรวมว่าแต่ละเดือนคงเหลือหรือติดลบ</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${accent.primarySoft}`}>{monthlyBalanceData.length} เดือน</span>
              </div>

              {monthlyBalanceData.length === 0 ? (
                <EmptyState title="ยังไม่มีข้อมูลรายเดือน" subtitle="เพิ่มรายการก่อนเพื่อสร้างสรุปรายเดือน" />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {monthlyBalanceData.map((month) => (
                    <div key={month.month} className={`rounded-2xl border p-4 ${month.balance >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-black ${currentTheme.text}`}>{formatDate(month.month + '-01', { month: 'long', year: 'numeric' })}</p>
                          <p className={`mt-1 text-xs ${currentTheme.muted}`}>รับ {formatCurrency(month.income)}</p>
                          <p className={`text-xs ${currentTheme.muted}`}>จ่าย {formatCurrency(month.expense)}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${month.balance >= 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'}`}>{month.balance >= 0 ? 'บวก' : 'ลบ'}</span>
                      </div>
                      <p className={`mt-4 text-xl font-black ${month.balance >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>{month.balance >= 0 ? 'คงเหลือ ' : 'ติดลบ '}{formatCurrency(Math.abs(month.balance))}</p>
                    </div>
                  ))}
                </div>
              )}
            </ShellCard>
          </main>
        )}

        {activeTab === 'settings' && (
          <main className="space-y-6">
            <ShellCard className="p-6">
              <h2 className={`text-xl font-black ${currentTheme.text}`}>ตั้งค่าบัญชี</h2>
              <p className={`mt-1 text-sm ${currentTheme.muted}`}>จัดการข้อมูลบัญชีและธีมเว็บไซต์</p>
            </ShellCard>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ShellCard className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className={`mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${currentTheme.hero} text-4xl font-black text-white shadow-lg`}>
                    {userInitial}
                  </div>
                  <h3 className={`text-lg font-black ${currentTheme.text}`}>{user.displayName || 'ยังไม่ได้ตั้งชื่อ'}</h3>
                  <p className={`mt-1 break-all text-sm ${currentTheme.muted}`}>{user.email}</p>
                  <span className="mt-4 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-500">Google Member</span>
                </div>
              </ShellCard>

              <ShellCard className="p-6 lg:col-span-2">
                <div className="mb-6">
                  <h3 className={`mb-3 text-lg font-black ${currentTheme.text}`}>ธีมเว็บไซต์</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    {[
                      { id: 'light', label: 'Light', color: 'bg-slate-100' },
                      { id: 'dark', label: 'Dark', color: 'bg-slate-900' },
                      { id: 'sky', label: 'Sky', color: 'bg-sky-400' },
                      { id: 'mint', label: 'Mint', color: 'bg-emerald-400' },
                      { id: 'rose', label: 'Rose', color: 'bg-rose-400' },
                    ].map((item) => (
                      <button key={item.id} type="button" onClick={() => setTheme(item.id)} className={`rounded-2xl border p-3 text-left transition ${theme === item.id ? `ring-2 ${currentTheme.ring}` : currentTheme.soft}`}>
                        <div className={`mb-3 h-10 rounded-xl ${item.color}`} />
                        <p className={`font-black ${currentTheme.text}`}>{item.label}</p>
                        <p className={`text-xs ${currentTheme.muted}`}>{theme === item.id ? 'กำลังใช้งาน' : 'กดเพื่อเปลี่ยน'}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className={`mb-1 block text-sm font-bold ${currentTheme.text}`}>ชื่อที่แสดง</label>
                    <input type="text" value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:ring-2 ${currentTheme.input} ${currentTheme.ring}`} placeholder="เช่น First" />
                  </div>

                  <div>
                    <label className={`mb-1 block text-sm font-bold ${currentTheme.text}`}>อีเมล</label>
                    <input type="email" value={user.email || ''} disabled className={`w-full cursor-not-allowed rounded-2xl border px-4 py-3 ${currentTheme.soft} ${currentTheme.muted}`} />
                  </div>

                  <div>
                    <label className={`mb-1 block text-sm font-bold ${currentTheme.text}`}>User ID</label>
                    <input type="text" value={user.uid || ''} disabled className={`w-full cursor-not-allowed rounded-2xl border px-4 py-3 ${currentTheme.soft} ${currentTheme.muted}`} />
                  </div>

                  {profileMessage && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${accent.primarySoft} ${accent.primaryBorder}`}>{profileMessage}</div>}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button type="submit" className={`flex-1 rounded-2xl px-4 py-3 font-bold text-white transition ${accent.primaryBg}`}>บันทึกข้อมูลบัญชี</button>
                    <button type="button" onClick={logout} className="flex-1 rounded-2xl border border-rose-300 px-4 py-3 font-bold text-rose-500 transition hover:bg-rose-500 hover:text-white">ออกจากระบบ</button>
                  </div>
                </form>
              </ShellCard>
            </section>
          </main>
        )}

        {activeTab === 'transactions' && (
          <main className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className={`text-2xl font-black ${currentTheme.text}`}>จัดการข้อมูลรายเดือน</h2>
                <p className={`text-sm ${currentTheme.muted}`}>เพิ่ม แก้ดู และจัดการรายการของเดือนที่เลือก</p>
              </div>
              <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${currentTheme.card}`}>
                <Icons.Calendar />
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonthNumber}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className={`bg-transparent font-bold outline-none cursor-pointer ${currentTheme.text}`}
                  >
                    {thaiMonths.map((month) => (
                      <option key={month.value} value={month.value} className="bg-white text-slate-900">
                        {month.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYearBE}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className={`bg-transparent font-bold outline-none cursor-pointer ${currentTheme.text}`}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year} className="bg-white text-slate-900">
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ShellCard className="p-5">
                <p className={`text-sm font-bold ${currentTheme.muted}`}>ยอดคงเหลือเดือนนี้</p>
                <p className={`mt-2 text-2xl font-black ${monthlyTotals.balance >= 0 ? accent.primaryText : 'text-rose-500'}`}>{formatCurrency(monthlyTotals.balance)}</p>
              </ShellCard>
              <ShellCard className="p-5">
                <p className={`text-sm font-bold ${currentTheme.muted}`}>รายรับเดือนนี้</p>
                <p className="mt-2 text-2xl font-black text-emerald-500">{formatCurrency(monthlyTotals.income)}</p>
              </ShellCard>
              <ShellCard className="p-5">
                <p className={`text-sm font-bold ${currentTheme.muted}`}>รายจ่ายเดือนนี้</p>
                <p className="mt-2 text-2xl font-black text-rose-500">{formatCurrency(monthlyTotals.expense)}</p>
              </ShellCard>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ShellCard className="h-fit p-6 lg:sticky lg:top-28">
                <h3 className={`mb-4 text-lg font-black ${currentTheme.text}`}>เพิ่มรายการใหม่</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className={`grid grid-cols-2 rounded-2xl p-1 ${currentTheme.nav}`}>
                    <button type="button" onClick={() => setType('income')} className={`rounded-xl py-2 text-sm font-bold transition ${type === 'income' ? 'bg-emerald-500 text-white shadow-sm' : currentTheme.muted}`}>รายรับ</button>
                    <button type="button" onClick={() => setType('expense')} className={`rounded-xl py-2 text-sm font-bold transition ${type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : currentTheme.muted}`}>รายจ่าย</button>
                  </div>

                  <div>
                    <label className={`mb-1 block text-sm font-bold ${currentTheme.text}`}>จำนวนเงิน</label>
                    <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 ${currentTheme.input} ${currentTheme.ring}`} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={`mb-1 block text-sm font-bold ${currentTheme.text}`}>รายละเอียด</label>
                    <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 ${currentTheme.input} ${currentTheme.ring}`} placeholder="เช่น ค่าอาหาร, เงินเดือน" />
                  </div>
                  <div>
                    <label className={`mb-1 block text-sm font-bold ${currentTheme.text}`}>วันที่</label>
                    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${currentTheme.input}`}>
                      <select
                        value={selectedDay}
                        onChange={(e) => handleDayChange(e.target.value)}
                        className={`bg-transparent font-bold outline-none cursor-pointer ${currentTheme.text}`}
                      >
                        {dayOptions.map((day) => (
                          <option key={day} value={day} className="bg-white text-slate-900">
                            วันที่ {Number(day)}
                          </option>
                        ))}
                      </select>

                      <span className={`text-sm font-bold ${currentTheme.muted}`}>—</span>

                      <span className={`font-bold ${currentTheme.text}`}>
                        {thaiMonths.find((m) => m.value === selectedMonthNumber)?.label} พ.ศ. {selectedYearBE}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className={`mb-1 block text-sm font-bold ${currentTheme.text}`}>แนบรูปหลักฐาน</label>
                    <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-bold transition ${currentTheme.soft}`}>
                      <Icons.PaperClip /> เลือกรูปภาพ
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} ref={fileInputRef} />
                    </label>
                    {attachment && (
                      <div className="relative mt-3 inline-block">
                        <img src={attachment} alt="Preview" className="h-20 rounded-2xl border object-cover" />
                        <button type="button" onClick={clearAttachment} className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white"><Icons.X /></button>
                      </div>
                    )}
                  </div>

                  <button type="submit" className={`w-full rounded-2xl px-4 py-3 font-bold text-white transition ${type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>บันทึกรายการ</button>
                </form>
              </ShellCard>

              <ShellCard className="p-6 lg:col-span-2">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className={`text-lg font-black ${currentTheme.text}`}>ประวัติรายการ</h3>
                    <p className={`text-sm ${currentTheme.muted}`}>{filteredTransactions.length} รายการในเดือนที่เลือก</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowReportModal(true)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${accent.primarySoft}`}><Icons.Table /> รายงานเต็มจอ</button>
                    {transactions.length > 0 && <button onClick={handleClearAll} className="flex items-center gap-2 rounded-xl border border-rose-300 px-3 py-2 text-sm font-bold text-rose-500 transition hover:bg-rose-500 hover:text-white"><Icons.Trash /> ล้างข้อมูล</button>}
                    <div className={`flex rounded-xl p-1 ${currentTheme.nav}`}>
                      <button onClick={() => setViewMode('list')} className={`rounded-lg p-2 ${viewMode === 'list' ? currentTheme.activeNav : currentTheme.muted}`}><Icons.List /></button>
                      <button onClick={() => setViewMode('table')} className={`rounded-lg p-2 ${viewMode === 'table' ? currentTheme.activeNav : currentTheme.muted}`}><Icons.Table /></button>
                    </div>
                  </div>
                </div>

                {transactionsLoading && <p className={`mb-3 rounded-xl px-3 py-2 text-sm font-bold ${accent.primarySoft}`}>กำลังโหลดข้อมูลจากบัญชีของคุณ...</p>}

                {filteredTransactions.length === 0 ? (
                  <EmptyState title="ไม่มีรายการในเดือนที่เลือก" subtitle="ลองเพิ่มรายการใหม่ หรือเปลี่ยนเดือนที่ต้องการดู" />
                ) : viewMode === 'list' ? (
                  <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                    {filteredTransactions.map((tx) => (
                      <div key={tx.id} className={`group flex items-center justify-between rounded-2xl border p-4 transition hover:scale-[1.005] ${currentTheme.soft}`}>
                        <div className="flex min-w-0 items-center gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{tx.type === 'income' ? <Icons.TrendingUp /> : <Icons.TrendingDown />}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`truncate font-black ${currentTheme.text}`}>{tx.description}</p>
                              {tx.attachment && <button onClick={() => setViewImageModal(tx.attachment)} className={`rounded-lg p-1 ${accent.primarySoft}`}><Icons.Image /></button>}
                            </div>
                            <p className={`text-xs ${currentTheme.muted}`}>{formatDate(tx.date, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                          <button onClick={() => handleDelete(tx.id)} className="rounded-xl p-2 text-slate-400 opacity-100 transition hover:bg-rose-500/10 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"><Icons.Trash /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
                    <table className="w-full whitespace-nowrap text-left text-sm">
                      <thead className={`${currentTheme.soft}`}>
                        <tr>
                          <th className="px-4 py-3 font-black">วันที่</th>
                          <th className="px-4 py-3 font-black">ประเภท</th>
                          <th className="px-4 py-3 font-black">รายละเอียด</th>
                          <th className="px-4 py-3 text-center font-black">หลักฐาน</th>
                          <th className="px-4 py-3 text-right font-black">จำนวนเงิน</th>
                          <th className="px-4 py-3 text-center font-black">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="border-t border-slate-200/40">
                            <td className={`px-4 py-3 ${currentTheme.muted}`}>{formatDate(tx.date)}</td>
                            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span></td>
                            <td className={`px-4 py-3 font-bold ${currentTheme.text}`}>{tx.description}</td>
                            <td className="px-4 py-3 text-center">{tx.attachment ? <button onClick={() => setViewImageModal(tx.attachment)} className={accent.primaryText}><Icons.Image /></button> : <span className={currentTheme.muted}>-</span>}</td>
                            <td className={`px-4 py-3 text-right font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                            <td className="px-4 py-3 text-center"><button onClick={() => handleDelete(tx.id)} className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"><Icons.Trash /></button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className={`${currentTheme.soft}`}>
                        <tr>
                          <td colSpan="4" className="px-4 py-3 text-right font-black">ยอดรวมสุทธิเดือนนี้:</td>
                          <td className={`px-4 py-3 text-right font-black ${monthlyTotals.balance >= 0 ? accent.primaryText : 'text-rose-500'}`}>{formatCurrency(monthlyTotals.balance)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </ShellCard>
            </section>
          </main>
        )}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className={`flex max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${currentTheme.card}`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${currentTheme.soft}`}>
              <div>
                <h3 className={`text-xl font-black ${currentTheme.text}`}>รายงานรายรับ-รายจ่าย</h3>
                <p className={`text-sm ${currentTheme.muted}`}>ประจำเดือน {formatDate(selectedMonth + '-01', { month: 'long', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className={`rounded-xl p-2 ${currentTheme.muted}`}><Icons.X /></button>
            </div>
            <div className="overflow-auto p-5">
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3"><p className={`text-xs ${currentTheme.muted}`}>ยอดคงเหลือ</p><p className={`text-lg font-black ${monthlyTotals.balance >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>{formatCurrency(monthlyTotals.balance)}</p></div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3"><p className={`text-xs ${currentTheme.muted}`}>รายรับ</p><p className="text-lg font-black text-emerald-500">{formatCurrency(monthlyTotals.income)}</p></div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3"><p className={`text-xs ${currentTheme.muted}`}>รายจ่าย</p><p className="text-lg font-black text-rose-500">{formatCurrency(monthlyTotals.expense)}</p></div>
              </div>
              <table className="w-full whitespace-nowrap border text-left text-xs">
                <thead className={`${currentTheme.soft}`}><tr><th className="border px-3 py-2">วันที่</th><th className="border px-3 py-2">ประเภท</th><th className="border px-3 py-2">รายละเอียด</th><th className="border px-3 py-2 text-right">จำนวนเงิน</th></tr></thead>
                <tbody>{filteredTransactions.map((tx) => <tr key={tx.id}><td className={`border px-3 py-1.5 ${currentTheme.muted}`}>{formatDate(tx.date)}</td><td className="border px-3 py-1.5"><span className={tx.type === 'income' ? 'font-black text-emerald-500' : 'font-black text-rose-500'}>{tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span></td><td className={`border px-3 py-1.5 ${currentTheme.text}`}>{tx.description}</td><td className={`border px-3 py-1.5 text-right font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}</td></tr>)}</tbody>
                <tfoot className={`${currentTheme.soft}`}><tr><td colSpan="3" className="border px-3 py-2 text-right font-black">ยอดรวมสุทธิ</td><td className={`border px-3 py-2 text-right font-black ${monthlyTotals.balance >= 0 ? accent.primaryText : 'text-rose-500'}`}>{formatCurrency(monthlyTotals.balance)}</td></tr></tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setViewImageModal(null)}>
          <div className={`relative flex max-h-full max-w-4xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${currentTheme.card}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between border-b p-4 ${currentTheme.soft}`}>
              <h4 className={`flex items-center gap-2 font-black ${currentTheme.text}`}><Icons.PaperClip /> รูปภาพหลักฐาน</h4>
              <button onClick={() => setViewImageModal(null)} className={`rounded-xl p-1 ${currentTheme.muted}`}><Icons.X /></button>
            </div>
            <div className="flex items-center justify-center overflow-auto p-4">
              <img src={viewImageModal} alt="หลักฐาน" className="max-h-[70vh] max-w-full rounded-2xl border object-contain shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
