#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

BASE_URL="http://localhost:3003/api/v1"
JWT_SECRET="changeme"

echo -e "${YELLOW}Tournament 6/8 Players Demo${NC}"

token=$(node -e "console.log(require('jsonwebtoken').sign({userId: 1, username: 'admin'}, '$JWT_SECRET', {expiresIn: '1h'}))")

echo -e "${BLUE}Step 1: Creating tournament${NC}"
tournament_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d '{"name":"Bracket 6of8 Demo","max_participants":8}' "$BASE_URL/tournaments")
echo "$tournament_response" | jq
tournament_id=$(echo "$tournament_response" | jq -r '.id')
echo -e "${GREEN}Created tournament ID: $tournament_id${NC}"
echo

echo -e "${BLUE}Step 2: Creating test users${NC}"
for i in {1..6}; do
    user_token=$(node -e "console.log(require('jsonwebtoken').sign({userId: $i, username: 'user_$i'}, '$JWT_SECRET', {expiresIn: '1h'}))")
    curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $user_token" -d '{"game_type":"pong"}' "$BASE_URL/matchmaking" > /dev/null
    echo -e "${GREEN}Created user $i${NC}"
    sleep 0.2
done
echo

echo -e "${BLUE}Step 3: Users join tournament${NC}"
for i in {1..6}; do
    user_token=$(node -e "console.log(require('jsonwebtoken').sign({userId: $i, username: 'user_$i'}, '$JWT_SECRET', {expiresIn: '1h'}))")
    join_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $user_token" -d '{}' "$BASE_URL/tournaments/$tournament_id/join")
    echo -e "${GREEN}User $i joined${NC}"
    sleep 0.2
done
echo

echo -e "${BLUE}Step 3.5: Checking tournament status${NC}"
tournament_status=$(curl -s "$BASE_URL/tournaments/$tournament_id" | jq -r '.status')
echo -e "${GREEN}Current tournament status: $tournament_status${NC}"

echo -e "${BLUE}Step 4: Explicitly starting the tournament${NC}"
start_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d '{}' "$BASE_URL/tournaments/$tournament_id/start")
echo "Full response: $start_response"
start_error=$(echo "$start_response" | jq -r '.error // empty')

if [ -n "$start_error" ]; then
    echo -e "${RED}Error starting tournament: $start_error${NC}"
    tournament_status=$(curl -s "$BASE_URL/tournaments/$tournament_id" | jq -r '.status')
    if [ "$tournament_status" == "in_progress" ]; then
        echo -e "${YELLOW}Tournament already started (status: $tournament_status), continuing test...${NC}"
    else
        echo -e "${RED}Tournament is not in progress. Current status: $tournament_status${NC}"
        echo -e "${RED}Cannot continue test.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Tournament started successfully${NC}"
    echo "$start_response" | jq
fi
echo

echo -e "${BLUE}Step 5: Checking tournament bracket${NC}"
sleep 2
tournament_details=$(curl -s "$BASE_URL/tournaments/$tournament_id")
games=$(echo "$tournament_details" | jq '.games')
echo -e "${GREEN}Tournament games:${NC}"
echo "$games" | jq
echo

game_count=$(echo "$games" | jq 'length')
if [ "$game_count" -eq 0 ]; then
    echo -e "${RED}No games found for tournament. Cannot continue.${NC}"
    exit 1
fi

echo -e "${BLUE}Step 6: Completing first round games${NC}"
first_round_games=$(echo "$tournament_details" | jq -r '.games[].id')
for game_id in $first_round_games; do
    game_details=$(curl -s "$BASE_URL/games/$game_id")
    participants=$(echo "$game_details" | jq '.participants')
    winner_id=$(echo "$game_details" | jq -r '.participants[0].user_id')
    player1_id=$(echo "$game_details" | jq -r '.participants[0].user_id // 0')
    player2_id=$(echo "$game_details" | jq -r '.participants[1].user_id // 0')
    if { [ -z "$winner_id" ] || [ "$winner_id" = "null" ]; } && [ "$player1_id" = "0" ] && [ "$player2_id" = "0" ]; then
        echo -e "${YELLOW}Game $game_id is a skipped/empty bracket slot in the first round${NC}"
        continue
    fi
    if [ -z "$winner_id" ] || [ "$winner_id" = "null" ]; then
        echo -e "${RED}No participants found for game $game_id${NC}"
        winner_id=1
    fi
    echo -e "${GREEN}Setting user $winner_id as winner for game $game_id${NC}"
    curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
        -d "{\"status\":\"completed\",\"winner_id\":$winner_id,\"score_winner\":10,\"score_loser\":5}" \
        "$BASE_URL/games/$game_id" > /dev/null
    sleep 0.2
