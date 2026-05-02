import React, { useState, useMemo, useRef, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, logout } from "./firebase";

export default function App() {
  // หาค่าเดือนปัจจุบัน YYYY-MM
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayDateStr = today.toISOString().slice(0, 10);

  // สถานะแท็บ (Dashboard หรือ Transactions)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // สถานะเก็บรายการทั้งหมด (ดึงจาก Local Storage)
  const [transactions, setTransactions] = useState(() => {
    const savedData = localStorage.getItem('my_expense_data');
    if (savedData) {
      return JSON.parse(savedData);
    }
    return []; // เริ่มต้นจาก 0
  });

  // บันทึกข้อมูลลง Local Storage อัตโนมัติทุกครั้งที่รายการอัปเดต
  useEffect(() => {
    localStorage.setItem('my_expense_data', JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAuthLoading(false);
  });

  return () => unsubscribe();
}, []);
  // สถานะต่างๆ สำหรับฟิลเตอร์และฟอร์ม
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

  // จัดการเมื่อเลือกไฟล์รูปภาพ
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- การคำนวณข้อมูลสำหรับแท็บ "จัดการรายการ" (รายเดือน) ---
  const filteredTransactions = useMemo(() => {
  return [...transactions]
    .filter((t) => t.date.startsWith(selectedMonth))
    .sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;

      return (a.createdAt || a.id) - (b.createdAt || b.id);
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

  // --- การคำนวณข้อมูลสำหรับแท็บ "แดชบอร์ด" (ภาพรวมทั้งหมด) ---
  const allTimeStats = useMemo(() => {
    return transactions.reduce((acc, curr) => {
      if (curr.type === 'income') acc.income += curr.amount;
      else acc.expense += curr.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [transactions]);

  // เตรียมข้อมูลกราฟ 6 เดือนล่าสุดที่มีข้อมูล
  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    const stats = {};
    transactions.forEach(t => {
      const mStr = t.date.slice(0, 7);
      if (!stats[mStr]) stats[mStr] = { month: mStr, income: 0, expense: 0 };
      stats[mStr][t.type] += t.amount;
    });
    const sorted = Object.values(stats)
  .map((item) => ({
    ...item,
    balance: item.income - item.expense,
  }))
  .sort((a, b) => a.month.localeCompare(b.month));

return sorted.slice(-6); // เอาแค่ 6 เดือนล่าสุด
  }, [transactions]);

  // หาค่าสูงสุดเพื่อเทียบอัตราส่วนความสูงของกราฟแท่ง
  const maxChartValue = Math.max(...chartData.flatMap(d => [d.income, d.expense]), 100);
  const monthlyBalanceData = useMemo(() => {
  const stats = {};

  transactions.forEach((t) => {
    const mStr = t.date.slice(0, 7);

    if (!stats[mStr]) {
      stats[mStr] = {
        month: mStr,
        income: 0,
        expense: 0,
      };
    }

    stats[mStr][t.type] += t.amount;
  });

  return Object.values(stats)
    .map((item) => ({
      ...item,
      balance: item.income - item.expense,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}, [transactions]);

  // 5 รายการล่าสุดสำหรับแดชบอร์ด
  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  }, [transactions]);

  // --- ฟังก์ชันช่วยเหลือทั่วไป ---
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !description || !date) return;

    const newTransaction = {
      id: Date.now(),
      type,
      amount: parseFloat(amount),
      description,
      date,
      attachment,
    };

    setTransactions([...transactions, newTransaction]);
    setAmount('');
    setDescription('');
    clearAttachment();

    const newTxMonth = date.slice(0, 7);
    if (newTxMonth !== selectedMonth) {
      setSelectedMonth(newTxMonth);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('ยืนยันการลบรายการนี้?')) {
      setTransactions(transactions.filter((t) => t.id !== id));
    }
  };

  const handleClearAll = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล "ทั้งหมด" ทุกเดือน? (การกระทำนี้ไม่สามารถกู้คืนได้)')) {
      setTransactions([]);
    }
  };

  const Icons = {
    Wallet: () => <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    TrendingUp: () => <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    TrendingDown: () => <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Calendar: () => <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    Table: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    PaperClip: () => <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
    Image: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    ChartBar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    Document: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  };
  if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500 font-medium">กำลังโหลด...</p>
    </div>
  );
}

