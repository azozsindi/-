/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Copy, Check, Link as LinkIcon, Ticket, Code2, Eye, Info, Database, Wand2, QrCode, Smartphone, Camera, UserPlus, Download, Loader2, Sparkles, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";
import confetti from "canvas-confetti";

const GAS_CODE = `function doGet(e) {
  try {
    var action = e.parameter.action || "check";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!ss) {
      return renderPage("خطأ في الربط ⚠️", "السكربت غير مرتبط بجدول بيانات. يرجى فتحه من داخل قوقل شيت (Extensions > Apps Script).", "#fef3c7", "#92400e");
    }
    
    var sheet = ss.getSheets()[0];
    
    // --- تسجيل تذكرة مجموعة جديدة ---
    if (action == "register") {
      var name = e.parameter.name || "ضيف بدون اسم";
      var count = e.parameter.count || "1";
      var id = e.parameter.id;
      
      if (!id) return ContentService.createTextOutput("Error: No ID").setMimeType(ContentService.MimeType.TEXT);
      
      sheet.appendRow([id, name, count, "Active", new Date()]);
      
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- التحقق من التذكرة (الاسكان) ---
    var id = e.parameter.id;
    if (!id) return renderPage("خطأ ⚠️", "لم يتم توفير معرف التذكرة.", "#fef3c7", "#92400e");
    
    var data = sheet.getDataRange().getValues();
    var found = false, rowIndex = -1, guestName = "", count = "", status = "";
    
    for (var i = 0; i < data.length; i++) {
      if (data[i][0].toString().trim() == id.toString().trim()) {
        found = true; 
        rowIndex = i + 1; 
        guestName = data[i][1]; 
        count = data[i][2]; 
        status = data[i][3]; 
        break;
      }
    }
    
    if (!found) return renderPage("تذكرة غير صالحة ⚠️", "عذراً، هذا الرمز غير موجود في سجلاتنا. تأكد من تسجيل الضيف أولاً.", "#fee2e2", "#991b1b");
    
    if (status == "Used") {
      return renderPage("دخول مرفوض ❌", "عذراً " + guestName + "، هذه التذكرة تم استخدامها مسبقاً.", "#fee2e2", "#991b1b");
    }
    
    // تحديث الحالة
    sheet.getRange(rowIndex, 4).setValue("Used");
    sheet.getRange(rowIndex, 5).setValue("حضر في: " + Utilities.formatDate(new Date(), "GMT+3", "HH:mm:ss"));
    
    return renderPage("تم السماح بالدخول ✅", "أهلاً بك " + guestName + "<br>العدد: " + count + " أشخاص", "#dcfce7", "#166534");
    
  } catch (err) {
    return renderPage("خطأ تقني ⚙️", err.toString(), "#fef3c7", "#92400e");
  }
}

function renderPage(title, message, bgColor, textColor) {
  var html = '<div dir="rtl" style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0;"><div style="background-color: ' + bgColor + '; color: ' + textColor + '; padding: 40px; border-radius: 24px; text-align: center; width: 85%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05);"><h1 style="font-size: 2.2rem; margin-bottom: 16px; font-weight: 800;">' + title + '</h1><p style="font-size: 1.3rem; line-height: 1.6; font-weight: 500;">' + message + '</p><div style="margin-top: 30px; font-size: 0.8rem; opacity: 0.6;">نظام التذاكر الذكي © 2026</div></div></div>';
  return HtmlService.createHtmlOutput(html).setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}`;

