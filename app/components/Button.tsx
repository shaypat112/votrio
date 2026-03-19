"use client";
import { useRouter } from "next/navigation";

export default function ButtonAuth() {
  const router = useRouter();
  return (
    <div>
      <button
        className="bg-white text-black px-8 py-3 rounded-md font-bold hover:bg-zinc-200 transition-all"
        onClick={() => router.push("/auth")}
      >
        Log In
      </button>
    </div>
  );
}
