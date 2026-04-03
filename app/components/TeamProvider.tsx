"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";

type Team = { id: string; name: string; slug?: string; role?: string };

type TeamContextValue = {
  teams: Team[];
  selectedTeamId: string | null;
  selectedTeam?: Team | null;
  setSelectedTeamId: (id: string | null) => void;
  loading: boolean;
};

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          if (mounted) {
            setTeams([]);
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/teams/list", {
          headers: buildAuthHeaders(accessToken),
        });
        if (!mounted) return;
        if (!res.ok) {
          setTeams([]);
          setLoading(false);
          return;
        }
        const json = await res.json();
        const items = json?.teams ?? [];
        if (mounted) setTeams(items as Team[]);
      } catch (e) {
        if (mounted) setTeams([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // hydrate selected team from localStorage
    try {
      const v = window.localStorage.getItem("votrio-selected-team");
      if (v) setSelectedTeamIdState(v);
    } catch {}

    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const setSelectedTeamId = (id: string | null) => {
    setSelectedTeamIdState(id);
    try {
      if (id) window.localStorage.setItem("votrio-selected-team", id);
      else window.localStorage.removeItem("votrio-selected-team");
    } catch {}
  };

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  const value = useMemo(
    () => ({ teams, selectedTeamId, selectedTeam, setSelectedTeamId, loading }),
    [teams, selectedTeamId, selectedTeam, loading],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}

export default TeamProvider;
