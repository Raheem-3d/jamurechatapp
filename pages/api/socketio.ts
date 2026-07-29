import type { NextApiRequest } from "next"
import type { NextApiResponseServerIO } from "@/types/next"
import { initializeSocketIO } from "@/lib/socket-server"
import { initializeReminderSystem } from "@/lib/reminder-init"

export const config = {
  api: {
    bodyParser: false,
  },
}

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log("* Initializing master Socket.io server instance via /api/socketio")
    const io = initializeSocketIO(res.socket.server as any)
    res.socket.server.io = io
  }
  
  initializeReminderSystem()
  res.end()
}

export default ioHandler
