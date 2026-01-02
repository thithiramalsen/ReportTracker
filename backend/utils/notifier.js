const clients = new Set()

function addClient(res) {
  clients.add(res)
}

function removeClient(res) {
  clients.delete(res)
}

function sendEvent(eventName, payload) {
  const data = JSON.stringify(payload)
  for (const res of clients) {
    try {
      res.write(`event: ${eventName}\n`)
      res.write(`data: ${data}\n\n`)
    } catch (e) {
      // ignore broken clients
    }
  }
}

module.exports = { addClient, removeClient, sendEvent }
