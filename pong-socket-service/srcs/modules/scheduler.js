import nodeCron from "node-cron";
import GAME_CONSTANTS from "../constants.js";
import PongError from "../models/pongError.js";
import {
  getActiveTournament,
  msRequestCreateTournament,
  msRequestJoinTournament,
} from "../microservices/gameMS.js";
import {
  broadcastTournament,
  createTournament,
  checkAndMarkTournamentAsStarted,
  broadcastTournament_V2,
} from "./tournament.js";
import jwt from "jsonwebtoken";

// mainly these configs require "create" and "start" event
// broadcast1 & broadcast2 are optional
const validateServerSchedules = (schedules) => {
  if (!schedules) return true;

  if (!Array.isArray(schedules))
    throw PongError(
      "Invalid configuration - schedules should be an array",
      500
    );

  schedules.forEach((item, ind) => {
    if (!item?.schedules?.start)
      throw PongError(
        `Invalid configuration in schedule #${ind} - start expected`
      );
    if (!item?.schedules?.create)
      throw PongError(
        `Invalid configuration in schedule #${ind} - create expected`
      );
  });
  return true;
};

// set up the node-cron jobs scheduleand their callbacks
const resetLastTournament = async () => {
  console.log(` inside resetLastTournament() `);
  const activeTournament = await getActiveTournament();
  console.log(`activeTournament `, activeTournament);
  if (!activeTournament || !activeTournament.id) return false;

  const token = jwt.sign(
    {
      userId: 999,
      username: "System",
      email: "System",
    },
    process.env.JWT_SECRET || "changeme"
  );

  if (
    activeTournament.status == "pending" ||
    activeTournament.status == "in_progress"
  ) {
    console.log(`activeTournament.status is `, activeTournament.status);
    console.log(` requires reset `);
    const endpoint = `${GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX}tournaments/${activeTournament.id}`;
    console.log(`endpoint = `, endpoint);
    const method = "PATCH";
    const out = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "canceled" }),
    });
    console.log(`FINALLY out = `, out);

    return true;
  }
  return false;
};
const setupServerSchedules = () => {
  const schedules = GAME_CONSTANTS.PONG_TOURNAMENT_SCHEDULES;
  validateServerSchedules(schedules);

  console.log(
    `=================================================================`
  );
  console.log(` HHH - setupServerSchedules() being called`);
  console.log(
    `=================================================================`
  );

  if (!schedules) {
    console.log("NOTE, not schedule was provided, skipping the schedules");
    return true;
  }
  schedules.forEach((thisSched, index) => {
    console.log(
      ` setting up schedule#${index} , with the name "${thisSched.name}"`
    );

    let debugRunNowOnce_Create = false; // FINALLY SHOULD BE false
    let debugStartTournamentAfterCreate = null; // FINALLY SHOULD BE 0 IF WANTS TO START ON TIME
    let debugPlayerJoins = false; // FINALLY SHOULD BE false
    let debugRunNowOnce_BC1 = false; // FINALLY SHOULD BE false
    let debugRunNowOnce_COUNTDOWN = false; // FINALLY SHOULD BE false

    if (GAME_CONSTANTS.FTT_EVALUATION_DEBUG_TOURNAMENT) {
      debugRunNowOnce_Create = true;
      debugPlayerJoins = true;
      debugRunNowOnce_BC1 = true;
      debugRunNowOnce_COUNTDOWN = true;
      // for presentation , 5 should be OK,  tournament will be started at +5 AND +5 = +10 min
      // the registration should be stopped at first +5 min ?
      debugStartTournamentAfterCreate =
        GAME_CONSTANTS.PONG_MINUTES_CLOSE_REGISTER; // FINALLY SHOULD BE 0 IF WANTS TO START ON TIME
    }

    // ===================================================== //
    // CREATE TOURNAMENT
    // ===================================================== //
    if (thisSched.schedules.create) {
      // define START activity here
      console.log(` thisSched.schedules.start = `, thisSched.schedules.start);
      let due = debugRunNowOnce_Create
        ? "* * * * * *"
        : thisSched.schedules.start;
      const job = nodeCron.schedule(due, async () => {
        const utcDate = new Date();
        console.log(" HHH - Local:", utcDate.toString()); // Local timezone
        console.log(` HHH - create was called on  `);

        if (debugRunNowOnce_Create) {
          console.log(" debug CREATE => job.stop() has been called");
          job.stop();
        }
        let maxParts =
          thisSched.max ??
          GAME_CONSTANTS.PONG_TOURNAMENT_DEFAULT_MAX_PARTICIPANTS;
        // even though this is create event, the parameter requires thisSched.schedules.start

        let ovrSchedule = null;
        if (
          debugStartTournamentAfterCreate &&
          debugStartTournamentAfterCreate > 0
        ) {
          ovrSchedule =
            new Date().getTime() + debugStartTournamentAfterCreate * 1000 * 60;
        }

        const newTournament = await createTournament(
          `${thisSched.name}`,
          maxParts,
          thisSched.schedules.start,
          ovrSchedule
        );

        if (debugPlayerJoins) {
          // await msRequestJoinTournament( newTournament.id , 42424243)
          // await msRequestJoinTournament( newTournament.id , 42424244)
          // await msRequestJoinTournament( newTournament.id , 42424248)
          // await msRequestJoinTournament( newTournament.id , 42424249)
          // await msRequestJoinTournament( newTournament.id , 42424245)
          // await msRequestJoinTournament( newTournament.id , 42424247)

          // ai set
          await msRequestJoinTournament(newTournament.id, 4242);
          await msRequestJoinTournament(newTournament.id, 424242);
          await msRequestJoinTournament(newTournament.id, 42424242);
          // await msRequestJoinTournament(newTournament.id, 42424244);
          // await msRequestJoinTournament(newTournament.id, 42424244);
        }
      });
    } else console.log(` schedule #${ind} has no start param`);

    console.log(` XXX ==================`);
    console.log(` XXX  scheduler.create OK `);
    console.log(` XXX ==================`);

    // ===================================================== //
    // BROADCAST1 TOURNAMENT
    // ===================================================== //
    if (thisSched.schedules.broadcast1) {
      //
      console.log(
        ` thisSched.schedules.broadcast1 = `,
        thisSched.schedules.broadcast1
      );
      let due = debugRunNowOnce_BC1
        ? "* * * * * *"
        : thisSched.schedules.broadcast1;
      const job = nodeCron.schedule(due, async () => {
        const activeTournament = await getActiveTournament();
        if (!activeTournament || !activeTournament.id) {
          console.log("whoops, no active tournament");
          return;
        }
        // broadcastTournament(activeTournament);
        broadcastTournament_V2(
          activeTournament,
          debugStartTournamentAfterCreate
        );
        if (debugRunNowOnce_BC1) {
          console.log(" debug BC1 => job.stop() has been called");
          job.stop();
        }
      });
    }
    console.log(` XXX ==================`);
    console.log(` XXX  scheduler.broadcast OK `);
    console.log(` XXX ==================`);

    // ===================================================== //
    // COUNTDOWN TOURNAMENT
    // ===================================================== //
    if (thisSched.schedules.countdown) {
      console.log(
        ` thisSched.schedules.countdown = `,
        thisSched.schedules.countdown
      );
      let due = debugRunNowOnce_COUNTDOWN
        ? "* * * * * *"
        : thisSched.schedules.countdown;
      const job = nodeCron.schedule(due, async () => {
        const activeTournament = await getActiveTournament();
        if (!activeTournament) {
          console.log("whoops, no active tournament");
          return;
        }

        // DELETE ME // the presentation code
        // this will check if there's enough participants / close the registration / start the coutdown
        console.log(" 999 - AWAIT FOR JOINING TO FINISH");
        setTimeout(async () => {
          // in skipRounOrStartRound ... there will be condition for startCountDownTournament() calling
          await checkAndMarkTournamentAsStarted();
        }, 1000 * 60 * debugStartTournamentAfterCreate);

        if (debugRunNowOnce_COUNTDOWN) {
          console.log(" debug COUNTDOWN => job.stop() has been called");
          job.stop();
        }
      });
    }
    console.log(` XXX ==================`);
    console.log(` XXX  scheduler.countdown OK `);
    console.log(` XXX ==================`);
  });
};

// throw Error("SEEMS OK HERE")
export { setupServerSchedules, resetLastTournament };
