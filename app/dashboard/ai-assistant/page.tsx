import AIAssistant from '@/components/ai-assistant';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function AIAssistantPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const userOrg = await db.user.findUnique({
    where: { id: session.user.id },
    select: { organization: { select: { aiEnabled: true } } }
  });

  const isEnabled = userOrg?.organization?.aiEnabled !== false;
  if (!isEnabled) {
    redirect("/dashboard");
  }

  return <AIAssistant />;
}
