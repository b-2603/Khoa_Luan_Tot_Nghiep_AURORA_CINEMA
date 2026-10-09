import React, { useState, useEffect } from 'react';
import { User, Certificate } from '../types';
import { getCertificates } from '../services/storage';
import { fetchCertificates } from '../services/apiClient';
import { 
  Award, ShieldCheck, QrCode, Printer, X, CheckCircle2, 
  Sparkles, Medal, Star, Copy, Check, ExternalLink, Calendar,
  GraduationCap
} from 'lucide-react';

interface CertificatesPageProps {
  currentUser: User;
}

export const CertificatesPage: React.FC<CertificatesPageProps> = ({ currentUser }) => {
  const [allCerts, setAllCerts] = useState<Certificate[]>(getCertificates());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates().then(data => {
      if (data && data.length > 0) setAllCerts(data);
    });
  }, []);

  const isMatchUser = (certUserId: string, currentId: string) => {
    const num1 = String(certUserId).replace('usr-', '');
    const num2 = String(currentId).replace('usr-', '');
    return certUserId === currentId || num1 === num2;
  };

  const certs = currentUser.role === 'manager' 
    ? allCerts 
    : allCerts.filter(c => isMatchUser(c.userId, currentUser.id));

  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const avgScore = certs.length > 0 
    ? Math.round(certs.reduce((sum, c) => sum + (c.score || 90), 0) / certs.length) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Hồ Sơ Chứng Chỉ Đào Tạo & Nghiệp Vụ Rạp</h2>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống chứng chỉ số hóa (Digital Certificates) cấp tự động kèm con dấu bảo chứng và mã QR xác thực chính thức của Aurora Cinemas
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500 text-white rounded-xl shadow-xs">
              <Medal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Đã Đạt Được</div>
              <div className="text-base font-black text-amber-950 leading-none mt-0.5">{certs.length} Chứng Chỉ</div>
            </div>
          </div>

          <div className="px-4 py-2 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500 text-white rounded-xl shadow-xs">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Điểm TB Sát Hạch</div>
              <div className="text-base font-black text-emerald-950 leading-none mt-0.5">{avgScore > 0 ? `${avgScore}/100` : '--'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Gallery Grid */}
      {certs.length === 0 ? (
        <div className="bg-gradient-to-b from-white to-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-amber-100/70 border border-amber-300 rounded-3xl flex items-center justify-center mx-auto text-amber-700 shadow-sm">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-800">Chưa Có Chứng Chỉ Đào Tạo Trong Hồ Sơ</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy tham gia các khóa học nghiệp vụ tại mục Đào Tạo và hoàn thành bài kiểm tra đánh giá (điểm từ 80% trở lên) để được cấp chứng chỉ danh giá của Cụm Rạp!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certs.map((cert) => (
            <div
              key={cert.certificateCode || cert.id}
              className="bg-white border-2 border-amber-200/90 hover:border-amber-400 rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
            >
              {/* Luxury Gold corner ribbon badge */}
              <div className="absolute top-0 right-0">
                <div className="bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black text-[9px] uppercase px-4 py-1 rounded-bl-xl tracking-wider shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  <span>XUẤT SẮC • {cert.score || 95} ĐIỂM</span>
                </div>
              </div>

              {/* Background Watermark Crest */}
              <div className="absolute -right-8 -bottom-8 text-amber-500/10 pointer-events-none group-hover:scale-105 transition-transform">
                <Award className="w-48 h-48" />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-300/60 rounded-xl text-amber-700 shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-amber-800 tracking-wider uppercase block">
                      AURORA CINEMAS CERTIFIED
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Mã: {cert.certificateCode}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-base text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2 leading-snug">
                    {cert.courseTitle}
                  </h3>
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600">
                    <span className="text-slate-400">Vinh danh:</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {cert.userName}
                    </span>
                    {cert.userStaffCode && (
                      <span className="text-[10px] font-mono text-slate-400">({cert.userStaffCode})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-amber-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-medium">Cấp ngày: {cert.issuedAt}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCode(cert.certificateCode)}
                      title="Sao chép mã xác thực"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                    >
                      {copiedCode === cert.certificateCode ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => setPreviewCert(cert)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Xem Bản Đẹp & In Bằng</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LUXURY MASTERPIECE CERTIFICATE PREVIEW MODAL & PRINT FRAME */}
      {/* ========================================================================= */}
      {previewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-4xl p-4 sm:p-6 shadow-2xl relative space-y-4 my-auto print:p-0 print:border-0 print:bg-white print:m-0">
            {/* Action Bar (Hidden when printing) */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-200 tracking-wide">
                  Xem Trước Chứng Chỉ Quốc Tế Chuẩn In Ấn (Khổ A4 Ngang)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>In / Xuất Bản PDF Chuẩn</span>
                </button>

                <button
                  onClick={() => setPreviewCert(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* =================================================================== */}
            {/* THE ACTUAL PRINTABLE CERTIFICATE TEMPLATE */}
            {/* =================================================================== */}
            <div 
              id="certificate-print-area"
              className="bg-[#faf8f2] text-slate-900 rounded-2xl p-6 sm:p-10 border-8 border-double border-amber-600/70 shadow-inner relative overflow-hidden select-none"
              style={{
                backgroundImage: 'radial-gradient(#d97706 0.75px, transparent 0.75px), radial-gradient(#d97706 0.75px, #faf8f2 0.75px)',
                backgroundSize: '30px 30px',
                backgroundPosition: '0 0, 15px 15px'
              }}
            >
              {/* Inner Decorative Golden Border */}
              <div className="border-2 border-amber-500/50 p-6 sm:p-8 rounded-xl relative bg-white/92 backdrop-blur-xs">
                
                {/* 4 Art-Deco Ornate Corners */}
                <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-700 pointer-events-none"></div>
                <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-700 pointer-events-none"></div>
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-700 pointer-events-none"></div>
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-700 pointer-events-none"></div>

                {/* Center Watermark Crest */}
                <div className="absolute inset-0 flex items-center justify-center opacity-4 pointer-events-none">
                  <Award className="w-96 h-96 text-amber-900" />
                </div>

                {/* Certificate Top Header */}
                <div className="text-center space-y-2 relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>AURORA CINEMAS INTERNATIONAL ACADEMY</span>
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  </div>

                  <h1 className="font-extrabold text-2xl sm:text-4xl text-amber-950 tracking-wide uppercase pt-2">
                    CHỨNG CHỈ NĂNG LỰC NGHIỆP VỤ
                  </h1>
                  <div className="text-xs sm:text-sm font-semibold tracking-widest text-amber-800 uppercase font-cinzel">
                    CERTIFICATE OF PROFESSIONAL EXCELLENCE
                  </div>
                </div>

                {/* Certificate Body Content */}
                <div className="text-center my-6 sm:my-8 space-y-4 relative z-10">
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">
                    Hội đồng Đào tạo & Giám sát Tiêu chuẩn Dịch vụ Rạp Chiếu Phim trân trọng chứng nhận:
                  </div>

                  {/* Recipient Name */}
                  <div className="py-1">
                    <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-wider uppercase border-b-2 border-amber-400/80 inline-block px-8 pb-1 shadow-xs certificate-name">
                      {(previewCert.userName || '').normalize('NFC')}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1.5">
                      Mã Nhân Sự: <span className="font-bold text-slate-800">{previewCert.userStaffCode || 'AR-STAFF-2026'}</span> • Cụm Rạp Chiếu Phim Aurora
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed font-medium">
                    Đã hoàn thành xuất sắc chương trình đào tạo nghiệp vụ chuẩn SOP và vượt qua kỳ sát hạch đánh giá chuyên môn:
                  </div>

                  {/* Course Title Card */}
                  <div className="bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 border border-amber-300 rounded-2xl py-3 px-6 max-w-xl mx-auto shadow-xs">
                    <div className="text-base sm:text-lg font-black text-amber-950 tracking-tight">
                      {(previewCert.courseTitle || '').normalize('NFC')}
                    </div>
                    <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mt-0.5">
                      Kết quả đánh giá: {previewCert.score || 95}/100 Điểm • Xếp loại: XUẤT SẮC (DISTINCTION)
                    </div>
                  </div>
                </div>

                {/* Certificate Signatures & Official Seals */}
                <div className="pt-6 border-t border-amber-300/70 grid grid-cols-3 items-end text-center relative z-10 gap-2 sm:gap-4">
                  {/* Left Signer: Training Director */}
                  <div className="space-y-1">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                      GIÁM ĐỐC ĐÀO TẠO
                    </div>
                    {/* Simulated hand signature */}
                    <div className="italic text-lg sm:text-2xl text-blue-900 font-extrabold h-12 flex items-center justify-center select-none transform -rotate-3">
                      Phạm Thu Hương
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 border-t border-slate-300 pt-1 max-w-[140px] mx-auto">
                      Phạm Thu Hương
                    </div>
                    <div className="text-[9px] text-slate-500">Giám đốc Đào tạo & Nhân sự</div>
                  </div>

                  {/* Center: Official Wax Seal 3D */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-amber-200 border-4 border-amber-400 flex flex-col items-center justify-center shadow-lg relative p-1">
                      <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-amber-300" />
                      <span className="text-[6px] sm:text-[7px] font-black tracking-widest text-center uppercase text-amber-100 mt-0.5">
                        AURORA SEAL
                      </span>
                      <span className="text-[5px] text-amber-200/90 font-mono">VERIFIED 2026</span>
                    </div>
                    <div className="text-[9px] font-mono text-amber-800 font-bold mt-2">
                      {previewCert.certificateCode}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Ngày cấp: {previewCert.issuedAt}
                    </div>
                  </div>

                  {/* Right: QR Code & General Manager */}
                  <div className="space-y-1">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                      TỔNG GIÁM ĐỐC CỤM RẠP
                    </div>
                    {/* Simulated hand signature */}
                    <div className="italic text-lg sm:text-2xl text-blue-900 font-extrabold h-12 flex items-center justify-center select-none transform -rotate-2">
                      Trần Quang Huy
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 border-t border-slate-300 pt-1 max-w-[140px] mx-auto">
                      Trần Quang Huy
                    </div>
                    <div className="text-[9px] text-slate-500">CEO & General Director</div>
                  </div>
                </div>

                {/* Footer Hash & Security Verification */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Xác thực điện tử SOP: aurora-cinema.vn/verify/{previewCert.certificateCode}</span>
                  </div>
                  <div>Hệ Thống Quản Trị Nhân Sự Rạp Aurora EMS © 2026</div>
                </div>

              </div>
            </div>

            {/* Print CSS styling injection */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #certificate-print-area, #certificate-print-area * {
                  visibility: visible;
                }
                #certificate-print-area {
                  position: fixed;
                  left: 0;
                  top: 0;
                  width: 100vw;
                  height: 100vh;
                  margin: 0;
                  padding: 20mm;
                  box-sizing: border-box;
                  background-color: white !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            `}} />

          </div>
        </div>
      )}
    </div>
  );
};
