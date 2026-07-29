"use client"
import { useCallback, useState } from "react"
import MessageList from "./message-list"
import MessageInput from "./message-input"
import { useSession } from "next-auth/react"
import type { Message } from "./types" // Make sure you have proper types

export default function ChatContainer() {

  const [messages, setMessages] = useState<Message[]>([])


   const [replyingTo, setReplyingTo] = useState<{
    id: string
    content: string
    sender: {
      id: string
      name: string
    }
  } | null>(null)
  const { data: session } = useSession()




const handleReplySelect = (message: any) => {

  setReplyingTo(message); 
};

// Extract unique users from messages for consistent name display in read receipts
const users = Array.from(
  new Map(
    messages.map((msg) => [
      msg.sender.id,
      { id: msg.sender.id, name: msg.sender.name }
    ])
  ).values()
);

  const handleReplySubmit = async (content: string, replyToId: string) => {
    if (!session?.user?.id) return
    
    try {
    
      
      // Here you would typically call your API
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          replyToId,
          senderId: session.user.id,
          // Add other required fields aata hai ki
        }),
      })

      if (!response.ok) throw new Error("Failed to send reply")
      
      const newMessage = await response.json()
      setMessages(prev => [...prev, newMessage])
      setReplyingTo(null)
    } catch (error) {
      console.error("Error sending reply:", error)
    }
  }



  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
       <MessageList messages={messages} onReplySelect={handleReplySelect} currentUserId={session?.user?.id} users={users} />
      </div>
  <MessageInput  replyingTo={replyingTo} key={replyingTo?.id || 'default'} />
        </div>
  )
}






