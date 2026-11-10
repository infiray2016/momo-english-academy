// 들은 글 귀띔(13절 C217 (1) · 정본 02-2 3.3 '기기 쪽' · 분석 task-ana-lesson-content-report 5절 안 1 · A1 · A2). 음성 인식이 맞는 답을 딴
// 낱말로 돌려주는 일(sea → 'See' · beach → 'Teach')을 선생님(AI)이 알아듣게, 앱이 들은 글의 낱말을 그 차례의 기대 낱말과 두 갈래로 맞대어 귀띔
// 목록을 낸다: (ㄱ) 동음이의어 묶음(시드 lists/homophones.json) (ㄴ) 소리가 가까운 낱말 목록(시드 lists/sound-alikes.json). 기대 낱말은 아이가
// 답하던 질문의 답 예시 내용 낱말 · 노리는 단어(answer)와 오늘 장면 낱말(scene — 단원 단어 · 카드 내용 낱말)이고, 기대 낱말이 없으면 귀띔도 없다.
// 귀띔은 회화 턴 사용자 메시지 한 줄에만 쓴다 — '말함' 셈(said.ts) · 일치율 · 평가는 이 모듈을 읽지 않는다(소리가 가까운 낱말은 대화에만). 순수
// 모듈이다.
// 귀띔은 소리에 근거가 있을 때만 낸다(13절 'C203 (1) · C217 보완 3'): 답 예시와 틀이 같고 낱말 하나만 다르다는 것만으로 내던 '답 틀' 갈래는 뺐다 —
// 'I like dolphins' 를 답 예시 낱말 whales 로 귀띔하면 선생님이 아이의 맞는 다른 답을 뒤집는다(자리 재현 반대 사례 1/7). 요청자가 정한 것은 소리가
// 닮은 낱말을 맥락으로 알아듣는 것(See · sea, Teach · beach)이고, 소리가 닮지 않은 낱말을 답 예시 낱말로 바꿔 듣는 것은 그 밖이다.
// 귀띔은 맞게 들린 말에 붙지 않게 좁힌다(13절 C217 보완 · 코드 검토 rev-content-1 I-2 · M-3): 장면 낱말 귀띔은 한두 낱말 말에만, 아이 말의 인사 ·
// 맞장구 말은 장면 낱말과 맞대지 않으며, 문장 속에서 들은 낱말이 그대로 장면 낱말이면 소리 귀띔을 내지 않는다.
import {
  ENGLISH_SAYING_MIN_WORDS,
  homophoneHeadOf,
  isChildFillerWord,
  isDontKnowSaying,
  sceneWordsOf,
} from "@/core/conversation/child-kind";
import { normalizeSpoken } from "@/core/conversation/spoken";

/** 소리가 가까운 낱말 목록의 항목(시드 lists/sound-alikes.json words — 표제어는 어휘 원형, alikes 는 그 낱말로 잘못 들리는 낱말). */
export type SoundAlikeEntry = { word: string; alikes: readonly string[] };

/** 귀띔의 갈래: 같은 소리(동음이의어 묶음) · 가까운 소리(시드 목록). 소리에 근거가 없는 갈래는 두지 않는다. */
export type HeardHintBy = "homophone" | "sound";

export type HeardHint = {
  /** 들은 낱말(소문자 — 정규화한 아이 말의 낱말). */
  heard: string;
  /** 기대 낱말(소문자 — 노리는 단어 · 답 예시에 적힌 꼴 · 장면 낱말). */
  expected: string;
  by: HeardHintBy;
  /** 기대 낱말의 출처: 아이가 답하던 질문의 답(answer) · 오늘 장면(scene). */
  from: "answer" | "scene";
};

/** 정규화한 글의 영어 낱말(소문자 · 줄임꼴은 펼친 꼴 — 막힘 무름 touchesScene 과 같은 낱말 꼴). */
function wordsOf(text: string): string[] {
  return normalizeSpoken(text)
    .split(" ")
    .filter((w) => /^[a-z]+$/.test(w));
}

/**
 * 들은 글의 귀띔 목록(들은 차례대로, 들은 낱말마다 하나). 낱말마다 그 질문의 답 낱말과 같은 소리 → 가까운 소리 → 오늘 장면 낱말과 같은 소리 →
 * 가까운 소리 차례로 처음 닿은 것 하나를 낸다. 이미 답 낱말인 들은 낱말(맞게 들린 말)은 귀띔하지 않는다. 같은 소리 묶음에도 가까운 소리 목록에도
 * 닿지 않는 낱말은 귀띔하지 않는다 — 답 예시와 틀이 같다는 것만으로는 내지 않는다('I can run' · 'I like dolphins' 는 그대로 맞는 답이다).
 * - 기능어(I · to · for …)와 인사 · 맞장구 말(hi · too · right … — child-kind isChildFillerWord)은 한두 낱말 말(ENGLISH_SAYING_MIN_WORDS 이하)일
 *   때만 답 낱말과 맞대고 장면 낱말과는 맞대지 않는다('I go to school.' 의 to · 'I like it too.' 의 too 가 two 귀띔이, 'Hi!' 가 high 귀띔이 되지
 *   않게 — 아이가 그 단원 단어를 말해 본 것이 아니다).
 * - 장면 낱말 귀띔(같은 소리 · 가까운 소리 모두)은 한두 낱말 말에만 내고, 들은 낱말이 그대로 장면 낱말이면 내지 않는다(문장 속 낱말은 아이가 정말
 *   말했을 수 있다).
 * - 답 낱말의 가까운 소리 귀띔은, 세 낱말 이상의 말에서 들은 낱말이 그대로 장면 낱말(단원 단어)이면 내지 않는다('I watch TV at home.' 의 watch 를
 *   wash 로 귀띔하지 않는다). 가까운 낱말 목록은 같은 소리 표제어끼리 함께 쓴다(sea 의 seat 은 see 에도 닿는다).
 * 모름 말 · 영어 낱말이 없는 글 · 기대 낱말이 없는 차례는 빈 목록이다.
 */
