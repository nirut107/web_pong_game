#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

API_URL="http://localhost:8000/api/v1"
GAME_URL="http://localhost:3003/api/v1"
JWT_SECRET="changeme"

USER1_ID=1
USER2_ID=2
USER1_NAME="user1"
USER2_NAME="user2"

USER1_TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({userId: $USER1_ID, username: '$USER1_NAME'}, '$JWT_SECRET', {expiresIn: '1h'}))")
USER2_TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({userId: $USER2_ID, username: '$USER2_NAME'}, '$JWT_SECRET', {expiresIn: '1h'}))")

echo -e "${BLUE}Registering users (simulated, JWTs generated)${NC}"
echo "User1: $USER1_NAME, Token: $USER1_TOKEN"
echo "User2: $USER2_NAME, Token: $USER2_TOKEN"
echo

# Matchmaking for pong
echo -e "${BLUE}Matchmaking for pong...${NC}"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $USER1_TOKEN" -d '{"game_type":"pong","skill_level":1500}' "$GAME_URL/matchmaking" > /dev/null
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $USER2_TOKEN" -d '{"game_type":"pong","skill_level":1550}' "$GAME_URL/matchmaking" > /dev/null

for i in {1..10}; do
  GAME=$(curl -s "$GAME_URL/games")
  PONG_GAME_ID=$(echo "$GAME" | jq -r '.[] | select(.game_type == "pong") | .id' | head -n1)
  if [ -n "$PONG_GAME_ID" ]; then
    GAME_DETAIL=$(curl -s "$GAME_URL/games/$PONG_GAME_ID")
    P1=$(echo "$GAME_DETAIL" | jq -r '.participants[] | select(.user_id == '$USER1_ID') | .id')
    P2=$(echo "$GAME_DETAIL" | jq -r '.participants[] | select(.user_id == '$USER2_ID') | .id')
    if [ -n "$P1" ] && [ -n "$P2" ]; then
      PONG_PARTICIPANT1=$P1
      PONG_PARTICIPANT2=$P2
      break
    fi
  fi
  sleep 1
done

if [ -z "$PONG_GAME_ID" ] || [ -z "$PONG_PARTICIPANT1" ] || [ -z "$PONG_PARTICIPANT2" ]; then
  echo -e "${RED}Failed to find pong game with both users${NC}"
  exit 1
fi

echo "Pong Game ID: $PONG_GAME_ID, Participants: $PONG_PARTICIPANT1, $PONG_PARTICIPANT2"
echo

# Simulate win for pong
echo -e "${BLUE}Simulating win for pong${NC}"
admin_token=$(node -e "console.log(require('jsonwebtoken').sign({userId: 1, username: 'admin'}, '$JWT_SECRET', {expiresIn: '1h'}))")
curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $admin_token" -d '{"status":"completed","winner_id":'$USER1_ID',"score_winner":10,"score_loser":5,"participants":[{"user_id":'$USER1_ID',"score":10,"is_winner":true},{"user_id":'$USER2_ID',"score":5,"is_winner":false}]}' "$GAME_URL/games/$PONG_GAME_ID" > /dev/null
echo -e "${GREEN}User1 wins pong${NC}"
echo

# Set pong metrics
echo -e "${BLUE}Setting pong metrics${NC}"
PONG_METRIC=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $USER1_TOKEN" -d '{"participant_id":'$PONG_PARTICIPANT1',"time_taken":123}' "$API_URL/analytics/metrics/pong")
echo "$PONG_METRIC" | jq
echo

# Display pong metrics
echo -e "${BLUE}Displaying pong metrics${NC}"
curl -s "$API_URL/analytics/metrics/pong/$PONG_PARTICIPANT1" | jq
echo

# Matchmaking for coderush
echo -e "${BLUE}Matchmaking for coderush...${NC}"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $USER1_TOKEN" -d '{"game_type":"coderush","skill_level":1500}' "$GAME_URL/matchmaking" > /dev/null
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $USER2_TOKEN" -d '{"game_type":"coderush","skill_level":1550}' "$GAME_URL/matchmaking" > /dev/null

for i in {1..10}; do
  GAME=$(curl -s "$GAME_URL/games")
  CR_GAME_ID=$(echo "$GAME" | jq -r '.[] | select(.game_type == "coderush") | .id' | head -n1)
  if [ -n "$CR_GAME_ID" ]; then
    GAME_DETAIL=$(curl -s "$GAME_URL/games/$CR_GAME_ID")
    C1=$(echo "$GAME_DETAIL" | jq -r '.participants[] | select(.user_id == '$USER1_ID') | .id')
    C2=$(echo "$GAME_DETAIL" | jq -r '.participants[] | select(.user_id == '$USER2_ID') | .id')
    if [ -n "$C1" ] && [ -n "$C2" ]; then
      CR_PARTICIPANT1=$C1
      CR_PARTICIPANT2=$C2
      break
    fi
  fi
  sleep 1
done

if [ -z "$CR_GAME_ID" ] || [ -z "$CR_PARTICIPANT1" ] || [ -z "$CR_PARTICIPANT2" ]; then
  echo -e "${RED}Failed to find code rush game with both users${NC}"
  exit 1
fi

echo "Code Rush Game ID: $CR_GAME_ID, Participants: $CR_PARTICIPANT1, $CR_PARTICIPANT2"
echo

# Simulate win for code rush
echo -e "${BLUE}Simulating win for code rush${NC}"
curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $admin_token" -d '{"status":"completed","winner_id":'$USER2_ID',"score_winner":15,"score_loser":7,"participants":[{"user_id":'$USER2_ID',"score":15,"is_winner":true},{"user_id":'$USER1_ID',"score":7,"is_winner":false}]}' "$GAME_URL/games/$CR_GAME_ID" > /dev/null
echo -e "${GREEN}User2 wins code rush${NC}"
echo

# Set code rush metrics
echo -e "${BLUE}Setting code rush metrics${NC}"

# Generate a random WPM value between 50 and 150
RANDOM_WPM=$((50 + RANDOM % 101)) # Generates a random number between 50 and 150

CR_METRIC=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $USER2_TOKEN" -d '{"participant_id":'$CR_PARTICIPANT2',"wpm":'$RANDOM_WPM'}' "$API_URL/analytics/metrics/coderush")
echo "$CR_METRIC" | jq
echo

# Display code rush metrics
echo -e "${BLUE}Displaying code rush metrics${NC}"
curl -s "$API_URL/analytics/metrics/coderush/$CR_PARTICIPANT2" | jq
echo

echo -e "${GREEN}Metrics demonstration completed${NC}" 
