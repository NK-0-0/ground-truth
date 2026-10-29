import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SOURCE_PROGRAMME_GFA_M2 } from '../../../core/models/campus-masterplan.models';
import { ZaNumberPipe } from '../../../shared/format';
import { ReferenceNote } from '../../../shared/reference-note';
import { TrackSectionDirective } from '../../../shared/section-tracking.directive';
import { MasterplanStore } from '../masterplan.store';

/** "Compare the three design alternatives" plus the measured-quantity comparison table. */
@Component({
  selector: 'app-alternatives',
  imports: [ReferenceNote, ZaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alternatives.html',
  styleUrl: './alternatives.css',
  host: { class: 'mp-block', id: 'mp-alternatives' },
  hostDirectives: [TrackSectionDirective],
})
export class Alternatives {
  protected readonly store = inject(MasterplanStore);

  protected readonly options = computed(() => {
    const plans = this.store.data()?.plans;
    if (!plans) return [];
    return (['A', 'B', 'C'] as const).map((key) => {
      const p = plans[key];
      return { key, plan: p, share: (p.metrics.placedGFAM2 / SOURCE_PROGRAMME_GFA_M2) * 100 };
    });
  });
}
