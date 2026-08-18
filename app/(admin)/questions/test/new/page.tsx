import { PageHeader } from "@/components/app-shell/page-header";
import { QuestionForm } from "@/components/questions/question-form";
import { createQuestionAction } from "../../../phase4-actions";
export default function NewTestQuestionPage() { return <><PageHeader description="Build a timed test question with one correct answer and a learner explanation." eyebrow="Test assessment" title="Add test question" /><QuestionForm action={createQuestionAction} assessmentType="TEST" /></>; }
