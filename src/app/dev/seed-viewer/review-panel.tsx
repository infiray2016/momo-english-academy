"use client";
// 시드 보기 칸 아래의 쓰기 칸 둘(plan-p05c '화면'): 6.3 표본 검토(사유 넷 · 문항 · 아이 눈 순회 여덟 · 메모)와
// 6.4 사람 확인(풀이 검사가 사람 확인으로 보낸 문항마다 '정답 맞음 · 고침'). 서버 모듈을 가져오지 않고 서버 액션만 부른다.
// 어른용 칸이다(4절 부모용 정보 — 작은 글자 허용, 해요체). 남기면 결과 글을 보이고 router.refresh() 로 칸을 다시 읽는다.
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState, useTransition } from "react";
import { WALKTHROUGH_QUESTIONS } from "@/core/seed/review-walkthrough";
import { type SaveResult, saveHumanCheck, saveReview } from "./actions";

type Reason = "ok" | "easy" | "hard" | "error";
type Decision = "correct" | "fixed";

const REASONS: readonly { value: Reason; label: string }[] = [
  { value: "ok", label: "알맞음" },
  { value: "easy", label: "쉬움" },
  { value: "hard", label: "어려움" },
  { value: "error", label: "오류" },
];
const DECISIONS: readonly { value: Decision; label: string }[] = [
  { value: "correct", label: "정답 맞음(시드 그대로)" },
  { value: "fixed", label: "고침(시드를 고친 뒤 풀이 검사를 다시 해요)" },
];
/** 문항 고르기의 '칸 전체' 값. */
const WHOLE_CELL = "";
/** 내용 해시는 앞 몇 자만 보인다(cell-view 머리와 같은 길이). */
const HASH_PREVIEW_LENGTH = 12;

/** 사람 확인으로 걸린 문항 하나(글은 서버 컴포넌트가 만든다). */
export type HumanCheckItem = {
  no: number;
  /** 판단(같음 · 다름 · 답이 여럿 · 답 없음). */
  verdict: string;
  solverAnswer: string;
  /** 시드 밖 허용 정답 후보. */
  candidates: string;
  seedAnswer: string;
  /** 같은 해시로 이미 남긴 확인(없으면 undefined). */
  decided?: string;
};

const BUTTON =
  "self-start rounded-md bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-50";
const SECTION =
  "flex flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-4 text-sm";

