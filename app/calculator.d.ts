export type RefundInput = {
  totalAmount: number;
  paidAmount: number;
  entranceFee: number;
  remainingAmount: number;
  contractMonths: number;
  contractDays: number;
  consumedDays: number;
  elapsedMonths: number;
};

export type PlanPreset = {
  id: string;
  name: string;
  months: number;
  amount: number;
};

export const PLAN_PRESETS: PlanPreset[];
export function contractEndDate(start: string, months: number): string;

export type RefundResult = {
  nonRefundableAmount: number;
  serviceFee: number;
  monthlyRate: number;
  monthlyConsumed: number;
  monthlyRefund: number;
  dailyRate: number;
  penalty: number;
  dailyRefund: number;
  offerOne: number;
};

export function countInclusiveDays(start: string, end: string): number;
export function calculateRefund(input: RefundInput): RefundResult;
export function formatYen(value: number, showDecimals?: boolean): string;
