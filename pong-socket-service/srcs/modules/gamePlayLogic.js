import { io } from "socket.io-client";
import GAME_CONSTANTS from "../constants.js";
import msRequestCreateGame, {
  msRequestStoreInBlockchain,
  msRequestUpdateMatchResult,
} from "../microservices/gameMS.js";
import randomBallDirection, { applyBounceVariant } from "./ballLogic.js";
import { isRatedGame } from "./pongGame.js";
import handleSpecial from "./specialLogic.js";
import {
  broadcastCustom,
  broadcastTournament,
  checkAndMarkTournamentAsStarted,
} from "./tournament.js";









const moveThePaddle = (socket, io, theGamePlay, payload) => {
  const playerIndex = payload?.player; // 0 to theMatchs.players.size - 1
  const move = payload?.move; //  'left' | 'right '
  const keyEvent = payload?.keyEvent; // 'start' | 'stop'

  if (move == "left") {
    theGamePlay.paddles[playerIndex].cont.isLeft = payload.keyEvent == "start";
  }

  if (move == "right") {
    theGamePlay.paddles[playerIndex].cont.isRight = payload.keyEvent == "start";
  }
};

const initializeGamePlay = (gamePlay) => {

  gamePlay.ball.pos.x = 0;
  gamePlay.ball.pos.z = 0;
 
  for(let i=0;i<gamePlay.paddles.length;i++)
  {
    if(gamePlay.paddles[i].aiLevel > 0)
    {
      
    }
  }

  gamePlay.ball.dir = randomBallDirection();
  gamePlay.gameIsPaused = true;
};

const isBallHittingTheWalls = (socket, io, theGamePlay) => {
  const theBall = theGamePlay.ball;
  const radius = GAME_CONSTANTS.BALL_DIAMETER / 2;
  const tableTop = GAME_CONSTANTS.TABLE_WIDTH / 2;
  let hit = false;

  if (theBall.pos.x + radius >= tableTop) {
    let overshoot = theBall.pos.x - (tableTop - radius);
    theBall.pos.x -= overshoot;
    theBall.dir.x *= -1;
    hit = true;
  } else if (theBall.pos.x - radius <= -tableTop) {
    let overshoot = -tableTop + radius - theBall.pos.x;
    theBall.pos.x += overshoot;
    theBall.dir.x *= -1;
    hit = true;
  }

  if (hit && GAME_CONSTANTS.PONG_ADD_RANDOM_REFLECT)
    applyBounceVariant(theBall.pos);
  if (hit && GAME_CONSTANTS.PONG_INCREASE_SPEED) {
    if (theBall.speed < GAME_CONSTANTS.BALL_MAX_SPEED) theBall.speed *= 1.02;
  }
  return hit;
};

// WORKISH
// const ORIGINAL_isBallHittingThePaddle = (theBall, thePaddle) => {
//     const {
//       BALL_RADIUS,
//       PADDLE_WIDTH,
//       PADDLE_LENGTH,
//     } = GAME_CONSTANTS

//     const ballX = theBall.pos.x
//     const ballZ = theBall.pos.z

//     const paddleX = thePaddle.pos.x
//     const paddleZ = thePaddle.pos.z
//     const paddleScale = thePaddle.scale || 1

//     const halfPaddleWidth = (PADDLE_WIDTH * paddleScale) / 2
//     const halfPaddleLength = (PADDLE_LENGTH * paddleScale) / 2

//     const margin = BALL_RADIUS + 0.05

//     const withinX = ballX >= paddleX - halfPaddleWidth - margin &&
//                     ballX <= paddleX + halfPaddleWidth + margin

//     const withinZ = ballZ >= paddleZ - halfPaddleLength - margin &&
//                     ballZ <= paddleZ + halfPaddleLength + margin

//     // const movingTowardPaddle =
//     //   (paddleZ > 0 && theBall.dir.z > 0) ||
//     //   (paddleZ < 0 && theBall.dir.z < 0)

