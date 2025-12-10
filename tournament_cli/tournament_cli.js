import { io } from "socket.io-client"
import https from 'https'
import { readFileSync } from "fs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certPath = path.resolve(__dirname, "./certs/cert.crt");

const ca = fs.readFileSync(certPath);
const theHost = "https://localhost:9999"
// const theHost = "https://10.13.5.4:9999"

const socket = io(theHost , {
  path: "/pong",
  reconnection: false,
  transports: ["websocket"] , 
  agent: new https.Agent({
    ca: ca,
    rejectUnauthorized: false,
  }),
});


socket.on("connect", () => {
  console.log("Connected!")

  socket.emit("new-tournament", {
  })

  socket.emit("updateTournament", {})
  console.log(`sent!`)
  setTimeout(() => socket.disconnect(), 1000)
})

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message)
  console.error('Full error:', err)
})