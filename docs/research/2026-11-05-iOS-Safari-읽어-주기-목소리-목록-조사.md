# iOS · iPadOS Safari 읽어 주기 목소리 목록 조사

조사 2026-11-05(규격 설계 담당, 변경 단위 `intent/2026-11-05-기기-음성-고르기-개선/` 의 조사 몫). 이 변경 단위는 같은 날 15:0x 요청자 결정(13절 C199)으로 보류됐고, 그래서 델타 spec 은 쓰지 않았다. 이 기록은 멈추기 전까지 모은 사실을 남긴 것이다. 첫 프리뷰 뒤 외부 AI 음성(`intent/2026-11-05-읽어-주기-AI-음성/`)과 함께 다시 판단할 때 쓴다. 근거는 [S번호]로 달았고, 끝의 출처 목록에 주소 · 확인일 · 확인 정도가 있다. 확인 정도는 높음(원본 코드나 여러 독립 기록이 일치) · 중간(한두 기록) · 낮음(한 글이나 판매 글) · 추측으로 가른다. 코드 고침과 기기 실측은 하지 않았다.

## 요약

1. **Safari 는 기기에 내장된 음성만 목록에 준다(높음).** WebKit 코드는 `isSystemVoice` 인 음성만 `getVoices()` 목록에 넣고, 그 까닭을 "핑거프린팅(브라우저로 기기를 가려내는 일)을 줄이려고"라고 적었다 [S1][S2]. 설정에서 내려받은 향상(Enhanced) · 고급(Premium) 품질 음성은 목록에 나오지 않는다 [S3][S4]. iOS 18 무렵에는 고품질 변형을 내려받으면 내장 음성까지 목록에서 사라졌다는 보고가 있었고, 2025-03 베타에서 사라짐만 고쳐졌다 [S4].
2. **Siri 음성은 Safari 에서 쓸 수 없다(높음).** Siri 가 말할 때 쓰는 음성은 Web Speech 에도 AVSpeechSynthesizer 에도 열려 있지 않다 [S5][S6][S7]. 다만 이름에 `siri` 가 든 작은 변형(en-US Aaron · Nicky, en-GB Arthur · Martha 등)은 기기에 따라 목록에 보일 수 있다 [S8][S9]. 이 변형은 Siri 음성의 낮은 품질 판이다 [S14].
3. **칸의 값(높음).** Safari 에서 `voiceURI` 는 Apple 음성 식별자(`com.apple.…`)이고 `name` 은 음성 이름이며 `lang` 은 BCP 47 꼴이다. `localService` 와 `default` 는 모든 음성이 true 다 [S1][S10][S11]. 그래서 `default` 로는 기기 기본 음성을 알 수 없다. macOS · iOS 는 음성 이름을 기기 언어로 바꿔 보이기도 하므로(예: 식별자 Maged · 이름 Majed) 이름보다 식별자가 안정적이다 [S3][S12].
4. **식별자 꼴(중간, iOS 17 무렵부터).** 내장 음성은 `com.apple.voice.compact.<lang>.<이름>` 와 `com.apple.voice.super-compact.<lang>.<이름>`, Siri 작은 변형은 `com.apple.ttsbundle.siri_<이름>_<lang>_compact`, Eloquence(매우 낮은 품질)는 `com.apple.eloquence.<lang>.<이름>`, 재미용 음성과 옛 음성(Albert · Bad News · Fred · Junior · Kathy · Ralph 등)은 `com.apple.speech.synthesis.voice.<이름>` 이다 [S8][S10][S11][S14]. iOS 13 이전에는 `com.apple.ttsbundle.Samantha-compact` 꼴이었다 [S16].
5. **지금 앱의 고르기는 Safari 에서 '목록 첫째'다(중간, 앱 영향은 추정).** 지금 pickVoice 는 lang 이 같은 음성 가운데 default → localService → 첫째 차례로 고른다. Safari 에서는 두 값이 늘 true 이므로 결과가 목록의 첫 en-US 음성이 된다. 2024-07 iPhone Safari 의 실제 목록에서 첫 en-US 음성은 Eloquence Flo 였고, 재미용 음성 열몇 개 뒤에 compact Samantha, 끝쪽에 super-compact Samantha 가 있었다 [S10]. 요청자 iPad 의 Chrome(Safari 와 같은 WebKit 목록) 기록(2026-10-22 18:5x, 장부 'H2 실측 3')에서 고른 음성은 Samantha 였으므로 차례는 기기와 판에 따라 다르다. iOS Chrome 에서 Eloquence 음성이 덧말("speak. Voice name equals …")을 함께 읽었다는 보고도 있다 [S11].
6. **compact 와 super-compact(낮음, 엇갈림).** 같은 이름(Samantha · Yuna · Daniel)이 둘씩 나온다 [S10][S11]. readium 은 iOS 에서 두 번 나오는 음성이 같은 소리를 낸다고 적었고 [S3], 2026-06 의 한 판매 글은 super-compact 가 가장 좋은 신경망 음성이라고 했다 [S13]. WebKit 은 2023-03 에 Samantha 가 늘 보이도록 super-compact 를 포함하는 목록으로 바꾸면서 "WebKit 은 이 compact 음성만 쓸 수 있다"고 적었다 [S2]. 귀로 들어 봐야 한다.
7. **한국어(중간).** Apple ko-KR 음성 가운데 내장은 Yuna(여성)뿐이고 Jian · Suhyun · Sora(여성)와 Minsu(남성)는 내려받기다 [S14]. 1 과 같은 까닭으로 Safari 에서는 Yuna 만 쓸 가능성이 크다. 2024 iPhone 목록의 ko-KR 도 compact · super-compact Yuna 둘뿐이었다 [S10]. 리오(남자 선생님)의 한국어 줄은 여성 음성이 된다.
8. **영어 내장 음성(중간).** 내장으로 알려진 영어 음성은 en-US Samantha(여성) · Nicky(여성, Siri 작은 변형) · Aaron(남성, Siri 작은 변형), en-GB Daniel(남성) · Martha · Arthur, en-AU Karen 등이다 [S14][S8]. Nicky · Aaron 은 일부 새 기기에만 기본으로 있다는 글이 있고 [S9], 2024 iPhone Safari 목록에는 없었다 [S10]. 그러면 en-US 남성 내장 음성이 없어서, 리오에게 다른 남성 음성을 주려면 영국 영어 Daniel 같은 다른 지역 음성을 써야 한다(제품 판단).
9. **목소리를 지정하지 않을 때(중간).** utterance 에 목소리를 넣지 않고 lang 만 주면 WebKit 은 `AVSpeechSynthesisVoice(language:)` 로 고른다 [S1]. iOS 18.6.2 에서는 그것이 설정 > 손쉬운 사용 > 말하기 콘텐츠에서 사용자가 고른 음성이었고, iOS 26.0 · 26.1 에서는 시스템 기본(Samantha 등)으로 바뀌었다는 회귀 보고가 있다. 고쳐졌다는 글은 찾지 못했다 [S15]. Siri 음성은 이 길로도 나오지 않는다 [S6].
10. **목록이 늦게 차는 판(높음).** iOS · iPadOS 26.3 이상에서 WebKit 은 음성 목록을 기다리지 않고 채운다. 그래서 첫 `getVoices()` 가 빈 목록일 수 있고, 목록이 차면 `voiceschanged` 가 온다 [S1][S2]. 첫 발화가 목록이 차기 전이면 lang 만으로 읽힌다.
11. **다른 브라우저(높음 · 중간).** iPad 의 Chrome 은 WebKit 이므로 목록과 동작이 Safari 와 같다 [S3][S11]. macOS Safari 도 같은 코드이고 이름 현지화가 더 많다 [S1][S3]. 데스크톱 Chrome 은 `voiceURI` 를 이름과 같게 주어 식별자를 잃고 [S12], 내려받은 Apple 음성도 목록에 넣으며, `default` 는 첫 음성만 true 다 [S12]. Chrome 의 Google 온라인 음성은 14초가 넘는 발화가 끊긴다는 보고가 있다 [S3]. Edge 의 Natural 음성은 높이(pitch)가 먹지 않는다 [S3].

