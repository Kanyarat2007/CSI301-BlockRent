import { Contract, JsonRpcProvider, parseEther, formatEther } from "ethers";
import ABI from "./EquipmentRentalABI.json";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
export const DEPLOY_BLOCK = Number(import.meta.env.VITE_DEPLOY_BLOCK || 0);
export const SEPOLIA_CHAIN_ID = "0xaa36a7";
export const ETHERSCAN_TX = "https://sepolia.etherscan.io/tx/";

// Provider ผ่าน Infura ใช้อ่านข้อมูล (ไม่ต้องเชื่อมกระเป๋า)
export const readProvider = new JsonRpcProvider(
  import.meta.env.VITE_INFURA_URL,
);
export const readContract = new Contract(CONTRACT_ADDRESS, ABI, readProvider);
// Contract ที่ผูกกับ Signer (MetaMask) ใช้ส่งธุรกรรม
export const writeContract = (signer) =>
  new Contract(CONTRACT_ADDRESS, ABI, signer);

export const STATUS = [
  "Reserved",
  "Active",
  "ReturnRequested",
  "Completed",
  "Disputed",
  "Cancelled",
];
export const STATUS_TH = {
  Reserved: "จองแล้ว รอส่งมอบ",
  Active: "กำลังเช่า",
  ReturnRequested: "แจ้งคืนแล้ว รอตรวจสอบ",
  Completed: "เสร็จสิ้น",
  Disputed: "อยู่ระหว่างข้อพิพาท",
  Cancelled: "ยกเลิก",
};

// ใช้ BigInt/ethers ทั้งหมด ไม่ใช้ Number กับจำนวน ETH
export const toWei = (v) => parseEther(String(v || "0"));
export const fmt = (wei) => `${formatEther(wei)} ETH`;
export const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
export const ipfsUrl = (u) =>
  u?.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u;

export const toEquipment = (e, activeRentalId) => ({
  id: Number(e.id),
  owner: e.owner,
  name: e.name,
  description: e.description,
  category: e.category,
  imageURI: e.imageURI,
  pricePerDay: e.pricePerDay,
  deposit: e.deposit,
  rentalId: Number(activeRentalId),
});
export const toRental = (r) => ({
  id: Number(r.id),
  equipmentId: Number(r.equipmentId),
  owner: r.owner,
  renter: r.renter,
  daysCount: Number(r.daysCount),
  rentAmount: r.rentAmount,
  depositAmount: r.depositAmount,
  startTime: Number(r.startTime),
  status: STATUS[Number(r.status)],
  ownerConfirmedPickup: r.ownerConfirmedPickup,
  renterConfirmedReceived: r.renterConfirmedReceived,
});
