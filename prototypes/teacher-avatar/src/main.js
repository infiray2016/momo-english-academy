import './style.css';
import { TeacherAvatar } from './teacher-avatar.js';
import { TEACHERS, STATES } from './teachers.js';

const $ = id => document.getElementById(id);
const teacherButtons = [...document.querySelectorAll('[data-teacher]')];
const stateButtons = [...document.querySelectorAll('button[data-state]')];
const synthesis = window.speechSynthesis;
const speechSupported = Boolean(synthesis && window.SpeechSynthesisUtterance);
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let avatar;
let selected = TEACHERS.mina;
let ready = false;
let loadVersion = 0;
let speechVersion = 0;
let currentSpeech = null;
let speechTimeout;
let englishVoices = [];

function setState(state) {
  avatar?.setState(state);
  $('stage').dataset.state = state;
  $('state-badge').textContent = STATES[state].label;
  $('state-description').textContent = STATES[state].description;
  stateButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.state === state)));
}

function updateControls() {
  stateButtons.forEach(button => { button.disabled = !ready; });
  $('greet').disabled = !ready || !speechSupported;
  $('read-text').disabled = !ready || !speechSupported;
}

function stopSpeech() {
  speechVersion += 1;
  clearTimeout(speechTimeout);
  if (currentSpeech) synthesis?.cancel();
  currentSpeech = null;
  $('greet-label').textContent = '목소리로 인사하기';
  $('speech-caption').hidden = true;
  setState('idle');
}

function speak(text) {
  if (!ready || !speechSupported) return;
  stopSpeech();
  const phrase = text.trim().slice(0, 240);
  if (!phrase) {
    $('voice-message').textContent = '먼저 읽어 줄 문장을 적어 주세요.';
    $('speech-text').focus();
    return;
  }
  const version = speechVersion;
  const utterance = new SpeechSynthesisUtterance(phrase);
  const voice = englishVoices.find(item => item.voiceURI === $('voice').value);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || 'en-US';
  utterance.rate = 0.86;
  utterance.pitch = selected.id === 'mina' ? 1.08 : 0.97;
  currentSpeech = utterance;
  $('greet-label').textContent = '인사 멈추기';
  $('voice-message').textContent = '목소리를 준비하고 있어요…';
  const finish = message => {
    if (version !== speechVersion) return;
    stopSpeech();
    $('voice-message').textContent = message;
  };
  utterance.onstart = () => {
    if (version !== speechVersion) return;
    setState('speaking');
    $('caption-text').textContent = phrase;
    $('speech-caption').hidden = false;
    $('voice-message').textContent = '영어 인사 중이에요. 다시 누르면 멈춰요.';
    clearTimeout(speechTimeout);
    speechTimeout = setTimeout(() => finish('재생 시간이 길어져 멈췄어요. 다시 눌러 주세요.'), 60000);
  };
  utterance.onend = () => finish('음성 재생이 끝났어요. 안 들렸다면 다른 영어 목소리를 골라 주세요.');
  utterance.onerror = event => finish(event.error === 'not-allowed'
    ? '기기에서 음성을 허용한 뒤 다시 눌러 주세요.'
    : '목소리를 재생하지 못했어요. 다른 영어 목소리를 골라 주세요.');
  speechTimeout = setTimeout(() => finish('음성이 시작되지 않았어요. 기기의 영어 음성 설정을 확인해 주세요.'), 12000);
  try { synthesis.speak(utterance); }
  catch { finish('이 브라우저에서는 음성을 재생하지 못했어요. 표정은 눌러 볼 수 있어요.'); }
}

function updateVoices() {
  const previous = $('voice').value;
  englishVoices = synthesis?.getVoices().filter(voice => /^en(?:-|_)/i.test(voice.lang)) || [];
  $('voice').replaceChildren(new Option('기기의 기본 영어 목소리', ''));
  englishVoices.forEach(voice => $('voice').add(new Option(`${voice.name} · ${voice.lang}`, voice.voiceURI)));
  if (englishVoices.some(voice => voice.voiceURI === previous)) $('voice').value = previous;
  if (!speechSupported) $('voice-message').textContent = '이 브라우저는 음성을 지원하지 않아요. 표정과 동작을 살펴보세요.';
}

