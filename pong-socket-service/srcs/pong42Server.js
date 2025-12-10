
import GAME_CONSTANTS from "./constants.js"
import https from "https";
import fs from "fs";
import { Server } from "socket.io";
import pong42Handler from "./pong42Handler.js";
import janitorSchedule from "./modules/janitor.js";
import { setIo } from './modules/gameRuntime.js'
import { broadcastTournament, socketServicePM, startCountdownTournament, startTournamentMatches  } from "./modules/tournament.js";
import msFetchUser from "./microservices/userMS.js";
import { getActiveTournament, msRequestCreateTournament, msRequestJoinTournament } from "./microservices/gameMS.js";
import { setupDefaultCronSchedule } from "./modules/cronShceulde.js";
import { resetLastTournament, setupServerSchedules } from "./modules/scheduler.js";
import client from "prom-client";
import Fastify from "fastify";

// import { msFetchTournament, msFetchTournaments, msRequestCreateTournament, msRequestJoinTournament } from "./microservices/gameMS.js";


const serverOptions = {
  key: fs.readFileSync("./certs/private.key"),
  cert: fs.readFileSync("./certs/cert.crt"),
  // key: fs.readFileSync("./certs/key.pem"),
  // cert: fs.readFileSync("./certs/cert.pem"),
};
const httpsServer = https.createServer(serverOptions);
const io = new Server(httpsServer, {
  path: GAME_CONSTANTS.PONG_WS_NAMESPACE, 
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: false,
  },
});

console.log("✅ setIo called:", new Date().toISOString());
setIo(io)

const register = new client.Registry();
register.setDefaultLabels({ app: 'pong-socket-service' });
client.collectDefaultMetrics({ register });

const pongConnections = new client.Gauge({
  name: 'pong_socket_connections_total',
  help: 'Total number of pong socket connections',
  registers: [register]
});

const activeTournaments = new client.Gauge({
  name: 'pong_active_tournaments_total',
  help: 'Total number of active tournaments',
  registers: [register]
});

const fastify = Fastify();
fastify.get('/metrics', async (request, reply) => {
  reply.type(register.contentType);
  return register.metrics();
});

fastify.listen({ port: 9998, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('Error starting metrics server:', err);
  } else {
    console.log(`Pong metrics server running at ${address}`);
  }
});

let createTournamentOnStartup = false  

if(createTournamentOnStartup)
{
  await resetLastTournament()
  setupServerSchedules()  
}
else
{
  console.log(`!NOTE, skipping create tournament upon server boot `)
}

io.on("connection", (pongSocket) => { 
  pongConnections.inc();
  pongSocket.on('disconnect', () => {
    pongConnections.dec();
  });
  pong42Handler( pongSocket , io )
})

httpsServer.listen (GAME_CONSTANTS.PONG_WS_PORT_NO , () => {
  console.log(`Pong42Server is running on ${GAME_CONSTANTS.PONG_DOMAIN_NAME}:${GAME_CONSTANTS.PONG_WS_PORT_NO}${GAME_CONSTANTS.PONG_WS_NAMESPACE}\n\n`);
});

janitorSchedule(io, GAME_CONSTANTS.JANITOR_INTERVAL_IN_SECS * 1000)