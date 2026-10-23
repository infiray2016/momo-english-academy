// 회화 선생님 명단의 화면 몫 · 보일 선생님 · 선생님 정하기(선생님 화면 plan 값 5, 5절 명단 자료 · 6.1 이름 변형 · AC-19a · AC-19b 의 단위 몫).
// 명단은 견본(teacherRoster — 1-가 명단과 같은 이름)과 저장소의 seed/teachers.json 을 쓴다. 아이 이름은 지어낸 값이다.
import { describe, expect, it } from "vitest";
import {
  resolveTeacher,
  teacherViewOf,
  visibleTeachers,
} from "@/core/teacher/roster";
import { loadSeedList } from "@/server/seed-lists";
import { teacherRoster } from "../fixtures/seed/builders";

const roster = teacherRoster().teachers;
const [mina, leo] = roster;
if (!mina || !leo) throw new Error("견본 명단은 둘이다");

/** 셋째 항목(명단을 늘리는 변경의 꼴 — 키 · 이름만 바꾼 사본). */
const third = {
  ...leo,
  key: "nabi",
  nameKo: "다온",
  nameEn: "Daon",
  nameKoWordExceptions: [],
};

const child = (over: Partial<Parameters<typeof visibleTeachers>[1]> = {}) => ({
  displayName: "모모",
  englishName: "Momo",
  nickname: null,
  ...over,
});
const keysOf = (list: readonly { key: string }[]) => list.map((t) => t.key);

describe("보일 선생님(값 5 visibleTeachers)", () => {
  it("AC-19a 보일 선생님: 이름이 겹치지 않는 아이에게는 명단 전부가 명단 차례로 보이고 셋째 항목을 더한 명단이면 셋이다", () => {
    expect(keysOf(visibleTeachers(roster, child()))).toEqual(["mina", "leo"]);
    expect(keysOf(visibleTeachers([...roster, third], child()))).toEqual([
      "mina",
      "leo",
      "nabi",
    ]);
  });

  it("AC-19b 보일 선생님: 영어 이름이 Mina 인 아이에게는 리오만 보인다(대소문자 · 띄어쓴 조각 · 별명도)", () => {
    for (const names of [
      { englishName: "Mina" },
      { englishName: "MINA" },
      { englishName: "Mina Park" },
      { englishName: "Mina-Lee" },
      { englishName: "Apple", nickname: "mina" },
    ]) {
      expect(keysOf(visibleTeachers(roster, child(names)))).toEqual(["leo"]);
    }
  });

  it("AC-19b 보일 선생님: 한글 이름이 미나 · 성을 뺀 이름이 미나인 아이에게는 리오만, 리오인 아이에게는 미나만 보인다", () => {
    for (const displayName of ["미나", "김미나", "남궁미나"]) {
      expect(keysOf(visibleTeachers(roster, child({ displayName })))).toEqual([
        "leo",
      ]);
    }
    expect(
      keysOf(visibleTeachers(roster, child({ displayName: "이리오" }))),
    ).toEqual(["mina"]);
    expect(
      keysOf(visibleTeachers(roster, child({ englishName: "Leo" }))),
    ).toEqual(["mina"]);
  });

  it("AC-19b 보일 선생님: 이름의 한 부분만 같은 아이(미나리 · Minamo)에게는 그대로 다 보인다", () => {
    expect(
      keysOf(
        visibleTeachers(
          roster,
          child({ displayName: "미나리", englishName: "Minamo" }),
        ),
      ),
    ).toEqual(["mina", "leo"]);
  });

  it("AC-19b 보일 선생님: 모든 선생님이 빠지면 명단 전부가 보인다(고를 선생님이 없는 아이는 없다)", () => {
    expect(
      keysOf(
        visibleTeachers(
          roster,
          child({ displayName: "미나", englishName: "Leo" }),
        ),
      ),
    ).toEqual(["mina", "leo"]);
  });
});

describe("선생님 정하기(값 5 resolveTeacher)", () => {
  it("AC-19b 선생님 정하기: 차례대로 명단에 있는 첫 키의 항목이고 빈 키 · 명단 밖 키는 건너뛴다", () => {
    expect(resolveTeacher(roster, "leo", "mina")?.key).toBe("leo");
    expect(resolveTeacher(roster, undefined, "mina")?.key).toBe("mina");
    expect(resolveTeacher(roster, null, "leo")?.key).toBe("leo");
    // 처음 스냅숏 키가 명단에서 빠졌으면 프로필의 지금 선생님(spec '세션의 선생님' 행)
    expect(resolveTeacher(roster, "tori", "mina")?.key).toBe("mina");
    expect(resolveTeacher(roster, "tori", null)).toBeUndefined();
    expect(resolveTeacher(roster)).toBeUndefined();
  });
});

describe("화면에 보내는 몫(값 5 teacherViewOf)", () => {
  it("AC-19b 화면 몫: 키 · 한글 이름 · 소개 · 성격 · 인사 · 색 · 모델 · 초상 주소 · 목소리만 있고 성격 글(영어) · 출처 · 영어 이름은 없다", () => {
    const view = teacherViewOf(mina);
    expect(view).toEqual({
      key: "mina",
      nameKo: "미나",
      introKo: mina.introKo,
      traitsKo: mina.traitsKo,
      greetingEn: mina.greetingEn,
      color: mina.color,
      modelPath: `/${mina.model.path}`,
      portraitPath: `/${mina.portrait.path}`,
      voice: { pitch: 1.08, prefer: [] },
    });
    const text = JSON.stringify(view);
    expect(text).not.toContain(mina.personaEn);
    expect(text).not.toContain(mina.source.creator);
    expect(text).not.toContain('"Mina"');
  });
});

describe("명단 서버(값 5 seed-lists teachers)", () => {
  it("AC-19a 명단 서버: 시드 목록 teachers 는 저장소의 seed/teachers.json 을 규격으로 읽어 미나 · 리오 차례다", () => {
    const file = loadSeedList("teachers");
    expect(keysOf(file.teachers)).toEqual(["mina", "leo"]);
    expect(
      keysOf(visibleTeachers(file.teachers, child({ englishName: "Mina" }))),
    ).toEqual(["leo"]);
  });
});
