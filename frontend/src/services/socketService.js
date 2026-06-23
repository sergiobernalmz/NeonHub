import { io } from 'socket.io-client'
import API_BASE_URL from '../config/api'

let socket = null

function getSocket() {
  if (!socket) {
    const base = API_BASE_URL.replace('/api', '')
    socket = io(base, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

function disconnectSocket() {
  if (socket?.connected) socket.disconnect()
}

export { getSocket, connectSocket, disconnectSocket }
