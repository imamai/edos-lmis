import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EDOS LMIS",
  description: "Laboratory Management Information System",
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('edoslmis-theme');
    var theme = stored || 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
