import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Samson Jisso Developer",
  description: "Content Managmement System",
};

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

export default Layout;
