// 회화 선생님 목소리 고르기(plan 회화-선생님-캐릭터 값 12, AC-19j). DB · 브라우저 없는 순수 함수.
// 명단 voice.prefer(이름 조각 차례)로 고르고, 맞는 것이 없으면 undefined — 부르는 쪽(음성 접점)이 pickVoice 로 간다.

const normalizeLang = (lang: string) => lang.toLowerCase().replaceAll("_", "-");

/**
 * lang 이 같은(소문자 · '_' 를 '-' 로) 목소리 가운데, prefer 조각 차례로 이름에 그 조각(대소문자 무시)이 든 첫 목소리.
 * 언어 앞부분(en)만 같은 목소리는 고르지 않는다. 빈 조각은 건너뛴다(아무 목소리에나 맞지 않게).
 */
export function preferredVoice<V extends { name: string; lang: string }>(
  voices: readonly V[],
  lang: string,
  prefer: readonly string[],
): V | undefined {
  const want = normalizeLang(lang);
  const same = voices.filter((v) => normalizeLang(v.lang) === want);
  for (const piece of prefer) {
    const needle = piece.toLowerCase();
    if (needle === "") continue;
    const found = same.find((v) => v.name.toLowerCase().includes(needle));
    if (found !== undefined) return found;
  }
  return undefined;
}
