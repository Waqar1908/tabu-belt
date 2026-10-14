import * as THREE from 'three';
import { createLeatherMaps } from './leather-texture';

/**
 * Procedural belt. CONTRACT for a replacement GLB: return a Group whose ring axis is +Y,
 * ring radius ≈ BELT.radius, centred on the origin, with the buckle facing +Z.
 * (See README — "Swapping in a GLB".)
 */
export const BELT = { radius: 1.5, width: 0.4, thickness: 0.05 } as const;

const TAIL_START = 0.17;
const TAIL_LEN = 0.94;
const TAIL_END = TAIL_START + TAIL_LEN;

/** Chamfered rectangular strap section, revolved around Y. */
function strapProfile(inner: number, thickness: number, width: number, chamfer = 0.012): THREE.Vector2[] {
  const h = width / 2, o = inner + thickness, c = chamfer;
  return [
    [inner + c, -h], [o - c, -h], [o, -h + c], [o, h - c],
    [o - c, h], [inner + c, h], [inner, h - c], [inner, -h + c], [inner + c, -h],
  ].map(([x, y]) => new THREE.Vector2(x, y));
}

function roundedRect(path: THREE.Path, w: number, h: number, r: number): void {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
}

export function createBelt(anisotropy: number): THREE.Group {
  const { radius: R, width: W, thickness: T } = BELT;
  const group = new THREE.Group();
  group.name = 'belt';

  const maps = createLeatherMaps(512, anisotropy);
  const leather = (repU: number, repV: number): THREE.MeshPhysicalMaterial => {
    const map = maps.color.clone();
    const bump = maps.bump.clone();
    for (const t of [map, bump]) { t.repeat.set(repU, repV); t.needsUpdate = true; }
    return new THREE.MeshPhysicalMaterial({
      map, bumpMap: bump, bumpScale: 2.2, roughness: 0.5,
      clearcoat: 0.4, clearcoatRoughness: 0.5, side: THREE.DoubleSide,
    });
  };
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b46a, metalness: 1, roughness: 0.18, envMapIntensity: 1.7 });
  const thread = new THREE.MeshStandardMaterial({ color: 0xd9c79e, roughness: 0.8 });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x0f0804, roughness: 1 });

  const outerR = R + T;
  const tailR = outerR + 0.003;
  const tailT = T * 0.9;
  const tailW = W * 0.88;
  const tailOuter = tailR + tailT;

  // Strap loop
  group.add(new THREE.Mesh(new THREE.LatheGeometry(strapProfile(R, T, W), 360), leather(26, 2)));

  // Tail lying over the strap, with rounded tip and punched holes
  group.add(new THREE.Mesh(
    new THREE.LatheGeometry(strapProfile(tailR, tailT, tailW, 0.01), 96, TAIL_START, TAIL_LEN),
    leather(3.9, 2),
  ));
  const tipGroup = new THREE.Group();
  tipGroup.rotation.y = TAIL_END;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(tailW / 2, tailW / 2, tailT, 40, 1, false, 0, Math.PI), leather(0.5, 0.5));
  tip.rotation.x = Math.PI / 2;
  tip.position.z = tailR + tailT / 2;
  tipGroup.add(tip);
  group.add(tipGroup);

  const holeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.01, 20);
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    g.rotation.y = 0.56 + i * 0.085;
    const h = new THREE.Mesh(holeGeo, holeMat);
    h.rotation.x = Math.PI / 2;
    h.position.z = tailOuter + 0.0005;
    g.add(h);
    group.add(g);
  }

  // Keeper loop
  group.add(new THREE.Mesh(
    new THREE.LatheGeometry(strapProfile(tailOuter + 0.006, 0.026, W * 1.08, 0.008), 20, 0.36, 0.1),
    leather(0.4, 1.6),
  ));

  // Saddle stitching — instanced capsules
  const stitchGeo = new THREE.CapsuleGeometry(0.0055, 0.05, 2, 6);
  stitchGeo.rotateZ(Math.PI / 2);
  const dummy = new THREE.Object3D();
  const stitchRow = (r: number, y: number, from: number, to: number): THREE.InstancedMesh => {
    const step = 0.085 / r;
    const count = Math.max(1, Math.floor((to - from) / step));
    const mesh = new THREE.InstancedMesh(stitchGeo, thread, count);
    for (let i = 0; i < count; i++) {
      const a = from + i * step;
      dummy.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      dummy.rotation.set(0, a, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  };
  const rowY = W / 2 - 0.045;
  for (const s of [-1, 1]) {
    group.add(stitchRow(outerR + 0.002, s * rowY, TAIL_END + 0.06, Math.PI * 2 - 0.34));
    group.add(stitchRow(tailOuter + 0.002, s * (tailW / 2 - 0.04), TAIL_START + 0.05, TAIL_END - 0.06));
  }

  // Buckle — machined frame, centre bar, prong
  const buckle = new THREE.Group();
  buckle.name = 'buckle';
  buckle.position.z = outerR + 0.07;
  const outline = new THREE.Shape();
  roundedRect(outline, 0.7, 0.58, 0.16);
  const hole = new THREE.Path();
  roundedRect(hole, 0.5, 0.38, 0.09);
  outline.holes.push(hole);
  const frameGeo = new THREE.ExtrudeGeometry(outline, {
    depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 6, curveSegments: 28,
  });
  frameGeo.translate(0, 0, -0.025);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.4, 24), gold);
  bar.position.x = -0.12;
  const prong = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.36, 8, 16), gold);
  prong.rotation.z = Math.PI / 2;
  prong.position.set(0.065, 0, 0.062);
  buckle.add(new THREE.Mesh(frameGeo, gold), bar, prong);
  group.add(buckle);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return group;
}
