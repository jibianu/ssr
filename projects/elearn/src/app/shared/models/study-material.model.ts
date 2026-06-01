export type StudyMaterialContentFormat = 'html' | 'json';

export interface StudyMaterialFileDto {
  id: string;
  studyMaterialId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  previewUrl?: string;
  convertedPreviewPath?: string;
  uploadStatus: number;
  sortOrder: number;
  createdOn?: string;
  updatedOn?: string;
}

export interface StudyMaterialSectionDto {
  id: string;
  title: string;
  description: string;
  imageLink?: string;
  sortOrder: number;
  contentFormat?: StudyMaterialContentFormat;
  isArchived?: boolean;
  files?: StudyMaterialFileDto[];
  createdOn?: string;
  updatedOn?: string;
}

export interface CurriculumStudyMaterialGroupDto {
  id: string;
  title: string;
  sortOrder: number;
  studyMaterials: StudyMaterialSectionDto[];
}

export const STUDY_MATERIAL_ALLOWED_EXTENSIONS = [
  '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx'
];

export const STUDY_MATERIAL_MAX_FILE_BYTES = 50 * 1024 * 1024;

export function isHtmlStudyContent(description: string | null | undefined): boolean {
  if (!description) return true;
  const t = description.trim();
  return !t.startsWith('{') || t.includes('<p>') || t.includes('<h');
}

export function officeEmbedUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

export function isPdfType(fileType: string): boolean {
  return (fileType || '').toLowerCase() === 'pdf';
}

/** Normalize API payload (camelCase or PascalCase) for study material groups. */
export function normalizeStudyMaterialGroups(raw: unknown): CurriculumStudyMaterialGroupDto[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((g: Record<string, unknown>) => ({
    id: String(g['id'] ?? g['Id'] ?? ''),
    title: String(g['title'] ?? g['Title'] ?? ''),
    sortOrder: Number(g['sortOrder'] ?? g['SortOrder'] ?? 0),
    studyMaterials: normalizeStudyMaterialSections(g['studyMaterials'] ?? g['StudyMaterials'])
  }));
}

export function normalizeStudyMaterialSections(raw: unknown): StudyMaterialSectionDto[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((s: Record<string, unknown>) => ({
    id: String(s['id'] ?? s['Id'] ?? ''),
    title: String(s['title'] ?? s['Title'] ?? ''),
    description: String(s['description'] ?? s['Description'] ?? ''),
    imageLink: (s['imageLink'] ?? s['ImageLink']) as string | undefined,
    sortOrder: Number(s['sortOrder'] ?? s['SortOrder'] ?? 0),
    contentFormat: (s['contentFormat'] ?? s['ContentFormat'] ?? 'html') as StudyMaterialContentFormat,
    isArchived: Boolean(s['isArchived'] ?? s['IsArchived'] ?? false),
    files: normalizeStudyMaterialFiles(s['files'] ?? s['Files']),
    createdOn: (s['createdOn'] ?? s['CreatedOn']) as string | undefined,
    updatedOn: (s['updatedOn'] ?? s['UpdatedOn']) as string | undefined
  }));
}

export function normalizeStudyMaterialFiles(raw: unknown): StudyMaterialFileDto[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((f: Record<string, unknown>) => ({
    id: String(f['id'] ?? f['Id'] ?? ''),
    studyMaterialId: String(f['studyMaterialId'] ?? f['StudyMaterialId'] ?? ''),
    fileName: String(f['fileName'] ?? f['FileName'] ?? ''),
    fileUrl: String(f['fileUrl'] ?? f['FileUrl'] ?? ''),
    fileType: String(f['fileType'] ?? f['FileType'] ?? '').toLowerCase(),
    fileSizeBytes: Number(f['fileSizeBytes'] ?? f['FileSizeBytes'] ?? 0),
    previewUrl: (f['previewUrl'] ?? f['PreviewUrl']) as string | undefined,
    convertedPreviewPath: (f['convertedPreviewPath'] ?? f['ConvertedPreviewPath']) as string | undefined,
    uploadStatus: Number(f['uploadStatus'] ?? f['UploadStatus'] ?? 0),
    sortOrder: Number(f['sortOrder'] ?? f['SortOrder'] ?? 0)
  }));
}

/** Student-visible sections: not archived. */
export function isStudentVisibleSection(section: StudyMaterialSectionDto): boolean {
  if (section.isArchived) return false;
  return true;
}

export function pdfEmbedUrl(fileUrl: string): string {
  if (!fileUrl) return '';
  const base = fileUrl.split('#')[0];
  return `${base}#view=FitH&toolbar=1`;
}
