"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Profile, UserStats } from "@/lib/types";
import { getProfiles, getStats } from "@/lib/db";

interface ProfileContextType {
  profile: Profile | null;
  stats: UserStats | null;
  setProfile: (p: Profile | null) => void;
  refreshStats: () => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  stats: null,
  setProfile: () => {},
  refreshStats: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("currentProfileId");
    if (stored) {
      getProfiles().then((profiles) => {
        const found = profiles.find((p) => p.id === stored);
        if (found) setProfileState(found);
      });
    }
  }, []);

  const refreshStats = useCallback(() => {
    if (profile) getStats(profile.id).then(setStats);
  }, [profile]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const setProfile = (p: Profile | null) => {
    setProfileState(p);
    if (p) localStorage.setItem("currentProfileId", p.id);
    else localStorage.removeItem("currentProfileId");
  };

  return (
    <ProfileContext.Provider value={{ profile, stats, setProfile, refreshStats }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
