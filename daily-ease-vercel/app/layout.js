import "./globals.css";
import AppProvider from "@/components/AppProvider";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Daily Ease — trusted home services",
  description: "Find and book plumbers, electricians, cleaners and more. English, हिन्दी, Hinglish.",
};
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0F766E" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Nav />
          <main className="container">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
