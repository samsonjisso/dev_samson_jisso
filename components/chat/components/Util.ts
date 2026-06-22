import { CHAT_PROFILE_QUERY_RESULT } from "@/sanity.types";

export  const formatSeconds = (s: number) => {
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return `${h}h${m ? ` ${m}m` : ""}`;
    }
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}m${sec ? ` ${sec}s` : ""}`;
    }
    return `${s}s`;
  };

  export const getGreeting = (profile: CHAT_PROFILE_QUERY_RESULT) => {
    if (!profile?.firstName) {
      return "Ask me anything about my work, experience, or projects.";
    }

    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    return `Hi! I'm ${fullName}. Ask me anything about my work, experience, or projects.`;
  };