# BlockRent – Blockchain Equipment Rental System

ระบบเช่าอุปกรณ์และจัดการเงินมัดจำด้วย Smart Contract บน **Ethereum Sepolia Testnet**
(Solidity ^0.8.20 · React + Vite · ethers v6 · MetaMask · Infura · Remix)

> ใช้ Test ETH เท่านั้น ไม่ใช่เงินจริง และเป็นต้นแบบสำหรับการเรียน ยังไม่ควรใช้กับเงินจริง

## ฟีเจอร์
- ลงประกาศ/แก้ไขอุปกรณ์ (ชื่อ รายละเอียด ประเภท รูป ราคา/วัน เงินมัดจำ)
- เช่าและชำระ ETH = (ราคา/วัน × จำนวนวัน) + เงินมัดจำ
- ยืนยันส่งมอบ 2 ขั้นตอน (Owner → Renter) → สถานะ Active
- แจ้งคืน / ยืนยันรับคืน / **Pull Payment** (`withdraw()`)
- เปิดข้อพิพาท และ Admin แบ่งเงินมัดจำ (ยอดรวมต้องเท่ากับเงินมัดจำ)
- ประวัติธุรกรรมจาก Blockchain Events พร้อมลิงก์ Sepolia Etherscan (ไม่ใช้ MySQL)

## เมนูแยกตาม Role
Role ของ Admin คือ Wallet ที่ Deploy Contract ส่วน Owner/Renter ตรวจจากความสัมพันธ์กับรายการ

| สถานะ | เมนูที่เห็น |
|---|---|
| ยังไม่เชื่อมต่อ Wallet | ตลาดอุปกรณ์ |
| ผู้ใช้ทั่วไป | ตลาดอุปกรณ์, ลงประกาศอุปกรณ์ |
| ผู้ใช้ที่เคยลงประกาศ (Owner) | + แดชบอร์ดเจ้าของ |
| ผู้ใช้ที่เคยเช่า (Renter) | + แดชบอร์ดผู้เช่า |
| Admin | ตลาดอุปกรณ์, จัดการระบบ (ตัดสินข้อพิพาท) |

ปุ่มในแต่ละรายการเช่าก็แสดงตามสิทธิ์เช่นกัน และ Contract ตรวจสิทธิ์ซ้ำอีกชั้นด้วย `require`

## วิธีติดตั้งและใช้งาน

### 1) เตรียม MetaMask และ Test ETH
1. ติดตั้ง MetaMask แล้วเปิดแสดง Test Networks เลือกเครือข่าย **Sepolia**
2. สร้างอย่างน้อย 3 Account: Wallet 1 (Admin), Wallet 2 (Owner), Wallet 3 (Renter)
3. ขอ Test ETH จาก Sepolia Faucet ให้ทุก Account

### 2) Deploy Contract ด้วย Remix
1. เปิด https://remix.ethereum.org สร้างไฟล์ `EquipmentRental.sol` แล้ววางโค้ดจาก `contracts/EquipmentRental.sol`
2. แท็บ Solidity Compiler เลือกเวอร์ชัน 0.8.20 ขึ้นไป แล้วกด Compile
3. แท็บ Deploy & Run เลือก Environment = **Injected Provider – MetaMask** (ใช้ **Wallet 1**)
4. กด Deploy และยืนยันใน MetaMask
5. คัดลอก **Contract Address** และเลข **Block** ที่ Deploy (ดูจาก Sepolia Etherscan)

> ไฟล์ `src/blockchain/EquipmentRentalABI.json` สร้างจากโค้ดนี้แล้ว หากแก้ Contract ให้คัดลอก ABI ใหม่จาก Remix มาแทนที่

### 3) ตั้งค่า Infura
1. สมัครที่ https://infura.io สร้าง API Key
2. ใช้ endpoint `https://sepolia.infura.io/v3/<API_KEY>`

### 4) รันเว็บไซต์
```bash
npm install
cp .env.example .env     # แล้วแก้ค่าในไฟล์ .env
npm run dev
```
ค่าใน `.env`
```
VITE_INFURA_URL=https://sepolia.infura.io/v3/<API_KEY>
VITE_CONTRACT_ADDRESS=0x...        # จาก Remix
VITE_DEPLOY_BLOCK=1234567          # Block ที่ Deploy
```
เปิด http://localhost:5173 แล้วกดเชื่อมต่อ MetaMask