done
echo

echo -e "${BLUE}Step 7: Using the tournament round advancement endpoint${NC}"
advance_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
    -d "{\"current_round\": 1}" \
    "$BASE_URL/tournaments/$tournament_id/advance-round")

echo -e "${YELLOW}Round advancement response:${NC}"
echo "$advance_response" | jq
next_round_games=$(echo "$advance_response" | jq '.nextRoundGames')
echo

echo -e "${BLUE}Step 8: Updated tournament bracket${NC}"
tournament_details=$(curl -s "$BASE_URL/tournaments/$tournament_id")
echo -e "${GREEN}All games in tournament:${NC}"
echo "$tournament_details" | jq '.games[] | {id, position, status, winner_id}'
echo

echo -e "${BLUE}Step 9: Completing second round games${NC}"
second_round_games=$(echo "$tournament_details" | jq -r '.games[] | select(.position | startswith("2")) | .id')
for game_id in $second_round_games; do
    game_details=$(curl -s "$BASE_URL/games/$game_id")
    participants=$(echo "$game_details" | jq '.participants')
    winner_id=$(echo "$game_details" | jq -r '.participants[0].user_id')
    if [ -z "$winner_id" ] || [ "$winner_id" = "null" ]; then
        echo -e "${RED}No participants found for game $game_id${NC}"
        winner_id=1
    fi
    echo -e "${GREEN}Setting user $winner_id as winner for game $game_id${NC}"
    curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
        -d "{\"status\":\"completed\",\"winner_id\":$winner_id,\"score_winner\":10,\"score_loser\":5}" \
        "$BASE_URL/games/$game_id" > /dev/null
    sleep 0.2
done
echo

echo -e "${BLUE}Step 10: Advancing to final round${NC}"
advance_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
    -d "{\"current_round\": 2}" \
    "$BASE_URL/tournaments/$tournament_id/advance-round")

echo -e "${YELLOW}Final round advancement response:${NC}"
echo "$advance_response" | jq
echo

echo -e "${BLUE}Step 11: Updated tournament bracket with final round${NC}"
tournament_details=$(curl -s "$BASE_URL/tournaments/$tournament_id")
echo -e "${GREEN}All games in tournament:${NC}"
echo "$tournament_details" | jq '.games[] | {id, position, status, winner_id}'
echo

echo -e "${BLUE}Step 12: Completing final round game${NC}"
final_round_game=$(echo "$tournament_details" | jq -r '.games[] | select(.position | startswith("3")) | .id')
if [ -n "$final_round_game" ]; then
    game_details=$(curl -s "$BASE_URL/games/$final_round_game")
    participants=$(echo "$game_details" | jq '.participants')
    winner_id=$(echo "$game_details" | jq -r '.participants[0].user_id')
    if [ -z "$winner_id" ] || [ "$winner_id" = "null" ]; then
        echo -e "${RED}No participants found for final game $final_round_game${NC}"
        winner_id=1
    fi
    echo -e "${GREEN}Setting user $winner_id as winner for final game $final_round_game${NC}"
    curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
        -d "{\"status\":\"completed\",\"winner_id\":$winner_id,\"score_winner\":10,\"score_loser\":5}" \
        "$BASE_URL/games/$final_round_game" > /dev/null
    sleep 0.2
    echo -e "${BLUE}Step 13: Completing tournament${NC}"
    complete_response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
        -d "{\"winner_id\":$winner_id}" \
        "$BASE_URL/tournaments/$tournament_id/complete")
    echo "$complete_response" | jq
else
    echo -e "${RED}No final round game found${NC}"
fi
echo

echo -e "${BLUE}Final tournament state:${NC}"
curl -s "$BASE_URL/tournaments/$tournament_id" | jq '{id, status, winner_id, games: [.games[] | {id, position, status, winner_id}]}'
echo

echo -e "${GREEN}Tournament round advancement demo completed${NC}" 