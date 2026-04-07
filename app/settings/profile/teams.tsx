"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { buildAuthHeaders } from "@/app/lib/http";
import { cn } from "@/app/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "./context";
import {
  SectionCard,
  FieldGroup,
  StyledInput,
  DangerButton,
  StyledSelect,
} from "./primitives";

type Team = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role: string;
  can_manage?: boolean;
  environment_count?: number;
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

type PlatformUser = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export function TeamsSection() {
  const { accessToken, admin } = useSettings();

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPlatformUsers, setLoadingPlatformUsers] = useState(false);
  const [workingMemberId, setWorkingMemberId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);

  const loadMembers = useCallback(async (teamId: string, token: string) => {
    const res = await fetch(`/api/teams/members?teamId=${teamId}`, {
      headers: buildAuthHeaders(token),
    });
    if (res.ok) {
      const data = await res.json();
      setMembers(data?.members ?? []);
    } else {
      const data = await res.json().catch(() => ({}));
      setTeamError(data?.error ?? "Unable to load members.");
      setMembers([]);
    }
  }, []);

  const loadTeams = useCallback(async (token: string) => {
    setLoading(true);
    const res = await fetch("/api/teams/list", {
      headers: buildAuthHeaders(token),
    });
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
  }, [loadMembers, selectedTeamId]);

  useEffect(() => {
    if (!accessToken) return;
    const timer = window.setTimeout(() => {
      void loadTeams(accessToken);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [accessToken, loadTeams]);

  const createTeam = async () => {
    if (!accessToken || !teamName.trim()) return;
    setTeamError(null);
    const res = await fetch("/api/teams/create", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name: teamName.trim() }),
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
    if (!accessToken || !selectedTeamId || !inviteUserId) return;
    setTeamError(null);
    const res = await fetch("/api/teams/add-member", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        teamId: selectedTeamId,
        userId: inviteUserId,
      }),
    });
    if (res.ok) {
      setInviteUserId("");
      await Promise.all([
        loadMembers(selectedTeamId, accessToken),
        loadPlatformUsers(selectedTeamId, accessToken),
      ]);
    } else {
      const d = await res.json().catch(() => ({}));
      setTeamError(d?.error ?? "Unable to add member.");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!accessToken || !selectedTeamId) return;
    const res = await fetch("/api/teams/remove-member", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ memberId }),
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

  const selectedTeam =
    teams.find((team) => team.id === selectedTeamId) ?? null;
  const canManageSelectedTeam = Boolean(
    admin.isAdmin ||
      selectedTeam?.can_manage ||
      selectedTeam?.role === "owner" ||
      selectedTeam?.role === "admin",
  );
  const availablePlatformUsers = platformUsers.filter(
    (user) =>
      user.id !== selectedTeam?.owner_id &&
      !members.some((member) => member.user_id === user.id),
  );

  const loadPlatformUsers = useCallback(async (teamId: string, token: string) => {
    setLoadingPlatformUsers(true);
    const res = await fetch(`/api/teams/platform-members?teamId=${teamId}`, {
      headers: buildAuthHeaders(token),
    });
    if (res.ok) {
      const data = await res.json();
      setPlatformUsers((data?.members ?? []) as PlatformUser[]);
    } else {
      const data = await res.json().catch(() => ({}));
      setTeamError(data?.error ?? "Unable to load platform members.");
      setPlatformUsers([]);
    }
    setLoadingPlatformUsers(false);
  }, []);

  useEffect(() => {
    if (!accessToken || !selectedTeamId || !canManageSelectedTeam) return;
    void loadPlatformUsers(selectedTeamId, accessToken);
  }, [accessToken, canManageSelectedTeam, loadPlatformUsers, selectedTeamId]);

  const updateMemberRole = async (
    memberId: string,
    role: "member" | "admin",
  ) => {
    if (!accessToken || !selectedTeamId) return;
    setWorkingMemberId(memberId);
    setTeamError(null);
    const res = await fetch("/api/teams/update-member-role", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ memberId, role }),
    });
    setWorkingMemberId(null);
    if (res.ok) {
      await loadMembers(selectedTeamId, accessToken);
    } else {
      const d = await res.json().catch(() => ({}));
      setTeamError(d?.error ?? "Unable to update member role.");
    }
  };

  return (
    <SectionCard
      title="Teams"
      description="Create teams, manage members, and control access from the backend."
    >
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
        <p className="text-xs text-muted-foreground">
          Creating a team makes you its owner. Owners and admins can invite,
          promote, and remove members.
        </p>
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
                <span>{team.name}</span>
                <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {admin.isAdmin && team.role !== "owner" && team.role !== "admin"
                    ? "admin"
                    : team.role}
                </span>
              </button>
            ))}
          </div>

          {/* Selected team panel */}
          {selectedTeamId && (
            <div className="space-y-4 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="rounded-lg border border-border bg-background px-3 py-3 text-xs text-muted-foreground">
                Team role:{" "}
                <strong className="text-foreground">
                  {admin.isAdmin && selectedTeam?.role !== "owner" && selectedTeam?.role !== "admin"
                    ? "admin"
                    : selectedTeam?.role ?? "member"}
                </strong>
                {" · "}
                Environments: {selectedTeam?.environment_count ?? 0}
              </div>

              {canManageSelectedTeam ? (
                <FieldGroup label="Add member">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={inviteUserId}
                        onValueChange={setInviteUserId}
                      >
                        <SelectTrigger className="h-9 rounded-lg border border-border bg-background text-sm text-foreground">
                          <SelectValue
                            placeholder={
                              loadingPlatformUsers
                                ? "Loading platform members..."
                                : availablePlatformUsers.length === 0
                                  ? "No available members"
                                  : "Select a platform member"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePlatformUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name ?? user.username ?? "Member"}
                              {user.username ? ` (@${user.username})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      onClick={addMember}
                      disabled={!inviteUserId || loadingPlatformUsers}
                      className={cn(
                        "rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200",
                        "hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white transition-colors",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                      )}
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pick from users already on the platform instead of typing a username.
                  </p>
                </FieldGroup>
              ) : (
                <p className="text-xs text-muted-foreground">
                  You can view this team, but only team admins can manage members.
                </p>
              )}

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
                        {canManageSelectedTeam && member.role !== "owner" ? (
                          <>
                            <StyledSelect
                              value={member.role}
                              onChange={(value) =>
                                void updateMemberRole(
                                  member.id,
                                  value as "member" | "admin",
                                )
                              }
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                            </StyledSelect>
                            <DangerButton
                              onClick={() => removeMember(member.id)}
                              disabled={workingMemberId === member.id}
                            >
                              Remove
                            </DangerButton>
                          </>
                        ) : (
                          <span className="rounded-md border border-white/[0.07] px-2 py-0.5 text-xs text-zinc-400">
                            {member.role}
                          </span>
                        )}
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
