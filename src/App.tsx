/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Copy, Check, Link as LinkIcon, Ticket, Code2, Eye, Info, Database, Wand2, QrCode, Smartphone, Camera, UserPlus, Download, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";

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
      // Parse "Name, Count" or just "Name"
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
      const rows = data.slice(1); // Skip header
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8" dir="rtl">
      <div className="max-w-md mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl mb-2">
            <Ticket className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">نظام التذاكر الذكي</h1>
          <div className="flex items-center justify-center gap-2">
            <button 
              onClick={copyToClipboard}
              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
            >
              {copied ? "تم نسخ الكود ✅" : "نسخ كود السكربت"}
            </button>
          </div>
        </header>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setImportMode("single")}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${importMode === "single" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}
          >
            إضافة فردية
          </button>
          <button 
            onClick={() => setImportMode("bulk")}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${importMode === "bulk" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}
          >
            إضافة جماعية (واتساب/إكسل)
          </button>
        </div>

        <main className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
          {importMode === "single" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">اسم الضيف</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="أدخل الاسم هنا..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">عدد الأشخاص</label>
                <input
                  type="number"
                  min="1"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(parseInt(e.target.value) || 1)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg font-bold"
                />
              </div>
              <button
                onClick={handleSingleRegister}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-95"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <QrCode className="w-6 h-6" />}
                إصدار التذكرة
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1 text-center">الصق الأسماء من الواتساب (اسم، عدد)</label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="محمد علي، 2&#10;أحمد خالد، 5&#10;سارة، 1"
                  className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-500 transition-all text-sm font-medium resize-none"
                />
                <button
                  onClick={handleBulkPaste}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  تسجيل القائمة الملصقة
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300"><span className="bg-white px-4">أو ارفع ملف إكسل</span></div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <input 
                  type="file" 
                  id="excel-upload" 
                  hidden 
                  accept=".xlsx, .xls" 
                  onChange={handleFileUpload}
                />
                <label 
                  htmlFor="excel-upload"
                  className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                >
                  <Database className="w-8 h-8 text-slate-300" />
                  <span className="text-xs font-bold text-slate-400">اختر ملف Excel</span>
                </label>
              </div>

              {loading && progress > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-indigo-600 h-full" />
                </div>
              )}
            </div>
          )}

          <AnimatePresence>
            {registeredTickets.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-8 space-y-8">
                <div className="h-px bg-slate-100" />
                <h3 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">التذاكر المصدرة ({registeredTickets.length})</h3>
                <div className="space-y-12">
                  {registeredTickets.map((ticket, i) => (
                    <div key={i} className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-white rounded-[2.5rem] border-4 border-indigo-50 shadow-inner relative group">
                        <QRCodeSVG id={`qr-${i}`} value={ticket.url} size={180} />
                        <button 
                          onClick={() => downloadQR(`qr-${i}`, ticket.name)}
                          className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full shadow-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 whitespace-nowrap"
                        >
                          <Download className="w-4 h-4" />
                          حفظ تذكرة {ticket.name}
                        </button>
                      </div>
                      <div className="text-center pt-4">
                        <p className="text-sm font-bold text-slate-800">{ticket.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1">العدد: {ticket.count} أشخاص</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <details className="text-center">
          <summary className="text-[10px] font-bold text-slate-300 cursor-pointer hover:text-slate-500 transition-colors list-none">الإعدادات المتقدمة</summary>
          <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100 space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 text-right">رابط السكربت (GAS URL)</label>
            <input
              type="text"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono"
              dir="ltr"
            />
          </div>
        </details>

        <footer className="text-center text-[10px] text-slate-400 font-medium pb-8">
          نظام التذاكر الذكي © 2026
        </footer>
      </div>
    </div>
  );
}
