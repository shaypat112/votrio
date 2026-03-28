import RepositoryDetailClient from "./RepositoryDetailClient";

export default async function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RepositoryDetailClient repoId={id} />;
}
