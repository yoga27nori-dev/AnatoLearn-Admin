import { PageHeader } from "@/components/app-shell/page-header";
import { LessonForm } from "@/components/phase3/resource-forms";
import { createResource } from "../../phase3-actions";
export default function NewContentPage() { return <><PageHeader description="Build a safe structured lesson. Save it as a draft before publication." eyebrow="Content review" title="Create lesson" /><LessonForm action={createResource.bind(null, "contentLesson")} /></>; }
