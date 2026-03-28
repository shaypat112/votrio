import ReportDetailClient from "./ReportDetailClient";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ repo: string }>;
}) {
  const { repo } = await params;
  return <ReportDetailClient repoSlug={repo} />;
}
