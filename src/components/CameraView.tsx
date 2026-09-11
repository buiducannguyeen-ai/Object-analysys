import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Maximize2,
  Minimize2,
  Scan,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  AlertTriangle,
  Wifi,
  Radio,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { DetectedObject } from "../types";

export interface CameraViewHandle {
  captureFrame: () => string | null;
}

interface CameraViewProps {
  detectedObjects: DetectedObject[];
  selectedObject: DetectedObject | null;
  onSelectObject: (obj: DetectedObject | null) => void;
  isScanning: boolean;
  activeSource: "webcam" | "sample" | "upload";
  sampleImageUrl?: string;
  uploadedImageUrl?: string;
  onSwitchToWebcam: () => void;
  onUseSampleImage?: () => void;
  dominantObject?: string;
}

const CATEGORY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  "Thiết bị điện tử": { border: "border-sky-500", bg: "bg-sky-500/15", text: "text-sky-300" },
  "Đồ gia dụng & Bếp": { border: "border-amber-500", bg: "bg-amber-500/15", text: "text-amber-300" },
  "Văn phòng phẩm": { border: "border-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-300" },
  "Thời trang & Phụ kiện": { border: "border-purple-500", bg: "bg-purple-500/15", text: "text-purple-300" },
  "Đồ uống & Thực phẩm": { border: "border-rose-500", bg: "bg-rose-500/15", text: "text-rose-300" },
  "Nội thất": { border: "border-orange-500", bg: "bg-orange-500/15", text: "text-orange-300" },
  "Người & Cá nhân": { border: "border-teal-500", bg: "bg-teal-500/15", text: "text-teal-300" },
};

function getColor(category: string) {
  return CATEGORY_COLORS[category] || {
    border: "border-blue-500",
    bg: "bg-blue-500/15",
    text: "text-blue-300",
  };
}

