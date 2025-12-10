#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_URL="http://localhost:3003/api/v1"
JWT_SECRET="changeme"

echo -e "${YELLOW}Game Routes Test${NC}"
echo ""

create_jwt_token() {
  local user_id=$1
  local username=$2
  echo $(node -e "console.log(require('jsonwebtoken').sign({userId: $user_id, username: '$username'}, '$JWT_SECRET', {expiresIn: '1h'}))")
}

echo -e "${CYAN}1. Matchmaking Routes${NC}"

player1_token=$(create_jwt_token 101 "player1")
player2_token=$(create_jwt_token 102 "player2")

echo -e "Player 1 entering matchmaking..."
player1_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $player1_token" -d '{
  "game_type": "pong",
  "skill_level": 1500
}' "$BASE_URL/matchmaking")

player1_request_id=$(echo "$player1_response" | jq -r '.id')
echo -e "Player 1 matchmaking ID: ${GREEN}$player1_request_id${NC}"

echo -e "Player 2 entering matchmaking..."
player2_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $player2_token" -d '{
  "game_type": "pong",
  "skill_level": 1550
}' "$BASE_URL/matchmaking")

player2_request_id=$(echo "$player2_response" | jq -r '.id')
echo -e "Player 2 matchmaking ID: ${GREEN}$player2_request_id${NC}"

echo -e "Get all matchmaking requests:"
all_requests=$(curl -s "$BASE_URL/matchmaking")
echo "$all_requests" | jq

echo -e "Get player 1 matchmaking status:"
player1_status=$(curl -s -H "Authorization: Bearer $player1_token" "$BASE_URL/matchmaking/status")
echo "$player1_status" | jq

sleep 2

echo -e "Canceling matchmaking requests..."
cancel1=$(curl -s -X DELETE -H "Authorization: Bearer $player1_token" "$BASE_URL/matchmaking/$player1_request_id")
cancel2=$(curl -s -X DELETE -H "Authorization: Bearer $player2_token" "$BASE_URL/matchmaking/$player2_request_id")

echo ""
echo -e "${CYAN}2. Direct Game Creation${NC}"

echo -e "Creating game manually..."
game_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $player1_token" -d '{
  "game_type": "pong",
  "players": 2
}' "$BASE_URL/games")

game_id=$(echo "$game_response" | jq -r '.id')
echo -e "Created game: ${GREEN}ID $game_id${NC}"

echo -e "Player 2 joining game..."
join_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $player2_token" "$BASE_URL/games/$game_id/join")
echo -e "Join status: ${GREEN}$(echo "$join_response" | jq -r '.success')${NC}"

echo -e "Getting game details:"
game_details=$(curl -s "$BASE_URL/games/$game_id")
echo "$game_details" | jq

echo -e "Game in progress..."
admin_token=$(create_jwt_token 1 "admin")
progress_update=$(curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $admin_token" -d '{
  "status": "in_progress"
}' "$BASE_URL/games/$game_id")

echo -e "Completing game with player 1 as winner..."
complete_game=$(curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $admin_token" -d '{
  "status": "completed",
  "winner_id": 101,
  "loser_id": 102,
  "score_winner": 5,
  "score_loser": 3,
  "participants": [
    {
      "user_id": 101,
      "score": 5,
      "is_winner": true
    },
    {
      "user_id": 102,
      "score": 3,
      "is_winner": false
    }
  ]
}' "$BASE_URL/games/$game_id")

echo -e "Final game state:"
final_game=$(curl -s "$BASE_URL/games/$game_id")
echo "$final_game" | jq

echo ""
echo -e "${CYAN}3. Game History and Active Games${NC}"

echo -e "Player 1 game history:"
player1_history=$(curl -s -H "Authorization: Bearer $player1_token" "$BASE_URL/games/history")
echo "$player1_history" | jq

echo -e "Active games:"
active_games=$(curl -s "$BASE_URL/games/active")
echo "$active_games" | jq

echo ""
echo -e "${GREEN}Game Routes Test Completed${NC}" 