import ReportDetailClient from "./ReportDetailClient";

export default function ReportDetailPage({ params }: { params: { repo: string } }) {
  return <ReportDetailClient repoSlug={params.repo} />;
}
