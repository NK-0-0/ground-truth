import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReferenceNote } from '../../../shared/reference-note';
import { TrackSectionDirective } from '../../../shared/section-tracking.directive';

/** "What the source evidence establishes". */
@Component({
  selector: 'app-public-analysis',
  imports: [ReferenceNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mp-block', id: 'public-analysis' },
  hostDirectives: [TrackSectionDirective],
  template: `
    <app-reference-note />
    <h3>What the source evidence establishes</h3>
    <p>
      219 walkway records: 74 assessment-matched and 145 unassessed. Five matched records report no
      lighting and fair condition. These are inspection priorities, not observed crime
      probabilities.
    </p>
    <p>
      908 GPR observations are separate from continuous utility assets. The restored older analysis
      below contains the historical utility screening and scenario panels, with their original
      source notes and assumptions. The incomplete boundary has 45 segments and 12 open ends; campus
      area is not established.
    </p>
    <p>
      82 historic accommodation requirements, 57 placed R8 blocks and 109 canonical GIS proposals
      are separate populations.
    </p>
  `,
})
export class PublicAnalysis {}