function ReviewForm({
  file,
  cell,
  itemNos,
}: {
  file: string;
  cell: string;
  itemNos: readonly number[];
}) {
  const router = useRouter();
  const id = useId();
  const [reason, setReason] = useState<Reason | null>(null);
  const [item, setItem] = useState(WHOLE_CELL);
  const [walkthrough, setWalkthrough] = useState<readonly string[]>([]);
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const toggle = (questionId: string, checked: boolean) =>
    setWalkthrough((current) =>
      checked
        ? [...current, questionId]
        : current.filter((q) => q !== questionId),
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reason === null) {
      setMessage("사유를 골라 주세요");
      return;
    }
    startTransition(async () => {
      const result: SaveResult = await saveReview({
        file,
        cell,
        itemNo: item === WHOLE_CELL ? null : Number(item),
        reason,
        memo,
        walkthroughNo: walkthrough,
      });
      setMessage(result.message);
      if (result.ok) {
        setReason(null);
        setItem(WHOLE_CELL);
        setWalkthrough([]);
        setMemo("");
        router.refresh();
      }
    });
  };

  return (
    <section aria-label="표본 검토 남기기" className={SECTION}>
      <h2 className="text-lg font-bold">표본 검토 남기기</h2>
      <p className="text-neutral-700">
        메모는 적재 때 운영 DB 의 신고 기록으로 들어가요. 아이 이름 · 개인
        정보를 적지 않아요
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-1 font-semibold">사유</legend>
          {REASONS.map((option) => (
            <label key={option.value} className="flex items-center gap-1">
              <input
                type="radio"
                name={`${id}-reason`}
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                required
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-item`} className="font-semibold">
            문항
          </label>
          <select
            id={`${id}-item`}
            value={item}
            onChange={(event) => setItem(event.target.value)}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            <option value={WHOLE_CELL}>칸 전체</option>
            {itemNos.map((no) => (
              <option key={no} value={String(no)}>
                문항 {no}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 font-semibold">
            아이 눈 순회('아니오'인 질문에만 표시해요)
          </legend>
          {WALKTHROUGH_QUESTIONS.map((question) => (
            <label key={question.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={walkthrough.includes(question.id)}
                onChange={(event) => toggle(question.id, event.target.checked)}
              />
              <span className="font-semibold">아니오</span>
              <span>{question.question}</span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-memo`} className="font-semibold">
            메모
          </label>
          <textarea
            id={`${id}-memo`}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            rows={3}
            className="rounded border border-neutral-300 p-2"
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={BUTTON}>
            남기기
          </button>
          <output aria-live="polite">{message}</output>
        </div>
      </form>
    </section>
  );
}

function HumanCheckForm({
  file,
  cell,
  contentHash,
  items,
}: {
  file: string;
  cell: string;
  contentHash: string;
  items: readonly HumanCheckItem[];
}) {
  const router = useRouter();
  const id = useId();
  const [decisions, setDecisions] = useState<ReadonlyMap<number, Decision>>(
    new Map(),
  );
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const choose = (no: number, decision: Decision) =>
    setDecisions((current) => new Map(current).set(no, decision));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chosen = [...decisions].map(([no, decision]) => ({ no, decision }));
    if (chosen.length === 0) {
      setMessage("고른 문항이 없어요");
      return;
    }
    startTransition(async () => {
      const result: SaveResult = await saveHumanCheck({
        file,
        cell,
        contentHash,
        items: chosen,
      });
      setMessage(result.message);
      if (result.ok) {
        setDecisions(new Map());
        router.refresh();
      }
    });
  };

  return (
    <>
      {items.length > 0 ? (
        <section aria-label="사람 확인 남기기" className={SECTION}>
          <h2 className="text-lg font-bold">사람 확인 남기기</h2>
          <p className="text-neutral-700">
            풀이 검사가 사람 확인으로 보낸 문항이에요. '정답 맞음'만 통과로
            세요. 화면을 연 때의 내용 해시{" "}
            <code className="font-mono">
              {contentHash.slice(0, HASH_PREVIEW_LENGTH)}
            </code>{" "}
            로 남겨요.
          </p>
          <form onSubmit={submit} className="flex flex-col gap-3">
            {items.map((item) => (
              <fieldset
                key={item.no}
                className="flex flex-col gap-2 rounded border border-neutral-200 p-3"
              >
                <legend className="px-1 font-semibold">문항 {item.no}</legend>
                <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-1">
                  <dt className="font-semibold">판단</dt>
                  <dd>{item.verdict}</dd>
                  <dt className="font-semibold">풀이 답</dt>
                  <dd>{item.solverAnswer}</dd>
                  <dt className="font-semibold">허용 정답 후보</dt>
                  <dd>{item.candidates}</dd>
                  <dt className="font-semibold">시드 정답</dt>
                  <dd>{item.seedAnswer}</dd>
                  <dt className="font-semibold">남긴 확인</dt>
                  <dd>{item.decided ?? "-"}</dd>
                </dl>
                <div className="flex flex-wrap gap-4">
                  {DECISIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="radio"
                        name={`${id}-decision-${item.no}`}
                        value={option.value}
                        checked={decisions.get(item.no) === option.value}
                        onChange={() => choose(item.no, option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button type="submit" disabled={pending} className={BUTTON}>
              사람 확인 남기기
            </button>
          </form>
        </section>
      ) : null}
      <output
        aria-label="사람 확인 결과"
        aria-live="polite"
        className="text-sm"
      >
        {message}
      </output>
    </>
  );
}

/** 칸 하나의 쓰기 칸(사람 확인 → 표본 검토). humanItems 는 칸이 사람 확인 상태일 때만 찬다. */
export function ReviewPanel({
  file,
  cell,
  contentHash,
  itemNos,
  humanItems,
}: {
  file: string;
  cell: string;
  contentHash: string;
  itemNos: readonly number[];
  humanItems: readonly HumanCheckItem[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <HumanCheckForm
        file={file}
        cell={cell}
        contentHash={contentHash}
        items={humanItems}
      />
      <ReviewForm file={file} cell={cell} itemNos={itemNos} />
    </div>
  );
}
