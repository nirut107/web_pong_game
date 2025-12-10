import { io } from "socket.io-client";
import GAME_CONSTANTS from "../constants.js";
import msRequestCreateGame, {
  getActiveTournament,
  msFetchTournament,
  msRequestAdvanceRound,
  msRequestCreateTournament,
  msRequestFinalizeTournament,
  msRequestStartTournament,
  msRequestUpdateGame,
} from "../microservices/gameMS.js";
import msFetchUser from "../microservices/userMS.js";
import newMatch from "../models/match.js";
import newMatchSettings from "../models/matchSettings.js";
import PongError from "../models/pongError.js";
import rooms from "../pong42ServerSetup.js";
import { addMatchToRooms } from "./matchLogic.js";
import startMatch, {
  displayDatetime,
  initializeThisMatch,
} from "./pongGame.js";
import CronExpressionParser from "cron-parser";
import https from "https";
import { readFileSync } from "fs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import broadcastToRoom, { ioInstance } from "./gameRuntime.js";

const _getBroadcastSocket = () => {
  console.log(
    `attempt to connect to broadcast server on ${GAME_CONSTANTS.SOCKET_SERVER}`
  );
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const certPath = path.resolve(__dirname, "../certs/cert.crt");

  const ca = fs.readFileSync(certPath);

  const bcSocket = io(GAME_CONSTANTS.SOCKET_SERVER, {
    reconnection: false,
    transports: ["websocket"],
    agent: new https.Agent({
      ca: ca,
      rejectUnauthorized: false,
    }),
  });

  bcSocket.on("connect", () => {
    console.log(
      ` 888 => broadcastSocket was connected to ${GAME_CONSTANTS.SOCKET_SERVER}`
    );
  });
  bcSocket.on("disconnect", (reason) => {
    console.log(` 888 => broadcastSocket was disconnected, `, reason);
  });
  bcSocket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
  });

  bcSocket.on("error", (err) => {
    console.error("General socket error:", err.message);
  });
  return bcSocket;
};

// create the initial setup for tournament using game-service microservies
// this usually starts around 15:00
const createTournament = async (
  tournamentName = null,
  maxParticipants = null,
  crontabSchedule = null,
  overwriteSchedule = null
) => {
  if (!tournamentName) tournamentName = "Test Tournament ";
  if (!maxParticipants) maxParticipants = 8;
  if (!crontabSchedule)
    crontabSchedule = GAME_CONSTANTS.CRONJOB_PONG_TOURNAMENT_START_AT;

  return await msRequestCreateTournament(
    tournamentName,
    maxParticipants,
    crontabSchedule,
    overwriteSchedule
  );
};

const broadcastCustom = async (
  eventName = "updateTournament",
  payload = {}
) => {
  const bcSocket = _getBroadcastSocket();
  bcSocket.on("connect", () => {
    bcSocket.emit(eventName, payload);
    bcSocket.disconnect();
  });
};

// really not sure about this one, but since the room was not ye set until 10 minutes before the tournament start
// this tournament won't have any game info
const broadcastTournament = async (
  tournamentObj,
  overwrittenMessage = null
) => {
  const bcSocket = _getBroadcastSocket();
  console.log(` BROADCAST_DEBUG , tournamentObj = `, tournamentObj);
  console.log(` overMsg = `, overwrittenMessage);
  bcSocket.on("connect", () => {
    if (overwrittenMessage === null) {
      const dateStr = new Date(tournamentObj.tournament_starts_at);
      overwrittenMessage = ` Tournament ${tournamentObj.name} will be started at ${dateStr}`;
    } else {
    }
    console.log(" 888 => BROADCAST1 MSG =>", overwrittenMessage);
    bcSocket.emit("broadcast", {
      msg: overwrittenMessage,
    });
    bcSocket.disconnect();
  });
};

