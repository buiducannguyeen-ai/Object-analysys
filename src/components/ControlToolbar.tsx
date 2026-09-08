import React from "react";
import {
  Play,
  Pause,
  Scan,
  Volume2,
  VolumeX,
  Upload,
  Layers,
  Sparkles,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { ScanSpeed } from "../types";
import { SAMPLE_IMAGES, SampleImage } from "../data/sampleImages";

interface ControlToolbarProps {
  isAutoScanning: boolean;
  onToggleAutoScan: () => void;
  onScanOnce: () => void;
  isScanning: boolean;
  scanSpeed: ScanSpeed;
  onChangeScanSpeed: (speed: ScanSpeed) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onSelectSample: (sample: SampleImage) => void;
  onUploadImage: (file: File) => void;
  activeSource: "webcam" | "sample" | "upload";
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  isAutoScanning,
  onToggleAutoScan,
  onScanOnce,
  isScanning,
  scanSpeed,
  onChangeScanSpeed,
  voiceEnabled,
  onToggleVoice,
  onSelectSample,
  onUploadImage,
  activeSource,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Main Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Auto Scan */}
          <button
            id="btn-toggle-autoscan"
            onClick={onToggleAutoScan}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-sm ${
              isAutoScanning
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 ring-2 ring-emerald-500/30"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
            }`}
          >
            {isAutoScanning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Đang quét tự động</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Bắt đầu quét tự động</span>
              </>
            )}
          </button>

          {/* Scan Once button */}
          <button
            id="btn-scan-once"
            disabled={isScanning}
            onClick={onScanOnce}
            className="px-3.5 py-2.5 rounded-xl font-medium text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Scan className={`w-4 h-4 ${isScanning ? "animate-spin text-blue-600" : ""}`} />
            <span>Quét ngay</span>
          </button>

          {/* Voice toggle */}
          <button
            id="btn-toggle-voice"
            onClick={onToggleVoice}
            title={voiceEnabled ? "Tắt đọc tên bằng giọng nói" : "Bật đọc tên đồ vật bằng giọng nói"}
            className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition flex items-center gap-1.5 ${
              voiceEnabled
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {voiceEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">Giọng đọc Bật</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Giọng đọc Tắt</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scan speed select */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => onChangeScanSpeed("fast")}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                scanSpeed === "fast"
                  ? "bg-white text-blue-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Nhanh (1.5s)
            </button>
            <button
              onClick={() => onChangeScanSpeed("normal")}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                scanSpeed === "normal"
                  ? "bg-white text-blue-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Chuẩn (2.5s)
            </button>
            <button
              onClick={() => onChangeScanSpeed("battery_saver")}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                scanSpeed === "battery_saver"
                  ? "bg-white text-blue-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tiết kiệm (4s)
            </button>
          </div>

          {/* Sample scenes dropdown */}
          <div className="relative group">
            <button
              id="btn-sample-scenes"
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Ảnh mẫu</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 hidden group-hover:block z-30 animate-in fade-in">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Chọn bối cảnh thử nghiệm
              </div>
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => onSelectSample(sample)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 text-xs transition flex flex-col"
                >
                  <span className="font-medium text-slate-800">{sample.title}</span>
                  <span className="text-[11px] text-slate-400">{sample.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload custom image */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            id="btn-upload-image"
            onClick={() => fileInputRef.current?.click()}
            title="Tải ảnh từ máy tính để nhận diện"
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Tải ảnh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
