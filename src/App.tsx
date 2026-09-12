/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { CameraView, CameraViewHandle } from "./components/CameraView";
import { DetectionList } from "./components/DetectionList";
import { ControlToolbar } from "./components/ControlToolbar";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { DetectedObject, HistoryItem, ScanSpeed } from "./types";
import { SampleImage, SAMPLE_IMAGES } from "./data/sampleImages";
import { speechService } from "./utils/speech";
import { AlertCircle, RefreshCw, KeyRound, ExternalLink } from "lucide-react";

export default function App() {
  const cameraRef = useRef<CameraViewHandle>(null);

  // Source selection: webcam vs sample image vs uploaded image
  const [activeSource, setActiveSource] = useState<"webcam" | "sample" | "upload">("webcam");
  const [sampleImageUrl, setSampleImageUrl] = useState<string>(SAMPLE_IMAGES[0].url);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");

  // Scanning states
  const [isAutoScanning, setIsAutoScanning] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSpeed, setScanSpeed] = useState<ScanSpeed>("normal");
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  // Detection output
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [dominantObject, setDominantObject] = useState<string>("");
  const [sceneSummary, setSceneSummary] = useState<string>("");
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<"connected" | "checking" | "error">("checking");

  // Keep refs for interval callbacks to avoid stale state
  const isAutoScanningRef = useRef(isAutoScanning);
  isAutoScanningRef.current = isAutoScanning;

  const isScanningRef = useRef(isScanning);
  isScanningRef.current = isScanning;

  const scanSpeedRef = useRef(scanSpeed);
  scanSpeedRef.current = scanSpeed;

  // Check backend health
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setApiStatus(data.status === "ok" ? "connected" : "error");
      })
      .catch(() => setApiStatus("error"));
  }, []);

  // Update speech service setting
  useEffect(() => {
    speechService.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  // Execute a single detection cycle
  const performDetection = useCallback(async () => {
    if (!cameraRef.current || isScanningRef.current) return;

    const frameBase64 = cameraRef.current.captureFrame();
    if (!frameBase64) return;

    isScanningRef.current = true;
    setIsScanning(true);
    setErrorMessage(null);
    const startTime = performance.now();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 22000);

    try {
      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frameBase64 }),
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      let data: any = null;

      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        // Non-JSON response (e.g., HTML from proxy during reload or 502/504)
        try {
          await response.text();
        } catch {
          // ignore
        }
      }

      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);

      if (!response.ok || !data || data.error) {
        let errText = data?.error;
        if (!errText) {
          if (response.status === 429) {
            errText = "Hệ thống AI đang tạm thời đạt giới hạn lượt gọi. Đang tự động thử lại...";
          } else if (response.status === 404) {
            errText = "Không tìm thấy dịch vụ nhận diện /api/detect trên máy chủ (404). Hãy kiểm tra file api/detect.ts hoặc thiết lập Serverless Function.";
          } else if (response.status === 401 || response.status === 403) {
            errText = "Khóa GEMINI_API_KEY chưa hợp lệ hoặc chưa được cấu hình trên máy chủ.";
          } else if (response.status === 502 || response.status === 504) {
            errText = "Máy chủ AI phản hồi chậm hoặc đang bận. Đang tự động kết nối lại...";
          } else if (response.status === 503) {
            errText = "Dịch vụ AI đang bảo trì tạm thời. Vui lòng đợi trong giây lát...";
          } else {
            errText = `Máy chủ phản hồi mã ${response.status}. Đang tự động thử lại...`;
          }
        }
        throw new Error(errText);
      }

      const objects: DetectedObject[] = data.objects || [];
      const dominant: string = data.dominantObject || "";
      const summary: string = data.sceneSummary || "";

      setDetectedObjects(objects);
      setDominantObject(dominant);
      setSceneSummary(summary);

      // Voice announcement of primary object if present
      if (dominant && dominant !== "Không xác định") {
        speechService.speak(`Phát hiện ${dominant}`);
      }

      // Add to history snapshot
      if (objects.length > 0) {
        setHistory((prev) => [
          {
            id: String(Date.now()),
            timestamp: Date.now(),
            dominantObject: dominant || objects[0].nameVi,
            objectsCount: objects.length,
            objects,
            thumbnail: frameBase64,
          },
          ...prev.slice(0, 15), // keep up to 16
        ]);
      }
    } catch (err: any) {
      console.warn("Detection request error:", err);
      let msg = err.message || "Lỗi kết nối nhận diện";
      
      // Parse raw JSON error string if returned from server
      if (typeof msg === "string") {
        const trimmed = msg.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.error?.message) {
              msg = parsed.error.message;
            } else if (typeof parsed.error === "string") {
              msg = parsed.error;
            }
          } catch {
            // Keep original string if parse fails
          }
        }

        if (
          msg.includes("API key not valid") ||
          msg.includes("API_KEY_INVALID") ||
          msg.includes("INVALID_ARGUMENT")
        ) {
          msg =
            "Khóa GEMINI_API_KEY không hợp lệ (API_KEY_INVALID). Hãy đảm bảo bạn đã tạo và sao chép đúng khóa từ Google AI Studio (chuỗi khóa chuẩn luôn bắt đầu bằng 'AIzaSy...'), sau đó cập nhật lại vào Vercel (Project Settings > Environment Variables > Redeploy).";
        } else if (err.name === "AbortError") {
          msg = "Yêu cầu nhận diện quá thời gian chờ (timeout), đang tối ưu và thử lại...";
        } else if (
          msg.includes("Unexpected token") ||
          msg.includes("is not valid JSON") ||
          msg.includes("JSON.parse")
        ) {
          msg = "Máy chủ đang khởi động hoặc đường truyền đang đồng bộ. Đang tự động kết nối lại...";
        } else if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
          msg = "Máy chủ AI đang có lượng yêu cầu lớn, hệ thống đang tự động cân bằng và thử lại...";
        } else if (msg.includes("GEMINI_API_KEY")) {
          if (!msg.includes("Vercel")) {
            msg =
              "Chưa tìm thấy GEMINI_API_KEY. Vui lòng cấu hình biến GEMINI_API_KEY: Trong AI Studio chọn Settings > Secrets; hoặc trong Vercel chọn Project Settings > Environment Variables.";
          }
        } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          msg = "Đường truyền Wifi/Internet gián đoạn. Vui lòng kiểm tra kết nối mạng.";
        }
      }
      setErrorMessage(msg);
    } finally {
      clearTimeout(timeoutId);
      isScanningRef.current = false;
      setIsScanning(false);
    }
  }, []);

  // Automatic scanning interval timer
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const getIntervalTime = (speed: ScanSpeed) => {
      switch (speed) {
        case "fast":
          return 2200;
        case "battery_saver":
          return 4500;
        case "normal":
        default:
          return 3200;
      }
    };

    const runLoop = async () => {
      if (isCancelled) return;

      if (isAutoScanningRef.current && !isScanningRef.current) {
        await performDetection();
      }

      if (!isCancelled) {
        const nextDelay = getIntervalTime(scanSpeedRef.current);
        timeoutId = setTimeout(runLoop, nextDelay);
      }
    };

    // Initial delay so camera has time to mount and stream
    timeoutId = setTimeout(runLoop, 1500);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [performDetection]);

  // Handlers
  const handleToggleAutoScan = () => {
    setIsAutoScanning((prev) => !prev);
  };

  const handleScanOnce = () => {
    performDetection();
  };

  const handleSelectSample = (sample: SampleImage) => {
    setActiveSource("sample");
    setSampleImageUrl(sample.url);
    setSelectedObject(null);
    // Trigger detection for sample image after quick DOM paint
    setTimeout(() => {
      performDetection();
    }, 400);
  };

  const handleUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setActiveSource("upload");
        setUploadedImageUrl(e.target.result as string);
        setSelectedObject(null);
        setTimeout(() => {
          performDetection();
        }, 400);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSwitchToWebcam = () => {
    setActiveSource("webcam");
    setSelectedObject(null);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setActiveSource("upload");
    setUploadedImageUrl(item.thumbnail);
    setDetectedObjects(item.objects);
    setDominantObject(item.dominantObject);
    setSelectedObject(item.objects[0] || null);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Header apiStatus={apiStatus} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-5">
        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm text-rose-900 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs sm:text-sm font-bold text-rose-900 flex items-center gap-2">
                    {errorMessage.includes("không hợp lệ") || errorMessage.includes("API_KEY_INVALID") ? (
                      <>
                        <KeyRound className="w-4 h-4 text-rose-600" />
                        <span>Khóa GEMINI_API_KEY không hợp lệ (API_KEY_INVALID)</span>
                      </>
                    ) : errorMessage.includes("GEMINI_API_KEY") ? (
                      <>
                        <KeyRound className="w-4 h-4 text-rose-600" />
                        <span>Chưa tìm thấy GEMINI_API_KEY</span>
                      </>
                    ) : (
                      <span>Thông báo kết nối</span>
                    )}
                  </div>
                  <div className="text-xs text-rose-700 leading-relaxed max-w-3xl">
                    {errorMessage}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                {errorMessage.includes("GEMINI_API_KEY") && (
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Lấy khóa Gemini API</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => performDetection()}
                  className="px-3 py-1.5 bg-white border border-rose-300 rounded-xl hover:bg-rose-100 font-semibold text-xs text-rose-800 transition flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Primary Row: Video Feed + Detection List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Webcam Viewer & Controls (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <CameraView
              ref={cameraRef}
              detectedObjects={detectedObjects}
              selectedObject={selectedObject}
              onSelectObject={setSelectedObject}
              isScanning={isScanning}
              activeSource={activeSource}
              sampleImageUrl={sampleImageUrl}
              uploadedImageUrl={uploadedImageUrl}
              onSwitchToWebcam={handleSwitchToWebcam}
              onUseSampleImage={() => handleSelectSample(SAMPLE_IMAGES[0])}
              dominantObject={dominantObject}
            />

            {/* Controls Toolbar */}
            <ControlToolbar
              isAutoScanning={isAutoScanning}
              onToggleAutoScan={handleToggleAutoScan}
              onScanOnce={handleScanOnce}
              isScanning={isScanning}
              scanSpeed={scanSpeed}
              onChangeScanSpeed={setScanSpeed}
              voiceEnabled={voiceEnabled}
              onToggleVoice={() => setVoiceEnabled((v) => !v)}
              onSelectSample={handleSelectSample}
              onUploadImage={handleUploadImage}
              activeSource={activeSource}
            />
          </div>

          {/* Right Column: Real-time Detections List (5 cols on lg) */}
          <div className="lg:col-span-5 h-full">
            <div className="lg:sticky lg:top-20">
              <DetectionList
                objects={detectedObjects}
                dominantObject={dominantObject}
                sceneSummary={sceneSummary}
                selectedObject={selectedObject}
                onSelectObject={setSelectedObject}
                isScanning={isScanning}
                latencyMs={latencyMs}
              />
            </div>
          </div>
        </div>

        {/* Bottom Row: History Snapshot Gallery */}
        <HistoryDrawer
          history={history}
          onClearHistory={handleClearHistory}
          onSelectHistoryItem={handleSelectHistoryItem}
        />
      </main>
    </div>
  );
}