//     const movingTowardPaddle =
//       (paddleZ > 0 && theBall.dir.z < 0) ||
//       (paddleZ < 0 && theBall.dir.z > 0)

//     if (withinX && withinZ && movingTowardPaddle) {
//       theBall.dir.z *= -1

//       // ball Z position adjustement
//       if (paddleZ > 0) {
//         theBall.pos.z = paddleZ - halfPaddleLength - BALL_RADIUS
//       } else {
//         theBall.pos.z = paddleZ + halfPaddleLength + BALL_RADIUS
//       }

//       return true
//     }

//     return false;
//   }

const isBallHittingThePaddle = (theBall, thePaddle) => {
  const { BALL_RADIUS, PADDLE_WIDTH, PADDLE_LENGTH } = GAME_CONSTANTS;

  const ballX = theBall.pos.x;
  const ballZ = theBall.pos.z;

  const paddleX = thePaddle.pos.x;
  const paddleZ = thePaddle.pos.z;
  const paddleScale = thePaddle.scale || 1;

  const halfPaddleWidth = (PADDLE_WIDTH * paddleScale) / 2;
  const halfPaddleLength = (PADDLE_LENGTH * paddleScale) / 2;

  const margin = BALL_RADIUS + 0.05;

  const withinX =
    ballX >= paddleX - halfPaddleWidth - margin &&
    ballX <= paddleX + halfPaddleWidth + margin;

  const withinZ =
    ballZ >= paddleZ - halfPaddleLength - margin &&
    ballZ <= paddleZ + halfPaddleLength + margin;

  const movingTowardPaddle =
    (paddleZ > 0 && theBall.dir.z > 0) || (paddleZ < 0 && theBall.dir.z < 0);

  if (withinX && withinZ) {
    if (!movingTowardPaddle) {
      // Ball already inside paddle zone but moving away
      // Push it out softly to avoid sticking
      theBall.pos.z =
        paddleZ > 0
          ? paddleZ + halfPaddleLength + BALL_RADIUS
          : paddleZ - halfPaddleLength - BALL_RADIUS;

      return false; // no bounce
    }

    // Ball is hitting paddle and moving into it → bounce
    theBall.dir.z *= -1;

    theBall.pos.z =
      paddleZ > 0
        ? paddleZ - halfPaddleLength - BALL_RADIUS
        : paddleZ + halfPaddleLength + BALL_RADIUS;

    return true;
  }

  return false;
};

const isBallHittingThePaddles = (socket, io, theGamePlay) => {
  const theBall = theGamePlay.ball;
  const radius = GAME_CONSTANTS.BALL_DIAMETER / 2;

  let hit = false;
  const edgeZ = GAME_CONSTANTS.TABLE_DEPTH / 2 - GAME_CONSTANTS.PADDLE_LENGTH;
  if (Math.abs(theBall.pos.z) < edgeZ) {
    process.stdout.write("N");
    return false;
  }
  process.stdout.write("+");
  theGamePlay.paddles.find((paddle) => {
    const pWidth = (GAME_CONSTANTS.PADDLE_WIDTH * paddle.scale) / 2;
    if (isBallHittingThePaddle(theBall, paddle)) hit = true;
    return hit;
  });

  if (hit && GAME_CONSTANTS.PONG_ADD_RANDOM_REFLECT)
    applyBounceVariant(theBall.pos);
  if (hit && GAME_CONSTANTS.PONG_INCREASE_SPEED) {
    if (theBall.speed < GAME_CONSTANTS.BALL_MAX_SPEED)
      theBall.speed *= GAME_CONSTANTS.BALL_SPEED_INCREASE_BY;
  }
  return hit;
};

