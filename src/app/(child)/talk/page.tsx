// 1-가 회화 자리(C50 (1), plan-p10b 바뀌는 파일). 회화 수업 · 세션은 1-나라 '토리가 준비 중이에요. 곧 만나요'와 '홈'만 보인다.
import { BigLink, ChildScreen, PostIt } from "@/components/board/board";

export default function TalkPage() {
  return (
    <ChildScreen>
      <PostIt
        tone="talk"
        tilt="slight"
        className="mx-auto mt-12 w-full max-w-xl items-center gap-8 p-10"
      >
        <h1 className="font-heading text-[32px] leading-tight">
          토리가 준비 중이에요. 곧 만나요
        </h1>
        <BigLink href="/">홈</BigLink>
      </PostIt>
    </ChildScreen>
  );
}
