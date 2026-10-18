"use client";

import { useMemo, useState } from "react";
import {
  PLAN_PRESETS,
  calculateRefund,
  contractEndDate,
  countInclusiveDays,
  formatYen,
} from "./calculator.mjs";

type FormState = {
  customerName: string;
  planId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  contractMonths: number;
  startDate: string;
  endDate: string;
  cancellationDate: string;
  pauseDays: number;
  consumedDays: number;
  elapsedMonths: number;
};

type ActionStep = {
  id: string;
  short: string;
  title: string;
  timing: string;
  task: string;
  sendLabel: string;
  message: string;
  caution?: string;
};

const defaultForm: FormState = {
  customerName: "",
  planId: "royal",
  totalAmount: 1_200_000,
  paidAmount: 1_200_000,
  remainingAmount: 1_200_000,
  contractMonths: 9,
  startDate: "2026-01-01",
  endDate: "2026-09-30",
  cancellationDate: "2026-03-01",
  pauseDays: 14,
  consumedDays: 46,
  elapsedMonths: 1.52,
};

function withDerivedPeriod(current: FormState, changes: Partial<FormState>): FormState {
  const next = { ...current, ...changes };
  const nextContractDays = countInclusiveDays(next.startDate, next.endDate);
  const calendarDays = countInclusiveDays(next.startDate, next.cancellationDate);
  const consumedDays = Math.max(0, calendarDays - next.pauseDays);
  const elapsedMonths = nextContractDays > 0
    ? (consumedDays / nextContractDays) * next.contractMonths
    : 0;

  return {
    ...next,
    consumedDays,
    elapsedMonths: Number(elapsedMonths.toFixed(2)),
  };
}

