"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateRefund, countInclusiveDays, formatYen } from "./calculator.mjs";

type FormState = {
  customerName: string;
  plan: string;
  totalAmount: number;
  paidAmount: number;
  entranceFee: number;
  remainingAmount: number;
  contractMonths: number;
  startDate: string;
  endDate: string;
  cancellationDate: string;
  pauseDays: number;
  consumedDays: number;
  elapsedMonths: number;
};

const defaultForm: FormState = {
  customerName: "",
  plan: "ロイヤルプラン",
  totalAmount: 1_200_000,
  paidAmount: 1_200_000,
  entranceFee: 400_000,
  remainingAmount: 800_000,
  contractMonths: 6,
  startDate: "2026-01-01",
  endDate: "2026-06-30",
  cancellationDate: "2026-03-01",
  pauseDays: 14,
  consumedDays: 46,
  elapsedMonths: 1.52,
};

const emptyForm: FormState = {
  customerName: "",
  plan: "カスタム",
  totalAmount: 0,
  paidAmount: 0,
  entranceFee: 0,
  remainingAmount: 0,
  contractMonths: 0,
  startDate: "",
  endDate: "",
  cancellationDate: "",
  pauseDays: 0,
  consumedDays: 0,
  elapsedMonths: 0,
};

function NumberField({
  label,
  value,
  onChange,
  suffix = "円",
  hint,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  step?: number;
  min?: number;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="suffix">{suffix}</span>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell date-shell">
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function RefundValue({ value }: { value: number }) {
  if (value < 0) {
    return (
      <span className="negative-result">
        <strong>返金なし</strong>
        <small>不足額 {formatYen(Math.abs(value))}</small>
      </span>
    );
  }
  return <>{formatYen(value)}</>;
}

export default function Home() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [copied, setCopied] = useState(false);

  const contractDays = countInclusiveDays(form.startDate, form.endDate);
  const calendarConsumedDays = countInclusiveDays(form.startDate, form.cancellationDate);

  useEffect(() => {
    const nextConsumed = Math.max(0, calendarConsumedDays - form.pauseDays);
    const nextElapsed = contractDays > 0
      ? (nextConsumed / contractDays) * form.contractMonths
      : 0;
    setForm((current) => ({
      ...current,
      consumedDays: nextConsumed,
      elapsedMonths: Number(nextElapsed.toFixed(2)),
    }));
  }, [calendarConsumedDays, contractDays, form.pauseDays, form.contractMonths]);

  const result = useMemo(
    () =>
      calculateRefund({
        totalAmount: form.totalAmount,
        paidAmount: form.paidAmount,
        entranceFee: form.entranceFee,
        remainingAmount: form.remainingAmount,
        contractMonths: form.contractMonths,
        contractDays,
        consumedDays: form.consumedDays,
        elapsedMonths: form.elapsedMonths,
      }),
    [form, contractDays],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const copySummary = async () => {
    const customer = form.customerName || "（未入力）";
    const text = [
      `【中途解約 返金額試算】${customer} / ${form.plan}`,
      `契約期間：${form.startDate || "未入力"}〜${form.endDate || "未入力"}`,
      `解約申請日：${form.cancellationDate || "未入力"}（休会 ${form.pauseDays}日・消化 ${form.consumedDays}日）`,
      `返金不可能額：${formatYen(result.nonRefundableAmount)}`,
      `提示① 月次ベースの半額：${result.offerOne < 0 ? `返金なし（不足額 ${formatYen(Math.abs(result.offerOne))}）` : formatYen(result.offerOne)}`,
      `提示② 月次ベース：${result.monthlyRefund < 0 ? `返金なし（不足額 ${formatYen(Math.abs(result.monthlyRefund))}）` : formatYen(result.monthlyRefund)}`,
      `提示③ 日次ベース（最終提示）：${result.dailyRefund < 0 ? `返金なし（不足額 ${formatYen(Math.abs(result.dailyRefund))}）` : formatYen(result.dailyRefund)}`,
      `違約金：${formatYen(result.penalty)}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Refund Desk ホーム">
          <span className="brand-mark">R</span>
          <span>REFUND DESK</span>
        </a>
        <span className="status-pill"><i /> 計算ルール v1.0</span>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">MID-TERM CANCELLATION CALCULATOR</div>
        <h1>返金額を、<br /><em>迷わず正確に。</em></h1>
        <p>
          契約情報と日付を入力するだけで、月次・日次ベースの返金額と
          交渉時の3段階の提示額を自動計算します。
        </p>
        <div className="hero-rule">
          <span>計算の基準</span>
          <strong>返金不可能額 ＝ min（5万円, 契約残額 × 20%）＋ 入会金</strong>
        </div>
      </section>

      <section className="workspace" aria-label="返金額計算フォーム">
        <div className="form-panel">
          <div className="section-heading">
            <span className="section-number">01</span>
            <div>
              <h2>契約情報</h2>
              <p>契約書・支払記録に沿って入力してください</p>
            </div>
          </div>

          <div className="field-grid two-col">
            <label className="field">
              <span className="field-label">お客様名 <small>任意</small></span>
              <span className="input-shell">
                <input
                  type="text"
                  value={form.customerName}
                  placeholder="例：山田 太郎"
                  onChange={(event) => update("customerName", event.target.value)}
                />
              </span>
            </label>
            <label className="field">
              <span className="field-label">契約プラン</span>
              <span className="input-shell select-shell">
                <select value={form.plan} onChange={(event) => update("plan", event.target.value)}>
                  <option>ロイヤルプラン</option>
                  <option>カスタム</option>
                </select>
              </span>
            </label>
          </div>

          <div className="field-grid two-col">
            <NumberField label="契約金額（総額）" value={form.totalAmount} onChange={(v) => update("totalAmount", v)} />
            <NumberField label="支払済み総額" value={form.paidAmount} onChange={(v) => update("paidAmount", v)} hint="実際に受領済みの金額" />
            <NumberField label="入会金" value={form.entranceFee} onChange={(v) => update("entranceFee", v)} />
            <NumberField label="契約残額" value={form.remainingAmount} onChange={(v) => update("remainingAmount", v)} hint="返金不可能額の20%計算に使用" />
            <NumberField label="契約月数" value={form.contractMonths} onChange={(v) => update("contractMonths", v)} suffix="ヶ月" step={0.1} />
          </div>

          <div className="divider" />

          <div className="section-heading">
            <span className="section-number">02</span>
            <div>
              <h2>期間と消化状況</h2>
              <p>休会日数を除いた実消化日数を自動算出します</p>
            </div>
          </div>

          <div className="field-grid three-col dates">
            <DateField label="契約開始日" value={form.startDate} onChange={(v) => update("startDate", v)} />
            <DateField label="契約終了日" value={form.endDate} onChange={(v) => update("endDate", v)} />
            <DateField label="解約申請日" value={form.cancellationDate} onChange={(v) => update("cancellationDate", v)} />
          </div>

          <div className="field-grid three-col compact-grid">
            <NumberField label="休会日数" value={form.pauseDays} onChange={(v) => update("pauseDays", v)} suffix="日" />
            <NumberField label="実消化日数" value={form.consumedDays} onChange={(v) => update("consumedDays", v)} suffix="日" hint="開始日〜申請日 − 休会日数" />
            <NumberField label="月次消化月数" value={form.elapsedMonths} onChange={(v) => update("elapsedMonths", v)} suffix="ヶ月" step={0.01} hint="消化日数から按分（編集可）" />
          </div>

          <div className="period-strip">
            <span>契約日数 <strong>{contractDays || "—"}日</strong></span>
            <span>暦上の経過 <strong>{calendarConsumedDays || "—"}日</strong></span>
            <span>休会控除後 <strong>{form.consumedDays || 0}日</strong></span>
          </div>

          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={() => setForm(emptyForm)}>入力をクリア</button>
            <button className="text-button" type="button" onClick={() => setForm(defaultForm)}>サンプル値に戻す</button>
          </div>
        </div>

        <aside className="result-panel" aria-live="polite">
          <div className="result-kicker">CALCULATION RESULT</div>
          <div className="result-title-row">
            <div>
              <h2>返金額の試算</h2>
              <p>{form.customerName ? `${form.customerName} 様` : "お客様名 未入力"}</p>
            </div>
            <span className="plan-tag">{form.plan}</span>
          </div>

          <div className="offer-flow" aria-label="返金打診の順序">
            <div><span>1回目</span><strong>返金不可</strong></div>
            <b>→</b>
            <div><span>2回目</span><strong>10万円</strong><small>社長承認</small></div>
            <b>→</b>
            <div className="active"><span>3回目</span><strong>算出額</strong></div>
          </div>

          <div className="offer-list">
            <article className="offer-card first">
              <div className="offer-meta"><span>提示 01</span><em>最初の算出提示</em></div>
              <h3>月次ベースの半額</h3>
              <div className="amount"><RefundValue value={result.offerOne} /></div>
              <p>月次返金額 × 50%</p>
            </article>

            <article className="offer-card second">
              <div className="offer-meta"><span>提示 02</span><em>次の提示</em></div>
              <h3>月次ベース</h3>
              <div className="amount"><RefundValue value={result.monthlyRefund} /></div>
              <p>月額換算で消化分を控除</p>
            </article>

            <article className="offer-card final">
              <div className="offer-meta"><span>提示 03</span><em>FINAL OFFER</em></div>
              <h3>日次ベース</h3>
              <div className="amount"><RefundValue value={result.dailyRefund} /></div>
              <p>第12条に基づく最終提示</p>
            </article>
          </div>

          <div className="summary-grid">
            <div><span>返金不可能額</span><strong>{formatYen(result.nonRefundableAmount)}</strong></div>
            <div><span>違約金</span><strong>{formatYen(result.penalty)}</strong><small>100円未満切捨て</small></div>
          </div>

          <details className="calculation-details">
            <summary>計算過程を確認</summary>
            <dl>
              <div><dt>サービス利用料</dt><dd>{formatYen(result.serviceFee)}</dd></div>
              <div><dt>月次換算額</dt><dd>{formatYen(result.monthlyRate, true)} / 月</dd></div>
              <div><dt>月次消費額</dt><dd>{formatYen(result.monthlyConsumed)}</dd></div>
              <div><dt>1日あたり受講料</dt><dd>{formatYen(result.dailyRate, true)} / 日</dd></div>
              <div><dt>実消化日数</dt><dd>{form.consumedDays}日</dd></div>
            </dl>
          </details>

          <button className="copy-button" type="button" onClick={copySummary}>
            <span>{copied ? "✓" : "□"}</span> {copied ? "コピーしました" : "試算結果をコピー"}
          </button>
        </aside>
      </section>

      <section className="notes">
        <div className="note-icon">!</div>
        <div>
          <h2>ご利用前にご確認ください</h2>
          <p>
            本ツールは社内の返金交渉を補助する試算ツールです。最終的な返金額は契約書、支払状況、
            休会記録等と照合し、合意書を締結してから確定してください。振込手数料等は含みません。
          </p>
        </div>
      </section>

      <footer>
        <span>REFUND DESK</span>
        <p>Clear numbers. Fair settlements.</p>
      </footer>
    </main>
  );
}
