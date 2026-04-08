"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfiles, createProfile } from "@/lib/db";
import { Profile } from "@/lib/types";
import { useProfile } from "@/context/ProfileContext";
import { PROFILE_AVATARS, PROFILE_COLORS } from "@/lib/constants";

export default function ProfileSelectPage() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState(PROFILE_AVATARS[0]);
  const [newColor, setNewColor] = useState(PROFILE_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfiles().then((data) => {
      setProfiles(data);
      setLoading(false);
    });
  }, []);

  const handleSelect = (p: Profile) => {
    setProfile(p);
    router.push("/home");
  };

  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const p = await createProfile({ name: newName.trim(), avatar: newAvatar, color: newColor });
      if (p) {
        setProfiles((prev) => [...prev, p]);
        setNewName("");
        setNewAvatar(PROFILE_AVATARS[0]);
        setNewColor(PROFILE_COLORS[0]);
        setShowAdd(false);
      } else {
        setError("저장에 실패했어요. Supabase 연결을 확인해주세요.");
      }
    } catch (e) {
      setError("오류가 발생했어요: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-12 pb-8">
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">📚</div>
        <h1 className="text-3xl font-black text-gray-900">스스로 학습</h1>
        <p className="text-gray-500 mt-1">누구세요?</p>
      </div>

      {/* Profile Cards */}
      <div className="space-y-3 mb-6">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(p)}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-98 transition-all"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-md"
              style={{ backgroundColor: p.color + "22", border: `3px solid ${p.color}` }}
            >
              {p.avatar}
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 text-lg">{p.name}</div>
              <div className="text-sm text-gray-400">탭해서 입장</div>
            </div>
            <div className="ml-auto text-gray-300 text-2xl">›</div>
          </button>
        ))}
      </div>

      {/* Add Profile */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-medium hover:border-indigo-400 hover:text-indigo-400 transition-colors"
        >
          + 새 프로필 추가
        </button>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-800">새 프로필 만들기</h2>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">이름</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="이름을 입력하세요"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">아바타</label>
            <div className="flex flex-wrap gap-2">
              {PROFILE_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setNewAvatar(emoji)}
                  className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all ${
                    newAvatar === emoji ? "ring-2 ring-indigo-500 scale-110" : "bg-gray-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">색상</label>
            <div className="flex gap-2">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    newColor === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAdd(false); setError(null); }}
              className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {saving ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* Parent link */}
      <div className="text-center mt-8">
        <a href="/parent" className="text-sm text-gray-400 hover:text-indigo-500 underline">
          👨‍👩‍👧‍👦 부모님 대시보드
        </a>
      </div>
    </div>
  );
}
