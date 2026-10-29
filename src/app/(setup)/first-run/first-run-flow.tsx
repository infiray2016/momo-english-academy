"use client";

// 첫 실행 여덟 화면(4절 첫 실행 행 · AC-1a · AC-1c, plan-p10a 파일별 값 8 · 정본 밖 문구 표 C72).
// PIN → 이름 → 아바타 → 알파벳 → 주제 묶음 → 시작 단계 → 음성 인식 안내 → 넘겨주기, 한 화면에 하나씩.
// 상태는 화면 메모리에만 둔다(새로 고치면 처음부터, PIN 을 기기에 저장하지 않음 — 정할 것 커). 마지막 한 번 저장한다.
// '다음'은 그 화면의 값이 맞을 때만 눌린다. 첫 실행은 부모 화면이지만 같은 보드 꼴로 그린다.
import { ChevronRight, Mic, Settings, ToggleRight } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import {
  AREA_LABEL,
  AvatarCircle,
  BigButton,
  ChildScreen,
  ChoiceButton,
  FOCUS_RING,
  PaperBand,
  PostIt,
  SELECTED_RING,
  SelectedMark,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { romanizeGivenName } from "@/core/profile/romanize";
import {
  AVATARS,
  type AvatarId,
  type FirstRunInput,
  isEnglishName,
  isPin,
  type MicResult,
  NAME_MAX_LENGTH,
  PIN_LENGTH,
  type TopicBundleId,
} from "@/core/profile/start";
import { AREAS, type Area } from "@/core/seed/structure";
import type { DeviceVerdict } from "@/core/speech/device";
import { TEACHER_TEXT } from "@/core/teacher/name";
import {
  clearMicState,
  isIpad,
  markMicUnavailable,
  readDeviceVerdict,
} from "@/lib/mic-state";
import {
  createBrowserSpeech,
  MIC_CHECK_INTERRUPTED_PREFIX,
} from "@/lib/speech/browser";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { checkEnglishName, completeFirstRun } from "@/server/actions/first-run";
import type { FirstRunView } from "@/server/profile";

/** 시작 단계 줄: 단추 열 너비(화면 꼴 값 — '고르지 않음' + 체크 표가 22px 글자로 들어가는 너비) · 예시 줄. */
const LEVEL_ROW = "grid grid-cols-[14rem_1fr] items-center gap-4";
const LEVEL_BUTTON = "w-full justify-start";
const APP_NAME = "모모 잉글리시 아카데미";
const HOME_PATH = "/";

/** 화면 문구(4절 · 3.1 · 7절 · C72 정본 밖 문구 표 그대로). '(제안)' 은 표에 없어 보고에 올린 문구다. */
const TEXT = {
  next: "다음",
  back: "이전",
  pinTitle: `부모님 PIN ${PIN_LENGTH}자리를 정해 주세요`,
  pinLabel: "PIN",
  pinAgain: "한 번 더 넣어 주세요",
  pinMismatch: "PIN 이 서로 달라요. 다시 정해 주세요",
  /** (제안) 이름 화면 제목 — 표에는 이름표 둘만 있다. */
  nameTitle: "아이 이름을 알려 주세요",
  displayNameLabel: "홈에 보일 이름(한글)",
  avatarTitle: "아이 그림을 골라 주세요",
  alphabetTitle: "아이가 알파벳 26자의 이름과 소리를 알아요?",
  alphabetKnown: "알아요",
  alphabetUnknown: "알파벳을 아직 몰라요",
  topicTitle: "아이가 좋아하는 주제 묶음을 골라 주세요",
  levelTitle: "영역마다 시작 단계를 고를 수 있어요",
  levelGuide: "고르지 않은 영역은 단계 찾기로 정해요",
  levelNone: "고르지 않음",
  levelTalkNote: "고르지 않으면 말하기 단계를 따라가요",
  levelAlphabet: "알파벳 · 소리 단원에서 시작해요",
  micTitle: "말하기 · 회화는 마이크가 있어야 해요",
  micBody:
    "말소리는 브라우저가 글자로 바꿔요. Chrome 은 소리를 Google 서버로 보내고, 다른 브라우저도 어디에서 바꾸는지 앱이 정할 수 없어요. 앱은 소리를 저장하지 않아요",
  micIpad: "설정에서 Siri 또는 받아쓰기를 켜야 말소리를 알아들어요",
  /** iPadOS 설정의 메뉴 이름(화면 검토 M-4 · 브리프 — 고유 이름이라 새 안내 문구가 아님). */
  ipadDictationPath: ["설정", "일반", "키보드", "받아쓰기"],
  ipadSiriPath: ["설정", "Siri 및 검색"],
  /** 아이패드 무음 모드 · 스크린 타임(plan-p11a 정본 밖 문구 표 — C111 · 전체 디자인 리뷰 I-1 · M-9). */
  ipadSilentMode: "무음 모드를 끄면 소리가 들리고 말을 들을 수 있어요",
  ipadScreenTime:
    "스크린 타임을 쓰면 설정 → 스크린 타임 → 콘텐츠 및 개인정보 보호 제한 → Siri 및 받아쓰기를 허용해 주세요",
  micCheck: "마이크 확인",
  /** 마이크 확인 단추 아래 안내(C72 — 확인은 소리가 들어와야 성공, fix 5). */
  micSpeakHint: "단추를 누른 뒤 아무 말이나 한마디 해 주세요",
  micOk: "마이크가 잘 돼요",
  micFailed: "마이크를 쓸 수 없었어요. 그래도 다음으로 넘어갈 수 있어요",
  micInterrupted: "다시 눌러 확인해 주세요",
  handoffTitle: "이제 아이에게 넘겨 주세요",
  handoffPlacement: (minutes: number) =>
    `영역마다 ${minutes}분쯤 단계 찾기를 해요`,
  handoff: "아이에게 넘기기",
  /** 끊김은 7절 네트워크 행 문구. */
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  /** (제안) 저장이 안 될 때 — C57 '지금은 들어갈 수 없어요 …' 꼴. */
  saveFailed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
} as const;

const STEPS = [
  "pin",
  "name",
  "avatar",
  "alphabet",
  "topic",
  "level",
  "mic",
  "handoff",
] as const;
type Step = (typeof STEPS)[number];

/** 알파벳을 모르면 시작 단계를 고를 수 없는 영역(3.1). */
const ALPHABET_AREAS: readonly Area[] = ["reading", "writing"];
/** 배치 평가를 보는 영역(회화는 말하기를 따른다). */
const PLACEMENT_AREAS: readonly Area[] = ["reading", "writing", "speaking"];

type MicStatus = "idle" | "checking" | "ok" | "failed" | "interrupted";

const inputClass =
  "min-h-14 w-full max-w-md rounded-xl border-2 border-ink bg-paper px-4 text-2xl text-ink focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** 묶음 대표 그림 하나. 그림이 없거나 읽지 못하면 그리지 않는다(제목이 이미 이름을 보인다, 화면 검토 I-2 · 정할 것 파). */
function TopicPicture({ label, src }: { label: string; src?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;
  return (
    <span data-topic-picture="" className="flex flex-col items-center gap-1">
      {/* biome-ignore lint/performance/noImgElement: 파일이 없을 수 있는 그림의 읽기 실패를 받으려면 img 의 onError 가 필요하다 */}
      <img
        src={src}
        alt=""
        width={88}
        height={88}
        onError={() => setBroken(true)}
        className="size-22 object-contain"
      />
      <span className="rounded-lg bg-paper px-3 py-1">{label}</span>
    </span>
  );
}

/** 묶음 제목: 항목마다 줄을 끊지 않는다(가운뎃점이 줄 끝에 남지 않게, 화면 검토 M-8). */
function BundleTitle({ label }: { label: string }) {
  const items = label.split(" · ");
  return (
    <span className="font-heading text-2xl">
      {items.map((item, i) => (
        <span key={item} className="whitespace-nowrap">
          {item}
          {i < items.length - 1 ? " · " : ""}
        </span>
      ))}
    </span>
  );
}

/** iPad 설정 길 한 줄(단순 도식 — 아이콘과 메뉴 이름, 정할 것 저 · 화면 검토 M-4). */
function SettingsPath({ steps }: { steps: readonly string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {steps.map((name, i) => (
        <span key={name} className="flex items-center gap-2">
          {i > 0 ? <ChevronRight aria-hidden className="size-6" /> : null}
          <span className="flex items-center gap-1 font-heading">
            {i === 0 ? <Settings aria-hidden className="size-6" /> : null}
            {i === steps.length - 1 ? (
              <ToggleRight aria-hidden className="size-6" />
            ) : null}
            {name}
          </span>
        </span>
      ))}
    </span>
  );
}

export function FirstRunFlow({ view }: { view: FirstRunView }) {
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [pinError, setPinError] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [englishEdited, setEnglishEdited] = useState(false);
  const [needNickname, setNeedNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [nicknameRejected, setNicknameRejected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState<AvatarId | undefined>();
  const [alphabetUnknown, setAlphabetUnknown] = useState<boolean | undefined>();
  const [topic, setTopic] = useState<TopicBundleId | undefined>();
  const [startLevels, setStartLevels] = useState<Partial<Record<Area, number>>>(
    {},
  );
  const [mic, setMic] = useState<MicResult>({ result: "not_checked" });
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [levelArea, setLevelArea] = useState<Area>("reading");
  const [verdict, setVerdict] = useState<DeviceVerdict | undefined>();
  const [port, setPort] = useState<SpeechPort | undefined>();
  const [saveMessage, setSaveMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  // 하이드레이션 끝 표시(e2e 가 채우기 전에 기다린다 — PIN 칸은 autoFocus 라 초점만으로는 하이드레이션을 알 수 없다, 차례 5 CI 7차)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // 음성 접점은 렌더 뒤에 만든다(SpeechPort.device 는 useEffect 에서만, P2b)
  useEffect(() => {
    const created = createBrowserSpeech({ settings: view.speech });
    setPort(created);
    setVerdict(readDeviceVerdict());
    return () => created.dispose();
  }, [view.speech]);

  // 화면이 바뀌면 제목으로 초점을 옮긴다(보조 기술이 새 화면을 읽게). PIN 화면은 첫 칸에(화면 검토 M-3)
  useEffect(() => {
    if (step === "pin") pinRef.current?.focus();
    else headingRef.current?.focus();
  }, [step]);

  const index = STEPS.indexOf(step);
  const go = (to: Step) => {
    setSaveMessage("");
    setStep(to);
  };
  const goNext = () => {
    const next = STEPS[index + 1];
    if (next) go(next);
  };
  const goBack = () => {
    const previous = STEPS[index - 1];
    if (previous) go(previous);
  };

  const englishShown = englishEdited
    ? englishName
    : romanizeGivenName(displayName);

  // ── 화면마다 '다음' 조건과 누름 ──

  const nameReady =
    displayName.trim() !== "" &&
    isEnglishName(englishShown) &&
    (!needNickname || isEnglishName(nickname));

  async function submitName() {
    setBusy(true);
    try {
      const checked = await checkEnglishName(
        needNickname ? nickname : englishShown,
      );
      // DB 오류(unavailable)는 저장 실패와 같은 C72 문장(검토 I-1, 새 문구 없음)
      if (!checked.ok) {
        setSaveMessage(TEXT.saveFailed);
        return;
      }
      if (!needNickname) {
        if (checked.vocabWord) {
          setNeedNickname(true);
          return;
        }
        setNickname("");
        goNext();
        return;
      }
      if (checked.vocabWord) {
        setNicknameRejected(true);
        return;
      }
      goNext();
    } catch {
      // 요청이 서버에 닿지 않음 — 저장 catch 와 같은 꼴: 기기가 끊겼으면 7절 끊김 문장, 아니면 C72 문장(검토 I-1)
      setSaveMessage(navigator.onLine ? TEXT.saveFailed : TEXT.offline);
    } finally {
      setBusy(false);
    }
  }

  function submitPin() {
    if (pin !== pinAgain) {
      setPinError(true);
      setPin("");
      setPinAgain("");
      pinRef.current?.focus();
      return;
    }
    setPinError(false);
    goNext();
  }

  async function checkMic() {
    if (!port || micStatus === "checking") return;
    // 누름 처리 안에서 동기로 부른다(iOS 첫 소리 제약, P2b)
    port.unlockFromGesture();
    setMicStatus("checking");
    const result = await port.checkMicrophone();
    if (result.ok) {
      clearMicState();
      setMic({ result: "ok" });
      setMicStatus("ok");
      return;
    }
    if (result.code.startsWith(MIC_CHECK_INTERRUPTED_PREFIX)) {
      // 끊김은 알림 없이 다시 누를 수 있게(정할 것 터)
      setMic({ result: "not_checked" });
      setMicStatus("interrupted");
      return;
    }
    if (result.group === "mic-unavailable") markMicUnavailable(result.code);
    setMic({
      result: "failed",
      code: result.code,
      browser: (verdict ?? readDeviceVerdict()).name,
    });
    setMicStatus("failed");
  }

  async function save() {
    if (!avatar || alphabetUnknown === undefined || !topic) return;
    setBusy(true);
    setSaveMessage("");
    const payload: FirstRunInput = {
      pin,
      displayName: displayName.trim(),
      englishName: englishShown.trim(),
      ...(needNickname ? { toriNickname: nickname.trim() } : {}),
      avatar,
      topicBundle: topic,
      alphabetUnknown,
      startLevels,
      mic,
    };
    try {
      const outcome = await completeFirstRun(payload);
      if (outcome.ok || outcome.reason === "already_done") {
        window.location.assign(HOME_PATH);
        return;
      }
      if (outcome.reason === "nickname_required") {
        setNeedNickname(true);
        go("name");
        return;
      }
      setSaveMessage(TEXT.saveFailed);
    } catch {
      setSaveMessage(navigator.onLine ? TEXT.saveFailed : TEXT.offline);
    } finally {
      setBusy(false);
    }
  }

  const placementLeft = PLACEMENT_AREAS.some(
    (area) =>
      startLevels[area] === undefined &&
      !(alphabetUnknown && ALPHABET_AREAS.includes(area)),
  );

  const micChecked = micStatus === "ok" || micStatus === "failed";
  const heading = (text: string) => (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className="font-heading text-[32px] leading-tight outline-none"
    >
      {text}
    </h1>
  );

  let body: ReactNode;
  let canNext = true;
  let onNext: () => void = goNext;
  switch (step) {
    case "pin":
      canNext = isPin(pin) && isPin(pinAgain);
      onNext = submitPin;
      body = (
        <>
          {heading(TEXT.pinTitle)}
          <label className="flex flex-col gap-2">
            <span className="sr-only">{TEXT.pinLabel}</span>
            <input
              ref={pinRef}
              // biome-ignore lint/a11y/noAutofocus: 첫 실행 첫 화면의 할 일이 이 칸 하나다(화면 검토 M-3)
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PIN_LENGTH}
              value={pin}
              aria-label={TEXT.pinLabel}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setPinError(false);
              }}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span>{TEXT.pinAgain}</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PIN_LENGTH}
              value={pinAgain}
              onChange={(e) => {
                setPinAgain(e.target.value.replace(/\D/g, ""));
                setPinError(false);
              }}
              className={inputClass}
            />
          </label>
          <StatusLine tone="error">
            {pinError ? TEXT.pinMismatch : ""}
          </StatusLine>
        </>
      );
      break;
    case "name":
      canNext = nameReady && !busy;
      onNext = () => void submitName();
      body = (
        <>
          {heading(TEXT.nameTitle)}
          <label className="flex flex-col gap-2">
            <span>{TEXT.displayNameLabel}</span>
            <input
              type="text"
              autoComplete="off"
              maxLength={NAME_MAX_LENGTH}
              // 한글 조합(IME) 중 React 가 값을 되돌려 쓰면 글자가 완성되지 않는 브라우저가 있어 비제어로 둔다(컨트롤러 핫픽스 2026-10-17 23:4x, 요청자 재현)
              defaultValue={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setNeedNickname(false);
                setNicknameRejected(false);
              }}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span>{TEACHER_TEXT.firstRunEnglishName}</span>
            <input
              type="text"
              lang="en"
              autoComplete="off"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              maxLength={NAME_MAX_LENGTH}
              value={englishShown}
              onChange={(e) => {
                setEnglishName(e.target.value);
                // 다 지우면 한글 이름에서 다시 채운다
                setEnglishEdited(e.target.value !== "");
                setNeedNickname(false);
                setNicknameRejected(false);
              }}
              className={cn(inputClass, "font-en")}
            />
          </label>
          {needNickname ? (
            <label className="flex flex-col gap-2">
              <span>{TEACHER_TEXT.firstRunNickname}</span>
              <input
                type="text"
                lang="en"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={NAME_MAX_LENGTH}
                value={nickname}
                aria-invalid={nicknameRejected || undefined}
                aria-describedby="nickname-status"
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameRejected(false);
                }}
                className={cn(
                  inputClass,
                  // 점선은 키보드 초점에만 — 거절된 칸은 굵은 실선 테(화면 검토 N-3)
                  "font-en aria-[invalid=true]:border-4",
                )}
              />
            </label>
          ) : null}
          {needNickname ? (
            // 별명도 vocab 낱말이면 받지 않고 4절 문장을 다시 보인다(화면 검토 I-1, 새 문구 없음)
            <StatusLine tone="error" className="-mt-2">
              <span id="nickname-status">
                {nicknameRejected ? TEACHER_TEXT.firstRunNickname : ""}
              </span>
            </StatusLine>
          ) : null}
        </>
      );
      break;
    case "avatar":
      canNext = avatar !== undefined;
      body = (
        <>
          {heading(TEXT.avatarTitle)}
          <div className="flex flex-wrap gap-6">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                data-touch=""
                aria-pressed={avatar === a.id}
                aria-label={a.label}
                onClick={() => setAvatar(a.id)}
                className={cn(
                  "relative rounded-full p-1",
                  FOCUS_RING,
                  avatar === a.id && SELECTED_RING,
                )}
              >
                {avatar === a.id ? (
                  <SelectedMark className="top-0 right-0" />
                ) : null}
                <AvatarCircle avatar={a.id} name={displayName} size={112} />
              </button>
            ))}
          </div>
        </>
      );
      break;
    case "alphabet":
      canNext = alphabetUnknown !== undefined;
      body = (
        <>
          {heading(TEXT.alphabetTitle)}
          <div className="flex flex-wrap gap-4">
            <ChoiceButton
              selected={alphabetUnknown === false}
              onClick={() => setAlphabetUnknown(false)}
            >
              {TEXT.alphabetKnown}
            </ChoiceButton>
            <ChoiceButton
              selected={alphabetUnknown === true}
              onClick={() => {
                setAlphabetUnknown(true);
                // 알파벳 · 소리 단원에서 시작하므로 읽기 · 쓰기 칸은 고를 수 없다(정할 것 처)
                setStartLevels((s) => {
                  const { reading: _r, writing: _w, ...rest } = s;
                  return rest;
                });
              }}
            >
              {TEXT.alphabetUnknown}
            </ChoiceButton>
          </div>
        </>
      );
      break;
    case "topic":
      canNext = topic !== undefined;
      body = (
        <>
          {heading(TEXT.topicTitle)}
          <div className="grid gap-8 sm:grid-cols-2">
            {view.bundles.map((b, i) => (
              // 묶음은 영역이 아니라 영역 색을 쓰지 않는다(종이 · 테, 화면 검토 M-5)
              <PostIt
                key={b.id}
                tone="paper"
                tilt={i === 0 ? "left" : "right"}
                pressed={topic === b.id}
                label={b.label}
                onClick={() => setTopic(b.id)}
                className="border-2 border-ink/30"
              >
                <BundleTitle label={b.label} />
                <span className="flex flex-wrap gap-3">
                  {b.pictures.map((p) => (
                    <TopicPicture key={p.label} label={p.label} src={p.src} />
                  ))}
                </span>
              </PostIt>
            ))}
          </div>
        </>
      );
      break;
    case "level": {
      // 영역마다 한 칸씩(영역 이름 단추로 고름) — 단계 선택지마다 예시 한 줄(4절, 컨트롤러 확정 · 화면 검토 M-1)
      const area = levelArea;
      const locked = alphabetUnknown === true && ALPHABET_AREAS.includes(area);
      const chosen = startLevels[area];
      const pick = (level: number | undefined) =>
        setStartLevels((s) => {
          const { [area]: _drop, ...rest } = s;
          return level === undefined ? rest : { ...rest, [area]: level };
        });
      body = (
        <>
          {heading(TEXT.levelTitle)}
          <p>{TEXT.levelGuide}</p>
          <div role="tablist" className="flex flex-wrap gap-2">
            {AREAS.map((a) => {
              const level = startLevels[a];
              const viewing = levelArea === a;
              // '보는 중' 표시는 아래 굵은 줄 — 체크는 '고름'에만 쓴다(화면 검토 review-p10-3-design N-1)
              return (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  data-touch=""
                  aria-selected={viewing}
                  aria-controls={`level-panel-${a}`}
                  id={`level-tab-${a}`}
                  onClick={() => setLevelArea(a)}
                  className={cn(
                    FOCUS_RING,
                    "inline-flex min-h-14 min-w-14 items-center justify-center rounded-xl border-2 border-ink bg-paper px-5 font-heading text-[22px] text-ink",
                    viewing && "border-b-8",
                  )}
                >
                  {level === undefined
                    ? AREA_LABEL[a]
                    : `${AREA_LABEL[a]} · ${level}단계`}
                </button>
              );
            })}
          </div>
          <section
            role="tabpanel"
            id={`level-panel-${area}`}
            aria-labelledby={`level-tab-${area}`}
            data-level-area={area}
            // 가로 화면은 두 열 — 열 우선(왼쪽 고르지 않음 · 1 · 2 · 3, 오른쪽 4 · 5 · 6, 화면 검토 N-2). 세로는 한 열
            className="grid gap-2 landscape:grid-flow-col landscape:grid-cols-2 landscape:gap-x-6"
            style={{
              gridTemplateRows: `repeat(${Math.ceil((view.levels[area].length + 1) / 2)}, auto)`,
            }}
          >
            {locked ? (
              <p className="min-h-14 content-center">{TEXT.levelAlphabet}</p>
            ) : (
              <>
                {/* 단추 열은 같은 너비 — 예시 줄이 같은 자리에서 시작한다(화면 검토 review-p10-fix2-design N-4) */}
                <div className={LEVEL_ROW}>
                  <ChoiceButton
                    className={LEVEL_BUTTON}
                    selected={chosen === undefined}
                    onClick={() => pick(undefined)}
                  >
                    {TEXT.levelNone}
                  </ChoiceButton>
                  <p>{area === "talk" ? TEXT.levelTalkNote : ""}</p>
                </div>
                {view.levels[area].map((l) => (
                  <div key={l.level} className={LEVEL_ROW}>
                    <ChoiceButton
                      className={LEVEL_BUTTON}
                      selected={chosen === l.level}
                      onClick={() => pick(l.level)}
                    >
                      {`${l.level}단계`}
                    </ChoiceButton>
                    <p>{l.example}</p>
                  </div>
                ))}
              </>
            )}
          </section>
        </>
      );
      break;
    }
    case "mic":
      body = (
        <>
          {heading(TEXT.micTitle)}
          {verdict && isIpad(verdict) ? (
            // 안내 상자는 영역 색 · 테 없이 옅은 바탕(화면 검토 M-5 · N-3 — 점선은 초점에만)
            <div
              data-ipad-guide=""
              className="flex flex-col gap-3 rounded-xl bg-cork/20 p-4"
            >
              <p>{TEXT.micIpad}</p>
              <SettingsPath steps={TEXT.ipadDictationPath} />
              <SettingsPath steps={TEXT.ipadSiriPath} />
              <p data-ipad-silent="">{TEXT.ipadSilentMode}</p>
              <p data-ipad-screen-time="">{TEXT.ipadScreenTime}</p>
            </div>
          ) : null}
          <p>{TEXT.micBody}</p>
          <div>
            {/* 확인 전에는 이 화면의 행동이 '마이크 확인'이라 큰 단추, 결과가 나오면 곁 단추(화면 검토 M-7) */}
            {micChecked ? (
              <SmallButton onClick={() => void checkMic()} disabled={!port}>
                <Mic aria-hidden className="size-7" />
                {TEXT.micCheck}
              </SmallButton>
            ) : (
              <BigButton
                onClick={() => void checkMic()}
                disabled={!port || micStatus === "checking"}
                aria-busy={micStatus === "checking" || undefined}
              >
                <Mic aria-hidden className="size-7" />
                {TEXT.micCheck}
              </BigButton>
            )}
          </div>
          <p data-mic-speak-hint="">{TEXT.micSpeakHint}</p>
          <StatusLine
            tone={
              micStatus === "ok"
                ? "ok"
                : micStatus === "failed"
                  ? "error"
                  : "info"
            }
          >
            {micStatus === "ok"
              ? TEXT.micOk
              : micStatus === "failed"
                ? TEXT.micFailed
                : micStatus === "interrupted"
                  ? TEXT.micInterrupted
                  : ""}
          </StatusLine>
        </>
      );
      break;
    case "handoff":
      onNext = () => void save();
      canNext = !busy;
      body = (
        <>
          {heading(TEXT.handoffTitle)}
          {placementLeft ? (
            <p>{TEXT.handoffPlacement(view.targetMinutes)}</p>
          ) : null}
        </>
      );
      break;
  }

  return (
    <ChildScreen>
      <PaperBand title={APP_NAME} />
      <section
        data-first-run-step={step}
        data-hydrated={hydrated ? "" : undefined}
        className="flex flex-1 flex-col gap-5 rounded bg-paper p-6 shadow-postit sm:p-8"
      >
        {/* 단계마다 입력 요소를 새로 만든다 — 같은 자리의 input 이 재사용되면 PIN 값이 이름 칸에 남는다(컨트롤러 핫픽스 2026-10-17 23:4x) */}
        <Fragment key={step}>{body}</Fragment>
        {step !== "pin" && step !== "mic" ? (
          <StatusLine tone="error">{saveMessage}</StatusLine>
        ) : null}
      </section>
      <nav className="flex items-center justify-between gap-4">
        {index > 0 ? (
          <SmallButton onClick={goBack} disabled={busy}>
            {TEXT.back}
          </SmallButton>
        ) : (
          <span />
        )}
        {step === "mic" && !micChecked ? (
          // 마이크 확인 전에는 '다음'이 곁 단추(확인은 선택이라 넘어갈 수 있다)
          <SmallButton onClick={onNext}>{TEXT.next}</SmallButton>
        ) : (
          <BigButton onClick={onNext} disabled={!canNext}>
            {step === "handoff" ? TEXT.handoff : TEXT.next}
          </BigButton>
        )}
      </nav>
    </ChildScreen>
  );
}
