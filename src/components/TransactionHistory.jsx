import { useEffect, useState } from "react";
import { History, ExternalLink } from "lucide-react";
import {
  readContract,
  readProvider,
  DEPLOY_BLOCK,
  ETHERSCAN_TX,
  short,
  same,
} from "../blockchain/contract";

const NAMES = {
  EquipmentRegistered: "ลงประกาศอุปกรณ์",
  EquipmentUpdated: "แก้ไขอุปกรณ์",
  EquipmentRented: "จองและชำระเงิน",
  PickupConfirmed: "เจ้าของยืนยันส่งมอบ",
  ReceivedConfirmed: "ผู้เช่ายืนยันรับอุปกรณ์",
  ReturnRequested: "แจ้งคืนอุปกรณ์",
  ReturnConfirmed: "เจ้าของยืนยันรับคืน",
  DisputeOpened: "เปิดข้อพิพาท",
  DisputeResolved: "Admin ตัดสินข้อพิพาท",
  Withdrawn: "ถอนเงิน",
};
const CHUNK = 5000;

// อ่านประวัติจาก Events แบ่งช่วง Block เพื่อไม่ให้เรียก RPC ครั้งเดียวมากเกินไป
async function loadLogs() {
  const latest = await readProvider.getBlockNumber();
  const out = [];
  for (let from = DEPLOY_BLOCK; from <= latest; from += CHUNK) {
    out.push(
      ...(await readContract.queryFilter(
        "*",
        from,
        Math.min(from + CHUNK - 1, latest),
      )),
    );
  }
  return out;
}

// rentalId: เฉพาะรายการเช่า | account: เฉพาะ Wallet | ไม่ส่งอะไร: ทั้งหมด (Admin)
export default function TransactionHistory({ rentalId, account }) {
  const [logs, setLogs] = useState(null);
  useEffect(() => {
    loadLogs()
      .then(setLogs)
      .catch(() => setLogs([]));
  }, []);

  const rows = (logs || [])
    .filter((l) => {
      if (!l.args) return false;
      if (rentalId != null)
        return l.args.rentalId != null && Number(l.args.rentalId) === rentalId;
      if (account)
        return Array.from(l.args).some(
          (v) => typeof v === "string" && same(v, account),
        );
      return true;
    })
    .reverse();

  return (
    <section className="section">
      <h2>
        <History size={22} /> ประวัติธุรกรรม
      </h2>
      {logs === null ? (
        <p className="muted">กำลังโหลดประวัติจาก Blockchain…</p>
      ) : rows.length === 0 ? (
        <p className="muted">ยังไม่มีประวัติธุรกรรม</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>เหตุการณ์</th>
                <th>อ้างอิง</th>
                <th>Block</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.transactionHash + l.index}>
                  <td>{NAMES[l.fragment.name] || l.fragment.name}</td>
                  <td>
                    {l.args.rentalId != null
                      ? `รายการเช่า #${l.args.rentalId}`
                      : l.args.equipmentId != null
                        ? `อุปกรณ์ #${l.args.equipmentId}`
                        : short(l.args.account)}
                  </td>
                  <td>{l.blockNumber}</td>
                  <td>
                    <a
                      href={ETHERSCAN_TX + l.transactionHash}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {short(l.transactionHash)} <ExternalLink size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