if (!user) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
          <span className="text-3xl">💰</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          ระบบบัญชีรายรับ-รายจ่าย
        </h1>

        <p className="text-sm text-slate-500 mb-6">
          เข้าสู่ระบบเพื่อจัดการข้อมูลการเงินของคุณ
        </p>

        <button
          onClick={loginWithGoogle}
          className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors flex items-center justify-center gap-3"
        >
          <span className="text-xl">G</span>
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </div>
  );
}
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header หลัก & ระบบ Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Icons.Wallet />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">ระบบบัญชีรายรับ-รายจ่าย</h1>
              <p className="text-sm text-slate-500">จัดการการเงินของคุณได้อย่างง่ายดาย</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icons.ChartBar /> แดชบอร์ด
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icons.Document /> จัดการรายการ
              </button>
            </div>

            <div className="flex items-center gap-3">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-9 h-9 rounded-full border border-slate-200"
                />
              )}

              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-700">
                  {user.displayName}
                </p>
                <p className="text-xs text-slate-400">
                  {user.email}
                </p>
              </div>

              <button
                onClick={logout}
                className="text-sm text-rose-500 hover:text-white border border-rose-200 hover:bg-rose-500 font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ======================= แท็บ แดชบอร์ด (Dashboard) ======================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* กล่องสรุปยอดรวมทั้งหมด (All Time) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 flex items-center gap-4">
                <div className="p-4 bg-slate-700 rounded-full text-white">
                  <Icons.Wallet />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-1">ยอดคงเหลือสุทธิ (รวมทั้งหมด)</p>
                  <h2 className="text-3xl font-bold text-white">
                    {formatCurrency(allTimeStats.balance)}
                  </h2>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
                <div className="p-4 bg-emerald-50 rounded-full">
                  <Icons.TrendingUp />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">รายรับรวม (ทั้งหมด)</p>
                  <h2 className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(allTimeStats.income)}
                  </h2>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 flex items-center gap-4">
                <div className="p-4 bg-rose-50 rounded-full">
                  <Icons.TrendingDown />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">รายจ่ายรวม (ทั้งหมด)</p>
                  <h2 className="text-2xl font-bold text-rose-600">
                    {formatCurrency(allTimeStats.expense)}
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ส่วนของกราฟรายเดือน (CSS ล้วน) */}
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Icons.ChartBar /> แนวโน้ม 6 เดือนล่าสุด
                </h3>
                
                <div className="h-64 flex items-end justify-around gap-2 pt-4 border-b border-slate-100 pb-2">
                  {chartData.length === 0 ? (
                    <p className="text-slate-400 self-center">ยังไม่มีข้อมูลสำหรับสร้างกราฟ</p>
                  ) : (
                    chartData.map((data, index) => {
                      const heightInc = maxChartValue > 0 ? (data.income / maxChartValue) * 100 : 0;
                      const heightExp = maxChartValue > 0 ? (data.expense / maxChartValue) * 100 : 0;
                      return (
                        <div key={index} className="flex flex-col items-center gap-2 w-full h-full justify-end group">
                          <div className="flex items-end gap-1 w-full justify-center h-[85%]">
                            <div 
                              style={{ height: `${heightInc}%` }} 
                              className="w-1/3 max-w-[24px] bg-emerald-400 rounded-t-md transition-all duration-500 group-hover:bg-emerald-500 relative"
                              title={`รายรับ: ${formatCurrency(data.income)}`}
                            ></div>
                            <div 
                              style={{ height: `${heightExp}%` }} 
                              className="w-1/3 max-w-[24px] bg-rose-400 rounded-t-md transition-all duration-500 group-hover:bg-rose-500 relative"
                              title={`รายจ่าย: ${formatCurrency(data.expense)}`}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">
                             {new Date(data.month + '-01').toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-center gap-6 mt-4 text-sm font-medium text-slate-600">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-400 rounded-full"></span> รายรับ</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-rose-400 rounded-full"></span> รายจ่าย</div>
                </div>
              </div>

              {/* ส่วนรายการล่าสุด */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">ทำรายการล่าสุด</h3>
                  <button onClick={() => setActiveTab('transactions')} className="text-sm text-blue-500 hover:text-blue-700 font-medium">ดูทั้งหมด</button>
                </div>
                
                {recentTransactions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Icons.Calendar />
                    <p className="mt-2">ยังไม่มีรายการ</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {tx.type === 'income' ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{tx.description}</p>
                            <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Icons.Wallet /> สรุปยอดคงเหลือรายเดือน
                </h3>
                <span className="text-sm text-slate-500">
                  {monthlyBalanceData.length} เดือน
                </span>
              </div>

              {monthlyBalanceData.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  ยังไม่มีข้อมูลรายเดือน
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {monthlyBalanceData.map((month) => (
                    <div
                      key={month.month}
                      className={`p-4 rounded-xl border ${
                        month.balance >= 0
                          ? 'bg-blue-50 border-blue-100'
                          : 'bg-rose-50 border-rose-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            {new Date(month.month + '-01').toLocaleDateString('th-TH', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            รับ {formatCurrency(month.income)}
                          </p>
                          <p className="text-xs text-slate-500">
                            จ่าย {formatCurrency(month.expense)}
                          </p>
                        </div>

                        <span
                          className={`text-xs px-2 py-1 rounded-full font-bold ${
                            month.balance >= 0
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-rose-100 text-rose-600'
                          }`}
                        >
                          {month.balance >= 0 ? 'บวก' : 'ลบ'}
                        </span>
                      </div>

                      <p
                        className={`text-xl font-bold mt-3 ${
                          month.balance >= 0 ? 'text-blue-600' : 'text-rose-600'
                        }`}
                      >
                        {month.balance >= 0 ? 'คงเหลือ ' : 'ติดลบ '}
                        {formatCurrency(Math.abs(month.balance))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= แท็บ จัดการรายการ (Transactions) ======================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header ของเดือนที่เลือก */}
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
              <h2 className="text-xl font-bold text-slate-800">จัดการข้อมูลรายเดือน</h2>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto">
                <Icons.Calendar />
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer w-full"
                />
              </div>
            </div>

            {/* กล่องสรุปเฉพาะเดือนที่เลือก */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center gap-4">
                <div className="p-4 bg-blue-50 rounded-full">
                  <Icons.Wallet />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">ยอดคงเหลือ (เฉพาะเดือนนี้)</p>
                  <h2 className={`text-2xl font-bold ${monthlyTotals.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {formatCurrency(monthlyTotals.balance)}
                  </h2>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
                <div className="p-4 bg-emerald-50 rounded-full">
                  <Icons.TrendingUp />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">รายรับ (เดือนนี้)</p>
                  <h2 className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(monthlyTotals.income)}
                  </h2>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 flex items-center gap-4">
                <div className="p-4 bg-rose-50 rounded-full">
                  <Icons.TrendingDown />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">รายจ่าย (เดือนนี้)</p>
                  <h2 className="text-2xl font-bold text-rose-600">
                    {formatCurrency(monthlyTotals.expense)}
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">เพิ่มรายการใหม่</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      รายรับ
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      รายจ่าย
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนเงิน (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="เช่น ค่าอาหาร, เงินเดือน"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    />
                  </div>

                  {/* ส่วนแนบรูปภาพ */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">แนบรูปหลักฐาน (ทางเลือก)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 border-dashed rounded-lg cursor-pointer hover:bg-slate-100 transition-colors text-sm text-slate-600">
                        <Icons.PaperClip />
                        <span>เลือกรูปภาพ</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleFileChange}
                          ref={fileInputRef}
                        />
                      </label>
                    </div>
                    
                    {attachment && (
                      <div className="mt-3 relative inline-block">
                        <img src={attachment} alt="Preview" className="h-20 w-auto rounded-lg object-cover border border-slate-200" />
                        <button 
                          type="button" 
                          onClick={clearAttachment}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors mt-2 ${
                      type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                    }`}
                  >
                    บันทึกรายการ
                  </button>
                </form>
              </div>

              {/* List Section */}
              <div className="lg:col-span-2 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800">ประวัติรายการ</h3>
                    <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                      {filteredTransactions.length} รายการ
                    </span>
                  </div>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="text-sm text-blue-600 hover:text-white border border-blue-200 hover:bg-blue-500 font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                  >
                    <Icons.Table /> ดูรายงานเต็มจอ
                  </button>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* ปุ่มล้างข้อมูลทั้งหมด */}
                    {transactions.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-sm text-rose-500 hover:text-white border border-rose-200 hover:bg-rose-500 font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                      >
                        <Icons.Trash /> ล้างข้อมูล
                      </button>
                    )}

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="ดูแบบรายการ"
                      >
                        <Icons.List />
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="ดูแบบตาราง"
                      >
                        <Icons.Table />
                      </button>
                    </div>
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Icons.Calendar />
                    <p className="mt-2">ไม่มีรายการในเดือนที่เลือก</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {viewMode === 'list' ? (
                      // แสดงแบบรายการ
                      filteredTransactions.map((tx) => (
                        <div 
                          key={tx.id} 
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {tx.type === 'income' ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800">{tx.description}</p>
                                {tx.attachment && (
                                  <button 
                                    onClick={() => setViewImageModal(tx.attachment)}
                                    className="text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 p-1 rounded-md transition-colors"
                                    title="ดูรูปหลักฐาน"
                                  >
                                    <Icons.Image />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                            <button 
                              onClick={() => handleDelete(tx.id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="ลบรายการ"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      // แสดงแบบตาราง
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-1.5 font-medium">วันที่</th>
                              <th className="px-4 py-3 font-medium">ประเภท</th>
                              <th className="px-4 py-3 font-medium">รายละเอียด</th>
                              <th className="px-4 py-3 font-medium text-center">หลักฐาน</th>
                              <th className="px-4 py-3 font-medium text-right">จำนวนเงิน</th>
                              <th className="px-4 py-3 font-medium text-center">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((tx) => (
                              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-1.5 text-slate-500">
                                  {new Date(tx.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">{tx.description}</td>
                                <td className="px-4 py-3 text-center">
                                  {tx.attachment ? (
                                    <button 
                                      onClick={() => setViewImageModal(tx.attachment)}
                                      className="text-blue-500 hover:text-blue-700 flex items-center justify-center w-full"
                                      title="ดูรูปหลักฐาน"
                                    >
                                      <Icons.Image />
                                    </button>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button 
                                    onClick={() => handleDelete(tx.id)}
                                    className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-50"
                                    title="ลบรายการ"
                                  >
                                    <Icons.Trash />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
                            <tr>
                              <td colSpan="4" className="px-4 py-3 text-right">ยอดรวมสุทธิเดือนนี้:</td>
                              <td className={`px-4 py-3 text-right ${monthlyTotals.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                {formatCurrency(monthlyTotals.balance)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Modal รายงานเต็มจอ สำหรับแคปรายงาน */}
{showReportModal && (
  <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center">
    <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
        <div>
          <h3 className="text-xl font-bold text-slate-800">รายงานรายรับ-รายจ่าย</h3>
          <p className="text-sm text-slate-500">
            ประจำเดือน {new Date(selectedMonth + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <button
          onClick={() => setShowReportModal(false)}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
        >
          <Icons.X />
        </button>
      </div>

      <div className="p-5 overflow-auto">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="border border-blue-100 bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">ยอดคงเหลือ</p>
            <p className={`text-lg font-bold ${monthlyTotals.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {formatCurrency(monthlyTotals.balance)}
            </p>
          </div>

          <div className="border border-emerald-100 bg-emerald-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">รายรับ</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(monthlyTotals.income)}
            </p>
          </div>

          <div className="border border-rose-100 bg-rose-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">รายจ่าย</p>
            <p className="text-lg font-bold text-rose-600">
              {formatCurrency(monthlyTotals.expense)}
            </p>
          </div>
        </div>

        <table className="w-full text-left text-xs whitespace-nowrap border border-slate-200">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2 border border-slate-200">วันที่</th>
              <th className="px-3 py-2 border border-slate-200">ประเภท</th>
              <th className="px-3 py-2 border border-slate-200">รายละเอียด</th>
              <th className="px-3 py-2 border border-slate-200 text-right">จำนวนเงิน</th>
            </tr>
          </thead>

          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="even:bg-slate-50">
                <td className="px-3 py-1.5 border border-slate-200 text-slate-600">
                  {new Date(tx.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>

                <td className="px-3 py-1.5 border border-slate-200">
                  <span className={tx.type === 'income' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                  </span>
                </td>

                <td className="px-3 py-1.5 border border-slate-200 text-slate-800">
                  {tx.description}
                </td>

                <td className={`px-3 py-1.5 border border-slate-200 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="bg-slate-100 font-bold">
            <tr>
              <td colSpan="3" className="px-3 py-2 border border-slate-200 text-right">
                ยอดรวมสุทธิ
              </td>
              <td className={`px-3 py-2 border border-slate-200 text-right ${monthlyTotals.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                {formatCurrency(monthlyTotals.balance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
)}
      {/* Modal หน้าต่างสำหรับดูรูปภาพ */}
      {viewImageModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          onClick={() => setViewImageModal(null)}
        >
          <div 
            className="relative max-w-4xl max-h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Icons.PaperClip /> รูปภาพหลักฐาน
              </h4>
              <button 
                onClick={() => setViewImageModal(null)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <Icons.X />
              </button>
            </div>
            <div className="p-4 overflow-auto flex justify-center items-center bg-slate-100/50">
              <img 
                src={viewImageModal} 
                alt="หลักฐาน" 
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm border border-slate-200" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
