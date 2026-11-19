import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import {
  Truck,
  PackageCheck,
  Undo2,
  CheckCircle2,
  AlertTriangle,
  Gavel,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useWallet } from "../context/WalletContext";
import {
  readContract,
  STATUS_TH,
  fmt,
  short,
  same,
  toWei,
} from "../blockchain/contract";

export const StatusBadge = ({ status }) => {
  const cls = {
    Reserved: "b-blue",
    Active: "b-blue",
    ReturnRequested: "b-blue",
    Completed: "b-green",
    Disputed: "b-orange",
    Cancelled: "b-gray",
  }[status];
  return <span className={`badge ${cls}`}>{STATUS_TH[status]}</span>;
};

// การ์ดรายการเช่า: ปุ่มที่แสดงขึ้นกับ Role ของผู้ดูเทียบกับรายการนั้น
export function RentalCard({ rental: r, detail = false }) {
  const { account, isAdmin, equipments, send, busy } = useWallet();
  const eq = equipments.find((e) => e.id === r.equipmentId);
  const isOwner = same(r.owner, account),
    isRenter = same(r.renter, account);
  const [showDispute, setShowDispute] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [dispute, setDispute] = useState(null);
  const [refund, setRefund] = useState(formatEther(r.depositAmount));
  const [comp, setComp] = useState("0");

  useEffect(() => {
    if (r.status === "Disputed") readContract.getDispute(r.id).then(setDispute);
  }, [r.status, r.id]);

  const setSplit = (which, v) => {
    which === "refund" ? setRefund(v) : setComp(v);
    try {
      const rest = formatEther(r.depositAmount - toWei(v));
      which === "refund" ? setComp(rest) : setRefund(rest);
    } catch {
      /* ค่าที่กรอกยังไม่ถูกต้อง */
    }
  };
  let splitOk = false;
  try {
    splitOk = toWei(refund) + toWei(comp) === r.depositAmount;
  } catch {
    /* ignore */
  }

  const act = (label, fn, Icon, cls = "btn-primary") => (
    <button
      className={`btn ${cls}`}
      disabled={busy}
      onClick={() => send(label, fn)}
    >
      <Icon size={18} /> {label}
    </button>
  );
  const canDispute =
    ["Reserved", "Active", "ReturnRequested"].includes(r.status) &&
    (isOwner || isRenter);

  return (
    <div className="card rental">
      <div className="row between wrap">
        <div>
          <div className="muted small">รายการเช่า #{r.id}</div>
          <h3>{eq?.name || `อุปกรณ์ #${r.equipmentId}`}</h3>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div className="grid-2 small">
        <div>
          <span className="muted">เจ้าของ</span>
          <br />
          {short(r.owner)}
          {isOwner && " (คุณ)"}
        </div>
        <div>
          <span className="muted">ผู้เช่า</span>
          <br />
          {short(r.renter)}
          {isRenter && " (คุณ)"}
        </div>
        <div>
          <span className="muted">ระยะเวลา</span>
          <br />
          {r.daysCount} วัน
        </div>
        <div>
          <span className="muted">เริ่มเช่า</span>
          <br />
          {r.startTime
            ? new Date(r.startTime * 1000).toLocaleString("th-TH")
            : "—"}
        </div>
        <div>
          <span className="muted">ค่าเช่า</span>
          <br />
          {fmt(r.rentAmount)}
        </div>
        <div>
          <span className="muted">เงินมัดจำ</span>
          <br />
          {fmt(r.depositAmount)}
        </div>
      </div>

      {r.status === "Reserved" && (
        <div className="steps small">
          <span className={r.ownerConfirmedPickup ? "done" : ""}>
            <CheckCircle2 size={15} /> เจ้าของส่งมอบ
          </span>
          <span className={r.renterConfirmedReceived ? "done" : ""}>
            <CheckCircle2 size={15} /> ผู้เช่ารับของ
          </span>
        </div>
      )}
      {dispute && (
        <div className="notice">
          <AlertTriangle size={18} /> เปิดข้อพิพาทโดย {short(dispute.openedBy)}{" "}
          · หลักฐาน:{" "}
          <a
            href={
              dispute.evidenceHash.startsWith("ipfs://")
                ? `https://ipfs.io/ipfs/${dispute.evidenceHash.slice(7)}`
                : dispute.evidenceHash
            }
            target="_blank"
            rel="noreferrer"
          >
            {dispute.evidenceHash}
          </a>
        </div>
      )}

      <div className="row wrap gap">
        {r.status === "Reserved" &&
          isOwner &&
          !r.ownerConfirmedPickup &&
          act("ยืนยันส่งมอบอุปกรณ์", (c) => c.confirmPickup(r.id), Truck)}
        {r.status === "Reserved" &&
          isRenter &&
          r.ownerConfirmedPickup &&
          !r.renterConfirmedReceived &&
          act(
            "ยืนยันได้รับอุปกรณ์",
            (c) => c.confirmReceived(r.id),
            PackageCheck,
          )}
        {r.status === "Reserved" && isRenter && !r.ownerConfirmedPickup && (
          <span className="muted small">
            <Clock size={15} /> รอเจ้าของยืนยันการส่งมอบ
          </span>
        )}
        {r.status === "Active" &&
          isRenter &&
          act("แจ้งคืนอุปกรณ์", (c) => c.requestReturn(r.id), Undo2)}
        {r.status === "ReturnRequested" &&
          isOwner &&
          act(
            "ยืนยันรับคืน",
            (c) => c.confirmReturn(r.id),
            CheckCircle2,
            "btn-success",
          )}
        {r.status === "ReturnRequested" && isRenter && (
          <span className="muted small">
            <Clock size={15} /> รอเจ้าของตรวจสอบสภาพอุปกรณ์
          </span>
        )}
        {canDispute && (
          <button
            className="btn btn-warn"
            onClick={() => setShowDispute(!showDispute)}
          >
            <AlertTriangle size={18} /> เปิดข้อพิพาท
          </button>
        )}
        {!detail && (
          <Link className="btn btn-ghost" to={`/rental/${r.id}`}>
            <ExternalLink size={18} /> รายละเอียดและประวัติ
          </Link>
        )}
      </div>

      {showDispute && canDispute && (
        <div className="panel">
          <label>
            หลักฐาน (IPFS CID / URL)
            <input
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="ipfs://bafy… หรือ https://…"
            />
          </label>
          <button
            className="btn btn-warn"
            disabled={busy || !evidence}
            onClick={() =>
              send("เปิดข้อพิพาท", (c) => c.openDispute(r.id, evidence))
            }
          >
            ส่งข้อพิพาท
          </button>
        </div>
      )}

      {r.status === "Disputed" && isAdmin && (
        <div className="panel">
          <strong>
            <Gavel size={16} /> ตัดสินการแบ่งเงินมัดจำ (รวมต้องเท่ากับ{" "}
            {formatEther(r.depositAmount)} ETH)
          </strong>
          <div className="grid-2">
            <label>
              คืนให้ผู้เช่า (ETH)
              <input
                value={refund}
                onChange={(e) => setSplit("refund", e.target.value)}
              />
            </label>
            <label>
              ชดเชยให้เจ้าของ (ETH)
              <input
                value={comp}
                onChange={(e) => setSplit("comp", e.target.value)}
              />
            </label>
          </div>
          {!splitOk && (
            <div className="error small">ยอดรวมต้องเท่ากับเงินมัดจำ</div>
          )}
          <button
            className="btn btn-primary"
            disabled={busy || !splitOk}
            onClick={() =>
              send("ตัดสินข้อพิพาท", (c) =>
                c.resolveDispute(r.id, toWei(refund), toWei(comp)),
              )
            }
          >
            <Gavel size={18} /> ยืนยันคำตัดสิน
          </button>
        </div>
      )}
    </div>
  );
}
