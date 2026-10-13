/** Standard Bluetooth Low Energy Heart Rate Service (0x180D) via Web Bluetooth. */

export interface HrPacket {
  hr: number;
  rr: number[]; // RR intervals in ms
}

export const bleSupported = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

export function parseHeartRate(value: DataView): HrPacket {
  const flags = value.getUint8(0);
  const sixteen = (flags & 0x01) !== 0;
  const hasEnergy = (flags & 0x08) !== 0;
  const hasRr = (flags & 0x10) !== 0;
  let i = 1;
  const hr = sixteen ? value.getUint16(i, true) : value.getUint8(i);
  i += sixteen ? 2 : 1;
  if (hasEnergy) i += 2;
  const rr: number[] = [];
  if (hasRr) {
    while (i + 1 < value.byteLength) {
      rr.push((value.getUint16(i, true) / 1024) * 1000);
      i += 2;
    }
  }
  return { hr, rr };
}

export const rmssd = (rr: number[]): number | null => {
  const clean = rr.filter((x) => x > 300 && x < 2000);
  if (clean.length < 8) return null;
  let sum = 0;
  let n = 0;
  for (let i = 1; i < clean.length; i++) {
    const d = clean[i] - clean[i - 1];
    if (Math.abs(d) > 250) continue; // drop ectopic / artefact
    sum += d * d;
    n++;
  }
  return n >= 6 ? Math.sqrt(sum / n) : null;
};

type BtDevice = {
  name?: string;
  gatt?: {
    connect(): Promise<{
      getPrimaryService(s: string): Promise<{
        getCharacteristic(c: string): Promise<{
          startNotifications(): Promise<unknown>;
          addEventListener(t: string, f: (e: Event) => void): void;
          removeEventListener(t: string, f: (e: Event) => void): void;
        }>;
      }>;
    }>;
    disconnect(): void;
    connected: boolean;
  };
  addEventListener(t: string, f: () => void): void;
};

export interface HrConnection {
  name: string;
  disconnect: () => void;
}

export async function connectHrMonitor(onPacket: (p: HrPacket) => void, onClose: () => void): Promise<HrConnection> {
  const nav = navigator as unknown as { bluetooth: { requestDevice(o: unknown): Promise<BtDevice> } };
  const device = await nav.bluetooth.requestDevice({ filters: [{ services: ["heart_rate"] }] });
  device.addEventListener("gattserverdisconnected", onClose);
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService("heart_rate");
  const ch = await service.getCharacteristic("heart_rate_measurement");
  const handler = (e: Event) => {
    const dv = (e.target as unknown as { value: DataView }).value;
    onPacket(parseHeartRate(dv));
  };
  ch.addEventListener("characteristicvaluechanged", handler);
  await ch.startNotifications();
  return {
    name: device.name ?? "Heart-rate monitor",
    disconnect: () => {
      try {
        ch.removeEventListener("characteristicvaluechanged", handler);
        device.gatt?.disconnect();
      } catch {
        /* already closed */
      }
    },
  };
}
