"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "../lib/supabase";
import { ArrowLeft, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleIcon } from "../components/GoogleIcon";

export default function AuthPage() {
  const postAuthPath = "/profile";
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = createClient();

  const loginWithProvider = async (provider: "github" | "google") => {
    if (!supabase) {
      setError(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${postAuthPath}`,
      },
    });

    if (oauthError) setError(oauthError.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border border-zinc-800 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-start">
            <Button asChild variant="ghost" size="sm" className="px-2">
              <Link href="/" className="inline-flex items-center gap-2">
                <ArrowLeft size={14} />
                Back home
              </Link>
            </Button>
          </div>
          <CardTitle className="text-2xl text-white font-semibold"></CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Sign in to manage scans, access sessions, and security workflows.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Social Login */}
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full justify-center gap-2 hover:bg-zinc-800/50 transition"
              onClick={() => loginWithProvider("github")}
              disabled={loading}
            >
              <Github size={16} />
              Continue with GitHub
            </Button>

            <Button
              variant="outline"
              className="w-full justify-center gap-2 hover:bg-zinc-800/50 transition"
              onClick={() => loginWithProvider("google")}
              disabled={loading}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          {error ? (
            <p className="text-center text-xs text-red-400">{error}</p>
          ) : null}
          {notice ? (
            <p className="text-center text-xs text-zinc-400">{notice}</p>
          ) : null}

          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            {isLogin
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
