import React from "react";
import { Camera, Sparkles, Wifi, ShieldCheck, ExternalLink } from "lucide-react";

interface HeaderProps {
  apiStatus: "connected" | "checking" | "error";
}

export const Header: React.FC<HeaderProps> = ({ apiStatus }) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Nhận Diện Đồ Vật Webcam AI
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Gemini Vision
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Nhận diện đồ vật thời gian thực qua webcam & mạng wifi
            </p>
          </div>
        </div>

        {/* Status Indicators & Tab Opener */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline font-medium">Truyền dữ liệu Wifi:</span>
            <span className="font-semibold text-emerald-600">Trực tuyến</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium text-slate-700">Mô hình AI:</span>
            <span className="font-semibold text-slate-900">Gemini 3.1 & 3.8</span>
          </div>

          <a
            id="header-open-tab-btn"
            href={typeof window !== "undefined" ? window.location.href : "#"}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở toàn màn hình trong tab mới để cấp quyền Webcam tốt nhất"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xs:inline">Mở Tab Mới</span>
          </a>
        </div>
      </div>
    </header>
  );
};
