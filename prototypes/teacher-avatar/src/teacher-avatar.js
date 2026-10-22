import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { sampleMotion } from './motion.js';

/** One canvas, one active VRM. Call dispose() when the owning view unmounts. */
export class TeacherAvatar {
  constructor(canvas, { onContextLost = () => {} } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    this.scene.add(new THREE.HemisphereLight(0xfff9ef, 0xaebfa9, 2));
    const key = new THREE.DirectionalLight(0xfff8ed, 2.4);
    key.position.set(-1, 2, 3);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xe4edff, 0.6);
    fill.position.set(2, 1, -1);
    this.scene.add(fill);
    this.loader = new GLTFLoader();
    this.loader.register(parser => new VRMLoaderPlugin(parser));
    this.state = 'idle';
    this.reduced = false;
    this.generation = 0;
    this.elapsed = 0;
    this.nextBlink = 2.5;
    this.blinkStart = -10;
    this.previousFrame = 0;
    this.disposed = false;
    this.onContextLost = event => {
      event.preventDefault();
      this.contextLost = true;
      onContextLost();
    };
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.tick = this.tick.bind(this);
    this.frame = requestAnimationFrame(this.tick);
  }

  async load(url, onProgress = () => {}) {
    const generation = ++this.generation;
    this.releaseModel();
    const gltf = await this.loader.loadAsync(url, event => {
      if (generation === this.generation) onProgress(event.total ? event.loaded / event.total : 0);
    });
    const vrm = gltf.userData.vrm;
    if (this.disposed || generation !== this.generation) {
      VRMUtils.deepDispose(gltf.scene);
      return false;
    }
    if (!vrm) {
      VRMUtils.deepDispose(gltf.scene);
      throw new Error('This file does not contain a VRM avatar.');
    }
    VRMUtils.rotateVRM0(vrm);
    VRMUtils.combineSkeletons(vrm.scene);
    vrm.scene.traverse(node => { if (node.isMesh) node.frustumCulled = false; });
    this.vrm = vrm;
    this.scene.add(vrm.scene);
    this.bones = Object.fromEntries(['head', 'neck', 'spine', 'chest'].map(name => [name, vrm.humanoid.getNormalizedBoneNode(name)]));
    this.lowerArms();
    vrm.update(0);
    vrm.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const head = this.bones.head.getWorldPosition(new THREE.Vector3());
    const height = box.max.y - box.min.y;
    this.framing = { top: box.max.y + height * 0.045, bottom: head.y - height * 0.25, x: head.x, z: head.z, width: height * 0.42 };
    if (vrm.lookAt) vrm.lookAt.target = this.camera;
    this.resize();
    this.elapsed = 0;
    this.nextBlink = 2.5;
    this.blinkStart = -10;
    return true;
  }

  lowerArms() {
    for (const side of ['left', 'right']) {
      const arm = this.vrm.humanoid.getNormalizedBoneNode(`${side}UpperArm`);
      const forearm = this.vrm.humanoid.getNormalizedBoneNode(`${side}LowerArm`);
      const hand = this.vrm.humanoid.getNormalizedBoneNode(`${side}Hand`);
      if (!arm || !forearm || !hand) continue;
      const sign = side === 'left' ? -1 : 1;
      arm.rotation.z = sign * 1.23;
      forearm.rotation.z = sign * 0.22;
      this.vrm.humanoid.update();
      this.vrm.scene.updateMatrixWorld(true);
      if (hand.getWorldPosition(new THREE.Vector3()).y > arm.getWorldPosition(new THREE.Vector3()).y) {
        arm.rotation.z *= -1;
        forearm.rotation.z *= -1;
      }
    }
  }

  resize() {
    const { width, height } = this.canvas.parentElement.getBoundingClientRect();
    if (!width || !height || this.disposed) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    if (this.framing) {
      const { top, bottom, x, z, width: modelWidth } = this.framing;
      const visibleHeight = Math.max(top - bottom, modelWidth / this.camera.aspect);
      const distance = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
      const center = (top + bottom) / 2;
      this.camera.position.set(x, center, z + distance);
      this.camera.lookAt(x, center, z);
    }
    this.camera.updateProjectionMatrix();
  }

  setState(state) {
    this.state = ['idle', 'speaking', 'listening', 'praise', 'thinking'].includes(state) ? state : 'idle';
  }

  setReducedMotion(reduced) { this.reduced = Boolean(reduced); }

  tick(timestamp) {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const delta = Math.min((timestamp - (this.previousFrame || timestamp)) / 1000, 0.05);
    this.previousFrame = timestamp;
    if (document.hidden || this.contextLost) return;
    this.elapsed += delta;
    if (this.vrm) {
      const pose = sampleMotion(this.state, this.elapsed, this.reduced);
      const blend = 1 - Math.exp(-delta * 7);
      const head = this.bones.head;
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, pose.headX, blend);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, pose.headY, blend);
      head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, pose.headZ, blend);
      if (this.bones.spine) {
        this.bones.spine.rotation.x = THREE.MathUtils.lerp(this.bones.spine.rotation.x, pose.bodyX, blend);
        this.bones.spine.rotation.y = THREE.MathUtils.lerp(this.bones.spine.rotation.y, pose.bodyY, blend);
      }
      if (!this.reduced && this.elapsed >= this.nextBlink) {
        this.blinkStart = this.elapsed;
        this.nextBlink = this.elapsed + 3 + Math.random() * 3;
      }
      const blinkAge = this.elapsed - this.blinkStart;
      const blink = !this.reduced && blinkAge < 0.18 ? Math.sin(blinkAge / 0.18 * Math.PI) : 0;
      const expression = this.vrm.expressionManager;
      expression?.setValue('blink', blink);
      expression?.setValue('happy', pose.smile);
      expression?.setValue('aa', pose.mouth * 0.8);
      expression?.setValue('oh', pose.mouth * (0.18 + 0.12 * Math.sin(this.elapsed * 7)));
      expression?.setValue('ee', pose.mouth * 0.15);
      this.vrm.update(delta);
    }
    this.renderer.render(this.scene, this.camera);
  }

  releaseModel() {
    if (!this.vrm) return;
    this.scene.remove(this.vrm.scene);
    VRMUtils.deepDispose(this.vrm.scene);
    this.vrm = null;
    this.bones = null;
  }

  dispose() {
    this.disposed = true;
    this.generation += 1;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.releaseModel();
    this.renderer.dispose();
  }
}
