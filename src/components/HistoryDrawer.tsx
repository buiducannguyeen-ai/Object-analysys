import React from "react";
import { History, Clock, ChevronRight, Trash2, Camera } from "lucide-react";
import { HistoryItem } from "../types";

interface HistoryDrawerProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onClearHistory,
  onSelectHistoryItem,
}) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">Lịch sử nhận diện gần đây</h3>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {history.length}
          </span>
        </div>
        <button
          onClick={onClearHistory}
          title="Xóa lịch sử"
          className="text-xs text-slate-400 hover:text-rose-600 transition flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {history.slice(0, 6).map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectHistoryItem(item)}
            className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-blue-400 hover:shadow-md transition cursor-pointer"
          >
            <div className="aspect-video w-full overflow-hidden bg-slate-900">
              <img
                src={item.thumbnail}
                alt={item.dominantObject}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            </div>
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {item.dominantObject}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                <span>{item.objectsCount} đồ vật</span>
                <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
