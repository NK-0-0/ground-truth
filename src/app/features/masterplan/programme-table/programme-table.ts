import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ZaNumberPipe } from '../../../shared/format';
import { ReferenceNote } from '../../../shared/reference-note';
import { TrackSectionDirective } from '../../../shared/section-tracking.directive';
import { MasterplanStore, type ProgrammeStatus } from '../masterplan.store';

const STATUS_LABELS: Record<ProgrammeStatus, string> = {
  full: 'Fully placed concept',
  partial: 'Partly placed',
  unsited: 'No resolved footprint',
};

/** "Keep every accommodation requirement in view": the 82-entry source programme for the chosen design. */
@Component({
  selector: 'app-programme-table',
  imports: [ReferenceNote, ZaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './programme-table.html',
  host: { class: 'mp-block', id: 'mp-programme' },
  hostDirectives: [TrackSectionDirective],
})
export class ProgrammeTable {
  protected readonly store = inject(MasterplanStore);
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly query = signal('');
  protected readonly status = signal<'all' | ProgrammeStatus>('all');

  protected readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase(),
      s = this.status();
    return this.store
      .programmeRows()
      .filter(
        (r) =>
          (s === 'all' || r.status === s) && (!q || (r.id + ' ' + r.use).toLowerCase().includes(q)),
      );
  });

  protected setStatus(value: string): void {
    this.status.set(value as 'all' | ProgrammeStatus);
  }
}
