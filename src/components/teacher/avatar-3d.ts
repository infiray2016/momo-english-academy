// 3D 선생님 그림 층(선생님 화면 plan 값 14, 10절 '선생님 그림' 행 · C115 · C122). 시제품 prototypes/teacher-avatar/src/teacher-avatar.js 를
// TypeScript 로 옮겼다. 캔버스 하나에 VRM 하나. 이 모듈은 그림 층 보관 조각(teacher-layer.tsx)이 동적 가져오기로만 받는다 — three ·
// three-vrm 을 가져오는 곳은 앱에서 여기 하나다(의존 규칙 three-only-in-avatar · avatar-only-dynamic, NFR-2).
// 시제품과 바뀐 것: (1) load 는 fetch(signal) → arrayBuffer → parseAsync(멈출 수 있음) (2) 첫 장을 그리면 onFirstFrame (3) 맥락 잃음 ·
// 장 그리기 오류는 onFailure(다시 불러오기 안내 없음) (4) dispose 는 한 번만, 뒤에 momo:teacher { type: "dispose" } (5) 크기는
// 캔버스 칸을 ResizeObserver 로 (6) 움직임 · 깜빡임은 core(sampleMotion · blinkAt) (7) 그린 장 수를 1초마다 data-teacher-frames, 적은 때
// (requestAnimationFrame 시각 — performance.now 시간축)를 data-teacher-frames-at (8) 첫 장 뒤에는 캔버스가 문서에서 떨어졌거나 크기가
// 0 이면 그리지 않는다('시작!' 화면의 숨긴 칸 · 대화 중 막힘 · 쉼 — GPU 가 쉼, 검토 4 M-1).
// 상수(그리기 빈도 — 매 장 · 화소 비율 · 섞기 · 깜빡임 간격 · 빛 · 카메라)는 시제품 값이고 iPad 실측 뒤 고친다(d10, C72 화면 꼴 상수).
import { type VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  type AvatarCallbacks,
  TEACHER_EVENT,
  type TeacherAvatarHandle,
  type TeacherLayerSignal,
} from "@/core/teacher/layer";
import {
  blinkAt,
  sampleMotion,
  TEACHER_STATES,
  type TeacherState,
} from "@/core/teacher/state";

/** 화소 비율 상한(시제품 값 — iPad 실측 뒤 고침). */
export const PIXEL_RATIO_MAX = 1.75;
/** 자세 섞기 빠르기(1 - exp(-delta × BLEND_RATE), 시제품 값). */
export const BLEND_RATE = 7;
/** 한 장 사이 시간 상한(초 — 쪽이 멈췄다 돌아와도 움직임이 튀지 않게, 시제품 값). */
const DELTA_MAX_SECONDS = 0.05;
/** 다음 깜빡임까지(초): 처음 · 간격 최소 · 간격 폭(3~6초, 시제품 값). */
const BLINK = { first: 2.5, minGap: 3, spread: 3 } as const;
/** 그린 장 수를 캔버스 속성에 적는 간격(ms). */
const FRAMES_EVERY_MS = 1000;
/** 카메라(시야각 · 가까운 면 · 먼 면, 시제품 값). */
const CAMERA = { fov: 30, near: 0.05, far: 20 } as const;
/**
 * 화면에 담는 범위: 머리 위 여유 · 머리 아래 · 너비(모델 키에 대한 비). 머리 위 여유는 시제품 값, 머리 아래 · 너비는 화면 검토 1 M-2 가
 * 가슴 위로 당김(시제품 0.25 · 0.42 는 허리까지라 얼굴이 초상의 절반 아래 — 4절 '상반신과 눈 맞춤').
 */
const FRAMING = { top: 0.045, belowHead: 0.15, width: 0.34 } as const;
/** 팔 내리기(라디안, 시제품 값). */
const ARMS = { upper: 1.23, lower: 0.22 } as const;
/** 표정 무게(시제품 값): 입 aa · oh(흔들림) · ee. */
const MOUTH = {
  aa: 0.8,
  ohBase: 0.18,
  ohSwing: 0.12,
  ohRate: 7,
  ee: 0.15,
} as const;
/** 빛 셋(시제품 값): 반구 빛(하늘 · 땅 색 · 세기) · 주 빛 · 보조 빛(색 · 세기 · 위치). */
const LIGHTS = {
  hemisphere: { sky: 0xfff9ef, ground: 0xaebfa9, intensity: 2 },
  key: { color: 0xfff8ed, intensity: 2.4, position: [-1, 2, 3] },
  fill: { color: 0xe4edff, intensity: 0.6, position: [2, 1, -1] },
} as const;
/** 아직 깜빡이지 않음(깜빡임 시작 시각 — 첫 깜빡임 전에 눈을 감지 않게 아주 앞, 시제품 값). */
const NO_BLINK_YET = -10;
const MS_PER_SECOND = 1000;
const BONES = ["head", "neck", "spine", "chest"] as const;

