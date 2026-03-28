import RepositoriesClient from "./RepositoriesClient";

export const metadata = {
  title: "Repositories — Votrio",
  description: "Discover public repositories and reviews.",
};

export default function RepositoriesPage() {
  return <RepositoriesClient />;
}
