const GAME_CONSTANTS = {
    
    
    GFX_GLOWING_INTENSITY: 0.6, 
    GFX_BG_DRIFT_RATE: 0.0001, 
    
    // debug AI forecast every 1 seconds
    SHOW_AI_FORECAST_POS : false,   // default = false

    PONG_DOMAIN_NAME : "https://localhost" , 

    PONG_WS_NAMESPACE: "/pong" , 
    PONG_WS_PORT_NO: 9999,

    PONG_MINUTES_BETWEEN_TOURNAMENT_MATCHES: 3, 
    PONG_MINUTES_CLOSE_REGISTER: 5 , 


    PONG_ADD_RANDOM_REFLECT: true, 
    PONG_INCREASE_SPEED: true, 

    // aurora | pantone | skybox
    PONG_SKYBOX_THEME: "pantone" , 

    BROADCAST_RATE: 1000,  // base line should be 100 
    PONG_LOBBY_PORT: 9999, 
    PONG_PORT_NO: 9999, 
    TABLE_WIDTH:  3, 
    TABLE_HEIGHT: 0.1,
    TABLE_DEPTH: 7,
    WINNING_AREA: 1, 


    BALL_DIAMETER: 0.2, 
    PADDLE_SPEED: 0.1,
    PADDLE_SPEED_FACTOR: 0.3, 
    BALL_MAX_SPEED: 0.40, 
    BALL_INITIAL_SPEED: 0.1, 


    CAM_P1_ALPHA: (Math.PI / 2), 
    CAM_P1_BETA: (Math.PI * 0.45), 
    CAM_P1_RADIUS: 5 + 1,

    CAM_P2_ALPHA: - (Math.PI / 2), 
    CAM_P2_BETA: (Math.PI * 0.45), 
    CAM_P2_RADIUS: 5 + 1,

    CAM_AUD_ALPHA: Math.PI ,
    CAM_AUD_BETA: Math.PI * 1/5,
    CAM_AUD_RADIUS: 5 + 1,


    BORDER_WIDTH: 0.1, 
    BORDER_HEIGHT: 0.1, 
    
    SPECIAL_MINITALK_DURATION : 30,
    SPECIAL_MINITALK_SCALE : 0.5,
        
    SPECIAL_FRACTOL_DURATION: 15, // 15 should be suffice!
    
    SPECIAL_FTIRC_DURATION: 30, 

    SPECIAL_SOLONG_DURATION : 30,
    SPECIAL_SOLONG_SPEED : 0.3,    
    
    USE_SOUND : false, 


    PADDLE_ALPHA: 0.9, 

    PADDLE_WIDTH: 0.6,
    PADDLE_HEIGHT: 0.2,
    PADDLE_DEPTH: 0.1,

    PADDLE_DEPTH_HITBOX: 0.3, 

    PONG_SHOW_AI_POV: true,     

    ROOM_TIMEOUT_IN_SECS: 30 * 60 , //  30 minutes
    JANITOR_INTERVAL_IN_SECS: 20 , // clean up every 2 minutes


    MS_CREATE_ROOM : true,  
    MS_JOIN_ROOM: true , 
    MS_COMPLETE_ROOM: true ,
    MS_ENDPOINT_PREFIX : `http://game-service:3003/api/v1/` , 


    GAME_ALLOW_DEBUG_KEY: true, 


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

const allAiPlayers:any = []
allAiPlayers.push(GAME_CONSTANTS.AI_PLAYER_EASY)
allAiPlayers.push(GAME_CONSTANTS.AI_PLAYER_MEDIUM)
allAiPlayers.push(GAME_CONSTANTS.AI_PLAYER_HARD)

export {
    GAME_CONSTANTS,
    allAiPlayers 
}
export default GAME_CONSTANTS