// use to update the AI timestamps from "countnig down"
const updateAiCountdownTimestamp = (theMatch, seconds) => {
  if (!theMatch.containsAi) return;

  theMatch.players.forEach((player) => {
    if (player?.aiLevel > 0) {
      player.shouldSeeBallAt += seconds * 1000;
      if (player.aiSpecialCB) player.aiSpecialCB += seconds * 1000;
    }
  });
};

const isBallInWinningArea = (socket, io, theGamePlay) => {
  // console.log(' ==> isBallInWInnningArea ? ')

  const z = theGamePlay.ball.pos.z;
  const r = GAME_CONSTANTS.BALL_RADIUS;

  const tableHalfDepth = GAME_CONSTANTS.TABLE_DEPTH / 2;
  const winZone = GAME_CONSTANTS.WINNING_AREA;

  const leftEdge = -tableHalfDepth - winZone;
  const rightEdge = tableHalfDepth + winZone;

  if (z - r <= leftEdge) 
  {
    if(GAME_CONSTANTS?.CRAZY_BOUNCE)
    {
       theGamePlay.ball.dir.z *= -1 
       return null
    }
    return [1, 0]; 
  }

  if (z + r >= rightEdge) 
  {
    if(GAME_CONSTANTS?.CRAZY_BOUNCE)
    {
       theGamePlay.ball.dir.z *= -1 
       return null
    }
    return [0, 1];
  }

  return null;
};

const maxPaddleX = GAME_CONSTANTS.TABLE_WIDTH / 2 + 0;
const minPaddleX = -1 * (GAME_CONSTANTS.TABLE_WIDTH / 2) - 0;

const calculatePaddle = (socket, io, theMatch) => {
  theMatch.gamePlay.paddles.map((paddle, ind) => {
    const dirFactor = 1;
    // (ind % 2 == 0 ? 1 : -1)

    const finalDir = (paddle.cont.isRight - paddle.cont.isLeft) * dirFactor;

    if (paddle.pos.x < minPaddleX) paddle.pos.x = minPaddleX;
    else if (paddle.pos.x > maxPaddleX) paddle.pos.x = maxPaddleX;
    else
      paddle.pos.x +=
        finalDir * paddle.speed * GAME_CONSTANTS.PADDLE_SPEED_FACTOR;
    if (paddle.speed != 1) process.stdout.write("/_");

    // paddle.pos.x =
  });
};

const checkIfMatchIsOver = (theMatch) => {
  let scoreToCheck = -1;

  switch (theMatch.matchSettings.type) {
    case "FirstTo5":
      scoreToCheck = 5;
      break;
    case "FirstTo10":
      scoreToCheck = 10;
      break;
    default:
      return false;
  }

  for (let i = 0; i <= 1; i++) {
    console.log(`score checking `, i, theMatch.score[i], scoreToCheck);
    if (theMatch.score[i] >= scoreToCheck) {
      theMatch.winnerSide = i;
      theMatch.matchStatus = "OVER";

      // check if is only valid player , ( no 4 players / classicMode )
      //   if(isRatedGame(theMatch))
      //       msRequestUpdateMatchResult(theMatch)
      return true;
    }
  }
  console.log(`nope, `, theMatch.score);
  return false;
};

const applyAiNoise = (theMatch, player, playerIndex) => {


  const aiLevel = Math.abs(player.aiLevel);
  const thePaddle = theMatch.gamePlay.paddles[playerIndex];

  let delayInMovement = (Math.random() * 0.4 - 0.2) / aiLevel;
  // console.log(`AI NOISE - adding ${delayInMovement} delay to timestamp`)
  // IGNORE for lvl3 
  if(aiLevel == 3)
    delayInMovement = 0 
  thePaddle.cont.tsToReleaseKey += delayInMovement;

  let chanceToGoWrongDirection = (4 - aiLevel) * 0.1;

  // REALLY LOW FOR LEVEL 3
  if(aiLevel == 3)
    chanceToGoWrongDirection *= 0.2 

  if (Math.random() < chanceToGoWrongDirection) {
    thePaddle.cont.isLeft = !thePaddle.cont.isLeft;
    thePaddle.cont.isRight = !thePaddle.cont.isRight;
    // console.log("AI NOISE - CONFUSE!")
  }
};

