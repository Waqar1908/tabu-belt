import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BeltStageComponent } from './components/belt-stage.component';
import { CHAPTERS } from './content';

@Component({
  selector: 'app-root',
  imports: [BeltStageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly chapters = CHAPTERS;
  readonly ready = signal(false);

  
openWhatsApp(): void {
  const phoneNumber = '919004087373'; 
  const message = 'Hello! I am interested in your services.';

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
}

}
