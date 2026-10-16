// 6.1 이름 바꾸기 · 가림 · AC-N4(P9 몫)(plan-p09b 증명 표). 이름은 지어낸 이름, 전화번호는 견본 꼴만 쓴다.
import { describe, expect, it } from "vitest";
import {
  speakingAnswerSpec,
  speakingPresentationSpec,
} from "@/core/ai/calls/speaking";
import { thinkoutSpec } from "@/core/ai/calls/thinkout";
import { writingFeedbackSpec } from "@/core/ai/calls/writing";
import { capabilitiesOf, requestConfigOf } from "@/core/ai/combo";
import {
  BUILTIN_CONTACT_PATTERNS,
  CONTACT_MASK,
  createMasker,
  fillName,
  nameVariantsOf,
  TWO_SYLLABLE_SURNAMES,
} from "@/core/ai/mask";
import { buildAiRequest } from "@/core/ai/request";
import { PLACEHOLDER_NAME } from "@/core/seed/structure";
import { MODEL_PRICES_FIXTURE } from "../fixtures/ai/model-prices";
import {
  SAMPLE_ADDRESS,
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_EMAIL,
  SAMPLE_NAMES,
  SAMPLE_PHONE,
  speakingAnswerSample,
  speakingPresentationSample,
  thinkoutSample,
  writingFeedbackSample,
} from "../fixtures/ai/sample-inputs";
import { testSettingValues } from "../fixtures/settings";

const noVocab = () => false;

describe("6.1 가림", () => {
  it("6.1 가림: 한글 이름 · 성을 뺀 이름 · 영어 이름의 대소문자 · 띄어쓰기 · 하이픈 변형을 {NAME} 으로 바꾼다", () => {
    const masker = createMasker({
      names: SAMPLE_NAMES,
      isVocabWord: noVocab,
      contactPatterns: [],
    });
    const cases: [string, string][] = [
      ["제 이름은 가나다예요.", `제 이름은 ${PLACEHOLDER_NAME}예요.`],
      ["나다는 사과를 좋아해요.", `${PLACEHOLDER_NAME}는 사과를 좋아해요.`],
      ["My name is Ganada.", `My name is ${PLACEHOLDER_NAME}.`],
      ["I am ganada!", `I am ${PLACEHOLDER_NAME}!`],
      ["I am GANADA", `I am ${PLACEHOLDER_NAME}`],
      ["call me Ga Nada", `call me ${PLACEHOLDER_NAME}`],
      ["call me ga-nada, ok", `call me ${PLACEHOLDER_NAME}, ok`],
    ];
    for (const [input, expected] of cases) {
      expect(masker(input).text).toBe(expected);
    }
    const result = masker("Ganada and 가나다");
    expect(result).toEqual({
      text: `${PLACEHOLDER_NAME} and ${PLACEHOLDER_NAME}`,
      names: 2,
      contacts: 0,
    });

    // 넉 자 이름의 두 글자 성
    expect(TWO_SYLLABLE_SURNAMES).toContain("남궁");
    const four = nameVariantsOf(
      { displayName: "남궁가나", englishName: "Gana", nickname: null },
      noVocab,
    );
    expect(four).toContain("남궁가나");
    expect(four).toContain("가나");
    // 두 글자 성이 아니면 넉 자 그대로만
    expect(
      nameVariantsOf(
        { displayName: "가나다라", englishName: "Ra", nickname: null },
        noVocab,
      ),
    ).toEqual(["가나다라", "Ra"]);
    // 영어 이름의 조각 · 별명, 긴 것부터, 두 글자 미만 버림
    expect(
      nameVariantsOf(
        { displayName: "가나다", englishName: "Mina-Jo K", nickname: "Minnie" },
        noVocab,
      ),
    ).toEqual(["Mina-Jo K", "Minnie", "Mina", "가나다", "나다", "Jo"]);
  });

  it("6.1 가림: vocab 단어와 같은 이름 변형은 바꾸지 않는다", () => {
    const vocab = new Set(["may", "jo"]);
    const isVocabWord = (w: string) => vocab.has(w.toLowerCase());
    const names = { displayName: "가나다", englishName: "May", nickname: null };
    expect(nameVariantsOf(names, isVocabWord)).toEqual(["가나다", "나다"]);
    const masker = createMasker({ names, isVocabWord, contactPatterns: [] });
    expect(masker("I can go in May. 가나다 here").text).toBe(
      `I can go in May. ${PLACEHOLDER_NAME} here`,
    );
  });

  it("6.1 가림: 낱말 안에 든 이름 글자(영문자 사이)는 바꾸지 않는다", () => {
    const masker = createMasker({
      names: { displayName: "가나다", englishName: "Ann", nickname: null },
      isVocabWord: noVocab,
      contactPatterns: [],
    });
    expect(masker("Anna and Joann like planning. Ann!").text).toBe(
      `Anna and Joann like planning. ${PLACEHOLDER_NAME}!`,
    );
    expect(masker("ann's bag, (Ann)").text).toBe(
      `${PLACEHOLDER_NAME}'s bag, (${PLACEHOLDER_NAME})`,
    );
    // 정규식 특수 문자가 든 이름도 글자 그대로
    const odd = createMasker({
      names: { displayName: "가나다", englishName: "O'Ne.il", nickname: null },
      isVocabWord: noVocab,
      contactPatterns: [],
    });
    expect(odd("I am o'ne.il. OxNexil").text).toBe(
      `I am ${PLACEHOLDER_NAME}. OxNexil`,
    );
  });

  it("6.1 가림: 전화번호 · 전자 우편과 시드 contact 정규식을 가린 자리로 바꾼다", () => {
    expect(CONTACT_MASK).toBe("***");
    expect(BUILTIN_CONTACT_PATTERNS.length).toBeGreaterThan(0);
    const masker = createMasker({
      names: SAMPLE_NAMES,
      isVocabWord: noVocab,
      contactPatterns: ["\\d{1,4}동 \\d{1,4}호"],
    });
    const result = masker(
      `전화는 ${SAMPLE_PHONE} 이고 ${SAMPLE_PHONE.replaceAll("-", "")}, 02.123.4567, 메일 ${SAMPLE_EMAIL}, 101동 202호 가나다`,
    );
    expect(result.text).toBe(
      `전화는 ${CONTACT_MASK} 이고 ${CONTACT_MASK}, ${CONTACT_MASK}, 메일 ${CONTACT_MASK}, ${CONTACT_MASK} ${PLACEHOLDER_NAME}`,
    );
    expect(result).toMatchObject({ names: 1, contacts: 5 });
    // 영문자에 붙여 쓴 번호도 가린다(검토 I-2, 숫자 경계)
    const glued = createMasker({
      names: SAMPLE_NAMES,
      isVocabWord: noVocab,
      contactPatterns: [],
    });
    expect(glued(`Ganada${SAMPLE_PHONE}`)).toEqual({
      text: `${PLACEHOLDER_NAME}${CONTACT_MASK}`,
      names: 1,
      contacts: 1,
    });
    expect(glued(`call${SAMPLE_PHONE.replaceAll("-", "")}`)).toEqual({
      text: `call${CONTACT_MASK}`,
      names: 0,
      contacts: 1,
    });
    // 짧은 수 · 낱말에 붙은 수 꼴은 그대로
    expect(masker("score 10 and 3.5 and 2026, 1010-1234-5678").text).toBe(
      "score 10 and 3.5 and 2026, 1010-1234-5678",
    );
  });
});