function NumberField({
  label,
  value,
  onChange,
  suffix = "円",
  hint,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  step?: number;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min="0"
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="suffix">{suffix}</span>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function DateField({ label, value, onChange, readOnly = false }: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className={`input-shell date-shell ${readOnly ? "is-readonly" : ""}`}>
        <input
          type="date"
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
        />
      </span>
    </label>
  );
}

function RefundValue({ value }: { value: number }) {
  if (value < 0) {
    return <span className="negative-result"><strong>返金なし</strong><small>不足額 {formatYen(Math.abs(value))}</small></span>;
  }
  return <>{formatYen(value)}</>;
}

function asRefundText(value: number) {
  return value < 0 ? `返金なし（不足額 ${formatYen(Math.abs(value))}）` : formatYen(value);
}

export default function Home() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [selfReasonConfirmed, setSelfReasonConfirmed] = useState(false);
  const [currentAction, setCurrentAction] = useState(0);
  const [acceptedOffer, setAcceptedOffer] = useState<1 | 2 | 3>(1);
  const [copied, setCopied] = useState<string | null>(null);

  const selectedPlan = PLAN_PRESETS.find((plan) => plan.id === form.planId) ?? PLAN_PRESETS[2];
  const contractDays = countInclusiveDays(form.startDate, form.endDate);
  const calendarConsumedDays = countInclusiveDays(form.startDate, form.cancellationDate);

  const result = useMemo(() => calculateRefund({
    totalAmount: form.totalAmount,
    paidAmount: form.paidAmount,
    entranceFee: 0,
    remainingAmount: form.remainingAmount,
    contractMonths: form.contractMonths,
    contractDays,
    consumedDays: form.consumedDays,
    elapsedMonths: form.elapsedMonths,
  }), [form, contractDays]);

  const agreementAmount = acceptedOffer === 1
    ? result.offerOne
    : acceptedOffer === 2
      ? result.monthlyRefund
      : result.dailyRefund;

  const actions = useMemo<ActionStep[]>(() => {
    const name = form.customerName.trim() ? `${form.customerName.trim()}様` : "お客様";
    return [
      {
        id: "hearing",
        short: "受付",
        title: "解約理由を確認する",
        timing: "退会希望の連絡を受けた直後",
        task: "理由をヒアリングし、自己都合による解約かを確認します。まだ金額は提示しません。",
        sendLabel: "確認メッセージ",
        message: `${name}\n\n退会のご希望について承りました。状況を正確に確認するため、差し支えない範囲で退会をご希望される理由をお聞かせいただけますでしょうか。\n\n内容を確認のうえ、今後のお手続きをご案内いたします。`,
        caution: "自己都合と確認できない場合は、この計算フローを進めず運営へ確認してください。",
      },
      {
        id: "no-refund",
        short: "1回目",
        title: "返金不可を案内する",
        timing: "自己都合による解約と確認できたとき",
        task: "契約に基づき、まず返金不可である旨を1回案内します。",
        sendLabel: "返金不可の案内文",
        message: `${name}\n\n解約のお申し出について確認いたしました。今回のお申し出は自己都合による中途解約に該当するため、契約内容に基づき返金はいたしかねます。\n\nご不明点がございましたらお知らせください。`,
      },
      {
        id: "special-refund",
        short: "2回目",
        title: "10万円返金を提案する",
        timing: "返金不可の案内に納得いただけないとき",
        task: "必ず社長承認を取得してから、特例として10万円の返金を提案します。",
        sendLabel: "10万円返金の提案文",
        message: `${name}\n\n社内で改めて検討した結果、特例として100,000円の返金をご提案いたします。\n\nこちらの内容でご了承いただける場合は、合意書のお手続きについてご案内いたします。ご確認をお願いいたします。`,
        caution: "送信前に社長承認が取れていることを確認してください。",
      },
      {
        id: "half-monthly",
        short: "提示①",
        title: "月次ベースの半額を提示する",
        timing: "10万円の提案にも納得いただけないとき",
        task: `計算結果の最初の提示として ${asRefundText(result.offerOne)} を案内します。`,
        sendLabel: "提示①の送信文",
        message: `${name}\n\n契約内容とこれまでのご利用状況を確認し、返金額として${asRefundText(result.offerOne)}をご提案いたします。\n\nこちらの内容でご了承いただけるか、ご確認をお願いいたします。`,
      },
      {
        id: "monthly",
        short: "提示②",
        title: "月次ベースを提示する",
        timing: "提示①に納得いただけないとき",
        task: `次の提示として、月次ベースの ${asRefundText(result.monthlyRefund)} を案内します。`,
        sendLabel: "提示②の送信文",
        message: `${name}\n\n再度検討し、月次ベースで算出した返金額${asRefundText(result.monthlyRefund)}をご提案いたします。\n\nこちらの内容でご了承いただけるか、ご確認をお願いいたします。`,
      },
      {
        id: "daily",
        short: "最終提示",
        title: "日次ベースを最終提示する",
        timing: "提示②にも納得いただけないとき",
        task: `契約第12条の日次計算による ${asRefundText(result.dailyRefund)} を最終提示します。`,
        sendLabel: "最終提示の送信文",
        message: `${name}\n\n契約第12条に基づき日次で算出した結果、返金額は${asRefundText(result.dailyRefund)}となります。こちらが当社からの最終提示です。\n\nご了承いただける場合は、合意書のお手続きへ進めさせていただきます。`,
        caution: "この提示でも合意に至らない場合は、追加提案をせず運営の高橋さんへ委譲してください。",
      },
      {
        id: "agreement",
        short: "合意",
        title: "合意書を送付する",
        timing: "いずれかの提示額に了承いただけたとき",
        task: `合意額 ${asRefundText(agreementAmount)} を明記した合意書を送付し、締結を確認します。`,
        sendLabel: "合意書送付の案内文",
        message: `${name}\n\n返金額${asRefundText(agreementAmount)}でのご同意ありがとうございます。\n\nお手続きを進めるため、解約日・返金額・振込先・振込期日を記載した合意書をお送りします。内容をご確認のうえ、ご締結をお願いいたします。`,
        caution: "口頭合意で終了せず、必ず合意書の締結を確認してください。",
      },
      {
        id: "payment",
        short: "返金",
        title: "返金を実行・完了連絡する",
        timing: "合意書の締結を確認したあと",
        task: "合意額を振り込み、振込完了の連絡を送ります。",
        sendLabel: "返金完了の案内文",
        message: `${name}\n\n合意書のご締結ありがとうございました。本日、合意内容に基づき${asRefundText(agreementAmount)}の返金手続きを行いました。\n\n着金まで今しばらくお待ちください。ご確認のほどよろしくお願いいたします。`,
        caution: "振込手数料は生徒側負担です。振込記録を案件資料に保存してください。",
      },
    ];
  }, [agreementAmount, form.customerName, result.dailyRefund, result.monthlyRefund, result.offerOne]);

  const activeAction = actions[currentAction];

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyPlan = (plan: (typeof PLAN_PRESETS)[number]) => {
    setForm((current) => withDerivedPeriod(current, {
      planId: plan.id,
      totalAmount: plan.amount,
      paidAmount: plan.amount,
      remainingAmount: plan.amount,
      contractMonths: plan.months,
      endDate: contractEndDate(current.startDate, plan.months),
    }));
  };

  const updateStartDate = (value: string) => {
    setForm((current) => withDerivedPeriod(current, {
      startDate: value,
      endDate: contractEndDate(value, current.contractMonths),
    }));
  };

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const copySummary = () => copyText("summary", [
    `【中途解約 返金額試算】${form.customerName || "（未入力）"} / ${selectedPlan.name}`,
    `契約期間：${form.startDate}〜${form.endDate}`,
    `休会 ${form.pauseDays}日・消化 ${form.consumedDays}日`,
    `提示① 月次ベースの半額：${asRefundText(result.offerOne)}`,
    `提示② 月次ベース：${asRefundText(result.monthlyRefund)}`,
    `提示③ 日次ベース（最終）：${asRefundText(result.dailyRefund)}`,
  ].join("\n"));

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Refund Desk ホーム"><span className="brand-mark">R</span><span>REFUND DESK</span></a>
        <a className="guide-link" href="#action-guide"><span>●</span> 対応ナビへ</a>
      </header>

      <section className="hero" id="top">
        <div>
          <div className="eyebrow">REFUND CALCULATION & ACTION GUIDE</div>
          <h1>計算から、<br /><em>次に送る文面まで。</em></h1>
          <p>返金額を出すだけで終わらない。契約情報を入力すると、打診の順番・送るタイミング・そのまま使える文面まで案内します。</p>
        </div>
        <div className="hero-steps" aria-label="対応の流れ">
          <span>01 理由確認</span><b>→</b><span>02 段階提示</span><b>→</b><span>03 合意書</span><b>→</b><span>04 返金</span>
        </div>
      </section>

      <section className="workspace" aria-label="返金額計算フォーム">
        <div className="form-panel">
          <div className="section-heading"><span className="section-number">01</span><div><h2>プランを選択</h2><p>期間と参考金額を仮入力します。金額はあとから変更できます</p></div></div>
          <div className="plan-grid">
            {PLAN_PRESETS.map((plan) => (
              <button key={plan.id} type="button" className={`plan-card ${form.planId === plan.id ? "selected" : ""}`} onClick={() => applyPlan(plan)}>
                <span className="plan-check">{form.planId === plan.id ? "✓" : ""}</span>
                <strong>{plan.name}</strong>
                <small>{plan.months}ヶ月・参考額</small>
                <b>{formatYen(plan.amount)}</b>
              </button>
            ))}
          </div>

          <div className="section-divider" />
          <div className="section-heading"><span className="section-number">02</span><div><h2>契約・支払情報</h2><p>契約書と支払記録に沿って入力してください</p></div></div>
          <div className="field-grid two-col">
            <label className="field"><span className="field-label">お客様名 <small>任意</small></span><span className="input-shell"><input type="text" value={form.customerName} placeholder="例：山田 太郎" onChange={(event) => update("customerName", event.target.value)} /></span></label>
            <NumberField label="契約金額" value={form.totalAmount} onChange={(v) => update("totalAmount", v)} hint="プランの参考額を自動入力。実際の契約金額に変更できます" />
            <NumberField label="支払済み総額" value={form.paidAmount} onChange={(v) => update("paidAmount", v)} hint="実際に受領済みの金額" />
            <NumberField label="契約残額" value={form.remainingAmount} onChange={(v) => update("remainingAmount", v)} hint="返金不可能額の20%計算に使用" />
          </div>

          <div className="section-divider" />
          <div className="section-heading"><span className="section-number">03</span><div><h2>期間と消化状況</h2><p>休会日数を差し引いて自動計算します</p></div></div>
          <div className="field-grid three-col dates">
            <DateField label="契約開始日" value={form.startDate} onChange={updateStartDate} />
            <DateField label="契約終了日（自動）" value={form.endDate} readOnly />
            <DateField label="解約申請日" value={form.cancellationDate} onChange={(v) => setForm((current) => withDerivedPeriod(current, { cancellationDate: v }))} />
          </div>
          <div className="field-grid three-col compact-grid">
            <NumberField label="休会日数" value={form.pauseDays} onChange={(v) => setForm((current) => withDerivedPeriod(current, { pauseDays: v }))} suffix="日" />
            <NumberField label="実消化日数" value={form.consumedDays} onChange={(v) => update("consumedDays", v)} suffix="日" hint="開始日〜申請日 − 休会日数" />
            <NumberField label="月次消化月数" value={form.elapsedMonths} onChange={(v) => update("elapsedMonths", v)} suffix="ヶ月" step={0.01} hint="按分値。必要に応じて編集可" />
          </div>
          <div className="period-strip"><span>契約日数 <strong>{contractDays || "—"}日</strong></span><span>暦上の経過 <strong>{calendarConsumedDays || "—"}日</strong></span><span>休会控除後 <strong>{form.consumedDays}日</strong></span></div>

          <label className={`confirmation ${selfReasonConfirmed ? "checked" : ""}`}>
            <input type="checkbox" checked={selfReasonConfirmed} onChange={(event) => setSelfReasonConfirmed(event.target.checked)} />
            <span className="custom-check">{selfReasonConfirmed ? "✓" : ""}</span>
            <span><strong>自己都合による解約であることを確認済み</strong><small>未確認の場合は、返金提示をせず先に理由を確認してください</small></span>
          </label>
        </div>

        <aside className="result-panel" aria-live="polite">
          <div className="result-kicker">CALCULATION RESULT</div>
          <div className="result-title-row"><div><h2>3段階の提示額</h2><p>{form.customerName ? `${form.customerName} 様` : "お客様名 未入力"}</p></div><span className="plan-tag">{selectedPlan.name} / {form.contractMonths}ヶ月</span></div>
          {!selfReasonConfirmed && <div className="result-alert"><span>!</span><p><strong>まだ金額を提示しないでください</strong>まず自己都合による解約かを確認します。</p></div>}

          <div className="offer-list">
            {[
              { id: 1 as const, label: "提示 01", title: "月次ベースの半額", value: result.offerOne, note: "3回目の打診・最初の提示" },
              { id: 2 as const, label: "提示 02", title: "月次ベース", value: result.monthlyRefund, note: "提示①で納得しない場合" },
              { id: 3 as const, label: "最終提示", title: "日次ベース", value: result.dailyRefund, note: "提示②でも納得しない場合" },
            ].map((offer) => (
              <article key={offer.id} className={`offer-card ${offer.id === 3 ? "final" : ""} ${acceptedOffer === offer.id ? "accepted" : ""}`}>
                <div className="offer-copy"><span>{offer.label}</span><h3>{offer.title}</h3><div className="amount"><RefundValue value={offer.value} /></div><p>{offer.note}</p></div>
                <button type="button" onClick={() => setAcceptedOffer(offer.id)}>{acceptedOffer === offer.id ? "✓ 合意額" : "合意額に設定"}</button>
              </article>
            ))}
          </div>

          <div className="summary-grid"><div><span>返金不可能額</span><strong>{formatYen(result.nonRefundableAmount)}</strong></div><div><span>違約金</span><strong>{formatYen(result.penalty)}</strong><small>100円未満切捨て</small></div></div>
          <details className="calculation-details"><summary>計算過程を確認</summary><dl><div><dt>サービス利用料</dt><dd>{formatYen(result.serviceFee)}</dd></div><div><dt>月次換算額</dt><dd>{formatYen(result.monthlyRate, true)} / 月</dd></div><div><dt>月次消費額</dt><dd>{formatYen(result.monthlyConsumed)}</dd></div><div><dt>1日あたり受講料</dt><dd>{formatYen(result.dailyRate, true)} / 日</dd></div></dl></details>
          <button className="copy-button" type="button" onClick={copySummary}>{copied === "summary" ? "✓ コピーしました" : "試算結果をコピー"}</button>

          <a className="next-action-preview" href="#action-guide">
            <span>いまの対応</span><strong>{activeAction.short}｜{activeAction.title}</strong><small>{activeAction.timing}</small><b>文面を確認する ↓</b>
          </a>
        </aside>
      </section>

      <section className="action-guide" id="action-guide">
        <div className="action-intro"><div className="eyebrow">ACTION PLAYBOOK</div><h2>いつ・何を送るか、<br />この順番で進める。</h2><p>左のステップを選ぶと、その場面で行うことと送信文が表示されます。対応が終わったら「次の対応へ」で進めてください。</p></div>
        <div className="playbook">
          <nav className="step-nav" aria-label="返金対応ステップ">
            {actions.map((action, index) => (
              <button key={action.id} type="button" className={`${currentAction === index ? "active" : ""} ${currentAction > index ? "done" : ""}`} onClick={() => setCurrentAction(index)}>
                <span>{currentAction > index ? "✓" : String(index + 1).padStart(2, "0")}</span><div><small>{action.short}</small><strong>{action.title}</strong></div>
              </button>
            ))}
          </nav>

          <article className="action-card">
            <div className="action-card-head"><span>STEP {String(currentAction + 1).padStart(2, "0")}</span><em>{activeAction.short}</em></div>
            <h3>{activeAction.title}</h3>
            <div className="when-box"><span>このタイミング</span><strong>{activeAction.timing}</strong></div>
            <div className="task-box"><span>やること</span><p>{activeAction.task}</p></div>
            {activeAction.caution && <div className="caution-box"><b>!</b><p>{activeAction.caution}</p></div>}
            <div className="message-box"><div><span>送る文面</span><strong>{activeAction.sendLabel}</strong></div><pre>{activeAction.message}</pre><button type="button" onClick={() => copyText(activeAction.id, activeAction.message)}>{copied === activeAction.id ? "✓ コピーしました" : "文面をコピー"}</button></div>
            <div className="step-controls"><button type="button" disabled={currentAction === 0} onClick={() => setCurrentAction((value) => Math.max(0, value - 1))}>← 前の対応</button><button className="next" type="button" disabled={currentAction === actions.length - 1} onClick={() => setCurrentAction((value) => Math.min(actions.length - 1, value + 1))}>対応完了・次へ →</button></div>
          </article>
        </div>
      </section>

      <section className="notes"><div className="note-icon">!</div><div><h2>最終確認</h2><p>本ツールは社内の返金交渉を補助する試算ツールです。最終的な返金額は契約書、支払状況、休会記録と照合してください。合意後は必ず合意書を締結し、締結確認後に返金を実行してください。</p></div></section>
      <footer><span>REFUND DESK</span><p>Calculate. Communicate. Close with clarity.</p></footer>
    </main>
  );
}
