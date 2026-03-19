export default function Installation() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-white">Installation</h1>
      <p className="text-zinc-400 text-lg">
        Vigilance is distributed via NPM. Ensure you have Node.js 18+ installed.
      </p>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Global Install</h3>
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-emerald-400">
          npm install -g vigilance-cli
        </div>
      </div>

      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <p className="text-sm text-emerald-200">
          <strong>Tip:</strong> If you encounter permission errors on
          Linux/macOS, you may need to use <code>sudo</code> or configure your
          npm prefix.
        </p>
      </div>
    </div>
  );
}
