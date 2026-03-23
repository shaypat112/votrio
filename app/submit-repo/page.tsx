import { SubmitRepoForm } from "../components/SubmitRepoForm";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Submit Repository — Votrio",
  description: "Submit a GitHub repository for AI-powered security analysis.",
};

export default function SubmitRepoPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-foreground" />
            <h1 className="text-lg font-semibold">Submit a Repository</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste a GitHub URL and we'll run a full security scan — checking for
            vulnerabilities, leaked secrets, and AI-generated code issues.
          </p>
        </div>
        <SubmitRepoForm />
      </div>
    </div>
  );
}
