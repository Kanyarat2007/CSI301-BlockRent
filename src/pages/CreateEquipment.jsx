import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatEther } from "ethers";
import { PlusCircle, Save } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { toWei, same } from "../blockchain/contract";

// ใช้ทั้งหน้าลงประกาศ (/create) และแก้ไข (/equipment/:id/edit)
export default function CreateEquipment() {
  const { id } = useParams();
  const nav = useNavigate();
  const { equipments, account, send, busy } = useWallet();
  const old = id ? equipments.find((e) => e.id === Number(id)) : null;
  const [f, setF] = useState({
    name: old?.name || "",
    description: old?.description || "",
    category: old?.category || "",
    imageURI: old?.imageURI || "",
    price: old ? formatEther(old.pricePerDay) : "",
    deposit: old ? formatEther(old.deposit) : "",
  });
  if (id && (!old || !same(old.owner, account)))
    return (
      <div className="container section">
        <p className="muted">แก้ไขได้เฉพาะอุปกรณ์ของคุณเท่านั้น</p>
      </div>
    );

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  let valid = f.name.trim() !== "";
  try {
    valid = valid && toWei(f.price) > 0n && toWei(f.deposit) > 0n;
  } catch {
    valid = false;
  }

  const submit = async (e) => {
    e.preventDefault();
    const args = [
      f.name,
      f.description,
      f.category,
      f.imageURI,
      toWei(f.price),
      toWei(f.deposit),
    ];
    const ok = await send(old ? "แก้ไขอุปกรณ์" : "ลงประกาศอุปกรณ์", (c) =>
      old ? c.updateEquipment(old.id, ...args) : c.registerEquipment(...args),
    );
    if (ok) nav("/owner");
  };

  return (
    <div className="container section narrow">
      <h1>{old ? "แก้ไขอุปกรณ์" : "ลงประกาศอุปกรณ์ให้เช่า"}</h1>
      <form className="card panel" onSubmit={submit}>
        <label>
          ชื่ออุปกรณ์
          <input
            value={f.name}
            onChange={set("name")}
            placeholder="เช่น กล้อง Canon EOS"
          />
        </label>
        <label>
          ประเภท
          <input
            value={f.category}
            onChange={set("category")}
            placeholder="เช่น กล้อง, เลนส์, โดรน"
          />
        </label>
        <label>
          รายละเอียด
          <textarea
            rows={4}
            value={f.description}
            onChange={set("description")}
          />
        </label>
        <label>
          รูปภาพ (URL หรือ ipfs://CID)
          <input
            value={f.imageURI}
            onChange={set("imageURI")}
            placeholder="ipfs://bafy…"
          />
        </label>
        <div className="grid-2">
          <label>
            ค่าเช่าต่อวัน (ETH)
            <input
              inputMode="decimal"
              value={f.price}
              onChange={set("price")}
              placeholder="0.005"
            />
          </label>
          <label>
            เงินมัดจำ (ETH)
            <input
              inputMode="decimal"
              value={f.deposit}
              onChange={set("deposit")}
              placeholder="0.02"
            />
          </label>
        </div>
        {old && old.rentalId !== 0 && (
          <div className="notice">
            อุปกรณ์กำลังถูกเช่า จึงแก้ไขราคาและเงินมัดจำไม่ได้
          </div>
        )}
        <button className="btn btn-primary" disabled={busy || !valid}>
          {old ? <Save size={18} /> : <PlusCircle size={18} />}{" "}
          {old ? "บันทึกการแก้ไข" : "ลงประกาศ"}
        </button>
      </form>
    </div>
  );
}
