import type { Metadata } from "next";
import Providers from "@/components/common/Providers";

export const metadata: Metadata = {
  title: "Campus Recruitment - Recruiter Portal",
  description: "INF/JNF recruiter placement management",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
