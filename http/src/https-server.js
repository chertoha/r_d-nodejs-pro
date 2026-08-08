import tls from "node:tls"
import fs from "node:fs"
import { httpHandler } from "./handler.js"

const httpsServer = tls.createServer(
  {
    key: fs.readFileSync("./key.pem"),
    cert: fs.readFileSync("./cert.pem"),
  },
  httpHandler,
)

httpsServer.listen(3443, () => {
  console.log("Server started on", httpsServer.address().port)
})
