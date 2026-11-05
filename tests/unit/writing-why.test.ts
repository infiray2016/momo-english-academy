// 쓰기 1~3단계 조립 문항의 틀린 까닭 가르기(델타 spec 2026-10-29 가르치고 배우는 수업 설계 1 · 2 · 5 '정본 밖 문구' 표,
// plan 다 · 정한 것 8). 문항은 3단계 단원 1 정규 시드 쓰기 수업(가르치는 수업)을 읽는다. 시험 이름은 정본 15절 번호(AC-3d)다.
import { describe, expect, it } from "vitest";
import { WRITING_WHY_KO, writingWhyOf } from "@/core/writing/why";
import { teachSeedLessons } from "../fixtures/seed/builders";

const writing = teachSeedLessons().writing;
if (writing.content.shape !== "items") throw new Error("쓰기 1~3 수업이 아님");
const item = writing.content.items[0];
if (item?.type !== "assemble-sentence") throw new Error("조립 문항이 아님");
// 'The bedroom is pink.' — 카드는 소문자, 대문자 단추가 첫 카드를 바꾼다
const tiles = (...pieces: string[]) => ({ kind: "tiles" as const, pieces });

describe("쓰기 틀린 까닭(정한 것 8)", () => {
  it("AC-3d 쓰기 조립 문항: 맞힌 답은 까닭이 없고 낱말 차례가 다르면 시드 whyKo 다", () => {
    expect(
      writingWhyOf(item, tiles("The", "bedroom", "is", "pink", ".")),
    ).toBeUndefined();
    expect(
      writingWhyOf(item, tiles("The", "bedroom", "pink", "is", ".")),
    ).toEqual({ reason: "order", textKo: item.whyKo });
    // 차례도 대문자도 틀리면 차례(시드 whyKo)가 먼저다
    expect(
      writingWhyOf(item, tiles("pink", "the", "is", "bedroom", ".")),
    ).toEqual({ reason: "order", textKo: item.whyKo });
  });

  it("AC-3d 쓰기 조립 문항: 차례가 같고 첫 글자가 대문자가 아니면 대문자 문구, 그 밖에 마침표 자리가 다르면 마침표 문구다(설계 5 문구 그대로)", () => {
    expect(WRITING_WHY_KO).toEqual({
      capital: "첫 글자를 대문자 단추로 바꿔요.",
      period: "마침표는 맨 끝에 놓아요.",
    });
    expect(
      writingWhyOf(item, tiles("the", "bedroom", "is", "pink", ".")),
    ).toEqual({ reason: "capital", textKo: WRITING_WHY_KO.capital });
    expect(
      writingWhyOf(item, tiles("The", "bedroom", ".", "is", "pink")),
    ).toEqual({ reason: "period", textKo: WRITING_WHY_KO.period });
    expect(
      writingWhyOf(item, tiles(".", "The", "bedroom", "is", "pink")),
    ).toEqual({ reason: "period", textKo: WRITING_WHY_KO.period });
  });

  it("AC-3d 쓰기 조립 문항: 대문자와 마침표가 함께 틀리면 대문자 문구 하나만 보인다(한 화면 한 줄)", () => {
    expect(
      writingWhyOf(item, tiles("the", "bedroom", "is", ".", "pink")),
    ).toEqual({ reason: "capital", textKo: WRITING_WHY_KO.capital });
  });

  it("AC-3d 쓰기 짝 · 허용 정답이 여럿인 문항도 같은 차례로 가르고, 조립이 아닌 문항은 시드 whyKo 다", () => {
    const spare = item.spare;
    if (spare?.type !== "assemble-sentence") throw new Error("짝 없음");
    // 'My bedroom is blue.'
    expect(
      writingWhyOf(spare, tiles("my", "bedroom", "is", "blue", ".")),
    ).toEqual({ reason: "capital", textKo: WRITING_WHY_KO.capital });
    expect(
      writingWhyOf(spare, tiles("My", "is", "bedroom", "blue", ".")),
    ).toEqual({ reason: "order", textKo: spare.whyKo });
    // 허용 정답 둘: 둘째 정답의 차례로 대문자만 틀린 답
    const two = {
      type: "assemble-sentence" as const,
      accepted: ["The cup is red.", "The red cup is here."],
      whyKo: "cup 다음에 is 예요.",
    };
    expect(
      writingWhyOf(two, tiles("the", "red", "cup", "is", "here", ".")),
    ).toEqual({ reason: "capital", textKo: WRITING_WHY_KO.capital });
    // 고르기 문항은 차례 · 대문자 · 마침표가 없다 — 시드 whyKo
    expect(
      writingWhyOf(
        { type: "pick-word", answerNo: 1, whyKo: "그림을 다시 봐요." },
        { kind: "choice", no: 2 },
      ),
    ).toEqual({ reason: "order", textKo: "그림을 다시 봐요." });
    expect(
      writingWhyOf(
        { type: "pick-word", answerNo: 1 },
        { kind: "choice", no: 1 },
      ),
    ).toBeUndefined();
  });
});
