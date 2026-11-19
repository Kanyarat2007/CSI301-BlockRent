import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, Wallet, Info } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { EquipmentImage } from "../components/EquipmentCard";
import { fmt, short, same } from "../blockchain/contract";

export default function EquipmentDetail() {
  const { id } = useParams();
  const { equipments, account, role, send, busy, connect } = useWallet();
  const [days, setDays] = useState(1);
  const e = equipments.find((x) => x.id === Number(id));
  if (!e)
    return (
      <div className="container section">
        <p className="muted">ไม่พบอุปกรณ์</p>
      </div>
    );

  const isOwner = same(e.owner, account);
  const free = e.rentalId === 0;
  const n = Number.isInteger(+days) && +days > 0 ? BigInt(days) : 0n;
  const rent = e.pricePerDay * n;
  const total = rent + e.deposit;

  return (
    <div className="container section detail">
      <EquipmentImage src={e.imageURI} size="large" />
      <div>
        <div className="row gap">
          <span className="muted">{e.category || "ทั่วไป"}</span>
          <span className={`badge ${free ? "b-green" : "b-gray"}`}>
            {free ? "ว่าง" : "ไม่ว่าง"}
          </span>
        </div>
        <h1>{e.name}</h1>
        <p className="desc">{e.description}</p>
        <div className="muted small">
          เจ้าของ: {short(e.owner)}
          {isOwner && " (คุณ)"}
        </div>
        <div className="card panel">
          <div className="row between">
            <span>ค่าเช่าต่อวัน</span>
            <strong>{fmt(e.pricePerDay)}</strong>
          </div>
          <div className="row between">
            <span>เงินมัดจำ</span>
            <strong>{fmt(e.deposit)}</strong>
          </div>

          {role === "user" && !isOwner && free && (
            <>
              <label>
                จำนวนวันที่เช่า
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={days}
                  onChange={(ev) => setDays(ev.target.value)}
                />
              </label>
              <div className="row between">
                <span>ค่าเช่า {String(n)} วัน</span>
                <span>{fmt(rent)}</span>
              </div>
              <div className="row between total">
                <span>ยอดชำระทั้งหมด</span>
                <strong>{fmt(total)}</strong>
              </div>
              <button
                className="btn btn-primary"
                disabled={busy || n === 0n}
                onClick={() =>
                  send("เช่าอุปกรณ์", (c) =>
                    c.rentEquipment(e.id, n, { value: total }),
                  )
                }
              >
                <Wallet size={18} /> ชำระและจองอุปกรณ์
              </button>
            </>
          )}
          {role === "guest" && (
            <button className="btn btn-primary" onClick={connect}>
              <Wallet size={18} /> เชื่อมต่อ MetaMask เพื่อเช่า
            </button>
          )}
          {role === "admin" && (
            <div className="notice">
              <Info size={18} /> Admin ไม่มีสิทธิ์เช่าอุปกรณ์
            </div>
          )}
          {isOwner && (
            <Link className="btn btn-ghost" to={`/equipment/${e.id}/edit`}>
              <Pencil size={18} /> แก้ไขข้อมูลอุปกรณ์
            </Link>
          )}
          {!free && !isOwner && role === "user" && (
            <div className="notice">
              <Info size={18} /> อุปกรณ์นี้กำลังถูกเช่า
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
