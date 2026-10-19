import type { Metadata } from "next";
export const metadata: Metadata = { title: "Wood Origins", description: "Wood Origins flooring and website administration." };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en"><body>{children}</body></html>;}
