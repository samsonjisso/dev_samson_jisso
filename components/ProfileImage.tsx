"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { AsciiArt } from "./ui/ascii-art";

interface ProfileImageProps {
  imageUrl: string;
  firstName: string;
  lastName: string;
}

export function ProfileImage({
  imageUrl,
}: ProfileImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toggleSidebar, open } = useSidebar();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  return (
    <button
      type="button"
      onClick={() => (isSignedIn ? toggleSidebar() : openSignIn())}
      className="relative aspect-square rounded-2xl overflow-hidden block group cursor-pointer w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Toggle AI Chat Sidebar"
    >

      <AsciiArt
        src={imageUrl}
        resolution={300}
        color="#06b6d4"
        inverted
        animateOnView={false}
        objectPosition="top"
        className="absolute inset-0 h-full w-full bg-black"
      />

      {/* Online Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
        </div>
        <span className="text-xs font-medium text-white">Online</span>
      </div>

      {/* Hover Overlay */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="text-center space-y-3">
          {open ? (
            <X className="w-12 h-12 text-white mx-auto" />
          ) : (
            <MessageCircle className="w-12 h-12 text-white mx-auto" />
          )}

          <div className="text-white text-xl font-semibold">
            {open ? "Close Chat" : "Chat with AI Twin"}
          </div>
          <div className="text-white/80 text-sm">
            {open ? "Click to close chat" : "Click to open chat"}
          </div>
        </div>
      </div>
    </button>
  );
}
