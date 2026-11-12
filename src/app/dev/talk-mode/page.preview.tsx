// 개발용 회화 방식 전환 쪽(/dev/talk-mode — 회화 Claude 주도 plan 묶음 D · spec FR-13 · 정본 AC-26o). 운영 배포 빌드에서는 빠지는 이름이다
// (next.config.ts 의 pageExtensions — 단위 tests/unit/next-config.test.ts). 가족 접근 쿠키 뒤에 있고(proxy), 지금 값 읽기도 서버 액션
// readTalkMode 가 먼저 requireAccess() 를 한다. 바꾸기 서버 액션(changeTalkMode)을 본체에 넘긴다. 아이 화면에서 이 쪽으로 가는 길은 없다.
import type { Metadata } from "next";
import { connection } from "next/server";
import { changeTalkMode, readTalkMode } from "@/server/dev/talk-mode";
import { TalkMode } from "./talk-mode";

export const metadata: Metadata = {
  title: "회화 방식 바꾸기",
  robots: { index: false, follow: false },
};

export default async function TalkModePage() {
  // DB 를 읽는 쪽이라 요청 때 그린다(빌드 때 미리 그리지 않는다)
  await connection();
  const initial = await readTalkMode();
  return <TalkMode initial={initial} change={changeTalkMode} />;
}
