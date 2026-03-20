"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";
import { Github, Mail, Lock, ArrowRight, Shield } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  // GitHub OAuth Login
  const loginWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        // Redirects straight to the installation docs after success
        redirectTo: `${window.location.origin}/docs/installation`,
      },
    });
  };

  // Email/Password Login
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.message);
    } else {
      // Manual redirect for email login
      window.location.href = "/docs/installation";
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-100 space-y-8">
        {/* Minimal Header */}
        <div className="flex flex-col items-center space-y-2">
          <Shield size={40} strokeWidth={1} className="text-white mb-2" />
          <h1 className="text-xl tracking-[0.3em] uppercase font-black italic">
            Vigilance_OS
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
            Protocol: {isLogin ? "Authentication" : "Registration"}
          </p>
        </div>

        {/* Auth Container */}
        <div className="border border-zinc-800 bg-black p-8 shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]">
          {/* GitHub Action */}
          <button
            onClick={loginWithGithub}
            className="w-full group relative flex items-center justify-center gap-3 border border-zinc-700 h-12 hover:bg-white hover:text-black transition-all duration-300 mb-8"
          >
            <Github size={18} />
            <span className="text-xs uppercase font-bold tracking-widest">
              Connect GitHub
            </span>
          </button>

          <div className="relative mb-8 flex items-center justify-center">
            <div className="absolute w-full border-t border-zinc-900"></div>
            <span className="relative bg-black px-4 text-[9px] text-zinc-600 uppercase tracking-[0.4em]">
              Internal_Mail
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="group relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors"
                size={14}
              />
              <input
                type="email"
                placeholder="EMAIL_ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-800 h-11 pl-10 pr-4 text-[10px] outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-800"
                required
              />
            </div>

            <div className="group relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors"
                size={14}
              />
              <input
                type="password"
                placeholder="ACCESS_CIPHER"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-zinc-800 h-11 pl-10 pr-4 text-[10px] outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-800"
                required
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-zinc-900 border border-zinc-700 h-12 flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 mt-6"
            >
              <span className="text-xs uppercase font-black tracking-widest">
                {loading ? "Verifying..." : isLogin ? "Authorize" : "Create_ID"}
              </span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>

        {/* Bottom Toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] text-zinc-600 hover:text-white uppercase tracking-widest transition-colors underline underline-offset-8 decoration-zinc-800"
          >
            {isLogin ? "Request New Access" : "Return to Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