const broadcastTournament_V2 = async (
  tournamentObj,
  minsToCountdown = GAME_CONSTANTS.PONG_MINUTES_CLOSE_REGISTER,
  minsToPrepare = GAME_CONSTANTS.PONG_MINUTES_BETWEEN_TOURNAMENT_MATCHES
) => {
  const bcSocket = _getBroadcastSocket();
  console.log(` BROADCAST_V2_DEBUG , tournamentObj = `, tournamentObj);

  const matchStartsAt =
    tournamentObj.tournament_starts_at +
    (minsToCountdown + minsToPrepare) * 6000;

  bcSocket.on("connect", () => {
    bcSocket.emit("broadcastStart", {
      tournamentName: tournamentObj.name,
      timestamp: matchStartsAt,
      minsBeforeClose: minsToCountdown,
    });
    bcSocket.disconnect();
  });
};

const socketServicePM = async (
  tournamentObj,
  userId,
  isTournamentPlayer = true,
  roomId
) => {
  const bcSocket = _getBroadcastSocket();
  bcSocket.on("connect", () => {
    const dateStr = new Date(
      new Date().getTime() +
        10 * 60 * GAME_CONSTANTS.PONG_MINUTES_BETWEEN_TOURNAMENT_MATCHES
    );
    const timeInLocal = new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    }).format(dateStr);
    const msg = `Your match onTournament| ${tournamentObj.name} |will be started at| ${timeInLocal}`;
    console.log(" 888 => socketServicePM =>", {
      userId,
      msg,
      isTournamentPlayer,
      roomId,
    });
    bcSocket.emit("systemPM", {
      userId,
      msg,
      isTournamentPlayer,
      roomId,
    });
    bcSocket.disconnect();
  });
};

const getBroadcastTournamentMessage = (activeTour, theGame, theMatch) => {
  const link = `${GAME_CONSTANTS.SITE_URL}pong/${theMatch.roomId}`;
  const messageFormats = [
    `⚔ May the odds be ever in the stronger's favor, torunament match will start soon, ${link}`,
    `⚔ Witness the mighty clashes on ${link}, game will start at ${displayDatetime(
      theMatch.matchStartsAt
    )}`,
    `⚔ The stakes have never been higher, watch the match that ends all the match here ${link}`,
  ];
  let n = Math.floor(Math.random() * messageFormats.length);
  return messageFormats[n];
};

