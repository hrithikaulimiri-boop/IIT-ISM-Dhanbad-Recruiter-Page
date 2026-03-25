"use client";

import { SessionProvider } from "next-auth/react";
import ThemeRegistry from "@/components/common/ThemeRegistry";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeRegistry>{children}</ThemeRegistry>
    </SessionProvider>
  );
}
