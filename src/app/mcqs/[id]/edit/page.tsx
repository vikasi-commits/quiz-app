import { McqQuestionPage } from "@/components/mcq/mcq-question-page";

type EditMcqPageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditMcqPage({ params }: EditMcqPageProps) {
	const { id } = await params;
	return <McqQuestionPage mode="edit" questionId={id} />;
}
