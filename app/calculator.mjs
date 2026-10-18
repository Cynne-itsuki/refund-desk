const safe = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const PLAN_PRESETS = [
  { id: "minimum", name: "ミニマム", months: 3, amount: 500_000 },
  { id: "advance", name: "アドバンス", months: 6, amount: 900_000 },
  { id: "royal", name: "ロイヤル", months: 9, amount: 1_200_000 },
  { id: "perfect", name: "パーフェクト", months: 12, amount: 2_000_000 },
];

export function contractEndDate(start, months) {
  if (!start || !months) return "";
  const date = new Date(`${start}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCMonth(date.getUTCMonth() + Number(months));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function countInclusiveDays(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return 0;
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
}

export function calculateRefund(input) {
  const totalAmount = Math.max(0, safe(input.totalAmount));
  const paidAmount = Math.max(0, safe(input.paidAmount));
  const entranceFee = Math.max(0, safe(input.entranceFee));
  const remainingAmount = Math.max(0, safe(input.remainingAmount));
  const contractMonths = Math.max(0, safe(input.contractMonths));
  const contractDays = Math.max(0, safe(input.contractDays));
  const consumedDays = Math.min(contractDays || Infinity, Math.max(0, safe(input.consumedDays)));
  const elapsedMonths = Math.min(contractMonths || Infinity, Math.max(0, safe(input.elapsedMonths)));

  const nonRefundableAmount = Math.round(Math.min(50_000, remainingAmount * 0.2) + entranceFee);
  const serviceFee = Math.max(0, totalAmount - entranceFee);
  const monthlyRate = contractMonths > 0 ? serviceFee / contractMonths : 0;
  const monthlyConsumed = Math.round(monthlyRate * elapsedMonths);
  const monthlyRefund = Math.round(paidAmount - nonRefundableAmount - monthlyConsumed);

  const dailyRate = contractDays > 0 ? (totalAmount - nonRefundableAmount) / contractDays : 0;
  const penaltyBeforeRounding = nonRefundableAmount + dailyRate * consumedDays;
  const penalty = Math.floor(Math.max(0, penaltyBeforeRounding) / 100) * 100;
  const dailyRefund = Math.round(paidAmount - penalty);
  const offerOne = Math.round(monthlyRefund * 0.5);

  return {
    nonRefundableAmount,
    serviceFee,
    monthlyRate,
    monthlyConsumed,
    monthlyRefund,
    dailyRate,
    penalty,
    dailyRefund,
    offerOne,
  };
}

export function formatYen(value, showDecimals = false) {
  const number = safe(value);
  const formatted = new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: 0,
  }).format(number);
  return `${formatted}円`;
}