type Framing = {
  top: number;
  bottom: number;
  x: number;
  z: number;
  width: number;
};

class TeacherAvatar implements TeacherAvatarHandle {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    1,
    CAMERA.near,
    CAMERA.far,
  );
  private readonly loader = new GLTFLoader();
  private readonly resizeObserver: ResizeObserver;
  private vrm: VRM | null = null;
  private bones: Partial<
    Record<(typeof BONES)[number], THREE.Object3D | null>
  > = {};
  private framing: Framing | null = null;
  private state: TeacherState = "idle";
  private reduced = false;
  private generation = 0;
  private elapsed = 0;
  private nextBlink: number = BLINK.first;
  private blinkStart = NO_BLINK_YET;
  /** 캔버스 크기가 0 인가(ResizeObserver 가 resize 에서 적음 — 첫 장 뒤 그리기 건너뜀). */
  private empty = true;
  private previousFrame = 0;
  private frame = 0;
  private frames = 0;
  private framesWrittenAt = 0;
  private firstFrameSent = false;
  private contextLost = false;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: AvatarCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, PIXEL_RATIO_MAX),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const { hemisphere } = LIGHTS;
    this.scene.add(
      new THREE.HemisphereLight(
        hemisphere.sky,
        hemisphere.ground,
        hemisphere.intensity,
      ),
    );
    for (const light of [LIGHTS.key, LIGHTS.fill]) {
      const directional = new THREE.DirectionalLight(
        light.color,
        light.intensity,
      );
      const [x, y, z] = light.position;
      directional.position.set(x, y, z);
      this.scene.add(directional);
    }
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.dataset.teacherFrames = "0";
    canvas.dataset.teacherFramesAt = String(performance.now());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
  }

  async load(url: string, signal: AbortSignal): Promise<boolean> {
    this.generation += 1;
    const generation = this.generation;
    this.releaseModel();
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`모델 받기 실패 ${response.status}`);
    const buffer = await response.arrayBuffer();
    const gltf = await this.loader.parseAsync(buffer, "");
    const vrm = gltf.userData.vrm as VRM | undefined;
    if (this.disposed || signal.aborted || generation !== this.generation) {
      VRMUtils.deepDispose(gltf.scene);
      return false;
    }
    if (!vrm) {
      VRMUtils.deepDispose(gltf.scene);
      throw new Error("VRM 이 아닌 파일");
    }
    VRMUtils.rotateVRM0(vrm);
    VRMUtils.combineSkeletons(vrm.scene);
    vrm.scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) node.frustumCulled = false;
    });
    this.vrm = vrm;
    this.scene.add(vrm.scene);
    this.bones = Object.fromEntries(
      BONES.map((name) => [name, vrm.humanoid.getNormalizedBoneNode(name)]),
    );
    this.lowerArms(vrm);
    vrm.update(0);
    vrm.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const head = (this.bones.head ?? vrm.scene).getWorldPosition(
      new THREE.Vector3(),
    );
    const height = box.max.y - box.min.y;
    this.framing = {
      top: box.max.y + height * FRAMING.top,
      bottom: head.y - height * FRAMING.belowHead,
      x: head.x,
      z: head.z,
      width: height * FRAMING.width,
    };
    if (vrm.lookAt) vrm.lookAt.target = this.camera;
    this.resize();
    this.elapsed = 0;
    this.nextBlink = BLINK.first;
    this.blinkStart = NO_BLINK_YET;
    return true;
  }

  setState(state: TeacherState): void {
    this.state = TEACHER_STATES.includes(state) ? state : "idle";
  }

  setReducedMotion(reduced: boolean): void {
    this.reduced = reduced;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.releaseModel();
    this.renderer.dispose();
    // GPU 메모리를 바로 놓는다(마무리에서 일찍 풂 — 맥락 잃음 처리기는 위에서 뗐다)
    if (!this.contextLost) this.renderer.forceContextLoss();
    const signal: TeacherLayerSignal = { type: "dispose" };
    window.dispatchEvent(new CustomEvent(TEACHER_EVENT, { detail: signal }));
  }

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    this.callbacks.onFailure("context-lost");
  };

  private lowerArms(vrm: VRM) {
    for (const side of ["left", "right"] as const) {
      const arm = vrm.humanoid.getNormalizedBoneNode(`${side}UpperArm`);
      const forearm = vrm.humanoid.getNormalizedBoneNode(`${side}LowerArm`);
      const hand = vrm.humanoid.getNormalizedBoneNode(`${side}Hand`);
      if (!arm || !forearm || !hand) continue;
      const sign = side === "left" ? -1 : 1;
      arm.rotation.z = sign * ARMS.upper;
      forearm.rotation.z = sign * ARMS.lower;
      vrm.humanoid.update();
      vrm.scene.updateMatrixWorld(true);
      if (
        hand.getWorldPosition(new THREE.Vector3()).y >
        arm.getWorldPosition(new THREE.Vector3()).y
      ) {
        arm.rotation.z *= -1;
        forearm.rotation.z *= -1;
      }
    }
  }

  private resize() {
    if (this.disposed) return;
    const { width, height } = this.canvas.getBoundingClientRect();
    this.empty = !width || !height;
    if (this.empty) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    if (this.framing) {
      const { top, bottom, x, z, width: modelWidth } = this.framing;
      const visibleHeight = Math.max(
        top - bottom,
        modelWidth / this.camera.aspect,
      );
      const distance =
        visibleHeight /
        (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
      const center = (top + bottom) / 2;
      this.camera.position.set(x, center, z + distance);
      this.camera.lookAt(x, center, z);
    }
    this.camera.updateProjectionMatrix();
  }

  private readonly tick = (timestamp: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const delta = Math.min(
      (timestamp - (this.previousFrame || timestamp)) / MS_PER_SECOND,
      DELTA_MAX_SECONDS,
    );
    this.previousFrame = timestamp;
    // 쪽이 숨으면 그리지 않는다(그린 장 수도 그대로 — AC-19h). 첫 장 뒤에는 보이지 않는 캔버스(문서에서 떨어짐 · 크기 0)에도
    // 그리지 않는다(검토 4 M-1 — 첫 장은 숨긴 칸에서도 그려야 3D 가 된다)
    if (document.hidden || this.contextLost) return;
    if (this.firstFrameSent && (!this.canvas.isConnected || this.empty)) return;
    this.elapsed += delta;
    try {
      const vrm = this.vrm;
      if (vrm) this.pose(vrm, delta);
      this.renderer.render(this.scene, this.camera);
    } catch {
      this.contextLost = true;
      this.callbacks.onFailure("context-lost");
      return;
    }
    this.frames += 1;
    if (this.vrm && !this.firstFrameSent) {
      this.firstFrameSent = true;
      this.writeFrames(timestamp);
      this.callbacks.onFirstFrame();
    } else if (timestamp - this.framesWrittenAt >= FRAMES_EVERY_MS) {
      this.writeFrames(timestamp);
    }
  };

  /** 그린 장 수와 적은 때를 캔버스 속성에 적는다(관찰 쪽이 두 값의 차이로 초당 장 수를 잼 — 검토 4 M-2). */
  private writeFrames(timestamp: number) {
    this.canvas.dataset.teacherFrames = String(this.frames);
    this.canvas.dataset.teacherFramesAt = String(timestamp);
    this.framesWrittenAt = timestamp;
  }

  private pose(vrm: VRM, delta: number) {
    const target = sampleMotion(this.state, this.elapsed, this.reduced);
    const blend = 1 - Math.exp(-delta * BLEND_RATE);
    const lerp = THREE.MathUtils.lerp;
    const head = this.bones.head;
    if (head) {
      head.rotation.x = lerp(head.rotation.x, target.headX, blend);
      head.rotation.y = lerp(head.rotation.y, target.headY, blend);
      head.rotation.z = lerp(head.rotation.z, target.headZ, blend);
    }
    const spine = this.bones.spine;
    if (spine) {
      spine.rotation.x = lerp(spine.rotation.x, target.bodyX, blend);
      spine.rotation.y = lerp(spine.rotation.y, target.bodyY, blend);
    }
    if (!this.reduced && this.elapsed >= this.nextBlink) {
      this.blinkStart = this.elapsed;
      this.nextBlink =
        this.elapsed + BLINK.minGap + Math.random() * BLINK.spread;
    }
    const blink = blinkAt({
      elapsed: this.elapsed,
      blinkStart: this.blinkStart,
      reduced: this.reduced,
    });
    const expression = vrm.expressionManager;
    expression?.setValue("blink", blink);
    expression?.setValue("happy", target.smile);
    expression?.setValue("aa", target.mouth * MOUTH.aa);
    expression?.setValue(
      "oh",
      target.mouth *
        (MOUTH.ohBase + MOUTH.ohSwing * Math.sin(this.elapsed * MOUTH.ohRate)),
    );
    expression?.setValue("ee", target.mouth * MOUTH.ee);
    vrm.update(delta);
  }

  private releaseModel() {
    const vrm = this.vrm;
    if (!vrm) return;
    this.scene.remove(vrm.scene);
    VRMUtils.deepDispose(vrm.scene);
    this.vrm = null;
    this.bones = {};
    this.framing = null;
  }
}

/** 3D 그림 층을 만든다. WebGL 맥락을 못 만들면 던진다(보관 조각이 no-webgl 로 다룸). */
export function createTeacherAvatar(
  canvas: HTMLCanvasElement,
  callbacks: AvatarCallbacks,
): TeacherAvatarHandle {
  return new TeacherAvatar(canvas, callbacks);
}
