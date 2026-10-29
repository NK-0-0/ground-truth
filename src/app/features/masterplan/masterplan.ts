import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { CampusDataService } from '../../core/campus-data.service';
import { ZaNumberPipe } from '../../shared/format';
import { OlderAnalysis } from '../older-analysis/older-analysis';
import { SmartFurniture } from '../smart-furniture/smart-furniture';
import { Alternatives } from './alternatives/alternatives';
import { Campus3d } from './campus-3d/campus-3d';
import { CampusPlan } from './campus-plan/campus-plan';
import { Delivery } from './delivery/delivery';
import { MasterplanStore } from './masterplan.store';
import { OriginalVision } from './original-vision/original-vision';
import { ProgrammeTable } from './programme-table/programme-table';
import { PublicAnalysis } from './public-analysis/public-analysis';
import { ReviewActions } from './review-actions/review-actions';
import { Sources } from './sources/sources';

/**
 * The integrated campus review, ordered to follow the decision process:
 * evidence, campus response, options, inspection, actions.
 */
@Component({
  selector: 'app-masterplan',
  imports: [
    ZaNumberPipe,
    PublicAnalysis,
    OlderAnalysis,
    CampusPlan,
    OriginalVision,
    Alternatives,
    SmartFurniture,
    Campus3d,
    ReviewActions,
    ProgrammeTable,
    Delivery,
    Sources,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './masterplan.html',
  styleUrl: './masterplan.css',
  host: { class: 'gta-card', id: 'mp-root', '[attr.aria-busy]': 'data.masterplan.isLoading()' },
})
export class Masterplan {
  protected readonly data = inject(CampusDataService);
  protected readonly store = inject(MasterplanStore);

  constructor() {
    effect(() => {
      const d = this.data.masterplan.value();
      if (d) untracked(() => this.store.init(d));
    });
  }
}
