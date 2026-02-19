import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPackageLabel(unit?: string) {
  if (!unit) return 'Dus/Paket';
  const u = unit.toLowerCase();

  if (['meter', 'kabel', 'selang'].includes(u)) return 'Roll';
  if (['batang', 'pipa', 'besi'].includes(u)) return 'Ikat';
  if (['sachet', 'renceng', 'renteng'].includes(u)) return 'Renteng';
  if (['lembar', 'kertas'].includes(u)) return 'Rim';
  if (['pasang'].includes(u)) return 'Lusin'; // Or kodi?
  if (['pcs', 'buah', 'unit'].includes(u)) return 'Dus/Paket';

  return 'Dus/Paket';
}