## 브라우저별 정리

| 브라우저 | 목록에 나오는 음성 | voiceURI | default · localService | 더 알 것 |
|---|---|---|---|---|
| iPadOS · iOS Safari, iPad Chrome(WebKit) | 내장 음성만(compact · super-compact · 기기에 따라 Siri 작은 변형 · Eloquence · 재미용). 내려받은 음성 · Siri 음성은 없음 | `com.apple.…` 식별자 | 모두 true | 26.3 이상은 목록이 늦게 참. lang 만 주면 기기가 고른 음성(iOS 26 회귀 보고) |
| macOS Safari | iPad 와 같음 | `com.apple.…` 식별자 | 모두 true | 이름이 기기 언어로 바뀌는 일이 더 많음 |
| 데스크톱 Chrome(macOS) | 내려받은 Apple 음성 포함 · Google 온라인 음성 | 이름과 같음 | default 는 첫 음성만, Google 음성은 localService false | Google 음성 14초 끊김 보고 |
| Edge 데스크톱 | Microsoft 온라인 Natural 음성이 많음 | 이름 꼴 | 판마다 다름 | Natural 음성은 높이가 먹지 않음 |
| Android Chrome | 음성이 아니라 언어 · 지역 목록 | 이름 꼴 | default 가 쓸모없음 | lang 이 `en_us` 꼴(지금 코드가 이미 맞춤) |

