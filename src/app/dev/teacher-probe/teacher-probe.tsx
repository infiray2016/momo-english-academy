"use client";

// 선생님 관찰 쪽 본체(선생님 화면 plan 값 16 — d6 몫, 컨트롤러 덧 2026-10-23). 프리뷰 배포에서 어른(요청자)이 쓰는 시험 도구이고 아이
// 화면이 아니다. (1) '이 프로필의 선생님 지우기' — 다음 회화에서 '선생님을 골라요'가 다시 나와 미나 · 리오를 둘 다 본다(C117).
// (2) '단원 바로 가기' — 영역 하나의 지금 단원을 1단계 단원 하나로 바꾼다(단원 통과 P12 전에 진짜 자료의 단원 2~5 를 써 보게).
// (3) 목소리 목록 표 · '목록 복사' — 요청자가 대화창에 붙여 넣어 리오 · 미나 목소리 순서를 정한다. 3D 재기는 d8 이 더한다.
// 서버 액션은 운영 배포에서 거부한다. 소리를 저장하지 않고 목소리 목록은 복사할 때만 기기 밖(클립보드)으로 나간다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AREA_LABEL } from "@/components/board/board";
import type { Area } from "@/core/seed/structure";
import {
  clearTeacherForPreview,
  jumpUnitForPreview,
} from "@/server/actions/teacher-preview";
import type { PreviewProbeView } from "@/server/preview";
import {
  PROBE_TEXT,
  type VoiceRow,
  voiceListText,
  voiceRowsOf,
} from "./probe-text";

type Line = { tone: "ok" | "error"; text: string } | null;

const buttonClass =
  "min-h-11 rounded-md border border-neutral-500 bg-neutral-100 px-4 py-2 text-base disabled:opacity-40";
const sectionClass =
  "space-y-3 rounded-lg border border-neutral-300 bg-white p-4";

function StatusText({ line, testId }: { line: Line; testId: string }) {
  return (
    <p
      role="status"
      data-testid={testId}
      data-tone={line?.tone}
      className={line?.tone === "error" ? "font-bold text-red-800" : ""}
    >
      {line?.text ?? ""}
    </p>
  );
}