export function heardHintsOf({
  heard,
  answer,
  targets,
  scene,
  homophones,
  soundAlikes,
  lemmaOf,
}: {
  /** 아이 말(인식 글). */
  heard: string;
  /** 아이가 답하던 질문 자리의 답 예시(카드 항목 · 장면 여는 질문 · AI 질문의 답 예시). 없으면 null. */
  answer: string | null;
  /** 그 질문이 노리는 단어. */
  targets: readonly string[];
  /** 오늘 장면 낱말(단원 단어 · 카드 내용 낱말 — 소문자). */
  scene: Iterable<string>;
  homophones: readonly (readonly string[])[];
  soundAlikes: readonly SoundAlikeEntry[];
  /** 표기형 → 원형(vocab forms). */
  lemmaOf: (surface: string) => string | undefined;
}): HeardHint[] {
  const tokens = wordsOf(heard);
  if (tokens.length === 0 || isDontKnowSaying(heard)) return [];
  const lower = (w: string) => w.toLowerCase();
  const lemma = (w: string) => lemmaOf(w)?.toLowerCase() ?? w;
  // 그 질문의 답 낱말(노리는 단어 먼저, 그다음 답 예시의 내용 낱말 — 적힌 꼴 그대로)
  const direct = [
    ...new Set([
      ...targets.map(lower),
      ...(answer === null ? [] : sceneWordsOf([answer])),
    ]),
  ];
  const broad = [...new Set([...scene].map(lower))];
  if (direct.length === 0 && broad.length === 0) return [];

  const headOf = homophoneHeadOf(homophones);
  const alikes = new Map<string, ReadonlySet<string>>(
    soundAlikes.map((e) => [lower(e.word), new Set(e.alikes.map(lower))]),
  );
  const same = (a: string, b: string) => a === b || lemma(a) === lemma(b);
  const sameSound = (w: string, e: string) =>
    !same(w, e) && headOf(w) === headOf(e);
  // 같은 소리 표제어의 목록도 함께 본다(sea 의 가까운 낱말은 see 에도 닿는다 — 목록에는 한쪽에만 적는다)
  const alikesByHead = new Map<string, Set<string>>();
  for (const [word, list] of alikes) {
    const head = headOf(word);
    const merged = alikesByHead.get(head) ?? new Set<string>();
    for (const a of list) merged.add(a);
    alikesByHead.set(head, merged);
  }
  const closeSound = (w: string, e: string) => {
    if (same(w, e)) return false;
    const list =
      alikesByHead.get(headOf(e)) ?? alikesByHead.get(headOf(lemma(e)));
    return list !== undefined && (list.has(w) || list.has(lemma(w)));
  };
  const directKeys = new Set(direct.flatMap((e) => [e, lemma(e)]));
  const broadKeys = new Set(broad.flatMap((e) => [e, lemma(e)]));
  const shortSaying = tokens.length <= ENGLISH_SAYING_MIN_WORDS;

  const out: HeardHint[] = [];
  const seen = new Set<string>();
  for (const w of tokens) {
    if (seen.has(w)) continue;
    seen.add(w);
    // 맞게 들린 답 낱말
    if (directKeys.has(w) || directKeys.has(lemma(w))) continue;
    // 기능어 · 인사 · 맞장구 말: 한두 낱말 말일 때만 답 낱말과 맞대고 장면 낱말과는 맞대지 않는다
    const functionWord = isChildFillerWord(w);
    if (functionWord && !shortSaying) continue;
    // 들은 낱말이 그대로 장면 낱말(단원 단어 · 카드 낱말)인가
    const sceneWord = broadKeys.has(w) || broadKeys.has(lemma(w));
    const answerSame = direct.find((e) => sameSound(w, e));
    if (answerSame !== undefined) {
      out.push({
        heard: w,
        expected: answerSame,
        by: "homophone",
        from: "answer",
      });
      continue;
    }
    // 문장 속에서 그대로 장면 낱말인 들은 낱말은 소리 귀띔을 내지 않는다(아이가 정말 그 낱말을 말했을 수 있다)
    const answerClose =
      sceneWord && !shortSaying
        ? undefined
        : direct.find((e) => closeSound(w, e));
    if (answerClose !== undefined) {
      out.push({
        heard: w,
        expected: answerClose,
        by: "sound",
        from: "answer",
      });
      continue;
    }
    // 오늘 장면 낱말: 한두 낱말 말에만, 기능어 · 인사 · 맞장구 말 · 그대로 장면 낱말인 들은 낱말은 맞대지 않는다
    if (!shortSaying || functionWord || sceneWord) continue;
    const sceneSame = broad.find((e) => sameSound(w, e));
    if (sceneSame !== undefined) {
      out.push({
        heard: w,
        expected: sceneSame,
        by: "homophone",
        from: "scene",
      });
      continue;
    }
    const sceneClose = broad.find((e) => closeSound(w, e));
    if (sceneClose !== undefined)
      out.push({ heard: w, expected: sceneClose, by: "sound", from: "scene" });
  }
  return out;
}
