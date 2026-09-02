import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewChatMobile } from "@/components/chats/NewChatMobile";
import WhatsAppChatsPage from "@/app/dashboard/chats/page";

export default async function NewChatPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="w-full">
      {/* Mobile Dedicated New Chat Screen */}
      <div className="block md:hidden w-full">
        <NewChatMobile />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block w-full">
        <WhatsAppChatsPage />
      </div>
    </div>
  );
}
