import * as THREE from 'three';

export interface LeatherMaps {
  color: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

function canvas2d(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return [c, ctx];
}

/** Procedural pebbled-calfskin maps (colour + bump). One 512px canvas each keeps memory tiny. */
export function createLeatherMaps(size: number, anisotropy: number): LeatherMaps {
  const [bumpCanvas, b] = canvas2d(size);
  b.fillStyle = '#7a7a7a';
  b.fillRect(0, 0, size, size);

  const pebbles = Math.floor((size * size) / 46);
  for (let i = 0; i < pebbles; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1.6 + Math.random() * 3.4;
    const g = b.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.6)');
    g.addColorStop(0.7, 'rgba(60,60,60,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = g;
    b.fillRect(x - r, y - r, r * 2, r * 2);
  }
  b.strokeStyle = 'rgba(0,0,0,0.18)';
  b.lineWidth = 0.8;
  for (let i = 0; i < size * 1.2; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const a = Math.random() * Math.PI * 2, l = 3 + Math.random() * 7;
    b.beginPath();
    b.moveTo(x, y);
    b.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    b.stroke();
  }

  const [colorCanvas, c] = canvas2d(size);
  c.fillStyle = '#5b3420';
  c.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 40 + Math.random() * 90;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const tone = i % 2 ? 'rgba(20,8,2,0.16)' : 'rgba(150,90,50,0.10)';
    g.addColorStop(0, tone);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.globalCompositeOperation = 'soft-light';
  c.globalAlpha = 0.85;
  c.drawImage(bumpCanvas, 0, 0);

  const make = (cv: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { color: make(colorCanvas, true), bump: make(bumpCanvas, false) };
}
