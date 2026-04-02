import SessionClient from "./SessionClient";

export default function SessionPage({
  params,
}: {
  params: { session: string };
}) {
  const { session } = params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Session {session}</h1>
      <SessionClient sessionId={session} />
    </div>
  );
}
