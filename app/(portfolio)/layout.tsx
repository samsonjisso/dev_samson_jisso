import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SanityLive } from "@/sanity/lib/live";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import SidebarToggle from "@/components/SidebarToggle";
import { FloatingDock } from "@/components/FloatingDock";
import { ModeToggle } from "@/components/DarkModeToggle";
import { ThemeProvider } from "@/components/ThemeProvider";
import { draftMode } from "next/headers";
import { DisableDraftMode } from "@/components/DisableDraftMode";
import { VisualEditing } from "next-sanity/visual-editing";


export const metadata: Metadata = {
  title: "Samson Jisso Developer",
  description: "Portfolio Website",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider>
            <SidebarProvider defaultOpen={false}>
              <SidebarInset>{children}</SidebarInset>
              <AppSidebar side="right" />
              <FloatingDock />
              <SidebarToggle />
            {/* Mode Toggle - Desktop: bottom right next to AI chat, Mobile: top right next to burger menu */}
              <div className="fixed md:bottom-6 md:right-24 top-1 right-18 md:top-auto md:left-auto z-0">
                <div className="w-10 h-10 md:w-12 md:h-12">
                  <ModeToggle />
                </div>
              </div>
            </SidebarProvider>
              
            <SanityLive />
             {(await draftMode()).isEnabled && (
              <>
                <VisualEditing/>
                <DisableDraftMode />
              </>
            )}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
