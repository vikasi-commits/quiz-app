import { McqPreview } from "@/components/mcq/mcq-preview";

type PreviewMcqPageProps = {
	params: Promise<{ id: string }>;
};

export default async function PreviewMcqPage({ params }: PreviewMcqPageProps) {
	const { id } = await params;
	return <McqPreview questionId={id} />;
}