const applyAiControl = (theMatch, player, playerIndex) => {
  const thePaddle = theMatch.gamePlay.paddles[playerIndex];
  if (thePaddle?.aiLevel >= 0) return;

  const distance = player.predictedNextPos.x - thePaddle.pos.x;
  //  -1 = left, 0 = no movement , 1 = right
  const direction = Math.sign(distance);
  const isLeftSide = playerIndex % 2 === 0;

  // Determine logical left/right keypress for this player's side
  const goingLeft =
    (isLeftSide && direction > 0) || (!isLeftSide && direction < 0);
  const goingRight =
    (isLeftSide && direction < 0) || (!isLeftSide && direction > 0);

  thePaddle.cont.isLeft = goingLeft;
  thePaddle.cont.isRight = goingRight;

  const timeSeconds =
    (Math.abs(distance) / thePaddle.speed) * GAME_CONSTANTS.PADDLE_SPEED_FACTOR;

  let keyTime = Math.min(timeSeconds * 1000, 1000);
  thePaddle.cont.tsToReleaseKey = Date.now() + keyTime;

  applyAiNoise(theMatch, player, playerIndex);
};

const predictNextPos = (x1, y1, x2, y2) => {
  const vx = x2 - x1;
  const vy = y2 - y1;

  let outX = x2 + vx;
  let outY = y2 + vy;

  const topBorder = GAME_CONSTANTS.TABLE_WIDTH / 2;
  const bottomBorder = -topBorder;
  const radius = GAME_CONSTANTS.BALL_RADIUS;

  if (outX + radius > topBorder) {
    const overshoot = outX + radius - topBorder;
    outX = topBorder - radius - overshoot;
  } else if (outX - radius < bottomBorder) {
    const overshoot = bottomBorder - (outX - radius);
    outX = bottomBorder + radius + overshoot;
  }

  return { x: outX, z: outY };
};


const customClamp = (pos) => {
  const half = GAME_CONSTANTS.TABLE_WIDTH / 2;

  if (pos.x > half) {
    pos.x = half - (pos.x - half) 
  } else if (pos.x < -half) {
    pos.x = -half + (-half - pos.x)
  }
  return pos
}


const updatedPredictNextPos = (x0, z0, x1, z1, x2, z2, paddle) => {

  console.log(` p0 = (${x0},${z0}), p1 = (${x1},${z1}), p2 = (${x2},${z2})  `)

  const PW = (GAME_CONSTANTS.PADDLE_WIDTH / 2) * paddle.scale;
  const halfWidth = GAME_CONSTANTS.TABLE_WIDTH / 2;
  const minX = -halfWidth;
  const maxX = halfWidth;
  const t = 1.0; 

  const vx1 = x1 - x0
  const vz1 = z1 - z0

  const wallX = x1 < 0 ? minX : maxX;
  if ((x1 < 0 && vx1 >= 0) || (x1 > 0 && vx1 <= 0)) {
    return customClamp({
      x: x2 + (x2 - x1) * t,
      z: z2 + (z2 - z1) * t,
      out: "case:noBounceDirection"
    })
  }

  let dtToWall = (wallX - x1) / vx1 
  if (dtToWall < 0 || dtToWall > t) {
    dtToWall = t
  }

  const zWall = z1 + vz1 * dtToWall 

  const vx2 = -vx1
  const vz2 = vz1

  const remainingT = t - dtToWall
  const predX = x2 + vx2 * remainingT
  const predZ = z2 + vz2 * remainingT

  return customClamp({
    x: Math.max(minX + PW, Math.min(maxX - PW, predX)),
    z: predZ,
    out: "case:bouncedClamped"
  })

};



