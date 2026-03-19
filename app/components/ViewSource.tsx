"use client";
import { useRouter } from "next/navigation";

export default function ViewSourceButton() {
  const router = useRouter();
  return (
    <div>
      <button
        className="bg-zinc-900 border border-zinc-800 px-8 py-3 rounded-md font-bold hover:bg-zinc-800 transition-all"
        onClick={() => router.push("/documentation/installation")}
      >
        Installation
      </button>
    </div>
  );
}