export function TeacherProbe({
  view,
  level,
  units,
}: {
  view: PreviewProbeView | null;
  /** 단원 바로 가기의 단계(1). */
  level: number;
  /** 영역마다 고를 수 있는 단원 번호. */
  units: Record<Area, number[]>;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [teacherLine, setTeacherLine] = useState<Line>(null);
  const [jumpLine, setJumpLine] = useState<Line>(null);
  const [copyLine, setCopyLine] = useState<Line>(null);
  const [voices, setVoices] = useState<VoiceRow[]>([]);

  // 목소리 목록은 늦게 차는 기기가 있어(voiceschanged) 바뀔 때마다 다시 읽는다
  useEffect(() => {
    setReady(true);
    const synth =
      typeof window.speechSynthesis === "object"
        ? window.speechSynthesis
        : undefined;
    if (!synth) return;
    const update = () => setVoices(voiceRowsOf(synth.getVoices()));
    update();
    synth.addEventListener("voiceschanged", update);
    return () => synth.removeEventListener("voiceschanged", update);
  }, []);

  async function clear() {
    setBusy(true);
    const out = await clearTeacherForPreview().catch(() => ({ ok: false }));
    setBusy(false);
    setTeacherLine(
      out.ok
        ? { tone: "ok", text: PROBE_TEXT.cleared }
        : { tone: "error", text: PROBE_TEXT.clearFailed },
    );
    if (out.ok) router.refresh();
  }

  async function jump(area: Area, unit: number) {
    setBusy(true);
    const out = await jumpUnitForPreview({ area, unit }).catch(() => undefined);
    setBusy(false);
    if (out?.ok) {
      setJumpLine({
        tone: "ok",
        text: PROBE_TEXT.jumped(AREA_LABEL[out.area], out.level, out.unit),
      });
      router.refresh();
      return;
    }
    setJumpLine({
      tone: "error",
      text:
        out?.reason === "refused"
          ? PROBE_TEXT.jumpRefused
          : PROBE_TEXT.jumpFailed,
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        voiceListText(voices, navigator.userAgent),
      );
      setCopyLine({ tone: "ok", text: PROBE_TEXT.copied });
    } catch {
      setCopyLine({ tone: "error", text: PROBE_TEXT.copyFailed });
    }
  }

  return (
    <main
      data-testid="teacher-probe"
      data-ready={ready ? "true" : undefined}
      className="mx-auto max-w-3xl space-y-4 bg-neutral-50 p-4 text-base text-neutral-900"
    >
      <h1 className="font-bold text-xl">{PROBE_TEXT.title}</h1>
      {view === null ? (
        <p>{PROBE_TEXT.noProfile}</p>
      ) : (
        <>
          <section className={sectionClass}>
            <h2 className="font-semibold text-lg">
              {PROBE_TEXT.teacherHeading}
            </h2>
            <p data-testid="teacher-now">
              {PROBE_TEXT.teacherNow(view.teacher?.nameKo ?? null)}
            </p>
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => void clear()}
            >
              {PROBE_TEXT.clear}
            </button>
            <StatusText line={teacherLine} testId="teacher-line" />
          </section>

          <section className={sectionClass}>
            <h2 className="font-semibold text-lg">{PROBE_TEXT.jumpHeading}</h2>
            <p>{PROBE_TEXT.jumpNote}</p>
            <ul className="space-y-3">
              {view.tracks.map((track) => (
                <li
                  key={track.area}
                  data-probe-track={track.area}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="w-16 font-semibold">
                    {AREA_LABEL[track.area]}
                  </span>
                  <span data-probe-now="" className="w-32">
                    {PROBE_TEXT.trackNow(track.level, track.unit)}
                  </span>
                  {units[track.area].map((unit) => {
                    const current =
                      track.level === level && track.unit === unit;
                    return (
                      <button
                        key={unit}
                        type="button"
                        aria-label={PROBE_TEXT.jumpLabel(
                          AREA_LABEL[track.area],
                          unit,
                        )}
                        aria-current={current ? "true" : undefined}
                        className={`${buttonClass} min-w-11 ${current ? "border-2 border-neutral-900 font-bold" : ""}`}
                        disabled={busy}
                        onClick={() => void jump(track.area, unit)}
                      >
                        {unit}
                      </button>
                    );
                  })}
                </li>
              ))}
            </ul>
            <StatusText line={jumpLine} testId="jump-line" />
            <Link href="/" className="underline">
              {PROBE_TEXT.home}
            </Link>
          </section>
        </>
      )}

      <section className={sectionClass}>
        <h2 className="font-semibold text-lg">{PROBE_TEXT.voicesHeading}</h2>
        <p>{PROBE_TEXT.voicesNote}</p>
        {voices.length === 0 ? (
          <p>{PROBE_TEXT.noVoices}</p>
        ) : (
          <table data-testid="voice-table" className="w-full text-left">
            <thead>
              <tr>
                {PROBE_TEXT.voiceColumns.map((c) => (
                  <th key={c} className="pr-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {voices.map((v) => (
                <tr key={`${v.name}|${v.lang}`}>
                  <td className="pr-3">{v.name}</td>
                  <td className="pr-3">{v.lang}</td>
                  <td className="pr-3">
                    {v.isDefault ? PROBE_TEXT.yes : PROBE_TEXT.no}
                  </td>
                  <td>{v.local ? PROBE_TEXT.yes : PROBE_TEXT.no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          type="button"
          className={buttonClass}
          onClick={() => void copy()}
        >
          {PROBE_TEXT.copy}
        </button>
        <StatusText line={copyLine} testId="copy-line" />
      </section>
    </main>
  );
}
