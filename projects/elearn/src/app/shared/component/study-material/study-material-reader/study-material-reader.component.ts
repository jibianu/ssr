import { Component, Input, OnChanges } from '@angular/core';
import {
  CurriculumStudyMaterialGroupDto,
  StudyMaterialSectionDto,
  isHtmlStudyContent,
  isStudentVisibleSection
} from '../../../models/study-material.model';
import { isLessonContentJson } from '../../../models/lesson-content.model';

@Component({
  selector: 'app-study-material-reader',
  templateUrl: './study-material-reader.component.html',
  styleUrls: ['./study-material-reader.component.scss'],
  standalone: false
})
export class StudyMaterialReaderComponent implements OnChanges {
  @Input() groups: CurriculumStudyMaterialGroupDto[] = [];
  @Input() allowDownload = true;
  /** When true, only published non-archived sections are shown. */
  @Input() studentView = false;

  activeSectionId: string | null = null;
  flatSections: { groupTitle: string; section: StudyMaterialSectionDto }[] = [];

  ngOnChanges(): void {
    this.buildFlatSections();
  }

  buildFlatSections(): void {
    this.flatSections = [];
    for (const g of this.groups || []) {
      const sections = (g.studyMaterials || [])
        .filter((s) => (this.studentView ? isStudentVisibleSection(s) : !s.isArchived))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      for (const s of sections) {
        this.flatSections.push({ groupTitle: g.title, section: s });
      }
    }
    if (this.flatSections.length && !this.activeSectionId) {
      this.activeSectionId = this.flatSections[0].section.id;
    }
  }

  selectSection(id: string): void {
    this.activeSectionId = id;
    const el = document.getElementById('sm-section-' + id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get activeIndex(): number {
    return this.flatSections.findIndex((x) => x.section.id === this.activeSectionId);
  }

  get activeEntry(): { groupTitle: string; section: StudyMaterialSectionDto } | null {
    const i = this.activeIndex;
    return i >= 0 ? this.flatSections[i] : null;
  }

  get progressPercent(): number {
    if (!this.flatSections.length) return 0;
    const i = Math.max(0, this.activeIndex);
    return Math.round(((i + 1) / this.flatSections.length) * 100);
  }

  prev(): void {
    const i = this.activeIndex;
    if (i > 0) this.selectSection(this.flatSections[i - 1].section.id);
  }

  next(): void {
    const i = this.activeIndex;
    if (i < this.flatSections.length - 1) this.selectSection(this.flatSections[i + 1].section.id);
  }

  isLegacyJson(desc: string): boolean {
    return isLessonContentJson(desc);
  }

  isHtml(desc: string): boolean {
    return isHtmlStudyContent(desc) && !isLessonContentJson(desc);
  }

  hasTextContent(section: StudyMaterialSectionDto): boolean {
    const d = (section.description || '').trim();
    if (!d || d === '<p></p>' || d === '{"version":1,"blocks":[]}') return false;
    if (isLessonContentJson(d)) {
      try {
        const parsed = JSON.parse(d) as { blocks?: unknown[] };
        return Array.isArray(parsed.blocks) && parsed.blocks.length > 0;
      } catch {
        return false;
      }
    }
    return true;
  }
}
