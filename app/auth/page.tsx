"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";
import { Github, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "../components/GoogleIcon";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = createClient();

  const loginWithProvider = async (provider: "github" | "google") => {
    setError(null);
    setNotice(null);
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/documentation/installation`,
      },
    });

    if (oauthError) setError(oauthError.message);
    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) setError(signInError.message);
      else window.location.href = "/documentation/installation";
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (signUpError) setError(signUpError.message);
    else setNotice("Check your email to confirm your account.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12">
      <Card className="w-full max-w-md border border-zinc-800 bg-zinc-900 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <Badge variant="outline" className="px-3 py-1 text-sm">
            Votrio Access
          </Badge>
          <CardTitle className="text-2xl text-white font-semibold">
            {isLogin ? "Sign in" : "Create your account"}
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Connect your account to unlock AI-powered trace analysis.
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

          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <Separator className="flex-1" />
            or use email
            <Separator className="flex-1" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                  size={14}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                  size={14}
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-600/40 bg-red-600/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            {notice && (
              <div className="rounded-md border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
                {notice}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Working..." : isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

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
