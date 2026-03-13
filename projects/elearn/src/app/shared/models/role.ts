export enum Role {
    Admin = 1,
    Trainer = 3,
    Company = 4,
    Student = 2,
    Manager = 5,
    /** Used for affiliate layout sidebar/topbar (affiliates are students with affiliate record; layout uses this for menu). */
    Affiliate = 6,
}

export const Difficulty = {
    1: 'Easy',
    2: 'Medium',
    3: 'Hard'
};

export const QuestionType = {
    ExamQA: '1',
    PracticeQA: '2',
    CurriculumQA: '3'
}
export enum ProgressStatus {
    InProgress = 1,
    Completed = 2
}
export enum CurriculamStatus {
    CodeList = "CODELIST",
    Course = "COURSE",
    Curriculums = "CURRICULUMS",
    CurriculumConcepts = "CURRICULUMCONCEPT",
    Concepts = "CONCEPT",
    CurriculumStudyMaterials = "CURRICULUMSTUDYMATERIALS",
    CurriculumTopics = "CURRICULUMTOPICS",
    CurriculumSubTopics = "CURRICULUMSUBTOPICS",
    CurriculumVideoLectures = "CURRICULUMVIDEOLECTURES",
    StudyMaterials = "STUDYMATERIALS",
    Questions = "QUESTIONS",
    QuestionSets = "QUESTIONSETS",
    VideoLectures = "VIDEOLECTURES",
}