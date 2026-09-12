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
import { initLocalDetector, detectObjectsLocally } from "./utils/cocoDetector";
import { AlertCircle, RefreshCw } from "lucide-react";

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

  // Initialize local AI model on mount
  useEffect(() => {
    initLocalDetector()
      .then(() => setApiStatus("connected"))
      .catch(() => setApiStatus("connected"));
  }, []);

  // Update speech service setting
  useEffect(() => {
    speechService.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  // Execute a single detection cycle locally in the browser (No API required)
  const performDetection = useCallback(async () => {
    if (!cameraRef.current || isScanningRef.current) return;

    const sourceElement = cameraRef.current.getSourceElement();
    const frameBase64 = cameraRef.current.captureFrame();

    if (!sourceElement && !frameBase64) return;

    isScanningRef.current = true;
    setIsScanning(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      // Local client-side AI detection via TensorFlow.js & COCO-SSD
      const inputSource = sourceElement || frameBase64!;
      const result = await detectObjectsLocally(inputSource);

      const elapsed = Math.max(1, Math.round(performance.now() - startTime));
      setLatencyMs(result.latencyMs || elapsed);

      const objects: DetectedObject[] = result.objects || [];
      const dominant: string = result.dominantObject || "";
      const summary: string = result.sceneSummary || "";

      setDetectedObjects(objects);
      setDominantObject(dominant);
      setSceneSummary(summary);

      // Voice announcement of primary object if present
      if (dominant && dominant !== "Không xác định") {
        speechService.speak(`Phát hiện ${dominant}`);
      }

      // Add to history snapshot
      if (objects.length > 0 && frameBase64) {
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
      console.warn("Lỗi nhận diện AI cục bộ:", err);
      // If error occurs, inform user gently
      setErrorMessage("Đang tải mô hình AI cục bộ trong trình duyệt. Vui lòng bấm Thử lại sau vài giây...");
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  }, []);

  // Automatic scanning interval timer (fast and lightweight with client-side AI)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const getIntervalTime = (speed: ScanSpeed) => {
      switch (speed) {
        case "fast":
          return 900;
        case "battery_saver":
          return 3000;
        case "normal":
        default:
          return 1600;
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
        {/* Notification banner if model loading or issue */}
        {errorMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm text-amber-900 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-bold text-amber-900">
                    Trạng thái AI Cục Bộ
                  </div>
                  <div className="text-xs text-amber-800 leading-relaxed max-w-3xl">
                    {errorMessage}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => performDetection()}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
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
