import React from "react";
import {
  Sparkles,
  Volume2,
  Tag,
  CheckCircle2,
  Layers,
  FileText,
  Eye,
} from "lucide-react";
import { DetectedObject } from "../types";
import { speechService } from "../utils/speech";

interface DetectionListProps {
  objects: DetectedObject[];
  dominantObject: string;
  sceneSummary: string;
  selectedObject: DetectedObject | null;
  onSelectObject: (obj: DetectedObject | null) => void;
  isScanning: boolean;
  latencyMs?: number;
}

const CATEGORY_STYLES: Record<string, { badge: string; dot: string }> = {
  "Thiết bị điện tử": { badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  "Đồ gia dụng & Bếp": { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  "Văn phòng phẩm": { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  "Thời trang & Phụ kiện": { badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  "Đồ uống & Thực phẩm": { badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  "Nội thất": { badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  "Người & Cá nhân": { badge: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
};

function getCategoryStyle(cat: string) {
  return CATEGORY_STYLES[cat] || { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500" };
}

export const DetectionList: React.FC<DetectionListProps> = ({
  objects,
  dominantObject,
  sceneSummary,
  selectedObject,
  onSelectObject,
  isScanning,
  latencyMs,
}) => {
  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    speechService.speak(text, true);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Đồ vật nhận diện thời gian thực</h2>
            <p className="text-xs text-slate-500">
              Phát hiện {objects.length} thực thể trong khung hình
            </p>
          </div>
        </div>

        {latencyMs !== undefined && latencyMs > 0 && (
          <div className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {latencyMs}ms
          </div>
        )}
      </div>

      {/* Scene Summary Banner */}
      {sceneSummary && (
        <div className="px-4 py-2.5 bg-blue-50/50 border-b border-blue-100/60 flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-blue-900">Bối cảnh: </span>
            {sceneSummary}
          </div>
        </div>
      )}

      {/* Main Objects List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {objects.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Eye className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700 mb-1">
              {isScanning ? "Đang quét và nhận diện đồ vật..." : "Chưa có đồ vật nào"}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {isScanning
                ? "Dữ liệu video đang được gửi qua mạng wifi tới mô hình thị giác AI..."
                : "Bấm 'Bắt đầu quét' hoặc hướng camera vào các đồ vật như cốc nước, điện thoại, sách, máy tính để nhận diện."}
            </p>
          </div>
        ) : (
          objects.map((obj, idx) => {
            const isSelected = selectedObject?.nameVi === obj.nameVi;
            const style = getCategoryStyle(obj.category);
            const isDominant = obj.nameVi === dominantObject;

            return (
              <div
                key={`${obj.nameVi}-${idx}`}
                onClick={() => onSelectObject(isSelected ? null : obj)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/80 border-blue-400 shadow-sm ring-1 ring-blue-300"
                    : "bg-white hover:bg-slate-50/80 border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 leading-tight">
                          {obj.nameVi}
                        </span>
                        {isDominant && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Nổi bật
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 italic">
                        {obj.nameEn}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Phát âm tiếng Việt"
                      onClick={(e) => handleSpeak(obj.nameVi, e)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                      {Math.round(obj.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Description if present */}
                {obj.description && (
                  <p className="text-xs text-slate-600 mb-2 pl-4">
                    {obj.description}
                  </p>
                )}

                {/* Progress bar + Category tag */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${style.badge}`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {obj.category}
                  </span>

                  <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(obj.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
