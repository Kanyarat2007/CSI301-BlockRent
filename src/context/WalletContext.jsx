import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BrowserProvider } from "ethers";
import {
  readContract,
  writeContract,
  SEPOLIA_CHAIN_ID,
  toEquipment,
  toRental,
  same,
} from "../blockchain/contract";

const Ctx = createContext(null);
export const useWallet = () => useContext(Ctx);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [pending, setPending] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (type, text, hash) => setToast({ type, text, hash });

  const refresh = useCallback(
    async (acc = account) => {
      try {
        const [adminAddr, eqCount, rCount] = await Promise.all([
          readContract.admin(),
          readContract.equipmentCount(),
          readContract.rentalCount(),
        ]);
        const ids = (n) => Array.from({ length: Number(n) }, (_, i) => i + 1);
        const [eqs, rts] = await Promise.all([
          Promise.all(
            ids(eqCount).map(async (i) =>
              toEquipment(
                await readContract.getEquipment(i),
                await readContract.activeRentalOf(i),
              ),
            ),
          ),
          Promise.all(
            ids(rCount).map(async (i) =>
              toRental(await readContract.getRental(i)),
            ),
          ),
        ]);
        setAdmin(adminAddr);
        setEquipments(eqs);
        setRentals(rts.reverse());
        setPending(acc ? await readContract.pendingWithdrawals(acc) : 0n);
      } catch (e) {
        notify(
          "error",
          "อ่านข้อมูลจาก Contract ไม่สำเร็จ ตรวจสอบ .env (Infura / Contract Address)",
        );
      } finally {
        setLoading(false);
      }
    },
    [account],
  );

  const connect = async () => {
    if (!window.ethereum)
      return notify("error", "ไม่พบ MetaMask กรุณาติดตั้งส่วนขยายก่อน");
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      } catch {
        notify("error", "กรุณาสลับเครือข่ายเป็น Sepolia ใน MetaMask");
        return;
      }
      const s = await new BrowserProvider(window.ethereum).getSigner();
      setSigner(s);
      setAccount(await s.getAddress());
    } catch (e) {
      notify("error", e.shortMessage || e.message);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setSigner(null);
    setPending(0n);
  };

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!window.ethereum) return;
    const onAcc = () => connect();
    const onChain = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAcc);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAcc);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 9000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ส่งธุรกรรม: รอ confirm แล้วโหลดข้อมูลใหม่
  const send = async (label, fn) => {
    if (!signer) return notify("error", "กรุณาเชื่อมต่อ MetaMask ก่อน");
    setBusy(true);
    try {
      const tx = await fn(writeContract(signer));
      notify("info", `${label}: กำลังรอยืนยันบน Blockchain…`, tx.hash);
      await tx.wait();
      notify("success", `${label} สำเร็จ`, tx.hash);
      await refresh();
      return true;
    } catch (e) {
      notify(
        "error",
        `${label} ไม่สำเร็จ: ${e.reason || e.shortMessage || e.message}`,
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const isAdmin = same(account, admin);
  const role = !account ? "guest" : isAdmin ? "admin" : "user";
  const ownsAny = useMemo(
    () => equipments.some((e) => same(e.owner, account)),
    [equipments, account],
  );
  const rentsAny = useMemo(
    () => rentals.some((r) => same(r.renter, account)),
    [rentals, account],
  );

  return (
    <Ctx.Provider
      value={{
        account,
        admin,
        role,
        isAdmin,
        ownsAny,
        rentsAny,
        equipments,
        rentals,
        pending,
        loading,
        busy,
        toast,
        setToast,
        connect,
        disconnect,
        refresh,
        send,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