const updateAiBallPosition = (theMatch) => {
  let returnValue = null;
  theMatch.players.forEach((player, playerIndex) => {
    if (player?.aiLevel) {
      if (player.aiSpecialCB && player.aiSpecialCB < Date.now()) {
        console.log(` Reach AI's special Due`);
        if (theMatch.gamePlay.paddles[playerIndex].special) {
          const specialId = theMatch.gamePlay.paddles[playerIndex].special.id;
          handleSpecial(theMatch, playerIndex, specialId);
          console.log("*** Reset special CB to null ");
          player.aiSpecialCB = null;
        }
      }

      if (player.shouldSeeBallAt <= Date.now()) {
        // cacluate the next "see"
        player.shouldSeeBallAt = Date.now() + (GAME_CONSTANTS.AI_SEES_BALL_EVERY_SECS * 1000);
        // player.predictedNextPos = predictNextPos(
        //   player.lastBallPos.x,
        //   player.lastBallPos.z,
        //   theMatch.gamePlay.ball.pos.x,
        //   theMatch.gamePlay.ball.pos.z
        // );
        player.predictedNextPos = updatedPredictNextPos(
          
          player.oldBallPos.x, 
          player.oldBallPos.z, 
          player.lastBallPos.x,
          player.lastBallPos.z,
          theMatch.gamePlay.ball.pos.x,
          theMatch.gamePlay.ball.pos.z,
          theMatch.gamePlay.paddles[ playerIndex ]
        );
        
        console.log(` AI ${playerIndex} predict (x,z) = `, player.predictedNextPos.x , player.predictedNextPos.z)

        if (
          player.statuses.includes("fractol") ||
          player.statuses.includes("ftirc")
        ) {
          let times = 1;
          if (
            player.statuses.includes("fractol") &&
            player.statuses.includes("ftirc")
          )
            times = 2;
          console.log("add further noise to position");

          // let factor = (Math.random() * 2 - 1) * 0.2;
          // factor *= Math.random() < 0.5 ? 1 : -1;
          // factor = (1 - factor) * times ;
          let chanceToSeeWrong = 0.1
          if(player?.aiLevel )
          {
            if(player.aiLevel == 2)
              chanceToSeeWrong *= 0.5 
          }
          // apply blinding effect with the default noise
          

          if( times >= 1)
          {
             chanceToSeeWrong = (times * 0.1)  + chanceToSeeWrong
             let factor = Math.random() * 2 - 1
             let adjustedValue 
             let min = player.predictedNextPos.x * 0.8 // 20% 
             let max = player.predictedNextPos.x * 1.2 // 20% 
             console.log('FRI_DEBUG BEFORE predictedNextPos.x = ', player.predictedNextPos.x)
             adjustedValue = Math.sign(factor) * chanceToSeeWrong             
             player.predictedNextPos.x *= Math.max(min, Math.min(max, adjustedValue))
             console.log('FRI_DEBUG AFTER predictedNextPos.x = ', player.predictedNextPos.x)
          }


          

        }

        // this is within a loop, i canno return 4 predictions for each ai, can i? 
        if (!returnValue) 
          returnValue = player.predictedNextPos;


        // update the last ball pos
        player.oldBallPos.x = player.lastBallPos.x
        player.oldBallPos.z = player.lastBallPos.z 
        player.lastBallPos.x = theMatch.gamePlay.ball.pos.x;
        player.lastBallPos.z = theMatch.gamePlay.ball.pos.z;

        applyAiControl(theMatch, player, playerIndex);
      }
    }
  });
  return returnValue;
};

const checkReleaseAiKey = (theMatch) => {
  theMatch.players.forEach((player, index) => {
    if (player?.aiLevel > 0) {
      const thePaddle = theMatch.gamePlay.paddles[index];
      if (
        isFinite(thePaddle.cont.tsToReleaseKey) &&
        thePaddle.cont.tsToReleaseKey < Date.now()
      ) {
        thePaddle.cont.isLeft = false;
        thePaddle.cont.isRight = false;
        thePaddle.cont.tsToReleaseKey = Infinity;
      }
    }
  });
};