## 다시 할 때의 출발점(정한 것 아님)

- iPad Safari 에서 고를 수 있는 폭은 내장 compact 계열 안이다. Siri 처럼 자연스러운 품질은 외부 AI 음성 intent(보류)의 몫이다(요약 1 · 2). 요청자가 "다른 기본 음성은 만족스럽지 않다"(C199)고 들은 것과 같은 결과다.
- 식별자에 `eloquence` · `speech.synthesis.voice` 가 든 음성은 빼는 것이 안전하다(요약 5). 이것만은 음질 개선과 따로, 지금 규칙이 그런 음성을 고를 수 있는지 요청자 iPad 목록 차례로 확인할 만하다.
- Web Speech 는 성별을 주지 않는다. 미나 · 리오를 가르려면 요청자가 들어 보고 고른 이름 · 식별자 조각(명단 voice.prefer, 자료)이 필요하다. 같은 이름(compact · super-compact)은 같은 음성으로 세야 한다(요약 6).
- 조각은 기기 언어로 바뀌지 않는 식별자 쪽이 안전하다(요약 3).
- 부모 화면이나 첫 실행에 'iPad 설정에서 더 좋은 목소리를 내려받기' 안내를 두는 안은 Safari 목록에는 효과가 없다(요약 1, S1 · S4, 높음). 목소리를 지정하지 않는 길로 설정에서 고른 음성이 나올 수는 있지만, iOS 26.0 · 26.1 에서 깨졌다는 보고가 있다(요약 9, S15). iOS 18 무렵에는 고품질 변형을 내려받으면 내장 음성이 목록에서 사라졌다는 보고도 있다(S4). 그래서 실측 전에는 권하지 않는다. 내장 음성 밖의 품질이 필요하면 외부 AI 음성이 남은 길이다.
- 실측할 것(요청자 iPad Safari · Chrome): 음성마다 이름 · 식별자 · lang · 목록 차례, iPadOS 판, 첫 목록 길이와 voiceschanged 뒤 길이, Siri 작은 변형(Aaron · Nicky)의 유무, compact 와 super-compact 의 소리 차이, 목소리를 지정하지 않고 lang 만 준 소리.

## 출처

확인일은 모두 2026-11-05 다.

