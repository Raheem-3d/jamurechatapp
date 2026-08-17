import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsDashboard from "@/components/reports-dashboard";

export const metadata = {
  title: "Reports & Analytics | JamureChat",
  description: "Enterprise Reporting and Analytics Module for JamureChat",
};

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <ReportsDashboard />;
}