const calculateMove = (socket, io, theMatch) => {
  if (theMatch.gamePlay.gameIsPaused) return;
  const ball = theMatch.gamePlay.ball;
  const theGamePlay = theMatch.gamePlay;

  ball.pos.x += ball.dir.x * ball.speed * GAME_CONSTANTS.BALL_SPEED_FACTOR;
  ball.pos.z += ball.dir.z * ball.speed * GAME_CONSTANTS.BALL_SPEED_FACTOR;

  if (isBallHittingTheWalls(socket, io, theGamePlay)) {
    // emit sound effect?
  }

  if (isBallHittingThePaddles(socket, io, theGamePlay)) {
    // emit sound effect?
  }

  calculatePaddle(socket, io, theMatch);

  // check for the AI
  if (theMatch.containsAi) {
    // console.log(" CONTAINS AI ")
    // repeatedly called, if the player is not an AI player or not reach "veiw" due
    // will simply returns
    let out = updateAiBallPosition(theMatch);

    if (out && GAME_CONSTANTS.PONG_SHOW_AI_POV)
      io.to(theMatch.roomId).emit("predict", out);

    checkReleaseAiKey(theMatch);
  } else {
    // console.log(" :( NOT CONTAINS AI ")
  }
    const winResult  = isBallInWinningArea(socket,io , theGamePlay)
    // someone got the score from this game
    if(winResult != null)
    {
        
        if(winResult[0] > 0)
            theMatch.score[0] ++ 
        else if(winResult[1] > 0)
            theMatch.score[1] ++ 

        console.log(' GOT SOME SCORE, AND IS NOW', theMatch.score )
        

        if(checkIfMatchIsOver(theMatch))
        {
            theMatch.matchEndsAt = Date.now()
            io.to(theMatch.roomId).emit('match-status', { match: theMatch})
            
            if(isRatedGame(theMatch))
                msRequestUpdateMatchResult(theMatch)


            if(theMatch.tournamentId)
            {
                console.log(`  FFF = trying to call msRequestStoreInBlockchain() `)
                msRequestStoreInBlockchain(theMatch)
                console.log(` EEE === broadcastCustom('updateTournament') `)
                broadcastCustom('updateTournament')    
                console.log(` END === broadcastCustom('updateTournament') `)
            }
            else
                console.log(" EEE - Is not a tournament match ")
            
            

            console.log(" BBB - THE MATCH IS OVER , CHECK IF TOURNAMENT THEN fire-and-forget it")
            if(theMatch.tournamentId)
            {
                
                checkAndMarkTournamentAsStarted().catch(err =>  {
                    console.log(" BBB - ERROR CAUGHT AS , " , err.message)
                })
            }

        }
            
        else 
        {
            io.to(theMatch.roomId).emit('match-status', { match : theMatch })

            // reset the AI players pos
            theMatch.players.forEach( player => {
                if( player?.aiLevel > 0)
                {
                    player.lastBallPos.x = 0
                    player.lastBallPos.z = 0
                }
                    
            })
            initializeGamePlay( theMatch.gamePlay )
            
            io.to(theMatch.roomId).emit('countdown', { cd: 3 , message : 'GO!' })

      // countdown during each score
      const secsToCountdown = 5;
      updateAiCountdownTimestamp(theMatch, secsToCountdown);
      setTimeout(() => {
        console.log("UNPAUSED THE GAME");
        theMatch.gamePlay.gameIsPaused = false;
      }, secsToCountdown * 1000);
    }

    return winResult;
  }

  return null;
};

export {
  calculateMove,
  moveThePaddle,
  initializeGamePlay,
  updateAiCountdownTimestamp,
};

export default calculateMove;