// get the information about the tournament & games related to such tournament
// create in-room memory and set the tournamentId , matchStartsAt for each room
// also assign player to each seat
const startCountdownTournament = async () => {
  console.log(` 999 - startCountdownTournament() is being called`);
  console.log(" Not USING FOR NOW?");
  return;

  // try {
  //     const activeTournament = await getActiveTournament('in_progress')

  //     if(!activeTournament)
  //     {
  //         console.log('Whoops, no active tournament to start countdown ')
  //         return
  //     }

  //     const response = await msRequestStartTournament(activeTournament.id)
  //     console.log("999 - CHECKING HERE?", response)

  //     if(!response.success || !response.games || !response.tournament)
  //     {
  //         console.log("CRITICAL ERROR, CANNOT START THE TOURNAMENT, response =", response)
  //         throw PongError("Crititacal Error, unable to start tournament", 500)
  //     }

  //     // fix the format of response.tournament.tournament_starts_at
  //     // from "2025-06-02 09:42:05" to "2025-06-02T09:42:05"
  //     response.tournament.tournament_starts_at = response.tournament.tournament_starts_at.replace(' ', 'T')

  //     let tempDate = new Date(response.tournament.tournament_starts_at)
  //     const  matchStartsAt = tempDate.getTime()
  //     const theMatches = response.games
  //     theMatches.forEach( async(dbMatch, index) => {

  //         if(dbMatch.winner_id)
  //         {
  //             console.log(" The match is already done (bye/empty), skip the rest")
  //             return
  //         }
  //         if(dbMatch.player1_id == null )
  //         {
  //             console.log(" FOR SOME REASON , the dbMatch.player1_id IS NULL , skip the rest")
  //             return
  //         }
  //         const theHost = await msFetchUser(dbMatch.player1_id)

  //         const theMatch = newMatch(theHost)

  //         console.log("AAA - TRY IN ROOM MEMORY HERE")
  //         console.log(` theMtach.roomId = ` ,theMatch.roomId)
  //         console.log("AAA - TRY IN ROOM MEMORY HERE")

  //         theMatch.hostPlayer = theHost.userId
  //         theMatch.players[0] = theHost

  //         // set the match id
  //         theMatch.id = dbMatch.id
  //         theMatch.tournamentId = response.tournament.id

  //         theMatch.matchStartsAt = matchStartsAt
  //         theMatch.matchStatus = 'INITED'
  //         const matchSettings = newMatchSettings()
  //         theMatch.matchSettings = matchSettings

  //         console.log("AAA - check me")
  //         msRequestUpdateGame( theMatch.id , {
  //             roomId : theMatch.roomId
  //         });
  //         console.log("AAA - END check me")

  //         console.log(" 999  PAYLOAD FOR PM#1 = ",
  //             {
  //                 tournament: response.tournament ,
  //                 userId: theUser.userId,
  //                 isTournamentPlayer: true,
  //                 roomId: theMatch.roomId,
  //             }
  //         )
  //         socketServicePM(response.tournament , theUser.userId , true , theMatch.roomId)

  //         if(dbMatch.player2_id)
  //         {
  //             const theUser = await msFetchUser( dbMatch.player2_id)
  //             theMatch.players[1] = theUser
  //             console.log(" 999  PAYLOAD FOR PM#2 = ",
  //                 {
  //                     tournament: response.tournament ,
  //                     userId: dbMatch.player2_id,
  //                     isTournamentPlayer: true,
  //                     roomId: theMatch.roomId,
  //                 }
  //             )
  //             socketServicePM(response.tournament , dbMatch.player2_id , true , theMatch.roomId)
  //         }

  //         // if user is null , skip insertion
  //         // if player1_id , set as host as well
  //         // fetch user / profile / create currentUser object to push into room players
  //         // push into match.players

  //         addMatchToRooms(theMatch)
  //         console.log(" all rooms are now ", rooms)
  //     })
  // }
  // catch(error)
  // {

  //     console.error(`error caught in startCountdownTournament `)
  //     console.log(error)
  //     throw PongError(error.message. error?.code ?? 500)
  //     return false
  // }
};

// the same way the match begin by clicking start game
// but this one will be triggered by the server itself
const startTournamentMatches = (socket, io) => {
  const nowTime = Date.now();

  rooms.forEach((room) => {
    if (!room.tournamentId) return;
    if (room.winnerSide != -1) return;
    if (room.matchStatus == "INITED" && room.matchStartsAt < nowTime) {
      let registerWithMicroservice = false;
      startMatch(socket, io, room);
      setTimeout(() => {
        theMatch.gamePlay.gameIsPaused = false;
        io.to(room.roomId).emit("match-status", { match: room });
      }, 5000);
    }
  });
};

// checkAndMarkTournamentAsStarted
// check if the is_bye is on for all of the players in tournament on such round