| 번호 | 출처 | 주소 | 확인 정도 |
|---|---|---|---|
| S1 | WebKit 원본 코드 `PlatformSpeechSynthesizerCocoa.mm`(main, 마지막 고침 2026-10-14 커밋 499e548). `appendVoices` 가 `isSystemVoice` 만 넣고 localService · isDefault 를 true 로 둔다. 말할 때 voiceURI 로 찾고, 없으면 lang 으로 찾는다 | https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/cocoa/PlatformSpeechSynthesizerCocoa.mm | 높음(원본 코드) |
| S2 | WebKit 커밋 셋: 8944776(2024-07-03, "Only show built-in voices … to reduce fingerprinting surface area" 주석), f20573e(2023-03-25, 버그 254443 · super-compact 포함 목록 · "WebKit … can only use these compact voices"), 0845cdb(2026-01-15, 목록을 기다리지 않고 채움 · 26.3 기준) | https://github.com/WebKit/WebKit/commit/8944776028bdc0440edf4ebb0c16675859b28ca7 · https://github.com/WebKit/WebKit/commit/f20573ec09c611d9bbb4f6327ca9f37c7ee3d16a · https://bugs.webkit.org/show_bug.cgi?id=254443 · https://github.com/WebKit/WebKit/commit/0845cdb9f9cd7466099cd80f2e610950e2f7f832 | 높음(원본 커밋) |
| S3 | readium speech, "SpeechSynthesis in browsers and OSes" | https://readium.org/speech/docs/WebSpeech.html | 중간~높음(여러 기기 시험 정리) |
| S4 | readium 이슈 #19(2024-05~2025-08, 내려받은 음성 · 고품질 변형이 Safari 에 안 보임, 고품질을 내려받으면 내장 음성이 사라짐), MDN 이슈 #40182(2025, iOS 에 Samantha 향상 품질을 내려받아도 목록에 없음) | https://github.com/HadrienGardeur/web-speech-recommended-voices/issues/19 · https://github.com/mdn/content/issues/40182 | 중간 |
| S5 | readium 이슈 #22(Siri 음성이 Web Speech 에 없음, 2025-08 "한 번도 열린 적 없다") | https://github.com/HadrienGardeur/web-speech-recommended-voices/issues/22 | 중간 |
| S6 | Speech Central, "Why Can't Third-Party Apps Use Siri Voices"(2026-08-08). 말하기 콘텐츠에서 Siri 를 골라도 API 는 다른 음성을 준다고 함. Apple 공식 문장은 찾지 못함 | https://speechcentral.net/2026/08/08/why-cant-third-party-apps-use-siri-voices-on-iphone-ipad-and-mac/ | 중간 |
| S7 | Apple 개발자 포럼 682438(AVSpeechSynthesizer 로 Siri 음성을 못 씀, 개발자 보고) | https://developer.apple.com/forums/thread/682438 | 낮음~중간 |
| S8 | iOS 기기의 AVSpeech 음성 목록(Expo, 2023-06 작성 · 2026-01 갱신). siri_Aaron · siri_Nicky · compact Samantha · compact Yuna · Eloquence · 재미용 식별자 | https://gist.github.com/asutekku/d5b09e5267b97c3af1f153a325089340 | 중간(네이티브 목록, Safari 목록과 다를 수 있음) |
| S9 | Apple 개발자 포럼 AVFoundation 글 모음 14쪽(compact Samantha 는 모든 기기에 있고 Siri 작은 변형은 일부 새 기기에만 있다는 글) | https://developer.apple.com/forums/tags/avfoundation?page=14&sortBy=newest | 낮음~중간 |
| S10 | SoSci Survey 지원 글 57702(2024-07, iPhone Safari 의 getVoices 전체 목록, 모두 기본 표시) | https://support.soscisurvey.de/?qa=57702/probleme-mit-sprachausgabe-bei-iphones | 중간(실제 목록 하나) |
| S11 | Stack Overflow 77079506(2023-09, iOS Chrome 의 en-GB 목록 · Eloquence 덧말) | https://stackoverflow.com/questions/77079506/eloquence-voices-are-speaking-extra-bs | 중간 |
| S12 | Chromium 이슈 40272127(2023-06, Chrome 은 voiceURI 를 이름으로 채움 · Safari 목록 예시, 아직 열림) | https://issues.chromium.org/issues/40272127 | 높음(코드 인용) |
| S13 | Ralf Koch, "Why AVSpeechSynthesizer Sounds Terrible on Real iPhones"(2026-06-10, super-compact 가 가장 좋다는 주장, 판매 글) | https://medium.com/@info_4533/why-avspeechsynthesizer-sounds-terrible-on-real-iphones-eb4565862ea8 | 낮음 |
| S14 | readium 추천 음성 자료 `json/en.json` · `json/ko.json` · `json/filters/`(Apple 음성의 내장 여부 · 품질 변형 · 성별, Eloquence · 재미용 목록) | https://github.com/readium/speech/tree/main/json | 중간 |
| S15 | Apple 개발자 포럼 804648(2025-10, iOS 26.0 · 26.1 에서 `AVSpeechSynthesisVoice(language:)` 가 사용자가 고른 음성을 무시, iOS 18.6.2 는 정상, Apple 은 조사 중) | https://developer.apple.com/forums/thread/804648 | 중간 |
| S16 | iOS 13.1.1 AVSpeech 음성 목록(siri_male · siri_female 식별자, ttsbundle 꼴) | https://gist.github.com/Koze/d1de49c24fc28375a9e314c72f7fdae4 | 중간(옛 판) |
