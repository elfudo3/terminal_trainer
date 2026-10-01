/**
 * The three.js side of the Mors viewer. Loaded on demand by mors-model.ts.
 *
 * Behaviour: Mors turns to follow the pointer anywhere on the page, floats
 * and glances around when left alone, and can be dragged on touch screens.
 * Rendering pauses while the tab is hidden or the model is off-screen, and
 * everything is released by `dispose()`.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { easeFactor, fitScale, frameDistance, idleLook, pointerToLook, type Look } from "./mors-model";

export interface SceneOptions {
  src: string;
  reducedMotion: boolean;
}

export interface SceneHandle {
  dispose(): void;
}

const IDLE_AFTER_MS = 2500;

export async function mountScene(canvas: HTMLCanvasElement, opts: SceneOptions): Promise<SceneHandle> {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

  // Lighting matches the app: warm key light, violet rim, a touch of gold fill.
  scene.add(new THREE.HemisphereLight(0xdde4ff, 0x1a1030, 1.2));
  const key = new THREE.DirectionalLight(0xfff1d6, 2.0);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight(0x9d8cff, 1.8);
  rim.position.set(-3, 2, -3);
  const fill = new THREE.PointLight(0xf2b84b, 0.6, 10);
  fill.position.set(1.5, -1, 2);
  scene.add(key, rim, fill);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(opts.src);
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const scale = fitScale(size);
  model.scale.setScalar(scale);
  camera.position.set(0, 0.05, frameDistance(size.clone().multiplyScalar(scale), camera.fov));
  camera.lookAt(0, 0.02, 0);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  // ---- Interaction state ----------------------------------------------------
  const current: Look = { yaw: 0, pitch: 0 };
  let target: Look = { yaw: 0, pitch: 0 };
  let lift = 0;
  let lastPointerAt = -Infinity;
  let dragging = false;
  let dragX = 0;
  let dragYaw = 0;

  const onPointerMove = (event: PointerEvent) => {
    if (dragging) {
      target = { yaw: dragYaw + (event.clientX - dragX) * 0.01, pitch: target.pitch };
      return;
    }
    if (event.pointerType === "touch") return; // touch only steers by dragging
    const rect = canvas.getBoundingClientRect();
    target = pointerToLook(event.clientX, event.clientY, window.innerWidth, window.innerHeight, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    lastPointerAt = performance.now();
  };
  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    dragX = event.clientX;
    dragYaw = current.yaw;
    lastPointerAt = performance.now();
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onPointerUp = () => {
    dragging = false;
    lastPointerAt = performance.now();
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  canvas.style.touchAction = "pan-y"; // vertical page scrolling still works over the model

  // ---- Sizing -----------------------------------------------------------------
  const resize = () => {
    const parent = canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth ?? 1);
    const h = Math.max(1, parent?.clientHeight ?? w);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

  // ---- Render loop, paused when hidden or off-screen -------------------------
  let frame = 0;
  let last = performance.now();
  let visible = true;
  const tick = (now: number) => {
    frame = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const idle = !dragging && now - lastPointerAt > IDLE_AFTER_MS;
    if (idle && !opts.reducedMotion) {
      const look = idleLook(t);
      target = { yaw: look.yaw, pitch: look.pitch };
      lift = look.lift;
    } else if (idle) {
      target = { yaw: 0, pitch: 0.02 };
      lift = 0;
    }
    const k = easeFactor(dt, dragging ? 14 : 6);
    current.yaw += (target.yaw - current.yaw) * k;
    current.pitch += (target.pitch - current.pitch) * k;
    pivot.rotation.set(current.pitch, current.yaw, 0);
    pivot.position.y = lift;
    renderer.render(scene, camera);
    if (visible) frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (!frame && visible) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const onVisibility = () => {
    visible = !document.hidden && inView;
    if (visible) start();
    else stop();
  };
  let inView = true;
  const intersection = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    onVisibility();
  });
  intersection.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  start();

  return {
    dispose: () => {
      stop();
      visible = false;
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const material of materials) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