export const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(
  (
    {
      detectedObjects,
      selectedObject,
      onSelectObject,
      isScanning,
      activeSource,
      sampleImageUrl,
      uploadedImageUrl,
      onSwitchToWebcam,
      onUseSampleImage,
      dominantObject,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [isTrackMuted, setIsTrackMuted] = useState(false);
    const [isFramePitchBlack, setIsFramePitchBlack] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    const handleVideoLoaded = () => {
      if (videoRef.current) {
        if (videoRef.current.videoWidth > 0) {
          setResolution({
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          });
        }
        videoRef.current.play().catch(() => {});
      }
    };

    // Enumerate camera devices
    useEffect(() => {
      async function enumerateCameras() {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevs = allDevices.filter((d) => d.kind === "videoinput");
            setAvailableDevices(videoDevs);
          }
        } catch (e) {
          console.warn("Lỗi đọc danh sách camera:", e);
        }
      }
      enumerateCameras();
    }, [stream]);

    // Initialize or reinitialize webcam
    useEffect(() => {
      if (activeSource !== "webcam") {
        stopWebcam();
        return;
      }

      let mounted = true;

      async function startCamera() {
        setCameraError(null);
        setIsTrackMuted(false);
        setIsFramePitchBlack(false);
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Trình duyệt không hỗ trợ WebRTC / getUserMedia API.");
          }

          // Stop previous stream if running
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }

          let newStream: MediaStream;
          try {
            const constraints: MediaStreamConstraints = {
              video: selectedDeviceId
                ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                : {
                    facingMode: facingMode ? { ideal: facingMode } : undefined,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  },
              audio: false,
            };
            newStream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (constraintErr) {
            console.warn("Khởi tạo với ràng buộc không thành công, thử chế độ mặc định:", constraintErr);
            newStream = await navigator.mediaDevices.getUserMedia({
              video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
              audio: false,
            });
          }

          if (!mounted) {
            newStream.getTracks().forEach((track) => track.stop());
            return;
          }

          const track = newStream.getVideoTracks()[0];
          if (track) {
            if (track.muted) {
              setIsTrackMuted(true);
            }
            track.onmute = () => {
              console.warn("Camera track bị tắt hoặc chuyển sang muted");
              setIsTrackMuted(true);
            };
            track.onunmute = () => {
              console.info("Camera track đã hoạt động trở lại");
              setIsTrackMuted(false);
              setIsFramePitchBlack(false);
            };
          }

          setStream(newStream);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
            videoRef.current.play().catch(() => {});
            handleVideoLoaded();
          }
        } catch (err: any) {
          console.error("Camera access error:", err);
          if (mounted) {
            setCameraError(
              err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
                ? "Quyền truy cập webcam bị từ chối hoặc bị hạn chế trong trình duyệt. Bạn có thể thử mở ứng dụng trong Tab Mới hoặc dùng chế độ Ảnh Mẫu bên dưới."
                : `Không thể kích hoạt webcam: ${err.message || "Thiết bị chưa sẵn sàng"}`
            );
          }
        }
      }

      startCamera();

      return () => {
        mounted = false;
        stopWebcam();
      };
    }, [activeSource, facingMode, selectedDeviceId]);

    const stopWebcam = () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    };

    const toggleFacingMode = () => {
      if (availableDevices.length > 1) {
        // Cycle device
        const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
        const nextIndex = (currentIndex + 1) % availableDevices.length;
        setSelectedDeviceId(availableDevices[nextIndex]?.deviceId || "");
      } else {
        setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
      }
    };

    const toggleFullscreen = () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    };

    // Capture current frame from video or image
    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        try {
          const canvas = canvasRef.current;
          if (!canvas) return null;

          if (activeSource === "webcam") {
            const video = videoRef.current;
            if (!video || video.readyState < 2) return null;

            // Scale down to 800px max width for ultra-fast Gemini transmission and low latency
            const maxDimension = 800;
            const currentW = video.videoWidth || 640;
            const currentH = video.videoHeight || 480;
            const scale = Math.min(1, maxDimension / Math.max(currentW, currentH));
            const w = Math.round(currentW * scale);
            const h = Math.round(currentH * scale);

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;

            ctx.drawImage(video, 0, 0, w, h);

            // Light sample check: detect pitch-black frames (e.g. camera shutter closed or blocked)
            try {
              const sampleW = Math.min(24, w);
              const sampleH = Math.min(24, h);
              const sample = ctx.getImageData(Math.floor(w / 2) - 12, Math.floor(h / 2) - 12, sampleW, sampleH);
              let totalBrightness = 0;
              for (let i = 0; i < sample.data.length; i += 4) {
                totalBrightness += sample.data[i] + sample.data[i + 1] + sample.data[i + 2];
              }
              const avg = totalBrightness / ((sample.data.length / 4) * 3);
              if (avg < 2.5) {
                setIsFramePitchBlack(true);
              } else {
                setIsFramePitchBlack(false);
              }
            } catch {
              // ignore
            }

            return canvas.toDataURL("image/jpeg", 0.8);
          } else {
            // Source is sample or uploaded image
            const img = document.getElementById("active-source-img") as HTMLImageElement;
            if (!img || !img.complete || img.naturalWidth === 0) return null;

            const maxDimension = 800;
            const currentW = img.naturalWidth || 640;
            const currentH = img.naturalHeight || 480;
            const scale = Math.min(1, maxDimension / Math.max(currentW, currentH));
            const w = Math.round(currentW * scale);
            const h = Math.round(currentH * scale);

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;

            ctx.drawImage(img, 0, 0, w, h);
            return canvas.toDataURL("image/jpeg", 0.8);
          }
        } catch (captureErr) {
          console.warn("Lỗi trích xuất khung hình từ canvas:", captureErr);
          return null;
        }
      },
    }));

    const showCameraBlockedNotice = activeSource === "webcam" && (isTrackMuted || isFramePitchBlack);

    return (
      <div
        ref={containerRef}
        className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 aspect-video w-full flex items-center justify-center group"
      >
        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Feed */}
        {activeSource === "webcam" && (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            onLoadedMetadata={handleVideoLoaded}
            onCanPlay={handleVideoLoaded}
            className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
          />
        )}

        {/* Static Image / Upload Feed */}
        {activeSource === "sample" && sampleImageUrl && (
          <img
            id="active-source-img"
            crossOrigin="anonymous"
            src={sampleImageUrl}
            alt="Sample Scene"
            className="w-full h-full object-cover"
          />
        )}

        {activeSource === "upload" && uploadedImageUrl && (
          <img
            id="active-source-img"
            src={uploadedImageUrl}
            alt="Uploaded Source"
            className="w-full h-full object-cover"
          />
        )}

        {/* Camera Error Message */}
        {activeSource === "webcam" && cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/20">
              <CameraOff className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1.5">Chưa thể kết nối Webcam</h3>
            <p className="text-xs text-slate-300 max-w-md mb-5 leading-relaxed">
              {cameraError}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                id="btn-retry-camera"
                onClick={() => {
                  setCameraError(null);
                  setSelectedDeviceId("");
                  setFacingMode((m) => (m === "user" ? "environment" : "user"));
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition shadow flex items-center gap-1.5"
              >
                <SwitchCamera className="w-4 h-4" /> Thử lại Webcam
              </button>

              <a
                id="btn-open-in-new-tab"
                href={typeof window !== "undefined" ? window.location.href : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition border border-slate-700 flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" /> Mở trong Tab Mới
              </a>

              {onUseSampleImage && (
                <button
                  id="btn-use-sample-fallback"
                  onClick={onUseSampleImage}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition shadow flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Dùng Ảnh Mẫu Thử Nghiệm
                </button>
              )}
            </div>
          </div>
        )}

        {/* Camera Muted / Hardware Privacy Shutter Guidance Notice */}
        {showCameraBlockedNotice && !cameraError && (
          <div className="absolute inset-x-3 md:inset-x-8 top-14 md:top-16 z-30 p-4 md:p-5 rounded-2xl bg-slate-900/95 border border-amber-500/50 backdrop-blur-xl shadow-2xl text-left">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold text-amber-300">
                    Camera đang bị che hoặc bị tắt (Màn hình đen / biểu tượng camera gạch chéo)
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    Cần tương tác phần cứng
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                  Trình duyệt đã cấp quyền nhưng không nhận được hình ảnh (hoặc camera đang bị khóa bởi công tắc vật lý / ứng dụng khác). Bạn hãy kiểm tra:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200 mb-3.5">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span><b>Nắp gạt camera</b>: Gạt nút trượt vật lý trên viền màn hình để mở ống kính camera.</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span><b>Phím tắt bàn phím</b>: Bấm phím bật webcam (ví dụ <code className="text-amber-300">Fn + F10</code> hoặc phím có hình máy ảnh).</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span><b>Quyền riêng tư Windows</b>: Vào <i>Cài đặt Windows &gt; Quyền riêng tư &amp; bảo mật &gt; Máy ảnh</i> và bật ON.</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span><b>Tắt app đang chiếm camera</b>: Đóng Zalo, Zoom, Google Meet hoặc Teams đang chạy nền.</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onUseSampleImage && (
                    <button
                      id="btn-switch-sample-instant"
                      onClick={onUseSampleImage}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" /> Dùng Ảnh Mẫu để thử AI ngay lập tức
                    </button>
                  )}
                  {availableDevices.length > 1 && (
                    <button
                      onClick={toggleFacingMode}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <SwitchCamera className="w-4 h-4" /> Thử Camera khác ({availableDevices.length} thiết bị)
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsTrackMuted(false);
                      setIsFramePitchBlack(false);
                      handleVideoLoaded();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Đã mở nắp / Thử lại
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scanning Laser Line Effect */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-pulse absolute top-0 left-0 right-0 animate-bounce duration-1000" />
            <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
          </div>
        )}

        {/* Bounding Boxes Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {detectedObjects.map((obj, index) => {
            const [ymin, xmin, ymax, xmax] = obj.box_2d;
            const safeYmin = Math.min(ymin, ymax);
            const safeYmax = Math.max(ymin, ymax);
            const safeXmin = Math.min(xmin, xmax);
            const safeXmax = Math.max(xmin, xmax);

            // Gemini coords are 0..1000
            const top = (safeYmin / 1000) * 100;
            const isMirrored = activeSource === "webcam" && facingMode === "user";
            const left = isMirrored
              ? ((1000 - safeXmax) / 1000) * 100
              : (safeXmin / 1000) * 100;
            const width = ((safeXmax - safeXmin) / 1000) * 100;
            const height = ((safeYmax - safeYmin) / 1000) * 100;

            const isSelected = selectedObject?.nameVi === obj.nameVi;
            const colors = getColor(obj.category);

            return (
              <div
                key={`${obj.nameVi}-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObject(isSelected ? null : obj);
                }}
                style={{
                  top: `${Math.max(0, Math.min(100, top))}%`,
                  left: `${Math.max(0, Math.min(100, left))}%`,
                  width: `${Math.max(2, Math.min(100, width))}%`,
                  height: `${Math.max(2, Math.min(100, height))}%`,
                }}
                className={`absolute pointer-events-auto cursor-pointer transition-all duration-300 rounded-md border-2 ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-400/25 ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] z-20"
                    : `${colors.border} ${colors.bg} hover:border-white hover:bg-white/10`
                }`}
              >
                {/* Tag label badge */}
                <div
                  className={`absolute -top-7 left-0 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap shadow-lg flex items-center gap-1.5 backdrop-blur-md ${
                    isSelected
                      ? "bg-yellow-500 text-slate-950"
                      : "bg-slate-900/90 text-white border border-slate-700"
                  }`}
                >
                  <span className="font-bold">{obj.nameVi}</span>
                  <span className="text-[10px] opacity-80">
                    {Math.round(obj.confidence * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top HUD: Status Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
          {/* Left indicators */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs text-white shadow-lg pointer-events-auto">
              {activeSource === "webcam" ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-medium text-emerald-400">Webcam trực tiếp</span>
                </>
              ) : activeSource === "sample" ? (
                <>
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-medium text-blue-300">Ảnh mẫu thử nghiệm</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-medium text-purple-300">Ảnh tải lên</span>
                </>
              )}
            </div>

            {/* Public Wifi / AI Connection status */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs text-slate-300 shadow-lg pointer-events-auto">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>Wifi / Gemini AI</span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {activeSource !== "webcam" && (
              <button
                id="btn-return-webcam"
                onClick={onSwitchToWebcam}
                className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-200 border border-slate-700/60 transition backdrop-blur-md flex items-center gap-1 shadow"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bật lại Webcam</span>
              </button>
            )}

            {activeSource === "webcam" && availableDevices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                title="Chọn thiết bị camera"
                className="px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs transition backdrop-blur-md shadow cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[120px] truncate"
              >
                <option value="">Camera mặc định</option>
                {availableDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            {activeSource === "webcam" && (
              <button
                id="btn-switch-camera"
                onClick={toggleFacingMode}
                title="Đổi camera trước/sau hoặc thiết bị"
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition backdrop-blur-md shadow"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            <button
              id="btn-toggle-fullscreen"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition backdrop-blur-md shadow"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Prominent Object Banner */}
        {dominantObject && dominantObject !== "Không xác định" && (
          <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex justify-center">
            <div className="px-4 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white shadow-xl flex items-center gap-2 pointer-events-auto animate-fade-in">
              <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-xs text-slate-400">Đang nhìn thấy:</span>
              <span className="text-sm font-bold text-amber-300">{dominantObject}</span>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                {detectedObjects.length} đồ vật
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

