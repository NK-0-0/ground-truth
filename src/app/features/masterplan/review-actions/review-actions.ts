import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReferenceNote } from '../../../shared/reference-note';
import { TrackSectionDirective } from '../../../shared/section-tracking.directive';
import { MasterplanStore } from '../masterplan.store';
import { CASE_STATUSES, type CaseStatus, ReviewNotesService } from '../review-notes.service';

/** "Analysis → design response → next action": source findings and browser-local investigation notes. */
@Component({
  selector: 'app-review-actions',
  imports: [ReferenceNote, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-actions.html',
  styleUrl: './review-actions.css',
  host: { class: 'mp-block', id: 'mp-actions' },
  hostDirectives: [TrackSectionDirective],
})
export class ReviewActions {
  protected readonly store = inject(MasterplanStore);
  private readonly notesService = inject(ReviewNotesService);
  protected readonly notes = this.notesService.notes;
  protected readonly statuses = CASE_STATUSES;
  protected readonly saveStatus = signal('');

  protected readonly form = inject(NonNullableFormBuilder).group({
    office: '',
    owner: '',
    due: '',
    status: 'Awaiting evidence' as CaseStatus,
    evidence: '',
  });

  protected readonly cases = computed(() => {
    const filter = this.store.caseFilter();
    return (this.store.data()?.cases ?? []).filter(
      (c) =>
        filter === 'all' || (filter === 'walkway' ? c.id.startsWith('W') : !c.id.startsWith('W')),
    );
  });

  constructor() {
    // Load the saved note whenever another case becomes active.
    effect(() => {
      const id = this.store.activeCaseId();
      untracked(() => {
        const n = this.notes()[id];
        this.form.reset({
          office: n?.office ?? '',
          owner: n?.owner ?? '',
          due: n?.due ?? '',
          status: n?.status ?? 'Awaiting evidence',
          evidence: n?.evidence ?? '',
        });
        this.saveStatus.set('');
      });
    });
  }

  protected statusOf(caseId: string): CaseStatus {
    return this.notes()[caseId]?.status ?? 'Awaiting evidence';
  }

  protected setFilter(value: string): void {
    this.store.caseFilter.set(value as 'all' | 'walkway' | 'design');
  }

  protected save(): void {
    const v = this.form.getRawValue();
    const note = {
      office: v.office.trim(),
      owner: v.owner.trim(),
      due: v.due,
      status: v.status,
      evidence: v.evidence.trim(),
      saved: new Date().toISOString(),
    };
    if (
      note.status === 'Ready for review' &&
      (!note.owner || !note.office || !note.due || !note.evidence)
    ) {
      this.saveStatus.set(
        'Record the office, person, due date and supporting evidence before marking this ready for review.',
      );
      return;
    }
    this.saveStatus.set(
      this.notesService.save(this.store.activeCaseId(), note)
        ? 'Saved in this browser. Source observations and design approval status remain unchanged.'
        : 'Saved for this session only; browser storage is unavailable.',
    );
  }
}
