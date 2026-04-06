import { Suspense } from "react";
import ProfileClient from "./ProfileClient";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Scans - Votrio",
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-4 py-10">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      }
    >
      <ProfileClient />
    </Suspense>
  );
}
