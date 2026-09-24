import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/lib/user-context";

export const metadata: Metadata = {
  title: "سامانه جامع مدیریت مجموعه خودرویی | Car Service ERP",
  description:
    "سیستم یکپارچه ERP + CRM + اتوماسیون فرآیندها + هوش مصنوعی برای نمایشگاه خودرو، تعمیرگاه، اجاره، فروش اقساطی، انبار قطعات و مدیریت مشتریان",
  keywords: ["ERP", "CRM", "خودرو", "نمایشگاه", "تعمیرگاه", "اجاره خودرو", "اتوماسیون", "هوش مصنوعی"],
  authors: [{ name: "vahidaskari1365" }],
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground erp-body">
        <ThemeProvider>
          <UserProvider>
            {children}
            <Toaster />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
