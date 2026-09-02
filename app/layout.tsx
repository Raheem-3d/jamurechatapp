import type React from "react"
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import SessionProvider from "@/components/session-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "sonner"
import GlobalLoader from "@/components/GlobalLoader"
import { BuzzOverlay } from "@/components/buzz-overlay"
import { PWAManager } from "@/components/pwa-manager"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "JamureChat - Team Chat & Collaboration",
    template: "%s | JamureChat",
  },
  description: "Chat and task management for your organization",
  generator: "Abdul Raheem",
  applicationName: "JamureChat",
  manifest: "/manifest.json",
  keywords: ["chat", "task management", "office", "collaboration", "real-time messaging"],
  authors: [{ name: "Raheem" }],
  creator: "Abdul Raheem",
  publisher: "Abdul Raheem",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JamureChat",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon.ico", sizes: "any" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/Desktopicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon.ico" },
      { url: "/Desktopicon.ico" },
    ],
    shortcut: "/icons/icon.ico",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning className="h-full overflow-hidden">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={fontSans.className} suppressHydrationWarning>
        <SessionProvider session={session}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <PWAManager />
              <GlobalLoader />
              <BuzzOverlay />
              {children}
              <Toaster
                position="top-center"
                richColors
                closeButton
                duration={4000}
              />
            </ThemeProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  )
}