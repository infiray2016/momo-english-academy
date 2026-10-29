// 아이 화면 글의 선생님 이름 자리(선생님 화면 plan 값 9, 4절 머리 문단 '[이름] · 조사' · 3.3 · 7절 · 8절 · C123 · C130 (7) · AC-19c).
// 조사 고르기는 이름 끝 받침으로 짝(이/가 · 은/는 · 와/과 · 을/를 · 아/야)을 고르고, 문구 표는 이름이 없으면 '선생님'이다.
import { describe, expect, it } from "vitest";
import {
  josa,
  TEACHER_FALLBACK_NAME,
  TEACHER_TEXT,
  teacherNameOf,
} from "@/core/teacher/name";

describe("조사 고르기(4절 머리 문단)", () => {
  it("AC-19c 조사 고르기: 받침 없는 이름(미나 · 리오)은 가 · 는 · 와 · 를 · 야, 받침 있는 이름(준 · 선생님)은 이 · 은 · 과 · 을 · 아다", () => {
    for (const name of ["미나", "리오"]) {
      expect(josa(name, "이/가")).toBe("가");
      expect(josa(name, "은/는")).toBe("는");
      expect(josa(name, "와/과")).toBe("와");
      expect(josa(name, "을/를")).toBe("를");
      expect(josa(name, "아/야")).toBe("야");
    }
    for (const name of ["준", "선생님"]) {
      expect(josa(name, "이/가")).toBe("이");
      expect(josa(name, "은/는")).toBe("은");
      expect(josa(name, "와/과")).toBe("과");
      expect(josa(name, "을/를")).toBe("을");
      expect(josa(name, "아/야")).toBe("아");
    }
  });

  it("AC-19c 조사 고르기: 끝 글자가 한글 음절이 아니면(영어 · 빈 글) 받침 없는 쪽이다", () => {
    expect(josa("Mina", "이/가")).toBe("가");
    expect(josa("", "은/는")).toBe("는");
    // 한글 음절 범위의 처음 · 끝(가 · 힣)
    expect(josa("가", "을/를")).toBe("를");
    expect(josa("힣", "을/를")).toBe("을");
  });

  it("AC-19c 이름 자리: 이름이 없거나 빈 글이면 '선생님'이고 있으면 앞뒤 빈칸을 뺀 그 이름이다", () => {
    expect(TEACHER_FALLBACK_NAME).toBe("선생님");
    expect(teacherNameOf(undefined)).toBe("선생님");
    expect(teacherNameOf(null)).toBe("선생님");
    expect(teacherNameOf("  ")).toBe("선생님");
    expect(teacherNameOf(" 미나 ")).toBe("미나");
  });
});

