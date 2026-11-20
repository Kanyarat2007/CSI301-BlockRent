# BlockRent – Blockchain Equipment Rental System

ระบบเช่าอุปกรณ์และจัดการเงินมัดจำด้วย Smart Contract บน **Ethereum Sepolia Testnet**
(Solidity ^0.8.20 · React + Vite · ethers v6 · MetaMask · Infura · Remix)

## ฟีเจอร์
- ลงประกาศ/แก้ไขอุปกรณ์ (ชื่อ รายละเอียด ประเภท รูป ราคา/วัน เงินมัดจำ)
- เช่าและชำระ ETH = (ราคา/วัน × จำนวนวัน) + เงินมัดจำ
- ยืนยันส่งมอบ 2 ขั้นตอน (Owner → Renter) → สถานะ Active
- แจ้งคืน / ยืนยันรับคืน / **Pull Payment** (`withdraw()`)
- เปิดข้อพิพาท และ Admin แบ่งเงินมัดจำ (ยอดรวมต้องเท่ากับเงินมัดจำ)
- ประวัติธุรกรรมจาก Blockchain Events พร้อมลิงก์ Sepolia Etherscan

## เมนูแยกตาม Role
Role ของ Admin คือ Wallet ที่ Deploy Contract

| สถานะ | เมนูที่เห็น |
|---|---|
| ยังไม่เชื่อมต่อ Wallet | ตลาดอุปกรณ์ |
| ผู้ใช้ทั่วไป | ตลาดอุปกรณ์, ลงประกาศอุปกรณ์ |
| ผู้ใช้ที่เคยลงประกาศ (Owner) | + แดชบอร์ดเจ้าของ |
| ผู้ใช้ที่เคยเช่า (Renter) | + แดชบอร์ดผู้เช่า |
| Admin | ตลาดอุปกรณ์, จัดการระบบ (ตัดสินข้อพิพาท) |

## รันเว็บไซต์
```bash
npm install
npm run dev
```

## โครงสร้างโปรเจกต์
```
contracts/EquipmentRental.sol      Smart Contract
src/blockchain/                    contract.js (Infura อ่าน / MetaMask เขียน) + ABI
src/context/WalletContext.jsx      Wallet, Role, โหลดข้อมูล, ส่งธุรกรรม
src/components/                    Navbar (เมนูตาม Role), WalletConnect, EquipmentCard, RentalStatus, TransactionHistory
src/pages/                         Home, EquipmentDetail, CreateEquipment, Owner/Renter/Admin Dashboard, RentalDetail
```

## ชุดทดสอบ
**A – กรณีปกติ:** Owner ลงประกาศกล้อง 0.005/วัน มัดจำ 0.02 → Renter เช่า 2 วัน จ่าย 0.03 → Owner ยืนยันส่งมอบ → Renter ยืนยันรับ → Renter แจ้งคืน → Owner ยืนยันรับคืน → Owner ถอน 0.01, Renter ถอน 0.02

**B – ต้อง Revert:** เช่าของตัวเอง, เช่า 0 วัน, ส่ง ETH ไม่ครบ, เช่าของที่ถูกจอง, Renter ยืนยันส่งมอบแทน Owner, Owner ยืนยันรับคืนก่อนแจ้งคืน, ถอนเมื่อไม่มียอด, คนนอกเปิดข้อพิพาท, ไม่ใช่ Admin ตัดสิน, แบ่งเงินมัดจำไม่ครบยอด

**C – ข้อพิพาท:** Owner เปิดข้อพิพาทพร้อม Evidence → Admin แบ่ง 0.015 (Renter) / 0.005 (Owner) → ถอนเงิน (Owner ได้รวม 0.015 ETH)

ตรวจ Transaction Hash ของทุกขั้นตอนได้ที่ https://sepolia.etherscan.io
