export interface SampleImage {
  id: string;
  title: string;
  category: string;
  url: string;
  description: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: "desk-workspace",
    title: "Bàn làm việc & Đồ công nghệ",
    category: "Thiết bị điện tử",
    url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
    description: "Máy tính xách tay, cốc cà phê, sổ tay và bút trên bàn gỗ",
  },
  {
    id: "fruits-kitchen",
    title: "Trái cây & Đồ dùng bếp",
    category: "Thực phẩm & Bếp",
    url: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=80",
    description: "Táo, chuối, cam tươi và đĩa trong phòng bếp",
  },
  {
    id: "stationery-study",
    title: "Balo & Đồ dùng học tập",
    category: "Văn phòng phẩm",
    url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80",
    description: "Balo, tai nghe, kính mắt và chai nước uống",
  },
  {
    id: "living-room",
    title: "Phòng khách & Nội thất",
    category: "Nội thất gia đình",
    url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80",
    description: "Ghế sofa xanh lá, bàn trà gỗ, chậu cây cảnh và gối ôm",
  },
];
