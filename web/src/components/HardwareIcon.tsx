import React from 'react';
import {
  Laptop,
  DesktopTower,
  Monitor,
  DeviceMobile,
  DeviceTablet,
  SimCard,
  Printer,
  Barcode,
  Headphones,
  Mouse,
  Keyboard,
  PlugCharging,
  WifiHigh,
  HardDrives,
  ShieldCheck,
  ProjectorScreen,
  BatteryCharging,
  Camera,
  Package,
} from '@phosphor-icons/react';

interface HardwareIconProps {
  category: string;
  className?: string;
}

export const HardwareIcon: React.FC<HardwareIconProps> = ({ category, className = 'w-4 h-4' }) => {
  const c = (category || '').toUpperCase().trim();

  if (c === 'LAPTOP') return <Laptop weight="duotone" className={`${className} text-[#5B4FE9]`} />;
  if (c === 'WORKSTATION') return <DesktopTower weight="duotone" className={`${className} text-slate-700`} />;
  if (c === 'MONITOR') return <Monitor weight="duotone" className={`${className} text-sky-600`} />;
  if (c === 'TELEFONO' || c === 'TELEFONO FIJO') {
    return <DeviceMobile weight="duotone" className={`${className} text-violet-600`} />;
  }
  if (c === 'IPAD') return <DeviceTablet weight="duotone" className={`${className} text-indigo-600`} />;
  if (c === 'SIM-CARD') return <SimCard weight="duotone" className={`${className} text-fuchsia-600`} />;
  if (c === 'IMPRESORA') return <Printer weight="duotone" className={`${className} text-amber-600`} />;
  if (c === 'SCANNER') return <Barcode weight="duotone" className={`${className} text-orange-600`} />;
  if (c === 'AUDIFONOS' || c === 'BOCINA') {
    return <Headphones weight="duotone" className={`${className} text-emerald-600`} />;
  }
  if (c === 'MOUSE') return <Mouse weight="duotone" className={`${className} text-teal-600`} />;
  if (c === 'TECLADO' || c === 'TECLADO Y MOUSE' || c === 'TECLADO NUMERICO') {
    return <Keyboard weight="duotone" className={`${className} text-cyan-700`} />;
  }
  if (c === 'DOCKING') return <PlugCharging weight="duotone" className={`${className} text-teal-700`} />;
  if (c === 'ACCESS POINT' || c === 'ROUTER') {
    return <WifiHigh weight="duotone" className={`${className} text-cyan-600`} />;
  }
  if (c === 'FIREWALL') return <ShieldCheck weight="duotone" className={`${className} text-rose-600`} />;
  if (c.includes('SWITCH') || c === 'SERVER' || c === 'NVR' || c === 'DVR' || c === 'PDU') {
    return <HardDrives weight="duotone" className={`${className} text-indigo-700`} />;
  }
  if (c === 'PROYECTOR') return <ProjectorScreen weight="duotone" className={`${className} text-amber-700`} />;
  if (c === 'NO-BREAK' || c === 'APC' || c.includes('BATERIA')) {
    return <BatteryCharging weight="duotone" className={`${className} text-emerald-700`} />;
  }
  if (c === 'CAMARA' || c === 'GOPRO') {
    return <Camera weight="duotone" className={`${className} text-slate-700`} />;
  }

  return <Package weight="duotone" className={`${className} text-slate-500`} />;
};

export const BrandTag: React.FC<{ brand?: string }> = ({ brand }) => {
  const b = (brand || '').trim().toUpperCase();
  if (!b || b === 'NA' || b === 'N/A') return null;

  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
  if (b.includes('DELL')) badgeClass = 'bg-sky-50 text-[#007DB8] border-sky-200';
  else if (b.includes('APPLE')) badgeClass = 'bg-slate-900 text-white border-slate-900';
  else if (b.includes('FORTI')) badgeClass = 'bg-rose-50 text-[#EE3124] border-rose-200';
  else if (b.includes('BROTHER')) badgeClass = 'bg-blue-50 text-[#0D2EA0] border-blue-200';
  else if (b.includes('ZEBRA')) badgeClass = 'bg-zinc-900 text-white border-zinc-800';
  else if (b.includes('KYOCERA')) badgeClass = 'bg-red-50 text-[#DF0522] border-red-200';
  else if (b.includes('JABRA')) badgeClass = 'bg-amber-50 text-amber-900 border-amber-200';
  else if (b.includes('HP') || b.includes('HPE')) badgeClass = 'bg-cyan-50 text-[#0096D6] border-cyan-200';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wide border ${badgeClass}`}
    >
      {b}
    </span>
  );
};
