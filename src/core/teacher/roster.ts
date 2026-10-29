// 회화 선생님 명단의 화면 몫 · 보일 선생님 · 선생님 정하기(선생님 화면 plan 값 5, 5절 명단 자료 · 6.1 이름 변형 · C130 · C141).
// 명단(seed/teachers.json)은 서버가 읽어 넘긴다. 화면에는 TeacherView 만 보낸다 — 성격 글(personaEn) · 출처 · 영어 이름은 보내지 않는다(5절).
// 아이 이름과 같은 이름의 선생님은 그 아이에게 보이지 않는다(6.1 과 같은 이름 변형). 순수 모듈이다.
import { nameVariantsOf } from "@/core/ai/mask";
import type { Teacher } from "@/core/seed/schema/teachers";

/** 화면에 보내는 선생님 몫. 모델 · 초상 주소는 같은 출처 절대 경로(`/teachers/…`)다. */
export type TeacherView = {
  key: string;
  nameKo: string;
  introKo: string;
  traitsKo: string[];
  greetingEn: string;
  color: { room: string; accent: string };
  modelPath: string;
  portraitPath: string;
  voice: { pitch: number; prefer: string[] };
};

/** 보일 선생님을 가르는 아이 이름(profiles 의 한글 이름 · 영어 이름 · 별명). */
export type ChildNames = {
  displayName: string;
  englishName: string;
  nickname?: string | null;
};

const HANGUL = /[가-힣]/;
/** 시드 자산 경로(public/ 기준, 앞 / 없음)를 같은 출처 주소로. */
const assetUrlOf = (path: string) => `/${path}`;

export function teacherViewOf(t: Teacher): TeacherView {
  return {
    key: t.key,
    nameKo: t.nameKo,
    introKo: t.introKo,
    traitsKo: [...t.traitsKo],
    greetingEn: t.greetingEn,
    color: { room: t.color.room, accent: t.color.accent },
    modelPath: assetUrlOf(t.model.path),
    portraitPath: assetUrlOf(t.portrait.path),
    voice: { pitch: t.voice.pitch, prefer: [...t.voice.prefer] },
  };
}

/**
 * 그 아이에게 보일 선생님(명단 차례). 아이 이름 변형(6.1 — 한글 이름 · 성을 뺀 이름 · 영어 이름 · 별명 · 띄어쓰기 · 하이픈 조각)의
 * 한글 변형이 한글 이름과 같거나 영어 변형이 영어 이름과 대소문자 없이 같은 선생님을 뺀다. 다 빠지면 명단 전부다.
 */
export function visibleTeachers(
  roster: readonly Teacher[],
  child: ChildNames,
): Teacher[] {
  const variants = nameVariantsOf(child, () => false);
  const ko = new Set(variants.filter((v) => HANGUL.test(v)));
  const en = new Set(
    variants.filter((v) => !HANGUL.test(v)).map((v) => v.toLowerCase()),
  );
  const shown = roster.filter(
    (t) => !ko.has(t.nameKo) && !en.has(t.nameEn.toLowerCase()),
  );
  return shown.length > 0 ? shown : [...roster];
}

/** 차례대로 명단에 있는 첫 키의 항목(빈 키 · 명단 밖 키는 건너뜀). 없으면 undefined. */
export function resolveTeacher(
  roster: readonly Teacher[],
  ...keys: readonly (string | null | undefined)[]
): Teacher | undefined {
  for (const key of keys) {
    if (!key) continue;
    const found = roster.find((t) => t.key === key);
    if (found) return found;
  }
  return undefined;
}
