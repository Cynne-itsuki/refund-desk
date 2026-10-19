import assert from "node:assert/strict";
import test from "node:test";
import { ENTRANCE_FEE, PLAN_PRESETS, calculateElapsedMonths, calculateRefund, contractEndDate, countInclusiveDays } from "../app/calculator.mjs";

test("4つのプランに期間と金額が正しく設定されている", () => {
  assert.deepEqual(
    PLAN_PRESETS.map(({ name, months, amount }) => [name, months, amount]),
    [
      ["ミニマム", 3, 500_000],
      ["アドバンス", 6, 900_000],
      ["ロイヤル", 9, 1_200_000],
      ["パーフェクト", 12, 2_000_000],
    ],
  );
  assert.equal(contractEndDate("2026-01-20", 9), "2026-10-20");
});

test("日付は開始日と終了日を含めて数える", () => {
  assert.equal(countInclusiveDays("2026-01-01", "2026-06-30"), 181);
  assert.equal(countInclusiveDays("2026-01-01", "2026-01-01"), 1);
});

test("月次消化月数の端数を切り上げる", () => {
  assert.equal(calculateElapsedMonths(190, 275, 9), 7);
  assert.equal(calculateElapsedMonths(0, 275, 9), 0);
  assert.equal(calculateElapsedMonths(400, 275, 9), 9);
});

test("固定入会金を含めて3段階の提示額を算出する", () => {
  const result = calculateRefund({
    totalAmount: 1_200_000,
    paidAmount: 1_200_000,
    entranceFee: ENTRANCE_FEE,
    remainingAmount: 800_000,
    contractMonths: 6,
    contractDays: 181,
    consumedDays: 46,
    elapsedMonths: 1.52,
  });

  assert.equal(result.nonRefundableAmount, 450_000);
  assert.equal(result.monthlyConsumed, 266_667);
  assert.equal(result.monthlyRefund, 483_333);
  assert.equal(result.offerOne, 241_667);
  assert.equal(result.penalty % 100, 0);
  assert.equal(result.dailyRefund, 559_400);
});

test("返金額がマイナスでも不足額判定に使える値を返す", () => {
  const result = calculateRefund({
    totalAmount: 100_000,
    paidAmount: 10_000,
    remainingAmount: 100_000,
    contractMonths: 1,
    contractDays: 30,
    consumedDays: 30,
    elapsedMonths: 1,
  });
  assert.ok(result.monthlyRefund < 0);
  assert.ok(result.dailyRefund < 0);
});
