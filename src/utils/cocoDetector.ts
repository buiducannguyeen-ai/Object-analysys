import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { DetectedObject, DetectionResult } from "../types";

export interface CocoClassInfo {
  vi: string;
  en: string;
  category: string;
  description: string;
}

export const COCO_DICTIONARY: Record<string, CocoClassInfo> = {
  person: {
    vi: "Người",
    en: "Person",
    category: "Con người",
    description: "Nhận diện người trong khung hình.",
  },
  bicycle: {
    vi: "Xe đạp",
    en: "Bicycle",
    category: "Phương tiện",
    description: "Phương tiện di chuyển hai bánh thô sơ.",
  },
  car: {
    vi: "Ô tô / Xe hơi",
    en: "Car",
    category: "Phương tiện",
    description: "Phương tiện giao thông 4 bánh cơ giới.",
  },
  motorcycle: {
    vi: "Xe máy",
    en: "Motorcycle",
    category: "Phương tiện",
    description: "Phương tiện xe gắn máy hai bánh.",
  },
  airplane: {
    vi: "Máy bay",
    en: "Airplane",
    category: "Phương tiện",
    description: "Phương tiện hàng không dân dụng hoặc quân sự.",
  },
  bus: {
    vi: "Xe buýt",
    en: "Bus",
    category: "Phương tiện",
    description: "Phương tiện vận tải công cộng.",
  },
  train: {
    vi: "Tàu hỏa",
    en: "Train",
    category: "Phương tiện",
    description: "Phương tiện đường sắt chở khách hoặc hàng.",
  },
  truck: {
    vi: "Xe tải",
    en: "Truck",
    category: "Phương tiện",
    description: "Phương tiện vận chuyển hàng hóa hạng nặng.",
  },
  boat: {
    vi: "Tàu / Thuyền",
    en: "Boat",
    category: "Phương tiện",
    description: "Phương tiện di chuyển đường thủy.",
  },
  "traffic light": {
    vi: "Đèn giao thông",
    en: "Traffic Light",
    category: "Giao thông",
    description: "Thiết bị tín hiệu chỉ dẫn giao thông đường bộ.",
  },
  "fire hydrant": {
    vi: "Trụ cứu hỏa",
    en: "Fire Hydrant",
    category: "Đô thị",
    description: "Trụ cấp nước phòng cháy chữa cháy công cộng.",
  },
  "stop sign": {
    vi: "Biển báo dừng",
    en: "Stop Sign",
    category: "Giao thông",
    description: "Biển báo hiệu lệnh dừng xe giao thông.",
  },
  "parking meter": {
    vi: "Đồng hồ đỗ xe",
    en: "Parking Meter",
    category: "Giao thông",
    description: "Thiết bị đo giờ thu phí đỗ xe tự động.",
  },
  bench: {
    vi: "Ghế dài công viên",
    en: "Bench",
    category: "Nội thất & Ngoài trời",
    description: "Băng ghế ngồi nghỉ ngơi nơi công cộng.",
  },
  bird: {
    vi: "Chim",
    en: "Bird",
    category: "Động vật",
    description: "Động vật lông vũ bay lượn.",
  },
  cat: {
    vi: "Mèo",
    en: "Cat",
    category: "Động vật",
    description: "Thú cưng họ mèo bốn chân đáng yêu.",
  },
  dog: {
    vi: "Chó",
    en: "Dog",
    category: "Động vật",
    description: "Thú cưng trung thành của con người.",
  },
  horse: {
    vi: "Ngựa",
    en: "Horse",
    category: "Động vật",
    description: "Động vật móng guốc bốn chân.",
  },
  sheep: {
    vi: "Cừu",
    en: "Sheep",
    category: "Động vật",
    description: "Động vật nhai lại cho lông và sữa.",
  },
  cow: {
    vi: "Bò",
    en: "Cow",
    category: "Động vật",
    description: "Gia súc nuôi lấy sữa và thịt.",
  },
  elephant: {
    vi: "Voi",
    en: "Elephant",
    category: "Động vật",
    description: "Động vật trên cạn kích thước lớn có vòi.",
  },
  bear: {
    vi: "Gấu",
    en: "Bear",
    category: "Động vật",
    description: "Động vật ăn thịt có bộ lông dày.",
  },
  zebra: {
    vi: "Ngựa vằn",
    en: "Zebra",
    category: "Động vật",
    description: "Động vật hoang dã có sọc đen trắng đặc trưng.",
  },
  giraffe: {
    vi: "Hươu cao cổ",
    en: "Giraffe",
    category: "Động vật",
    description: "Động vật cao nhất thế giới với chiếc cổ dài.",
  },
  backpack: {
    vi: "Ba lô",
    en: "Backpack",
    category: "Phụ kiện & Đồ dùng",
    description: "Túi đeo hai vai dùng đựng sách vở, đồ dùng.",
  },
  umbrella: {
    vi: "Chiếc ô / Dù",
    en: "Umbrella",
    category: "Phụ kiện & Đồ dùng",
    description: "Dụng cụ che mưa nắng cá nhân.",
  },
  handbag: {
    vi: "Túi xách",
    en: "Handbag",
    category: "Phụ kiện & Đồ dùng",
    description: "Túi xách thời trang cầm tay.",
  },
  tie: {
    vi: "Cà vạt",
    en: "Necktie",
    category: "Trang phục",
    description: "Phụ kiện thắt cổ áo trang trọng.",
  },
  suitcase: {
    vi: "Vali du lịch",
    en: "Suitcase",
    category: "Đồ dùng du lịch",
    description: "Hành lý đựng tư trang khi đi xa.",
  },
  frisbee: {
    vi: "Đĩa ném thể thao",
    en: "Frisbee",
    category: "Thể thao",
    description: "Đĩa nhựa ném bay trong trò chơi ngoài trời.",
  },
  skis: {
    vi: "Ván trượt tuyết đôi",
    en: "Skis",
    category: "Thể thao",
    description: "Thiết bị thể thao mùa đông trên tuyết.",
  },
  snowboard: {
    vi: "Ván trượt tuyết đơn",
    en: "Snowboard",
    category: "Thể thao",
    description: "Ván thể thao trượt dốc tuyết.",
  },
  "sports ball": {
    vi: "Quả bóng thể thao",
    en: "Sports Ball",
    category: "Thể thao",
    description: "Bóng tròn chơi đá banh, bóng rổ hoặc quần vợt.",
  },
  kite: {
    vi: "Con diều",
    en: "Kite",
    category: "Thể thao & Giải trí",
    description: "Đồ chơi giấy thả bay trên bầu trời nhờ gió.",
  },
  "baseball bat": {
    vi: "Gậy bóng chày",
    en: "Baseball Bat",
    category: "Thể thao",
    description: "Dụng cụ dùng để đánh bóng chày.",
  },
  "baseball glove": {
    vi: "Găng tay bóng chày",
    en: "Baseball Glove",
    category: "Thể thao",
    description: "Găng tay da dùng bắt bóng chày.",
  },
  skateboard: {
    vi: "Ván trượt đường phố",
    en: "Skateboard",
    category: "Thể thao",
    description: "Ván gắn bốn bánh lăn biểu diễn đường phố.",
  },
  surfboard: {
    vi: "Ván lướt sóng",
    en: "Surfboard",
    category: "Thể thao",
    description: "Ván trượt trên mặt nước và ngọn sóng biển.",
  },
  "tennis racket": {
    vi: "Vợt tennis",
    en: "Tennis Racket",
    category: "Thể thao",
    description: "Vợt dùng chơi môn quần vợt.",
  },
  bottle: {
    vi: "Chai nước / Bình",
    en: "Bottle",
    category: "Đồ uống & Bếp",
    description: "Chai thủy tinh hoặc nhựa đựng chất lỏng.",
  },
  "wine glass": {
    vi: "Ly rượu vang",
    en: "Wine Glass",
    category: "Đồ dùng bàn ăn",
    description: "Ly thủy tinh chân cao uống rượu.",
  },
  cup: {
    vi: "Cốc / Ly nước",
    en: "Cup",
    category: "Đồ uống & Bếp",
    description: "Cốc gốm sứ hoặc nhựa dùng uống trà, cà phê.",
  },
  fork: {
    vi: "Chiếc nĩa / Dĩa",
    en: "Fork",
    category: "Dụng cụ ăn uống",
    description: "Dụng cụ bàn ăn có nhiều răng nhọn ghim thức ăn.",
  },
  knife: {
    vi: "Chiếc dao",
    en: "Knife",
    category: "Dụng cụ ăn uống & Bếp",
    description: "Dụng cụ có lưỡi sắc dùng cắt thức ăn.",
  },
  spoon: {
    vi: "Muỗng / Thìa",
    en: "Spoon",
    category: "Dụng cụ ăn uống",
    description: "Dụng cụ bàn ăn dạng lòng chảo nông múc canh, cơm.",
  },
  bowl: {
    vi: "Bát / Tô chén",
    en: "Bowl",
    category: "Dụng cụ ăn uống",
    description: "Đồ dùng chứa thức ăn dạng súp hoặc cơm.",
  },
  banana: {
    vi: "Quả chuối",
    en: "Banana",
    category: "Thực phẩm & Trái cây",
    description: "Trái cây giàu kali vỏ vàng ruột mềm ngọt.",
  },
  apple: {
    vi: "Quả táo",
    en: "Apple",
    category: "Thực phẩm & Trái cây",
    description: "Trái cây giòn ngọt vỏ đỏ hoặc xanh.",
  },
  sandwich: {
    vi: "Bánh mì sandwich",
    en: "Sandwich",
    category: "Thực phẩm",
    description: "Bánh mì kẹp thịt rau tiện lợi.",
  },
  orange: {
    vi: "Quả cam",
    en: "Orange",
    category: "Thực phẩm & Trái cây",
    description: "Trái cây họ cam quýt giàu vitamin C.",
  },
  broccoli: {
    vi: "Bông cải xanh",
    en: "Broccoli",
    category: "Thực phẩm & Rau củ",
    description: "Rau họ cải xanh giàu dưỡng chất và chất xơ.",
  },
  carrot: {
    vi: "Củ cà rốt",
    en: "Carrot",
    category: "Thực phẩm & Rau củ",
    description: "Củ màu cam giàu vitamin A và beta-carotene.",
  },
  "hot dog": {
    vi: "Bánh mì hot dog",
    en: "Hot Dog",
    category: "Thực phẩm",
    description: "Bánh mì kẹp xúc xích nóng hổi kèm mù tạt.",
  },
  pizza: {
    vi: "Bánh Pizza",
    en: "Pizza",
    category: "Thực phẩm",
    description: "Món bánh nướng Ý phủ phô mai và nhân thơm ngon.",
  },
  donut: {
    vi: "Bánh Donut",
    en: "Donut",
    category: "Thực phẩm & Bánh ngọt",
    description: "Bánh ngọt chiên vòng xốp phủ sốt đường chocolate.",
  },
  cake: {
    vi: "Bánh kem / Bánh ngọt",
    en: "Cake",
    category: "Thực phẩm & Bánh ngọt",
    description: "Món tráng miệng nướng trang trí bắt mắt.",
  },
  chair: {
    vi: "Ghế ngồi",
    en: "Chair",
    category: "Nội thất",
    description: "Đồ nội thất đơn có lưng tựa để ngồi.",
  },
  couch: {
    vi: "Ghế Sofa",
    en: "Sofa / Couch",
    category: "Nội thất",
    description: "Ghế bọc nệm dài êm ái cho phòng khách.",
  },
  "potted plant": {
    vi: "Chậu cây cảnh",
    en: "Potted Plant",
    category: "Cây xanh & Trang trí",
    description: "Cây xanh trồng trong chậu thanh lọc không khí.",
  },
  bed: {
    vi: "Giường ngủ",
    en: "Bed",
    category: "Nội thất",
    description: "Nội thất có đệm dùng để nghỉ ngơi và ngủ.",
  },
  "dining table": {
    vi: "Bàn ăn / Bàn làm việc",
    en: "Dining Table",
    category: "Nội thất",
    description: "Mặt bàn phẳng rộng chân gỗ hoặc kim loại.",
  },
  toilet: {
    vi: "Bồn cầu",
    en: "Toilet",
    category: "Thiết bị vệ sinh",
    description: "Thiết bị vệ sinh phòng tắm.",
  },
  tv: {
    vi: "Màn hình TV / Tivi",
    en: "Television / Monitor",
    category: "Thiết bị điện tử",
    description: "Màn hình hiển thị hình ảnh và giải trí nghe nhìn.",
  },
  laptop: {
    vi: "Máy tính xách tay (Laptop)",
    en: "Laptop",
    category: "Thiết bị điện tử",
    description: "Máy vi tính cá nhân di động có bàn phím và màn hình.",
  },
  mouse: {
    vi: "Chuột máy tính",
    en: "Computer Mouse",
    category: "Thiết bị điện tử",
    description: "Thiết bị điều khiển trỏ chuột máy vi tính.",
  },
  remote: {
    vi: "Điều khiển từ xa (Remote)",
    en: "Remote Control",
    category: "Thiết bị điện tử",
    description: "Thiết bị hồng ngoại điều khiển TV và điều hòa.",
  },
  keyboard: {
    vi: "Bàn phím máy tính",
    en: "Computer Keyboard",
    category: "Thiết bị điện tử",
    description: "Thiết bị nhập liệu văn bản với các phím bấm.",
  },
  "cell phone": {
    vi: "Điện thoại di động",
    en: "Cell Phone / Smartphone",
    category: "Thiết bị điện tử",
    description: "Điện thoại thông minh cầm tay kết nối mạng.",
  },
  microwave: {
    vi: "Lò vi sóng",
    en: "Microwave",
    category: "Thiết bị gia dụng",
    description: "Thiết bị hâm nóng và nấu chín thức ăn bằng sóng vi ba.",
  },
  oven: {
    vi: "Lò nướng",
    en: "Oven",
    category: "Thiết bị gia dụng",
    description: "Thiết bị dùng nhiệt nướng bánh và thực phẩm.",
  },
  toaster: {
    vi: "Máy nướng bánh mì",
    en: "Toaster",
    category: "Thiết bị gia dụng",
    description: "Thiết bị nướng giòn lát bánh mì sandwich.",
  },
  sink: {
    vi: "Bồn rửa chén / Lavabo",
    en: "Sink",
    category: "Thiết bị vệ sinh & Bếp",
    description: "Chậu rửa có vòi nước xả tiện nghi.",
  },
  refrigerator: {
    vi: "Tủ lạnh",
    en: "Refrigerator",
    category: "Thiết bị gia dụng",
    description: "Thiết bị làm mát bảo quản thực phẩm tươi ngon.",
  },
  book: {
    vi: "Cuốn sách / Vở",
    en: "Book",
    category: "Văn phòng phẩm",
    description: "Tập hợp các trang giấy in chữ hoặc ghi chép.",
  },
  clock: {
    vi: "Đồng hồ",
    en: "Clock",
    category: "Đồ gia dụng & Trang trí",
    description: "Thiết bị đo đếm và hiển thị thời gian.",
  },
  vase: {
    vi: "Bình hoa / Lọ hoa",
    en: "Vase",
    category: "Trang trí nhà cửa",
    description: "Bình gốm sứ hoặc thủy tinh cắm hoa tươi.",
  },
  scissors: {
    vi: "Chiếc kéo",
    en: "Scissors",
    category: "Văn phòng phẩm & Dụng cụ",
    description: "Dụng cụ hai lưỡi chéo dùng cắt giấy, vải.",
  },
  "teddy bear": {
    vi: "Gấu bông",
    en: "Teddy Bear",
    category: "Đồ chơi",
    description: "Thú nhồi bông mềm mại làm quà tặng hoặc đồ chơi.",
  },
  "hair drier": {
    vi: "Máy sấy tóc",
    en: "Hair Dryer",
    category: "Thiết bị chăm sóc cá nhân",
    description: "Thiết bị thổi khí nóng làm khô tóc nhanh chóng.",
  },
  toothbrush: {
    vi: "Bàn chải đánh răng",
    en: "Toothbrush",
    category: "Vệ sinh cá nhân",
    description: "Dụng cụ chăm sóc và vệ sinh răng miệng hàng ngày.",
  },
};

let cocoModelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let isModelReady = false;

/**
 * Preloads the client-side COCO-SSD object detection model in the browser.
 * Zero API keys, zero external backend calls, runs 100% locally with WebGL.
 */
export async function initLocalDetector(): Promise<cocoSsd.ObjectDetection> {
  if (!cocoModelPromise) {
    cocoModelPromise = (async () => {
      try {
        await tf.ready();
        // Use 'lite_mobilenet_v2' for ultra-fast, lightweight performance in browser
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        isModelReady = true;
        console.log("Local COCO-SSD model initialized successfully (No API required)");
        return model;
      } catch (err) {
        console.warn("Falling back to default mobilenet_v2:", err);
        const model = await cocoSsd.load();
        isModelReady = true;
        return model;
      }
    })();
  }
  return cocoModelPromise;
}

export function isLocalModelLoaded(): boolean {
  return isModelReady;
}

/**
 * Runs object detection locally on an HTMLVideoElement, HTMLImageElement, HTMLCanvasElement, or base64 image.
 */
export async function detectObjectsLocally(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | string
): Promise<DetectionResult> {
  const startTime = performance.now();
  const model = await initLocalDetector();

  let inputElement: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
  let sourceWidth = 640;
  let sourceHeight = 480;

  if (typeof source === "string") {
    // base64 image or data URL
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Không thể tải hình ảnh"));
      img.src = source;
    });
    inputElement = img;
    sourceWidth = img.naturalWidth || img.width || 640;
    sourceHeight = img.naturalHeight || img.height || 480;
  } else {
    inputElement = source;
    if (source instanceof HTMLVideoElement) {
      sourceWidth = source.videoWidth || source.clientWidth || 640;
      sourceHeight = source.videoHeight || source.clientHeight || 480;
    } else if (source instanceof HTMLImageElement) {
      sourceWidth = source.naturalWidth || source.width || 640;
      sourceHeight = source.naturalHeight || source.height || 480;
    } else if (source instanceof HTMLCanvasElement) {
      sourceWidth = source.width || 640;
      sourceHeight = source.height || 480;
    }
  }

  // Detect objects with COCO-SSD
  // maxNumBoxes = 15, minScore = 0.35
  const rawPredictions = await model.detect(inputElement, 15, 0.35);

  const objects: DetectedObject[] = rawPredictions.map((pred) => {
    const rawClass = pred.class.toLowerCase().trim();
    const info = COCO_DICTIONARY[rawClass] || {
      vi: rawClass.charAt(0).toUpperCase() + rawClass.slice(1),
      en: pred.class,
      category: "Vật thể",
      description: `Vật thể phát hiện: ${pred.class}`,
    };

    const [bx, by, bw, bh] = pred.bbox;
    // Bounding box scaled from 0 to 1000 [ymin, xmin, ymax, xmax]
    const ymin = Math.max(0, Math.min(1000, Math.round((by / sourceHeight) * 1000)));
    const xmin = Math.max(0, Math.min(1000, Math.round((bx / sourceWidth) * 1000)));
    const ymax = Math.max(0, Math.min(1000, Math.round(((by + bh) / sourceHeight) * 1000)));
    const xmax = Math.max(0, Math.min(1000, Math.round(((bx + bw) / sourceWidth) * 1000)));

    return {
      nameVi: info.vi,
      nameEn: info.en,
      category: info.category,
      confidence: Math.round(pred.score * 100),
      description: info.description,
      box_2d: [ymin, xmin, ymax, xmax],
    };
  });

  // Sort objects by confidence descending
  objects.sort((a, b) => b.confidence - a.confidence);

  const latencyMs = Math.round(performance.now() - startTime);

  let dominantObject = "Không xác định";
  let sceneSummary = "Không tìm thấy vật thể nổi bật nào trong góc nhìn này.";

  if (objects.length > 0) {
    dominantObject = objects[0].nameVi;
    const names = objects.slice(0, 4).map((o) => o.nameVi);
    const uniqueNames = Array.from(new Set(names));
    sceneSummary = `AI cục bộ phát hiện ${objects.length} vật thể: ${uniqueNames.join(", ")}.`;
  }

  return {
    dominantObject,
    sceneSummary,
    objects,
    timestamp: Date.now(),
    latencyMs,
  };
}
