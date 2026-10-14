import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy,
  inject, input, output, viewChild,
} from '@angular/core';
import { ScrollDirector } from '../animation/scroll-director';
import { BeltScene } from '../three/belt-scene';

/**
 * Owns the WebGL canvas. Created lazily by `@defer` so three.js + gsap live in their own chunk.
 * All rendering and animation run outside Angular's zone; everything is torn down in ngOnDestroy.
 */
@Component({
  selector: 'app-belt-stage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="stage" aria-hidden="true"></canvas>`,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 1; display: block; pointer-events: none; }
    .stage { display: block; width: 100%; height: 100%; }
  `],
})
export class BeltStageComponent implements AfterViewInit, OnDestroy {
  readonly scrollRoot = input.required<HTMLElement>();
  readonly ready = output<void>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  private scene?: BeltScene;
  private director?: ScrollDirector;
  private observer?: ResizeObserver;

  ngAfterViewInit(): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.zone.runOutsideAngular(() => {
      try {
        const el = this.canvas().nativeElement;
        this.scene = new BeltScene(el, reduced);
        this.director = new ScrollDirector(this.scene.rig, reduced);
        this.director.init(this.scrollRoot());
        this.scene.start();
        this.observer = new ResizeObserver(() => this.scene?.resize());
        this.observer.observe(el);
      } catch (err) {
        console.error('WebGL scene failed to start — showing copy only.', err);
      }
    });
    this.zone.run(() => this.ready.emit());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.director?.dispose();
    this.scene?.dispose();
  }
}
