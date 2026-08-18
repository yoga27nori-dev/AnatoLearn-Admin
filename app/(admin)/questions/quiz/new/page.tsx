import { PageHeader } from "@/components/app-shell/page-header";
import { QuestionForm } from "@/components/questions/question-form";
import { createQuestionAction } from "../../../phase4-actions";
export default function NewQuizQuestionPage() { return <><PageHeader description="Build an untimed quiz question with one correct answer and a learner explanation." eyebrow="Quiz assessment" title="Add quiz question" /><QuestionForm action={createQuestionAction} assessmentType="QUIZ" /></>; }