const checkAndMarkTournamentAsStarted = async () => {
  console.log(` =========================================================== `);
  console.log(` 888 <== inside checkAndMarkTournamentAsStarted() `);
  console.log(` =========================================================== `);
  try {
    let activeTour = await getActiveTournament();
    let doCallBack = false;

    if (!activeTour) {
      console.log("Whoops, no active tournament found, simply return ");
      return;
    }

    if (activeTour.completed_at != null) {
      console.log("YAY! the tournament is over");
      broadcastCustom("updateTournament", null);
      return;
    }

    if (activeTour.games && activeTour.games.length == 0) {
      console.log(" TOURNAMENT HAS YET TO STARTED #1");

      const tempTour = await msRequestStartTournament(activeTour.id);
      if (tempTour && tempTour.games) activeTour.games = tempTour.games;
      // console.log(activeTour)
      // console.log(" TOURNAMENT HAS YET TO STARTED #2")
      // DONOT USE NEWLY FECTHED :()
      // activeTour = await getActiveTournament()
    } else {
      console.log(" BBB - activeTour.games.length = ", activeTour.games.length);
      if (activeTour.games[0]) {
        console.log(" BBB - games[0]", activeTour.games[0]);
        console.log(" -or All");
        console.log(activeTour.games);
      } else {
        console.log(" BBB even game[0] does not exist ");
      }
      let round = 1;
      if (activeTour.games.length == 7) round = 3;
      else if (activeTour.games.length > 4) round = 2;
      else round = 1;
      console.log(
        " TOURNAMENT HAS STARTED #2, AND NEEDS TO BE ADVANCE, with round = ",
        round
      );

      if (round == 3) {
        console.log(" DDD - May need a special rule for the 3rd round???");
      }
      const tempTour = await msRequestAdvanceRound(activeTour.id, round);

      console.log(` #### RESTORE ORIGINAL LINE HERE `);
      console.log(
        ` THU_DEBUG result from msRequestAdvanceRound() with activeTour.id = ${activeTour.id} `
      );
      // #### RESTORE ORIGINAL LINE HERE
      // if(tempTour && tempTour.games)
      //     activeTour.games = tempTour.games
      if (tempTour && tempTour.success) {
        // just broadcast here ?
        broadcastCustom("updateTournament");

        // final round
        if (
          tempTour?.tournamentCompleted ||
          tempTour.nextRoundGames.length == 0
        ) {
          console.log(" DDD - CHECK FOR FINALIZE HERE ****");
          console.log(` activeTour.id = `, activeTour?.id);
          console.log(` tempTour.winner = `, tempTour?.winner);

          msRequestFinalizeTournament(activeTour?.id, tempTour?.winner?.id);
          console.log(" DDD - END CHECK FOR FINALIZE HERE ****");
        } else {
          console.log(`==============================`);
          console.log(` DDD - YAY can advance round`);
          console.log(tempTour);
          console.log(`==============================`);
          activeTour.games = tempTour.nextRoundGames;
          // broadcastCustom('updateTournament')
        }
      } else {
        console.log(`==============================`);
        console.log(
          " DDD - request for advance round , returns SOMETHING ELSE"
        );
        console.log(tempTour);
        console.log(`==============================`);
      }
    }
    const theDue = new Date(
      new Date().getTime() +
        1000 * 60 * GAME_CONSTANTS.PONG_MINUTES_BETWEEN_TOURNAMENT_MATCHES
    );

    const endpoint = `${GAME_CONSTANTS.AVALANCHE_SERVER}submitScore`;
    const method = "POST";

    let allEmpty = true;

    activeTour.games.forEach(async (game) => {
      if (!game.status || game.status != "completed") {
        // do nothing , if no opponent
        if (game.is_empty) return;
        if (game.is_bye) {
          const payloadP1 = {
            tournamentId: activeTour.id,
            position: game.position,
            playerId: game.player1_id,
            score: 0,
          };
          console.log(` BLOCKCHAIN_DEBUG ===> IS_BYE ==> `, payloadP1);
          fetch(endpoint, {
            method: method,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payloadP1),
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error(`HTTP ${res.status} - ${res.statusText}`);
              }
            })
            .catch((err) => {
              console.log(" BLOCKCHAIN_DEBUG => fail fecth#1", err.message);
            });
        } else {
          allEmpty = false;
        }
        console.log(" TOURNAMENT HAS YET TO STARTED #3");
        console.log(game);
        if (!game.player2_id) return;
        doCallBack = true;
        // create room , join 2 players , set TournamentId , setMatch StartUpTimestamps
        const theMatch = newMatch({ tournamentId: activeTour.id });
        theMatch.tournamentId = activeTour.id;
        theMatch.matchStartsAt = theDue.getTime();
        theMatch.matchStatus = "INITED";
        // Sun , fix that the position was missing
        theMatch.tournamentPosition = game.position;

        theMatch.id = game.id;
        console.log(
          ` BBB - this is assigning of game.id = ${game.id}`,
          game.id
        );

        msRequestUpdateGame(theMatch, {
          roomId: theMatch.roomId,
        });
        if (game.player1_id) {
          theMatch.hostPlayer = game.player1_id;
          let player1 = await msFetchUser(game.player1_id);
          console.log(`TOURNAMENT HAS YET TO STARTED #5 - player 1`);
          await socketServicePM(
            activeTour,
            game.player1_id,
            true,
            theMatch.roomId
          );
          const broadcastMessage = getBroadcastTournamentMessage(
            activeTour,
            game,
            theMatch
          );

          // await broadcastTournament(activeTour, broadcastMessage);
          //
          console.log(" MON_DEBUG #1", theMatch);
          const thePlayers = [];
          // theMatch.players.forEach( thisPlayer => {
          //   console.log(` MON_DEBUG #2 player = `, thisPlayer)
          //   thePlayers.push(thisPlayer.userId)
          // })
          thePlayers.push(game.player1_id);
          thePlayers.push(game.player2_id);
          console.log(` MON_DEBUG `, thePlayers);
          console.log(` BROADCAST_DEBUG , sending broadcastMatch with`, {
            timestamp: theMatch.matchStartsAt,
            roomId: theMatch.roomId,
            players: thePlayers,
          });
          console.log(` MON_DEBUG ==== `);
          broadcastCustom("broadcastMatch", {
            timestamp: theMatch.matchStartsAt,
            roomId: theMatch.roomId,
            players: thePlayers,
          });

          theMatch.players[0] = player1;
        }
        if (game.player2_id) {
          console.log(`TOURNAMENT HAS YET TO STARTED #6 - player 2`);
          await socketServicePM(
            activeTour,
            game.player2_id,
            true,
            theMatch.roomId
          );
          let player2 = await msFetchUser(game.player2_id);
          theMatch.players[1] = player2;
        }
        addMatchToRooms(theMatch);
        console.log(
          "` *** BBB - listing all rooms after adding ",
          theMatch.roomId
        );

        Object.keys(rooms).forEach((key, ind) => {
          console.log(
            ` - room#${ind + 1} = ${rooms[key].roomId}, id = ${rooms[key].id}`
          );
        });

        console.log(
          " DDD - AVOID msRequestCreateGame on THIS TIME , SINCE IT SUPPOSED TO BE THERE ALREADY "
        );
        //
        // await msRequestCreateGame( theMatch , { userId: theMatch.hostPlayer})
        console.log(" *** BBB end list");
        setTimeout(async () => {
          let tsMatch = rooms[theMatch.roomId];
          initializeThisMatch(tsMatch);

          let io = ioInstance;

          io.to(tsMatch.roomId).emit("match-start-ok", {});
          io.to(tsMatch.roomId).emit("match-status", { match: tsMatch });
          io.to(tsMatch.roomId).emit("game-data", tsMatch.gamePlay);

          io.to(tsMatch.roomId).emit("countdown", { cd: 3, message: "GO!" });
          tsMatch.gamePlay.gameIsPaused = true;

          startMatch(null, io, tsMatch);

          setTimeout(() => {
            tsMatch.gamePlay.gameIsPaused = false;
            io.to(tsMatch.roomId).emit("match-status", { match: tsMatch });
          }, 5000);
        }, 1000 * 60 * GAME_CONSTANTS.PONG_MINUTES_BETWEEN_TOURNAMENT_MATCHES);
      }
    });
    console.log(" DEBUG UNTIL THIS POINT");

    console.log(` THU_DEBUG allEmpty = ${allEmpty}`);
    if (allEmpty) {
      // recursively call for next round?
      checkAndMarkTournamentAsStarted();
    }

    return;
  } catch (error) {
    console.error("error caught in checkAndMarkTournamentAsStarted as", error);
    if (
      error.code == 400 &&
      String(error.message).startsWith("Tournament needs at least")
    ) {
      PongError("Not enough participants, the tournament has been canceled");
    }
  }
};

export {
  createTournament,
  startCountdownTournament,
  startTournamentMatches,
  broadcastTournament,
  broadcastTournament_V2,
  broadcastCustom,
  checkAndMarkTournamentAsStarted,
  socketServicePM,
};
