const headerEndPattern = "\r\n\r\n"

export const httpHandler = (socket) => {
  let buffer = ""
  socket.on("data", (chunk) => {
    buffer += chunk.toString("latin1")

    if (!buffer.includes(headerEndPattern)) {
      return
    }

    const [request, ...rawHeaders] = buffer
      .split(headerEndPattern)[0]
      .split("\r\n")

    const [method, path, protocol] = request.split(" ")
    const headers = parseHeaders(rawHeaders)

    const routeContext = {
      method,
      path,
      host: headers.host,
      headers,
    }

    const response = resolveRoute(routeContext)

    console.log("RESPONSE:")
    console.log(response)

    socket.write(response)
    socket.end()
  })
}

function parseHeaders(rawHeaders) {
  const entries = []

  for (const rawHeader of rawHeaders) {
    const separatorIndex = rawHeader.indexOf(":")
    const key = rawHeader.slice(0, separatorIndex).trim()
    const value = rawHeader.slice(separatorIndex + 1).trim()
    entries.push([key.toLowerCase(), value.toLowerCase()])
  }

  return Object.fromEntries(entries)
}

function resolveRoute(context) {
  const result = router(context)

  const headers = Object.entries(result.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\r\n")

  return `HTTP/1.1 ${resolveStatusText(result.status)}\r\n${headers}\r\n\r\n${result.body}`
}

function router(context) {
  const { method, path, host, headers } = context

  if (method.toLowerCase() === "get" && path === "/") {
    return {
      status: 200,
      headers: {
        "content-type": "text/plain",
      },
      body: `Host=${host}, Path=${path}`,
    }
  }

  if (method.toLowerCase() === "get" && path === "/headers") {
    return {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ headers }, null, 2),
    }
  }

  const body = "Not Found"

  return {
    status: 404,
    headers: {
      "content-type": "text/plain",
      "content-length": Buffer.byteLength(body),
    },
    body,
  }
}

function resolveStatusText(status) {
  switch (status) {
    case 200:
      return "200 OK"

    case 404:
      return "404 Not Found"

    default:
      return "500 Internal Server Error"
  }
}
