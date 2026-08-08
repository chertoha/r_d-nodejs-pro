import net from "node:net"
import { httpHandler } from "./handler.js"

console.log("http-server")

const server = net.createServer(httpHandler).on("error", (err) => {
  throw err
})

server.listen(3005, () => {
  console.log("Server started on", server.address().port)
})
