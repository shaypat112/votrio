"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";
import { ShieldCheck, Github, Mail, Lock, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.message);
      else window.location.href = "/docs"; // Success redirect
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) alert(error.message);
      else alert("Check your email for the confirmation link!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-black border border-zinc-800 p-8">
          <h1 className="text-xl font-bold font-mono mb-6 uppercase tracking-tighter">
            Vigilance // {isLogin ? "Login" : "Register"}
          </h1>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-800 h-10 px-4 text-xs font-mono focus:border-white outline-none"
              required
            />
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 h-10 px-4 text-xs font-mono focus:border-white outline-none"
              required
            />
            <button
              disabled={loading}
              className="w-full bg-white text-black h-10 font-bold uppercase text-xs tracking-widest hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : isLogin
                  ? "Execute Login"
                  : "Initialize"}
            </button>
          </form>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="mt-6 text-[10px] text-zinc-500 font-mono uppercase tracking-widest hover:text-white"
          >
            {isLogin ? "[ Request_New_Access ]" : "[ Return_To_Login ]"}
          </button>
        </div>
      </div>
    </div>
  );
}
