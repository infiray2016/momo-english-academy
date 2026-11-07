// 모든 e2e 가 가져올 test(plan-p02 '바뀌는 파일' P2b, 다-4). 가짜 Web Speech 를 addInitScript 로 넣는다.
// 대본은 test.use({ speechScript: loadSpeechScript("…") }) 로 바꾼다. 기본은 default-ok.
// 접근 쿠키 준비(plan-p03b 공용 변경 5): 모든 e2e 가 유효한 가족 접근 쿠키를 갖고 시작한다(proxy 가 /dev/* 도 막는다, C57).
// WebGL(선생님 화면 plan 값 13 · 9절 'WebGL 없는 CI'): 선택 webgl 기본 off — 문맥의 모든 쪽(page · speechPage)에서 캔버스의 webgl ·
// webgl2 · experimental-webgl 맥락이 null 이라 선생님 창이 늘 초상(대신 표시 길)이다. 3D 프로젝트만 on(d9).
// 버리는 듣기(iPad 버리는 듣기 plan 정한 것 7): 선택 discardMode 는 기본이 없고, 값이 있으면 시험마다 집 전체 speech.discard_mode 를 그
// 값으로 바꿨다가 되돌린다(withHouseholdSetting). e2e DB 는 TEST_SETTINGS(ios)로 뜨고 기기도 iPad 꼴이라, 그대로면 버림 객체가 기존 회화
// e2e 의 대본을 먼저 가져간다. 그래서 본 구성(playwright.config use)이 'off' 를 두고 talk-discard 만 test.use({ discardMode: "ios" }) 다.
// DB 가 없는 e2e-local 구성은 값을 두지 않는다(값이 없으면 DB 에 닿지 않는다).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type BrowserContext,
  test as base,
  expect,
  type Page,
} from "@playwright/test";
import {
  DISCARD_MODE_KEY,
  type DiscardMode,
} from "../../src/core/speech/discard-settings";
import {
  type SpeechSettings,
  speechSettingsFrom,
} from "../../src/core/speech/listen";
import {
  parseSpeechScript,
  type SpeechScript,
} from "../../src/core/speech/script";
import { installFakeWebSpeech } from "../../src/lib/speech/fake-web-speech";
import { addAccessCookie } from "./access-cookie";

const SPEECH_FIXTURES = join(__dirname, "..", "fixtures", "speech");

/** tests/fixtures/speech/scripts/<이름>.json 을 대본 규격으로 읽는다. */
export function loadSpeechScript(name: string): SpeechScript {
  return parseSpeechScript(
    JSON.parse(
      readFileSync(join(SPEECH_FIXTURES, "scripts", `${name}.json`), "utf8"),
    ),
  );
}

/** 시험용 음성 설정(12절 기본값, tests/fixtures/speech/settings.json). */
export function loadSpeechSettings(): SpeechSettings {
  const raw = JSON.parse(
    readFileSync(join(SPEECH_FIXTURES, "settings.json"), "utf8"),
  ) as Record<string, unknown>;
  return speechSettingsFrom((key) => raw[key]);
}

/** 쪽 시작 스크립트: 캔버스의 WebGL 맥락을 null 로(그 밖 맥락 — 2d 등 — 은 그대로). 밖 이름을 쓰지 않는다(Playwright 가 함수 글을 옮김). */
export function disableWebgl(): void {
  const original = HTMLCanvasElement.prototype.getContext;
  const blocked = ["webgl", "webgl2", "experimental-webgl"];
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    type: string,
    ...rest: unknown[]
  ) {
    if (blocked.includes(type)) return null;
    return (original as (...args: unknown[]) => unknown).call(
      this,
      type,
      ...rest,
    );
  } as typeof original;
}

export type Webgl = "off" | "on";

export type E2eOptions = {
  speechScript: SpeechScript;
  webgl: Webgl;
  /** 시험 동안의 speech.discard_mode(없으면 DB 를 건드리지 않는다). */
  discardMode: DiscardMode | undefined;
};

export const test = base.extend<E2eOptions>({
  speechScript: [loadSpeechScript("default-ok"), { option: true }],
  webgl: ["off", { option: true }],
  discardMode: [undefined, { option: true }],
  context: async ({ context, baseURL, webgl, discardMode }, use) => {
    await addAccessCookie(context, baseURL);
    if (webgl === "off") await context.addInitScript(disableWebgl);
    if (discardMode === undefined) {
      await use(context);
      return;
    }
    // DB 도우미는 값이 있을 때만 불러온다(e2e-local 은 이 모듈을 가져오되 DB 연결 모듈을 싣지 않는다)
    const { withHouseholdSetting } = await import("./db");
    await withHouseholdSetting(DISCARD_MODE_KEY, discardMode, () =>
      use(context),
    );
  },
  page: async ({ page, speechScript }, use) => {
    await page.addInitScript(installFakeWebSpeech, speechScript);
    await use(page);
  },
});

/**
 * 그 대본의 가짜 음성을 넣은 새 쪽(검토 review-p10-fix2-code N-2). 대본은 이름(tests/fixtures/speech/scripts/<이름>.json)
 * 또는 시험 안에서 만든 대본이다. 기본 page 와 달리 대본을 쪽마다 바꿀 때 쓴다.
 */
export async function speechPage(
  context: BrowserContext,
  script: SpeechScript | string,
): Promise<Page> {
  const page = await context.newPage();
  await page.addInitScript(
    installFakeWebSpeech,
    typeof script === "string" ? loadSpeechScript(script) : script,
  );
  return page;
}

export { expect };
