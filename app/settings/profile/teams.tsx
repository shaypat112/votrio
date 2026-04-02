"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { createClient } from "@/app/lib/supabase";
import { useSettings } from "./context";
import {
  SectionCard,
  FieldGroup,
  StyledInput,
  DangerButton,
} from "./primitives";

type Team = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role: string;
};

type TeamMember = {
  id: string;
  role: string;
  user_id: string;
  profiles?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
};

export function TeamsSection() {
  const { accessToken } = useSettings();
  const supabase = useMemo(() => createClient(), []);

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    loadTeams(accessToken);
  }, [accessToken]);

  const loadTeams = async (token: string) => {
    setLoading(true);
    const res = await fetch(`/api/teams/list?accessToken=${token}`);
    if (res.ok) {
      const data = await res.json();
      const next = (data?.teams ?? []) as Team[];
      setTeams(next);
      if (!selectedTeamId && next.length > 0) {
        setSelectedTeamId(next[0].id);
        await loadMembers(next[0].id, token);
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setTeamError(data?.error ?? "Unable to load teams.");
    }
    setLoading(false);
  };

  const loadMembers = async (teamId: string, token: string) => {
    const res = await fetch(
      `/api/teams/members?accessToken=${token}&teamId=${teamId}`,
    );
    if (res.ok) {
      const data = await res.json();
      setMembers(data?.members ?? []);
    } else {
      const data = await res.json().catch(() => ({}));
      setTeamError(data?.error ?? "Unable to load members.");
      setMembers([]);
    }
  };

  const createTeam = async () => {
    if (!accessToken || !teamName.trim()) return;
    setTeamError(null);
    const res = await fetch("/api/teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, name: teamName.trim() }),
    });
    if (res.ok) {
      setTeamName("");
      await loadTeams(accessToken);
    } else {
      const d = await res.json().catch(() => ({}));
      setTeamError(d?.error ?? "Unable to create team.");
    }
  };

  const addMember = async () => {
    if (!accessToken || !selectedTeamId || !inviteUsername.trim()) return;
    setTeamError(null);
    const res = await fetch("/api/teams/add-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        teamId: selectedTeamId,
        username: inviteUsername.trim(),
      }),
    });
    if (res.ok) {
      setInviteUsername("");
      await loadMembers(selectedTeamId, accessToken);
    } else {
      const d = await res.json().catch(() => ({}));
      setTeamError(d?.error ?? "Unable to add member.");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!accessToken || !selectedTeamId) return;
    const res = await fetch("/api/teams/remove-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, memberId }),
    });
    if (res.ok) {
      await loadMembers(selectedTeamId, accessToken);
    } else {
      const d = await res.json().catch(() => ({}));
      setTeamError(d?.error ?? "Unable to remove member.");
    }
  };

  const selectTeam = async (teamId: string) => {
    if (!accessToken) return;
    setSelectedTeamId(teamId);
    await loadMembers(teamId, accessToken);
  };

  return (
    <SectionCard title="Teams" description="Create and manage team access.">
      <FieldGroup label="New team">
        <div className="flex gap-2">
          <StyledInput
            placeholder="Team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="flex-1"
          />
          <button
            onClick={createTeam}
            disabled={!teamName.trim()}
            className={cn(
              "rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200",
              "hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            Create
          </button>
        </div>
      </FieldGroup>

      {teamError && <p className="text-xs text-red-400">{teamError}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : teams.length === 0 ? (
        <p className="text-sm text-zinc-500">No teams yet. Create one above.</p>
      ) : (
        <>
          {/* Team picker */}
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => selectTeam(team.id)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                  selectedTeamId === team.id
                    ? "bg-card text-foreground"
                    : "border border-border text-zinc-400 hover:border-border hover:text-zinc-200",
                )}
              >
                {team.name}
              </button>
            ))}
          </div>

          {/* Selected team panel */}
          {selectedTeamId && (
            <div className="space-y-4 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
              <FieldGroup label="Add member">
                <div className="flex gap-2">
                  <StyledInput
                    placeholder="username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    className="flex-1"
                  />
                  <button
                    onClick={addMember}
                    disabled={!inviteUsername.trim()}
                    className={cn(
                      "rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200",
                      "hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white transition-colors",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                  >
                    Add
                  </button>
                </div>
              </FieldGroup>

              <div className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-xs text-zinc-500">No members yet.</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm text-zinc-100">
                          {member.profiles?.full_name ??
                            member.profiles?.username ??
                            "Member"}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {member.profiles?.username ?? member.user_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-white/[0.07] px-2 py-0.5 text-xs text-zinc-400">
                          {member.role}
                        </span>
                        <DangerButton onClick={() => removeMember(member.id)}>
                          Remove
                        </DangerButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
