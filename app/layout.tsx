import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "스스로 학습",
  description: "청소년을 위한 자기주도학습 앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen antialiased">
        <div className="max-w-md mx-auto pb-20">
          {children}
        </div>
        <Navigation />
      </body>
    </html>
  );
}