function showLoadError(message) {
  ready = false;
  stopSpeech();
  updateControls();
  $('stage').setAttribute('aria-busy', 'false');
  $('load-screen').hidden = false;
  $('load-message').textContent = message;
  $('retry').hidden = false;
}

async function selectTeacher(id) {
  const version = ++loadVersion;
  stopSpeech();
  selected = TEACHERS[id];
  ready = false;
  updateControls();
  teacherButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.teacher === id)));
  $('stage-name').textContent = selected.englishName;
  $('teacher-name').textContent = selected.name;
  $('teacher-description').textContent = selected.description;
  $('personality').replaceChildren(...selected.traits.map(trait => {
    const span = document.createElement('span');
    span.textContent = trait;
    return span;
  }));
  $('speech-text').value = selected.greeting;
  $('avatar').setAttribute('aria-label', `${selected.name} 선생님의 움직이는 3D 아바타`);
  document.documentElement.style.setProperty('--accent', selected.accent);
  document.documentElement.style.setProperty('--room', selected.room);
  $('stage').setAttribute('aria-busy', 'true');
  $('load-screen').hidden = false;
  $('retry').hidden = true;
  $('load-message').textContent = `${selected.name} 선생님이 오고 있어요`;
  $('voice-message').textContent = speechSupported ? '눌러서 영어 인사를 들어 보세요.' : '이 브라우저는 음성을 지원하지 않아요. 표정과 동작을 살펴보세요.';
  try {
    if (!avatar) {
      avatar = new TeacherAvatar($('avatar'), { onContextLost: () => showLoadError('3D 화면이 잠시 멈췄어요. 다시 불러와 주세요.') });
      avatar.setReducedMotion($('reduce-motion').checked);
    }
    const loaded = await avatar.load(selected.model, progress => {
      if (version === loadVersion) $('load-message').textContent = progress >= 1
        ? '표정과 움직임을 준비하고 있어요…'
        : `${selected.name} 선생님이 오고 있어요${progress ? ` · ${Math.round(progress * 100)}%` : ''}`;
    });
    if (!loaded || version !== loadVersion) return;
    ready = true;
    updateControls();
    $('stage').setAttribute('aria-busy', 'false');
    $('load-screen').hidden = true;
  } catch (error) {
    if (version !== loadVersion) return;
    console.error('Teacher avatar could not load:', error);
    showLoadError('선생님을 불러오지 못했어요. 연결과 브라우저의 3D 지원을 확인해 주세요.');
  }
}

teacherButtons.forEach(button => button.addEventListener('click', () => {
  if (button.dataset.teacher !== selected.id) selectTeacher(button.dataset.teacher);
}));
stateButtons.forEach(button => button.addEventListener('click', () => {
  stopSpeech();
  setState(button.dataset.state);
  $('voice-message').textContent = '지금은 소리 없이 표정과 동작만 미리 보고 있어요.';
}));
$('greet').addEventListener('click', () => {
  if (currentSpeech) {
    stopSpeech();
    $('voice-message').textContent = '인사를 멈췄어요. 준비되면 다시 눌러 주세요.';
  } else speak(selected.greeting);
});
$('read-text').addEventListener('click', () => speak($('speech-text').value));
$('retry').addEventListener('click', () => {
  if (avatar?.contextLost) { window.location.reload(); return; }
  selectTeacher(selected.id);
});
function applyMotionPreference(reduced) {
  $('reduce-motion').checked = reduced;
  document.documentElement.classList.toggle('reduced-motion', reduced);
  avatar?.setReducedMotion(reduced);
}
$('reduce-motion').addEventListener('change', event => applyMotionPreference(event.target.checked));
motionPreference.addEventListener('change', event => applyMotionPreference(event.matches));
applyMotionPreference(motionPreference.matches);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeech(); });
window.addEventListener('pagehide', () => stopSpeech());
synthesis?.addEventListener('voiceschanged', updateVoices);
updateVoices();
selectTeacher('mina');
if (import.meta.hot) import.meta.hot.dispose(() => { stopSpeech(); avatar?.dispose(); });
