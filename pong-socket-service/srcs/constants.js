const shortDate = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' })

const GAME_CONSTANTS = {

    // *** FTT_EVALUATION_DEBUG_TOURNAMENT   default false 
    // set to true to create tournament at the time of evaluation, join some players 
    // , and start the match real soon , 
    FTT_EVALUATION_DEBUG_TOURNAMENT: true, 

    CRAZY_BOUNCE: false, 


    PONG_TOUR_MINS_BEFORE_TOUR : 5, 



    PONG_DOMAIN_NAME : "https://localhost" , 
    MS_GAME_ENDPOINT_PREFIX : `http://game-service:3000/api/v1/`, 
    MS_USER_ENDPOINT_PREFIX : `http://user-service:3000/api/v1/`, 
    SITE_URL : `http://localhost:3000/` ,    
    AVALANCHE_SERVER : `http://avalanche-service:3000/`, 
    SOCKET_SERVER : `https://socket-service:8888`, 


    PONG_WS_NAMESPACE: "/pong" , 
    PONG_WS_PORT_NO: 9999,


    PONG_DELETE_ROOM_ON_SOCKET_EVENT: true , 


    PONG_MINUTES_BETWEEN_TOURNAMENT_MATCHES: 5, 
    PONG_MINUTES_CLOSE_REGISTER: 1 , 

    // leave these , they won't work, still in the code though
    PONG_TOURNAMENT_SCHEDULES: [
        {            
            name: `Daily ${shortDate}`,  
            maxParticipants: 8 , 
            schedules : {
                // cron schedule format should be UTC+0 format 
                create : '0 8 * * *',      // *** required for cron
                start : '0 7 * * *',       // *** required for cron-parser calculation
                broadcast1 : '0 7 * * *',   // *** required for cron
                countdown : '50 7 * * *',   // *** required for cron
            },
        }
    ], 
    CRONJOB_PONG_TOURNAMENT_START_AT : "0 8 * * *" , 
    PONG_TOURNAMENT_DEFAULT_MAX_PARTICIPANTS: 8, 
    PONG_TOURNAMENT_DEFAULT_TOUR_NAME: "Daily", 
    // end leave these alone 


    PONG_ADD_RANDOM_REFLECT: true, 
    PONG_INCREASE_SPEED: true, 

    AI_SEES_BALL_EVERY_SECS : 1, 

    BROADCAST_RATE: 100,  // ORIGINAL base line should be somewhat 100    
    PONG_LOBBY_PORT: 9999, 
    PONG_PORT_NO: 9999, 
    TABLE_WIDTH:  3, 
    TABLE_HEIGHT: 0.1,
    TABLE_DEPTH: 7,
    WINNING_AREA: 0.3, 


    BALL_DIAMETER: 0.2,     
    BALL_SPEED_FACTOR: 0.2, 
    BALL_MAX_SPEED: 0.40,     
    BALL_INITIAL_SPEED: 0.4, 
    BALL_SPEED_INCREASE_BY: 1.08, // +8%
    
    PADDLE_SPEED: 0.1,
    PADDLE_SPEED_FACTOR: 0.3, 


    CAM_P1_ALPHA: (Math.PI / 2), 
    CAM_P1_BETA: (Math.PI * 0.4), 
    CAM_P1_RADIUS: 5 + 1,

    CAM_P2_ALPHA: - (Math.PI / 2), 
    CAM_P2_BETA: (Math.PI * 0.4), 
    CAM_P2_RADIUS: 5 + 1,

    CAM_AUD_ALPHA: Math.PI ,
    CAM_AUD_BETA: Math.PI * 1/5,
    CAM_AUD_RADIUS: 5 + 1,


    BORDER_WIDTH: 0.1, 
    BORDER_HEIGHT: 0.3, 
    
    SPECIAL_MINITALK_DURATION : 30,
    SPECIAL_MINITALK_SCALE : 0.5,
        
    SPECIAL_FRACTOL_DURATION: 15, // 15 secs should be suffice!
    
    SPECIAL_FTIRC_DURATION: 30, 

    SPECIAL_SOLONG_DURATION : 30,
    SPECIAL_SOLONG_SPEED : 0.3,
    
    USE_SOUND : false, 


    PADDLE_WIDTH: 0.6,
    PADDLE_HEIGHT: 0.2,
    PADDLE_DEPTH: 0.1,

    PADDLE_DEPTH_HITBOX: 0.3, 

    PONG_SHOW_AI_POV: true,     
    // setting the random range of AI's callback , these means 10 - 50 secs
    PONG_AI_SPECIAL_FROM_SECS: 10, 
    PONG_AI_SPECIAL_TO_SECS: 50, 


    ROOM_TIMEOUT_IN_SECS:  10 * 60 ,  // 5 minutes
    JANITOR_INTERVAL_IN_SECS: 5 * 60  , // clean up every 3 minutes

    MS_CREATE_ROOM : true,  
    MS_JOIN_ROOM: true , 
    MS_COMPLETE_ROOM: true ,
    


    AI_PLAYER_EASY: {
        userId : 4242, 
        username : 'bot_easy',
        nick : 'AI Lvl.1 🤖',
        rating: 1000,
        aiLevel: 1           
    }, 
    AI_PLAYER_MEDIUM: {
        userId : 424242, 
        username : 'bot_medium',
        nick : 'AI Lvl.2 🤖',
        rating: 1200,
        aiLevel: 2           
    }, 
    AI_PLAYER_HARD: {
        userId : 42424242, 
        username : 'bot_hard',
        nick : 'AI Lvl.3 🤖',
        rating: 1300,
        aiLevel: 3           
    }, 
}   

GAME_CONSTANTS.BALL_RADIUS = GAME_CONSTANTS.BALL_DIAMETER / 2 
GAME_CONSTANTS.TABLE_LENGTH = GAME_CONSTANTS.TABLE_DEPTH 
GAME_CONSTANTS.PADDLE_LENGTH = GAME_CONSTANTS.PADDLE_DEPTH 


const allAiPlayers = []
allAiPlayers.push(GAME_CONSTANTS.AI_PLAYER_EASY)
allAiPlayers.push(GAME_CONSTANTS.AI_PLAYER_MEDIUM)
allAiPlayers.push(GAME_CONSTANTS.AI_PLAYER_HARD)

export {
    GAME_CONSTANTS,
    allAiPlayers 
}
export default GAME_CONSTANTS