describe("6.1 화면", () => {
  it("6.1 화면: {NAME} 을 영어 이름으로 채운다", () => {
    expect(
      fillName(
        `Hi ${PLACEHOLDER_NAME}! ${PLACEHOLDER_NAME}, ready?`,
        SAMPLE_NAMES.englishName,
      ),
    ).toBe("Hi Ganada! Ganada, ready?");
    expect(fillName("no name here", "Ganada")).toBe("no name here");
  });
});

describe("AC-N4 가림", () => {
  const values = testSettingValues();
  const book = new Map(
    MODEL_PRICES_FIXTURE.models.map((m) => [
      m.model,
      { caps: capabilitiesOf(m) },
    ]),
  );
  const masker = createMasker({
    names: SAMPLE_NAMES,
    isVocabWord: noVocab,
    contactPatterns: SAMPLE_CONTACT_PATTERNS,
  });
  const leaks = (body: unknown) => {
    const text = JSON.stringify(body);
    return {
      contact: text.includes(SAMPLE_PHONE) || text.includes(SAMPLE_ADDRESS),
      email: text.includes(SAMPLE_EMAIL) || text.includes("@example.com"),
      name:
        text.includes(SAMPLE_NAMES.displayName) ||
        text.toLowerCase().includes(SAMPLE_NAMES.englishName.toLowerCase()),
      masked: text.includes(CONTACT_MASK),
    };
  };

  it("AC-N4 생각 꺼내기 요청 본문에 아이가 쓴 전화번호가 없고 가린 자리로 바뀐다", () => {
    const input = thinkoutSample(2);
    expect(JSON.stringify(input.history)).toContain(SAMPLE_PHONE);
    const { body } = buildAiRequest(thinkoutSpec, input, {
      config: requestConfigOf({ purpose: "thinkout", values, book }),
      masker,
      rules: thinkoutSpec.rulesOf(values, input),
    });
    expect(leaks(body)).toEqual({
      contact: false,
      email: false,
      name: false,
      masked: true,
    });
  });

  it("AC-N4 쓰기 첨삭 · 말하기 평가 요청 본문에도 전화번호 · 전자 우편이 없다", () => {
    const feedbackConfig = requestConfigOf({
      purpose: "writing_feedback",
      values,
      book,
    });
    for (const level of [6, 10] as const) {
      const input = writingFeedbackSample(level);
      expect(
        input.draft.includes(SAMPLE_PHONE) ||
          input.draft.includes(SAMPLE_EMAIL),
      ).toBe(true);
      const { body } = buildAiRequest(writingFeedbackSpec, input, {
        config: feedbackConfig,
        masker,
        rules: writingFeedbackSpec.rulesOf(values, input),
      });
      expect(leaks(body)).toEqual({
        contact: false,
        email: false,
        name: false,
        masked: true,
      });
    }
    const speakingConfig = requestConfigOf({
      purpose: "speaking_eval",
      values,
      book,
    });
    const answer = speakingAnswerSample(6, {
      transcript: `my number is ${SAMPLE_PHONE} and mail ${SAMPLE_EMAIL}`,
    });
    const presentation = speakingPresentationSample(10, {
      transcript: `I like winter. Call me at ${SAMPLE_PHONE}. I am Ganada.`,
    });
    for (const body of [
      buildAiRequest(speakingAnswerSpec, answer, {
        config: speakingConfig,
        masker,
        rules: {},
      }).body,
      buildAiRequest(speakingPresentationSpec, presentation, {
        config: speakingConfig,
        masker,
        rules: {},
      }).body,
    ]) {
      expect(leaks(body)).toEqual({
        contact: false,
        email: false,
        name: false,
        masked: true,
      });
    }
  });
});
