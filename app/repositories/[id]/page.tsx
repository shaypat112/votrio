import RepositoryDetailClient from "./RepositoryDetailClient";

export default function RepositoryDetailPage({ params }: { params: { id: string } }) {
  return <RepositoryDetailClient repoId={params.id} />;
}
