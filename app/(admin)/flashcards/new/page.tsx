import { PageHeader } from "@/components/app-shell/page-header";
import { FlashcardForm } from "@/components/flashcards/flashcard-form";
import { createFlashcardAction } from "../../phase4-actions";

export default function NewFlashcardPage() {
  return <><PageHeader description="Create a draft study card, review both sides, then publish when its topic is eligible." eyebrow="Flashcards" title="Add flashcard" /><FlashcardForm action={createFlashcardAction} /></>;
}