export default function App() {
  const [copied, setCopied] = useState(false);
  const [scriptUrl, setScriptUrl] = useState("https://script.google.com/macros/s/AKfycbwXJFTKXTyCIvW2Bw2hwDWz94HLhwMoXsme8COtla7QPEUPaewCeLCJ66D_aC5s_gn7/exec");
  const [guestName, setGuestName] = useState("");
  const [ticketCount, setTicketCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registeredTickets, setRegisteredTickets] = useState<{url: string, name: string, count: number}[]>([]);
  const [importMode, setImportMode] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  const [progress, setProgress] = useState(0);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(GAS_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4f46e5', '#818cf8', '#fbbf24', '#f472b6']
    });
  };

  const registerOne = async (name: string, count: number) => {
    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const url = `${scriptUrl}?action=register&id=${uniqueId}&name=${encodeURIComponent(name)}&count=${count}`;
    await fetch(url, { mode: 'no-cors' });
    return { url: `${scriptUrl}?id=${uniqueId}`, name, count };
  };

  const handleSingleRegister = async () => {
    if (!scriptUrl) return alert("يرجى إدخال رابط السكربت!");
    if (!guestName) return alert("يرجى إدخال اسم الضيف!");
    setLoading(true);
    try {
      const ticket = await registerOne(guestName, ticketCount);
      setRegisteredTickets([ticket]);
      fireConfetti();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ في الاتصال.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPaste = async () => {
    if (!bulkText.trim()) return alert("يرجى لصق الأسماء أولاً!");
    const lines = bulkText.split("\n").filter(l => l.trim());
    setLoading(true);
    const results = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/[,،-]/);
      const name = parts[0].trim();
      const count = parseInt(parts[1]) || 1;
      try {
        const ticket = await registerOne(name, count);
        results.push(ticket);
        setProgress(Math.round(((i + 1) / lines.length) * 100));
      } catch (e) { console.error(e); }
    }
    setRegisteredTickets(results);
    setLoading(false);
    setProgress(0);
    fireConfetti();
    alert(`تم تسجيل ${results.length} ضيف بنجاح!`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      setLoading(true);
      const results = [];
      const rows = data.slice(1);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row[0]?.toString().trim();
        const count = parseInt(row[1]) || 1;
        if (name) {
          try {
            const ticket = await registerOne(name, count);
            results.push(ticket);
            setProgress(Math.round(((i + 1) / rows.length) * 100));
          } catch (e) { console.error(e); }
        }
      }
      setRegisteredTickets(results);
      setLoading(false);
      setProgress(0);
      fireConfetti();
      alert(`تم تسجيل ${results.length} ضيف من الملف بنجاح!`);
    };
    reader.readAsBinaryString(file);
  };

  const downloadQR = (id: string, name: string) => {
    const svg = document.getElementById(id);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `تذكرة-${name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-900 font-sans selection:bg-indigo-100" dir="rtl">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-indigo-200/30 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[60%] -right-[10%] w-[70%] h-[70%] bg-violet-200/30 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-amber-100/20 blur-[100px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="max-w-md mx-auto px-5 py-10 relative z-10 space-y-10">
        {/* Header */}
        <header className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-indigo-600 rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(79,70,229,0.5)] mb-2 relative group"
          >
            <Ticket className="text-white w-12 h-12 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-4 border-white shadow-lg" />
            <Sparkles className="absolute -bottom-2 -left-2 text-amber-400 w-6 h-6 animate-bounce" />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-black tracking-tight text-slate-900">نظام التذاكر</h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">إدارة الدخول الذكية • 2026</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button 
              onClick={copyToClipboard}
              className="text-[11px] font-black text-indigo-600 bg-white/80 backdrop-blur-md px-5 py-2 rounded-full shadow-sm border border-indigo-100/50 hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-2"
            >
              <Code2 className="w-3.5 h-3.5" />
              {copied ? "تم نسخ الكود ✅" : "نسخ كود السكربت"}
            </button>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-[2.5rem] border border-white/60 shadow-xl shadow-indigo-500/5">
          <button 
            onClick={() => setImportMode("single")}
            className={`flex-1 py-4 rounded-[2rem] text-sm font-black transition-all duration-500 flex items-center justify-center gap-2 ${importMode === "single" ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-400/30" : "text-slate-400 hover:text-slate-600"}`}
          >
            <UserPlus className="w-4 h-4" />
            إضافة فردية
          </button>
          <button 
            onClick={() => setImportMode("bulk")}
            className={`flex-1 py-4 rounded-[2rem] text-sm font-black transition-all duration-500 flex items-center justify-center gap-2 ${importMode === "bulk" ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-400/30" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Database className="w-4 h-4" />
            إضافة جماعية
          </button>
        </div>

        {/* Main Content */}
        <main className="glass rounded-[3.5rem] p-8 space-y-8 relative overflow-hidden shadow-2xl shadow-indigo-500/10">
          <AnimatePresence mode="wait">
            {importMode === "single" ? (
              <motion.div 
                key="single"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase mr-3">اسم الضيف</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="أدخل الاسم هنا..."
                      className="w-full px-7 py-6 bg-white/60 border border-white/80 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all text-xl font-bold placeholder:text-slate-300 shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase mr-3">عدد الأشخاص</label>
                    <input
                      type="number"
                      min="1"
                      value={ticketCount}
                      onChange={(e) => setTicketCount(parseInt(e.target.value) || 1)}
                      className="w-full px-7 py-6 bg-white/60 border border-white/80 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all text-xl font-bold shadow-inner"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSingleRegister}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] active:scale-95 group"
                >
                  {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <QrCode className="w-7 h-7 group-hover:rotate-12 transition-transform" />}
                  إصدار التذكرة
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="bulk"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <label className="block text-[11px] font-black text-slate-400 uppercase text-center">الصق الأسماء من الواتساب</label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="محمد علي، 2&#10;أحمد خالد، 5"
                    className="w-full h-44 px-7 py-6 bg-white/60 border border-white/80 rounded-[2rem] focus:outline-none focus:border-indigo-500/50 transition-all text-sm font-bold resize-none shadow-inner"
                  />
                  <button
                    onClick={handleBulkPaste}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    تسجيل القائمة الملصقة
                  </button>
                </div>

                <div className="relative flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-200/50" />
                  <span className="text-[10px] uppercase font-black text-slate-300">أو ملف إكسل</span>
                  <div className="flex-1 h-px bg-slate-200/50" />
                </div>

                <div className="flex flex-col items-center gap-4">
                  <input type="file" id="excel-upload" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
                  <label 
                    htmlFor="excel-upload"
                    className="w-full border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                      <Database className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <span className="text-xs font-black text-slate-400 group-hover:text-indigo-600 transition-colors">اختر ملف Excel</span>
                  </label>
                </div>

                {loading && progress > 0 && (
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-indigo-600 h-full shadow-[0_0_15px_rgba(79,70,229,0.6)]" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Area */}
          <AnimatePresence>
            {registeredTickets.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="pt-12 space-y-12 border-t border-slate-100/50"
              >
                <div className="flex items-center justify-center gap-4">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">التذاكر المصدرة ({registeredTickets.length})</h3>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100" />
                </div>
                
                <div className="space-y-20 pb-10">
                  {registeredTickets.map((ticket, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex flex-col items-center gap-8 animate-float"
                    >
                      {/* Premium Ticket Visual */}
                      <div className="relative w-full max-w-[300px]">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_30px_60px_-15px_rgba(79,70,229,0.15)] border border-slate-100 relative overflow-hidden ticket-shape group">
                          {/* Top Section */}
                          <div className="flex flex-col items-center gap-8 relative z-10">
                            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner group-hover:bg-white transition-colors">
                              <QRCodeSVG id={`qr-${i}`} value={ticket.url} size={180} />
                            </div>
                            
                            <div className="text-center space-y-2">
                              <p className="text-2xl font-display font-black text-slate-900">{ticket.name}</p>
                              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-black uppercase">
                                <UserPlus className="w-3.5 h-3.5" />
                                {ticket.count} أشخاص
                              </div>
                            </div>
                          </div>
                          
                          {/* Perforated Line */}
                          <div className="absolute top-[65%] left-0 right-0 border-t-2 border-dashed border-slate-100 pointer-events-none" />
                          
                          {/* Bottom Section (Stub) */}
                          <div className="mt-12 text-center relative z-10 opacity-30">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Smart Ticket System • 2026</p>
                          </div>
                        </div>
                        
                        <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-3 px-4 z-20">
                          <button 
                            onClick={() => downloadQR(`qr-${i}`, ticket.name)}
                            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl shadow-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                            حفظ الصورة
                          </button>
                          <button 
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: 'تذكرتك الذكية',
                                  text: `تذكرة دخول لـ ${ticket.name}`,
                                  url: ticket.url
                                });
                              } else {
                                navigator.clipboard.writeText(ticket.url);
                                alert("تم نسخ الرابط!");
                              }
                            }}
                            className="w-14 bg-white border border-slate-100 text-slate-900 rounded-2xl shadow-xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer Settings */}
        <details className="text-center group">
          <summary className="text-[11px] font-black text-slate-300 cursor-pointer hover:text-indigo-400 transition-colors list-none flex items-center justify-center gap-2 py-4">
            <Wand2 className="w-3.5 h-3.5" />
            الإعدادات المتقدمة
          </summary>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-8 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white/80 shadow-xl space-y-4"
          >
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 text-right uppercase mr-2">رابط السكربت المباشر</label>
              <input
                type="text"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                className="w-full px-5 py-4 bg-white/80 border border-slate-100 rounded-2xl text-[10px] font-mono focus:outline-none focus:border-indigo-500 shadow-inner"
                dir="ltr"
              />
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed">تأكد من نشر السكربت في Google Apps Script كـ Web App وإعطاء صلاحية الوصول للجميع (Anyone).</p>
          </motion.div>
        </details>

        <footer className="text-center space-y-2 pb-16">
          <div className="h-px w-12 bg-slate-200 mx-auto" />
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest opacity-40">نظام التذاكر الذكي • 2026</p>
        </footer>
      </div>
    </div>
  );
}
