import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SceneRig } from '../three/belt-scene';

const TAU = Math.PI * 2;

/**
 * Directs the whole film. One scrubbed master timeline (0–10) is mapped to the scroll
 * height of the page; chapter copy is faded in/out by its own scrubbed triggers.
 *
 *   0 ─ 2.4   Hero → macro on the buckle
 *   2.4 ─ 4.4 Push in on leather + stitching as the strap passes the lens
 *   4.4 ─ 7.2 Pull up and over, one full 360° turn to expose the construction
 *   7.2 ─ 8.8 Side-lit buckle detail
 *   8.8 ─ 10  Settle into the hero composition
 */
export class ScrollDirector {
  private ctx?: gsap.Context;

  constructor(private readonly rig: SceneRig, private readonly reduced: boolean) {}

  init(root: HTMLElement): void {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    this.ctx = gsap.context(() => {
      this.intro(root);
      this.film(root);
      this.chapters(root);
      this.rail(root);
    }, root);
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }

  dispose(): void {
    this.ctx?.revert();
  }

  private $(root: HTMLElement, sel: string): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(sel));
  }

  private intro(root: HTMLElement): void {
    if (this.reduced) {
      this.rig.intro.value = 1;
    } else {
      gsap.to(this.rig.intro, { value: 1, duration: 2.8, ease: 'power2.inOut', delay: 0.15 });
      gsap.from(this.$(root, '[data-line]'), { yPercent: 115, duration: 1.5, ease: 'expo.out', stagger: 0.12, delay: 1.1 });
      gsap.from(this.$(root, '[data-intro]'), { autoAlpha: 0, y: 20, duration: 1.2, stagger: 0.1, delay: 1.6 });
    }
    gsap.to(this.$(root, '[data-hero-copy]'), {
      autoAlpha: 0, yPercent: this.reduced ? 0 : -8, ease: 'none',
      scrollTrigger: { trigger: this.$(root, '[data-hero]')[0], start: 'top top', end: '55% top', scrub: true },
    });
  }

  private film(root: HTMLElement): void {
    const { camera, lookAt, belt, key, rim, gold, dust, exposure } = this.rig;
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: this.reduced ? true : 1.4 },
    });

    // A — hero to buckle macro
    tl.to(camera.position, { x: 0.6, y: 0.32, z: 3.55, duration: 2.4 }, 0)
      .to(lookAt, { x: 0.05, y: 0, z: 1.5, duration: 2.4 }, 0)
      .to(belt.rotation, { x: 0, y: 0.1, duration: 2.4 }, 0)
      .to(gold, { intensity: 5, duration: 2.4 }, 0)
      // B — leather and stitching pass the lens
      .to(camera.position, { x: 0.2, y: 0.16, z: 2.6, duration: 2 }, 2.4)
      .to(lookAt, { x: 0, y: 0, z: 1.5, duration: 2 }, 2.4)
      .to(belt.rotation, { y: 0.95, duration: 2 }, 2.4)
      .to(key, { intensity: 120, duration: 2 }, 2.4)
      // C — engineering: high angle, full 360°
      .to(camera.position, { x: 0, y: 2.6, z: 5.2, duration: 2.8 }, 4.4)
      .to(lookAt, { x: 0, y: 0, z: 0, duration: 2.8 }, 4.4)
      .to(belt.rotation, { x: 0.3, y: 0.95 + TAU, duration: 2.8 }, 4.4)
      .to(rim, { intensity: 260, duration: 2.8 }, 4.4)
      .to(gold, { intensity: 0, duration: 2.8 }, 4.4)
      .to(exposure, { value: 0.92, duration: 2.8 }, 4.4)
      // D — side-lit buckle, belt pushed to the right of frame
      .to(camera.position, { x: -0.9, y: 0.5, z: 3.7, duration: 1.6 }, 7.2)
      .to(lookAt, { x: -0.75, y: 0, z: 1.5, duration: 1.6 }, 7.2)
      .to(belt.rotation, { x: 0, y: TAU, duration: 1.6 }, 7.2)
      .to(gold, { intensity: 6, duration: 1.6 }, 7.2)
      .to(rim, { intensity: 170, duration: 1.6 }, 7.2)
      // E — final hero composition
      .to(camera.position, { x: 0, y: 0.8, z: 5.9, duration: 1.2 }, 8.8)
      .to(lookAt, { x: 0, y: 0.45, z: 0.2, duration: 1.2 }, 8.8)
      .to(belt.rotation, { x: 0.2, y: TAU - 0.35, duration: 1.2 }, 8.8)
      .to(gold, { intensity: 0, duration: 1.2 }, 8.8)
      .to(rim, { intensity: 200, duration: 1.2 }, 8.8)
      .to(key, { intensity: 170, duration: 1.2 }, 8.8)
      .to(exposure, { value: 1.1, duration: 1.2 }, 8.8)
      // Parallax on the dust for the whole film
      .to(dust.position, { y: 2.5, duration: 10, ease: 'none' }, 0);
  }

  private chapters(root: HTMLElement): void {
    const sections = this.$(root, '[data-chapter]');
    sections.forEach((sec) => {
      const items = Array.from(sec.querySelectorAll<HTMLElement>('[data-reveal]'));
      const last = sec.hasAttribute('data-last');
      const lift = this.reduced ? 0 : 48;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: last ? 'top 60%' : 'top 65%',
          end: last ? 'bottom bottom' : 'bottom 35%',
          scrub: true,
        },
      });
      tl.fromTo(items, { autoAlpha: 0, y: lift }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.22, ease: 'power2.out' }, 0);
      if (!last) {
        tl.to(items, { autoAlpha: 0, y: -lift * 0.65, stagger: 0.03, duration: 0.18, ease: 'power2.in' }, 0.72);
      }
    });
  }

  private rail(root: HTMLElement): void {
    gsap.fromTo(
      Array.from(document.querySelectorAll<HTMLElement>('[data-progress]')),
      { scaleY: 0 },
      { scaleY: 1, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: true } },
    );
  }
}
