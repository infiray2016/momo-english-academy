// 회화 앱 맞장구 목록 검사(회화 plan 정한 것 20, 시드 목록 lists/talk-wait-lines.json). 맞장구는 선생님 목소리로 모든 단계에서 읽으므로
// 금지어(6.4) · '선생님 이름'(6.4 · C130 — 명단 이름 · 옛 이름) · 물음표(아이가 답할 차례가 아니다) · 1단계 문장 길이 상한(3.6, 가장 낮은
// 단계에도 읽는다) · 겹친 줄(대소문자 무시)을 본다. DB · 파일을 읽지 않는 순수 함수다.
import { type TeacherNames, teacherNameHits } from "@/core/seed/check-teacher";
import type { SeedIssue } from "@/core/seed/issue";
import type {
  ForbiddenFile,
  TalkWaitLinesFile,
} from "@/core/seed/schema/reference";
import { SEED_FILES } from "@/core/seed/structure";
import { forbiddenHits, sentenceWords, splitSentences } from "@/core/seed/text";

export type TalkWaitLinesContext = {
  forbidden: ForbiddenFile;
  teacherNames: TeacherNames;
  /** 회화 1단계 문장 길이 상한(level-specs talk 1 의 sentenceMaxWords). 단계 규격이 없으면 길이는 보지 않는다. */
  maxWords?: number;
};

export function checkTalkWaitLines(
  file: TalkWaitLinesFile,
  ctx: TalkWaitLinesContext,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const seen = new Set<string>();
  file.lines.forEach((line, i) => {
    const problems: string[] = [];
    const key = line.trim().toLowerCase();
    if (seen.has(key)) problems.push("앞 줄과 겹친다(대소문자 무시)");
    seen.add(key);
    for (const hit of forbiddenHits(line, ctx.forbidden))
      problems.push(
        hit.kind === "pattern"
          ? `금지 정규식 ${hit.id}(${hit.category}) 에 걸린다`
          : `금지어 ${hit.match} 에 걸린다`,
      );
    const names = teacherNameHits(line, ctx.teacherNames);
    if (names.length > 0)
      problems.push(
        `선생님 이름 ${names.map((n) => `'${n}'`).join(" · ")} 이 있다(6.4 · C130)`,
      );
    if (line.includes("?"))
      problems.push("물음표가 있다(맞장구는 아이가 답할 차례가 아니다)");
    if (ctx.maxWords !== undefined)
      for (const sentence of splitSentences(line)) {
        const words = sentenceWords(sentence);
        if (words > ctx.maxWords)
          problems.push(
            `문장 낱말 ${words}개가 회화 1단계 상한 ${ctx.maxWords}(3.6)를 넘는다`,
          );
      }
    if (problems.length > 0)
      out.push({
        rule: "talk-wait-lines",
        severity: "error",
        message: `맞장구 '${line}': ${problems.join(" · ")}`,
        file: SEED_FILES.talkWaitLines,
        path: `lines.${i}`,
      });
  });
  return out;
}
