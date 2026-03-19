export default function QuickStart() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-white">Quick Start</h1>
      <p className="text-zinc-400">
        Follow these steps to secure your first project in under 2 minutes.
      </p>

      <div className="space-y-8">
        <div className="flex gap-4">
          <div className="flex-none w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold">
            1
          </div>
          <div>
            <h3 className="text-white font-bold">Initialize Vigilance</h3>
            <p className="text-sm text-zinc-500 mb-2">
              Run this in your project root to create a config file.
            </p>
            <code className="block bg-zinc-950 p-3 border border-zinc-800 rounded text-zinc-300">
              vigilance init
            </code>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-none w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold">
            2
          </div>
          <div>
            <h3 className="text-white font-bold">Run your App</h3>
            <p className="text-sm text-zinc-500 mb-2">
              Wrap your start script to enable AI debugging.
            </p>
            <code className="block bg-zinc-950 p-3 border border-zinc-800 rounded text-zinc-300">
              vigilance run "npm start"
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
