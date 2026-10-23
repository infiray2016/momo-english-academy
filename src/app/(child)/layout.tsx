// 아이 화면 틀(4절 포스트잇 보드, plan-p10a 바뀌는 파일). 코르크 바탕 · 본문 글꼴 · 낱말 단위 줄바꿈은
// 루트(layout.tsx · globals.css)와 보드(ChildScreen)가 맡고, 이 틀은 아이 화면 묶음을 표시한다(lang="ko" 는 <html>).
// 집 선생님(선생님 화면 plan 값 9)을 서버에서 읽어 아이 화면 조각에 나눈다 — 문구 표의 [이름] 자리. 읽기 실패 · 고르기 전은 null('선생님').
import { connection } from "next/server";
import { TeacherProvider } from "@/components/teacher/teacher-provider";
import { householdTeacher } from "@/server/teacher";

export default async function ChildLayout({ children }: LayoutProps<"/">) {
  // DB 를 읽는 틀이라 요청 때 그린다(빌드 때 미리 그리지 않는다)
  await connection();
  const teacher = await householdTeacher();
  return (
    <div data-child-area="" className="min-h-dvh bg-cork font-sans text-ink">
      <TeacherProvider value={teacher}>{children}</TeacherProvider>
    </div>
  );
}
