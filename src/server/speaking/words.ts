import "server-only";
// 말하기 질문 판정의 낱말 품사 표 읽기(델타 spec 2026-10-29 가르치고 배우는 수업 설계 8 '의미 검사' · plan 다 · 정한 것 7).
// 수업의 질문 · 질문 짝 · 같이 해 보기 글(questionTextsOf)에 나온 낱말의 어휘 행과 function · pronoun 행을 DB 에서 미리 거른 뒤,
// 판정 규칙의 정본인 순수 함수 meaningWordsFor 로 같은 표를 만든다(세션 서버 · 말하기 평가 서버 · 화면 자료 · 지표 스크립트가 같이 쓴다).
// 질문이 없는 수업(읽기 · 쓰기 · 질문 없는 말하기)은 DB 를 읽지 않고 빈 목록이다.
import { arrayOverlaps, inArray, or, sql } from "drizzle-orm";
import { questionTextsOf } from "@/core/speaking/judge";
import { type MeaningWord, meaningWordsFor } from "@/core/speaking/meaning";
import { normalizeForMatch } from "@/core/speech/match-rate";
import { vocab } from "@/db/schema/content";
import type { DbOrTx } from "@/server/db";

/** 표에 늘 넣는 품사(not 범위를 닫는 대명사 · 기능어 — meaningWordsFor 와 같은 갈래). */
const ALWAYS_POS = ["function", "pronoun"];

/** 그 수업 판정에 쓰는 낱말 품사 표. */
export async function meaningWordsOf(
  db: DbOrTx,
  lesson: Parameters<typeof questionTextsOf>[0],
  homophones: readonly (readonly string[])[],
): Promise<MeaningWord[]> {
  const texts = questionTextsOf(lesson);
  if (texts.length === 0) return [];
  const tokens = [
    ...new Set(texts.flatMap((text) => normalizeForMatch(text, homophones))),
  ];
  // DB 는 넓게 거르고(소문자 낱말 · 꼴 하나라도 같은 행 · 늘 넣는 품사) 정확한 규칙은 순수 함수가 정한다
  const tokenList = sql.join(
    tokens.map((t) => sql`${t}`),
    sql`, `,
  );
  const rows = await db
    .select({
      word: vocab.word,
      pos: vocab.partsOfSpeech,
      forms: vocab.forms,
    })
    .from(vocab)
    .where(
      or(
        arrayOverlaps(vocab.partsOfSpeech, ALWAYS_POS),
        inArray(sql`lower(${vocab.word})`, tokens),
        sql`exists (select 1 from jsonb_array_elements_text(case when jsonb_typeof(${vocab.forms}) = 'array' then ${vocab.forms} else '[]'::jsonb end) as f(form) where lower(f.form) in (${tokenList}))`,
      ),
    );
  return meaningWordsFor(
    texts,
    rows.map((r) => ({
      word: r.word,
      pos: r.pos,
      forms: Array.isArray(r.forms)
        ? r.forms.filter((f): f is string => typeof f === "string")
        : [],
    })),
    homophones,
  );
}