describe("문구 표(값 9)", () => {
  it("AC-19c 문구 표: 미나 · 리오 · 준 · 고르기 전마다 맞는 조사로 나온다", () => {
    expect(TEACHER_TEXT.thinking("준")).toBe("준이 생각하고 있어요");
    expect(TEACHER_TEXT.thinking("미나")).toBe("미나가 생각하고 있어요");
    expect(TEACHER_TEXT.thinking(undefined)).toBe("선생님이 생각하고 있어요");
    expect(TEACHER_TEXT.stopConfirm("리오")).toBe(
      "리오와 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요",
    );
    expect(TEACHER_TEXT.stopConfirm("준")).toBe(
      "준과 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요",
    );
    expect(TEACHER_TEXT.aiRest(undefined)).toBe(
      "선생님이 잠깐 쉬어요. 다른 공부를 해 볼까요",
    );
    expect(TEACHER_TEXT.aiRest("미나")).toBe(
      "미나가 잠깐 쉬어요. 다른 공부를 해 볼까요",
    );
    expect(TEACHER_TEXT.notHeard("미나")).toBe(
      "미나에게 잘 안 들렸어요. 조금 더 크게 말해 볼까요",
    );
    expect(TEACHER_TEXT.notHeard(null)).toBe(
      "선생님에게 잘 안 들렸어요. 조금 더 크게 말해 볼까요",
    );
    expect(TEACHER_TEXT.replay("미나")).toBe("미나 말 다시 듣기");
    expect(TEACHER_TEXT.replay(undefined)).toBe("선생님 말 다시 듣기");
    expect(TEACHER_TEXT.followGuide("미나")).toBe("미나를 따라 말해 봐요");
    expect(TEACHER_TEXT.followGuide("준")).toBe("준을 따라 말해 봐요");
    expect(TEACHER_TEXT.friendship("리오")).toBe("리오와 친한 정도");
    expect(TEACHER_TEXT.promise("준")).toBe(
      "준은 집 · 학교 · 전화번호를 묻지 않아요 · 부모님도 볼 수 있어요",
    );
    expect(TEACHER_TEXT.promise("미나")).toBe(
      "미나는 집 · 학교 · 전화번호를 묻지 않아요 · 부모님도 볼 수 있어요",
    );
    expect(TEACHER_TEXT.promiseLabel).toBe("선생님의 약속");
  });

  it("AC-16c 처음 회화 안내는 3.3 글 그대로 다섯 줄이고 이름 자리는 조사를 맞춘다", () => {
    expect(TEACHER_TEXT.intro("미나")).toEqual([
      "미나는 앱 속 AI 선생님이에요.",
      "미나는 오늘 이야기에 나오는 것만 물어요.",
      "집 주소, 학교 이름, 전화번호는 묻지 않아요.",
      "미나는 지난 이야기를 조금 기억해요.",
      "미나와 나눈 이야기는 부모님도 볼 수 있어요",
    ]);
    expect(TEACHER_TEXT.intro("준").join(" ")).toBe(
      "준은 앱 속 AI 선생님이에요. 준은 오늘 이야기에 나오는 것만 물어요. 집 주소, 학교 이름, 전화번호는 묻지 않아요. 준은 지난 이야기를 조금 기억해요. 준과 나눈 이야기는 부모님도 볼 수 있어요",
    );
    expect(TEACHER_TEXT.intro(undefined)[0]).toBe(
      "선생님은 앱 속 AI 선생님이에요.",
    );
  });

  it("AC-19c 문구 표: 창 이름표 · 고르는 화면 · 수업 목록 · 마무리 글도 이름 자리를 쓰고 '선생님 선생님'이 되지 않는다", () => {
    expect(TEACHER_TEXT.windowName("미나")).toBe("미나 선생님");
    expect(TEACHER_TEXT.windowName(undefined)).toBe("선생님");
    expect(TEACHER_TEXT.chooseGo("미나")).toBe("미나 선생님과 할래요");
    expect(TEACHER_TEXT.chooseGo(undefined)).toBe("선생님과 할래요");
    expect(TEACHER_TEXT.chooseGreetLabel("리오")).toBe("리오 인사 듣기");
    expect(TEACHER_TEXT.talkLockWords("준")).toBe(
      "준과 며칠 더 이야기하면 열려요",
    );
    expect(TEACHER_TEXT.talkWordPractice("미나")).toBe(
      "내일 미나와 또 이야기해요. 아직 덜 익은 말을 미나가 물어볼 거예요",
    );
    expect(TEACHER_TEXT.recastTitle("준")).toBe("준이 바꿔 말해 준 문장");
    expect(TEACHER_TEXT.needsSpeaking).toBe(
      "말하기에서 단계를 찾으면 회화 선생님을 만날 수 있어요",
    );
    expect(TEACHER_TEXT.meetTeacher).toBe("이제 회화 선생님을 만날 수 있어요");
    expect(TEACHER_TEXT.firstRunEnglishName).toBe("선생님이 부를 영어 이름");
    expect(TEACHER_TEXT.firstRunNickname).toBe(
      "선생님이 부를 다른 영어 이름(별명)을 골라 주세요",
    );
    expect([
      TEACHER_TEXT.chooseTitle,
      TEACHER_TEXT.chooseGreet,
      TEACHER_TEXT.chooseParents,
      TEACHER_TEXT.chosen,
      TEACHER_TEXT.chooseRetry,
      TEACHER_TEXT.story,
      TEACHER_TEXT.storyListen,
      TEACHER_TEXT.probeClear,
    ]).toEqual([
      "선생님을 골라요",
      "인사 듣기",
      "고른 선생님은 부모님이 바꿀 수 있어요",
      "골랐어요",
      "다시 골라 주세요",
      "선생님 이야기",
      "선생님 이야기 듣기",
      "이 프로필의 선생님 지우기",
    ]);
  });

  it("AC-19c 문구 표: 어느 글에도 '토리'가 없고 이름 자리 글은 넘긴 이름만 쓴다", () => {
    const names = ["미나", "리오", "준", undefined] as const;
    for (const [key, value] of Object.entries(TEACHER_TEXT)) {
      const outputs =
        typeof value === "function"
          ? names.flatMap((n) => {
              const out = (value as (n?: string) => string | string[])(n);
              return Array.isArray(out) ? out : [out];
            })
          : [value];
      for (const text of outputs) {
        expect(text, key).not.toContain("토리");
        expect(text, key).not.toBe("");
      }
    }
    for (const line of TEACHER_TEXT.intro("리오"))
      expect(line).not.toMatch(/미나|준(?=[이은과을])/);
  });
});
