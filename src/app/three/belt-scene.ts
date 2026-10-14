import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createBelt } from './belt.factory';
import { createDust } from './dust';

/** Everything the scroll timeline is allowed to animate. */
export interface SceneRig {
  camera: THREE.PerspectiveCamera;
  lookAt: THREE.Vector3;
  belt: THREE.Object3D;
  key: THREE.SpotLight;
  rim: THREE.SpotLight;
  gold: THREE.PointLight;
  dust: THREE.Object3D;
  exposure: { value: number };
  intro: { value: number };
}

function disposeMaterial(mat: THREE.Material): void {
  for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
  mat.dispose();
}

export class BeltScene {
  readonly rig: SceneRig;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  private readonly camRig = new THREE.Group();
  private readonly floatGroup = new THREE.Group();
  private readonly pointer = new THREE.Vector2();
  private readonly parallax = new THREE.Vector2();
  private readonly key: THREE.SpotLight;
  private dpr: number;
  private time = 0;
  private last = performance.now();
  private frames = 0;
  private slowAcc = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly reduced: boolean) {
    this.dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.fog = new THREE.FogExp2(0x050403, 0.03);

    // Studio reflections for the gold, generated procedurally — no HDR download.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.5;
    room.dispose();
    pmrem.dispose();

    // Camera on a parallax rig
    this.camera.position.set(0, 1.5, 6.2);
    this.camRig.add(this.camera);
    this.scene.add(this.camRig);

    // Belt
    const pivot = new THREE.Group();
    pivot.rotation.set(0.22, -0.35, 0);
    this.floatGroup.add(createBelt(this.renderer.capabilities.getMaxAnisotropy()));
    pivot.add(this.floatGroup);
    this.scene.add(pivot);

    // Lighting
    this.key = new THREE.SpotLight(0xfff1dc, 160, 24, Math.PI / 5, 0.6, 2);
    this.key.position.set(-3.2, 5, 4.5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    const rim = new THREE.SpotLight(0xffd9a0, 140, 24, Math.PI / 4, 0.7, 2);
    rim.position.set(3.5, 2.5, -4.5);
    const gold = new THREE.PointLight(0xffb86b, 0, 8, 2);
    gold.position.set(1.2, 0.8, 3.7);
    this.scene.add(this.key, rim, gold);

    // Floor that only receives the belt's shadow
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.55 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.15;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const dust = createDust(reducedCount(reduced));
    this.scene.add(dust);

    this.rig = {
      camera: this.camera,
      lookAt: new THREE.Vector3(0, -0.1, 0.2),
      belt: pivot,
      key: this.key,
      rim,
      gold,
      dust,
      exposure: { value: 1 },
      intro: { value: 0 },
    };

    if (!reduced) window.addEventListener('pointermove', this.onPointer, { passive: true });
    this.resize();
  }

  start(): void { this.renderer.setAnimationLoop(this.tick); }
  stop(): void { this.renderer.setAnimationLoop(null); }

  resize(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    const a = w / h;
    this.camera.aspect = a;
    this.camera.fov = a < 0.7 ? 64 : a < 1 ? 50 : 36; // keep the ring framed on portrait phones
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('pointermove', this.onPointer);
    this.scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) if (mat) disposeMaterial(mat);
    });
    this.key.shadow.map?.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private readonly onPointer = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };

  private readonly tick = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.time += dt;
    this.adaptQuality(dt);

    const { intro, exposure, lookAt, dust } = this.rig;
    this.renderer.toneMappingExposure = exposure.value * intro.value;

    const t = this.time;
    this.floatGroup.position.y = (1 - intro.value) * -0.6 + (this.reduced ? 0 : Math.sin(t * 0.8) * 0.035);
    this.floatGroup.rotation.z = this.reduced ? 0 : Math.sin(t * 0.5) * 0.012;

    this.parallax.lerp(this.pointer, 0.05);
    this.camRig.position.set(this.parallax.x * 0.25, -this.parallax.y * 0.15, 0);
    this.camera.lookAt(lookAt);

    if (!this.reduced) dust.rotation.y = t * 0.015;
    this.renderer.render(this.scene, this.camera);
  };

  /** If the first ~2s after the intro run slowly, drop to 1× pixel ratio once. */
  private adaptQuality(dt: number): void {
    if (this.rig.intro.value < 1 || this.dpr <= 1) return;
    this.frames++;
    if (this.frames > 40 && this.frames <= 160) this.slowAcc += dt;
    if (this.frames === 160 && this.slowAcc / 120 > 0.026) {
      this.dpr = 1;
      this.resize();
    }
  }
}

function reducedCount(reduced: boolean): number {
  return reduced ? 120 : window.innerWidth < 768 ? 260 : 480;
}