## โครงสร้างโปรเจกต์
```
contracts/EquipmentRental.sol      Smart Contract
src/blockchain/                    contract.js (Infura อ่าน / MetaMask เขียน) + ABI
src/context/WalletContext.jsx      Wallet, Role, โหลดข้อมูล, ส่งธุรกรรม
src/components/                    Navbar (เมนูตาม Role), WalletConnect, EquipmentCard, RentalStatus, TransactionHistory
src/pages/                         Home, EquipmentDetail, CreateEquipment, Owner/Renter/Admin Dashboard, RentalDetail
```
การอ่านข้อมูลใช้ Infura (ไม่ต้องเชื่อมกระเป๋า) ส่วนการส่งธุรกรรมใช้ MetaMask
ราคา/เงินมัดจำคำนวณด้วย BigInt (ethers) ไม่ใช้ Number เพื่อไม่ให้เสียความแม่นยำ

## การเก็บข้อมูล (ไม่ใช้ MySQL)
| ข้อมูล | ที่เก็บ |
|---|---|
| ข้อมูลอุปกรณ์ ราคา เงินมัดจำ สถานะเช่า ยอดถอนได้ | Smart Contract |
| ประวัติธุรกรรม | Blockchain Events (`queryFilter`) |
| รูปภาพ / หลักฐานข้อพิพาท | IPFS (เก็บ CID/URI ใน Contract) |
| Contract Address / ABI | Frontend (`.env`, JSON) |

อัปโหลดรูปไป IPFS (เช่น Pinata) แล้ววาง `ipfs://CID` ในช่องรูปภาพ/หลักฐาน (ทดลองใช้ URL รูปได้ แต่ควรเป็นลิงก์ถาวร)

## ชุดทดสอบ (ทำใน Remix หรือหน้าเว็บ)
**A – กรณีปกติ:** Owner ลงประกาศกล้อง 0.005/วัน มัดจำ 0.02 → Renter เช่า 2 วัน จ่าย 0.03 → Owner ยืนยันส่งมอบ → Renter ยืนยันรับ → Renter แจ้งคืน → Owner ยืนยันรับคืน → Owner ถอน 0.01, Renter ถอน 0.02

**B – ต้อง Revert:** เช่าของตัวเอง, เช่า 0 วัน, ส่ง ETH ไม่ครบ, เช่าของที่ถูกจอง, Renter ยืนยันส่งมอบแทน Owner, Owner ยืนยันรับคืนก่อนแจ้งคืน, ถอนเมื่อไม่มียอด, คนนอกเปิดข้อพิพาท, ไม่ใช่ Admin ตัดสิน, แบ่งเงินมัดจำไม่ครบยอด

**C – ข้อพิพาท:** Owner เปิดข้อพิพาทพร้อม Evidence → Admin แบ่ง 0.015 (Renter) / 0.005 (Owner) → ถอนเงิน (Owner ได้รวม 0.015 ETH)

ตรวจ Transaction Hash ของทุกขั้นตอนได้ที่ https://sepolia.etherscan.io

## ข้อจำกัดของเวอร์ชันนี้
1. **การหมดเวลา:** `daysCount` ใช้คำนวณค่าเช่าเท่านั้น ไม่มีบังคับวันครบกำหนดหรือค่าปรับคืนล่าช้า
2. **การยกเลิก:** มีสถานะ `Cancelled` แต่ยังไม่มีฟังก์ชันยกเลิกการจอง/คืนเงินกรณีไม่ส่งมอบ
3. **ข้อพิพาท:** Admin แบ่งได้เฉพาะเงินมัดจำ ค่าเช่าจ่ายให้ Owner เสมอ แม้กรณีไม่ได้ส่งมอบอุปกรณ์
4. **การล็อกเงิน:** หากไม่มีฝ่ายใดดำเนินการต่อและไม่เปิดข้อพิพาท เงินจะค้างใน Contract (ยังไม่มี Timeout)
5. **การส่งมอบจริง:** Blockchain ตรวจสอบสภาพ/การส่งมอบทางกายภาพเองไม่ได้ ต้องเชื่อใจการยืนยันของคู่สัญญา
6. **การเปิดข้อพิพาท:** ยังไม่มีระยะเวลาตอบกลับและกฎป้องกันการถ่วงเวลา
7. Admin เป็นผู้ชี้ขาดที่ได้รับความไว้วางใจ ไม่ใช่การตัดสินโดย Blockchain เอง
8. ประวัติธุรกรรมอ่านจาก Events แบบแบ่งช่วง Block (ถ้าข้อมูลมากควรใช้ Indexer เช่น The Graph)
