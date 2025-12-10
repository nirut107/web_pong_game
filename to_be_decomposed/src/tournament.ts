import { fetchHtmlFileManage, showNotification } from "./manage";
import { navigateTo, userInfo } from "./route";
import { socketService } from "./services";
import { translatePage, translateWord } from "./translate";
import { fetchProfileUser } from "./liveChat";
import { User } from "./friendlist";
import { nativeOverride } from "@babylonjs/core";

interface Tournament {
  id: number;
  name: string;
  status: string;
  winner_id: number | null;
  winner_username: string | null;
  max_participants: number;
  current_participants: number;
  tournament_starts_at: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  participants: {
    id: number;
    user_id: number;
    username: string;
    status: string;
  }[];
  games: {
    id: number;
    game_type: string;
    status: string;
    position: string;
    winner_id: number | null;
    winner_username: string | null;
    loser_id: number | null;
    loser_username: string | null;
  }[];
}

interface Game {
  id: number;
  game_type: string;
  status: string;
  winner_id: number | null;
  loser_id: number | null;
  score_winner: number | null;
  score_loser: number | null;
  tournament_id: number | null;
  roomId: string;
  players: number;
  position: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  participants: {
    id: number;
    user_id: number;
    username: string;
    score: number;
    is_winner: boolean;
  }[];
}

const socket = socketService.getSocket();

let selectedValue: number;

socket.on("updateTournament", async () => {
  navigateTo("/tournament");
});

export const generateTournament = async () => {
  const BackTourBtn = document.getElementById(
    "BackTourBtn"
  ) as HTMLButtonElement;
  const showboard = document.getElementById("showboard") as HTMLElement;
  const tournamentModal = document.getElementById(
    "tournamentModal"
  ) as HTMLElement;
  const closemodal = document.getElementById(
    "btn-tournament-close"
  ) as HTMLElement;

  await fetchHtmlFileManage("/tournament_board.html", "bracket");
  let count = 8;
  const res = await fetch(`/api/v1/tournaments`);
  let allrournament: Tournament[] = await res.json();
  allrournament.filter((tournament) => {
    tournament.status != "pending";
  });

  const select = document.getElementById(
    "tournament-select"
  ) as HTMLSelectElement;
  select.innerHTML = "";
  console.log("allrournament", allrournament);
  allrournament.forEach((t: Tournament) => {
    const option = document.createElement("option");
    option.value = t.id.toString();
    option.textContent = t.name;
    select.appendChild(option);
  });
  if (allrournament.length > 0) {
    select.value = allrournament[0].id.toString();
  } else {
    showNotification(
      "No tournament available at the moment",
      [
        {
          text: "Back",
          onClick: () => navigateTo("/gamelibrary"),
          datatsl: "back",
        },
      ],
      "notour"
    );
  }

  showboard.onclick = () => {
    tournamentModal.style.display = "flex";
    closemodal.onclick = () => {
      tournamentModal.style.display = "none";
    };
    tournamentModal.onclick = (evevt: MouseEvent) => {
      if (evevt.target === tournamentModal) {
        tournamentModal.style.display = "none";
      }
    };
    console.log("allrournament", allrournament, Number(select.value));

    generateScoreboard(Number(select.value));
  };
  BackTourBtn.onclick = () => {
    socket.emit("leavetournamentroom", { userId: userInfo.userId });
    navigateTo("/gamelibrary");
  };
  select.addEventListener("change", (event) => {
    selectedValue = Number((event.target as HTMLSelectElement).value);
    const tournament: Tournament | undefined = allrournament.find(
      (tournament) => tournament.id === selectedValue
    );

    if (tournament) {
      console.log("Selected tournament ID:", selectedValue);
      generateRound(8, tournament);
    } else {
      console.log("Tournament not found!");
    }
  });
  generateRound(count, allrournament[0]);
};

async function generateScoreboard(id: number) {
  let tournamentData: TournamentData = {
    "1L1vs1R1": ["userA:5", "userB:3"],
    "1L2vs1R2": ["userC:7", "userD:2"],
    "1L3vs1R3": ["userE:6", "userF:6"],
    "1L4vs1R4": ["userG:9", "userH:4"],
    "2L1vs2R1": ["userA:4", "userC:8"],
    "2L2vs2R2": ["userE:3", "userG:6"],
    "3L1vs3R1": ["userC:5", "userG:5"],
    WINNER: ["userC"],
  };
  const container = document.getElementById("rounds-container") as HTMLElement;
  container.innerHTML = `<div class="loader-container" id="loader">
      <div class="loader-spinner"></div>
      <div class="loader-text tsl" data-tsl="loading_blockchain">Loading Tournament Score Form Blockchain...</div>
    </div>`;
  translatePage();
  try {
    const res = await fetch("http://localhost:3010/getscores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId: id,
      }),
    });
    const data = await res.json();
    if (data) {
      tournamentData = data;
    }
    console.log("test", data);
  } catch (err) {
    console.log(err);
  }
  container.innerHTML = "";
  await renderTournament(tournamentData);
}

type MatchResult = [string, string];
type TournamentData = {
  [matchKey: string]: MatchResult | string[];
  WINNER: string[];
};

async function renderTournament(data: TournamentData) {
  const container = document.getElementById("rounds-container");
  if (!container) return;

  container.innerHTML = "";

  const groupedRounds: Record<
    string,
    { matchKey: string; players: MatchResult }[]
  > = {};

  Object.entries(data).forEach(([matchKey, value]) => {
    if (matchKey === "WINNER") return;

    const round = matchKey[0];
    if (!groupedRounds[round]) groupedRounds[round] = [];
    groupedRounds[round].push({
      matchKey,
      players: value as MatchResult,
    });
  });

  for (const [round, matches] of Object.entries(groupedRounds)) {
    const roundDiv = document.createElement("div");
    roundDiv.classList.add("round-section");

    const title = document.createElement("h3");
    const div1 = document.createElement("div");
    const div2 = document.createElement("div");
    div1.classList.add("tsl");
    div1.setAttribute("data-tsl", "round");
    title.appendChild(div1);
    title.classList.add("round-title");
    div2.textContent = `${round}`;
    title.style.display = "flex";
    title.style.flexDirection = "row";
    title.style.justifyContent = "center";
    title.style.gap = "10px";
    title.appendChild(div2);

    roundDiv.appendChild(title);

    const table = document.createElement("table");
    table.classList.add("matches-table");

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th class="tsl" data-tsl="match">Match</th>
        <th class="tsl" data-tsl="player1">Player 1</th>
        <th class="tsl" data-tsl="score">Score</th>
        <th class="tsl" data-tsl="player2">Player 2</th>
        <th class="tsl" data-tsl="score">Score</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (const { matchKey, players } of matches) {
      let [p1, p2] = players;
      console.log("p1:", p1, "p2:", p2);
      let id1, id2;
      let score1, score2;
      let name1, name2;

      if (p1) {
        [[id1, score1]] = Object.entries(p1);
        console.log("fetchProfileUser", id1);
        const info: User = await fetchProfileUser(Number(id1));
        if (info) name1 = info.displayName;
      }

      if (p2) {
        [[id2, score2]] = Object.entries(p2);
        console.log("fetchProfileUser", id2);
        const info: User = await fetchProfileUser(Number(id2));
        if (info) name2 = info.displayName;
      }

      const row = document.createElement("tr");
      const matches = matchKey.match(/\d+/g);
      const lastNumber = matches ? matches[matches.length - 1] : null;

      row.innerHTML = `
        <td>${lastNumber}</td>
        <td>${name1 ?? ""}</td>
        <td>${score1 ?? ""}</td>
        <td>${name2 ?? ""}</td>
        <td>${score2 ?? ""}</td>
      `;

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    roundDiv.appendChild(table);
    container.appendChild(roundDiv);
  }

  if (data.WINNER && data.WINNER.length > 0) {
    const winnerDiv = document.createElement("div");
    winnerDiv.classList.add("winner-section");
    const winnerText = document.createElement("h3");
    winnerText.classList.add("winner-text");
    console.log(data.WINNER);
    const win = Object.keys(data.WINNER[0]);
    const infoWin: User = await fetchProfileUser(Number(win));
    const userWin = infoWin.displayName;
    winnerText.textContent = `🏆 Winner: ${userWin}`;
    winnerDiv.appendChild(winnerText);
    container.appendChild(winnerDiv);
  }
  translatePage();
}

async function generateRound(count: number, playerInTournaments: Tournament) {
  let token;

  let playerInTournament: Tournament;
  socket.emit("jointournamentroom", { userId: userInfo.userId });
  try {
    token = localStorage.getItem("token");
    if (!token) {
      return;
    }
    const res = await fetch(`/api/v1/tournaments/${playerInTournaments.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    playerInTournament = await res.json();
  } catch (err) {
    console.log(err);
    return;
  }
  console.log("tournament", playerInTournament, playerInTournaments);
  const totalRounds = Math.log2(count);

  for (let round = 1; round <= totalRounds; round++) {
    const roundDiv = document.createElement("div");
    roundDiv.className = "round";

    const matchCount = count / Math.pow(2, round);
    for (let match = 0; match < matchCount; match++) {
      const matchId = `${round}L${Math.floor(match) + 1}vs${round}R${
        Math.floor(match) + 1
      }`;

      const game = playerInTournament.games.find((g) => g.position === matchId);

      let p1, p2, ip1, ip2;
      let isFighting = 0;
      let sp1 = "none";
      let sp2 = "none";
      let gameData: Game = {} as Game;

      if (game) {
        if (game.status == "completed") {
          p1 = playerInTournament.participants.find(
            (p) => p.user_id === game.winner_id
          )?.username;
          p2 = playerInTournament.participants.find(
            (p) => p.user_id === game.loser_id
          )?.username;
          ip1 = playerInTournament.participants.find(
            (p) => p.user_id === game.winner_id
          )?.user_id;
          ip2 = playerInTournament.participants.find(
            (p) => p.user_id === game.loser_id
          )?.user_id;
          sp1 = "win";
          sp2 = "lose";
        } else if (game.status == "waiting") {
          try {
            const res = await fetch(`/api/v1/games/${game.id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            gameData = await res.json();
            console.log("gamedata", gameData);
            if (gameData.participants.length == 2) {
              p1 = gameData.participants[0].username;
              p2 = gameData.participants[1].username;
              ip1 = gameData.participants[0].user_id;
              ip2 = gameData.participants[1].user_id;
            } else if (gameData.participants.length == 1) {
              p1 = gameData.participants[0].username;
              ip1 = gameData.participants[0].user_id;
            }
            isFighting = 1;
          } catch (err) {
            console.log(err);
          }
        } else {
          p1 = translateWord("Waiting");
          p2 = translateWord("Waiting");
        }
      } else {
        p1 = translateWord("Waiting");
        p2 = translateWord("Waiting");
      }
      console.log(p1, p2, sp1, sp2, matchId);
      await createPlayerHTML(p1, ip1, sp1, matchId, 1);
      const vs = document.getElementById(`V_${matchId}`) as HTMLImageElement;
      await createPlayerHTML(p2, ip2, sp2, matchId, 2);
      const id = document.getElementById(`${matchId}`) as HTMLElement;
      if (isFighting) {
        if (vs) {
          vs.src = "/image/vs.gif";
          id.style.cursor = "pointer";
          id.onclick = () => {
            socket.emit("leavetournamentroom", { userId: userInfo.userId });
            navigateTo(`/pong/${gameData.roomId}`);
          };
        }
      } else {
        id.style.cursor = "";
        id.onclick = () => {};
      }
    }
  }

  let avatar = "/image/avatar/2df.jpeg";
  let playerName = translateWord("Waiting");
  const game = playerInTournament.games.find((g) => g.position === "3L1vs3R1");
  if (game) {
    console.log("last win");
    try {
      if (game.winner_id) {
        const userInfo = await fetchProfileUser(game.winner_id);
        if (userInfo != undefined) console.log(userInfo);
        if (!userInfo.avatarUrl && userInfo.displayName.startsWith("AI")) {
          userInfo.avatarUrl = "/image/bot.jpg";
        }
        if (userInfo.avatarUrl) avatar = userInfo.avatarUrl;
        if (userInfo.displayName) playerName = userInfo.displayName;
      }
    } catch (err) {
      console.log(err);
    }
    const winnerName = document.getElementById("winnerNmae") as HTMLElement;
    const winnerAvatar = document.getElementById(
      "winnerAvatar"
    ) as HTMLImageElement;
    if (playerName && winnerName) {
      winnerName.textContent = playerName;
    }
    if (avatar && winnerAvatar) {
      winnerAvatar.src = avatar;
    }
  }
  translatePage();
}

async function createPlayerHTML(
  playerName: string | undefined,
  userid: number | undefined,
  status: string,
  matchId: string,
  player: number
) {
  let avatar = "/image/avatar/2df.jpeg";
  let frame;
  try {
    if (userid) {
      const userInfo = await fetchProfileUser(userid);
      if (!userInfo.avatarUrl && userInfo.displayName.startsWith("AI")) {
        userInfo.avatarUrl = "/image/bot.jpg";
      }
      if (userInfo.avatarUrl) avatar = userInfo.avatarUrl;
      playerName = userInfo.displayName;
    }
  } catch (err) {
    console.log(err);
  }
  if (status == "win") {
    frame = "/image/win.png";
  } else if (status == "lose") {
    frame = "/image/lose.png";
  }
  const avatar_player = document.getElementById(
    `A_${matchId}_${player}`
  ) as HTMLImageElement;
  const frame_player = document.getElementById(
    `F_${matchId}_${player}`
  ) as HTMLImageElement;
  const name_player = document.getElementById(
    `N_${matchId}_${player}`
  ) as HTMLElement;

  avatar_player.src = avatar;
  if (frame) frame_player.src = frame;
  if (playerName == undefined) {
    name_player.classList.add("tsl");
    name_player.setAttribute("data-tsl", "noplayer");
  } else {
    name_player.textContent = playerName;
  }
}

export function ExitFromTournament() {
  socket.emit("leavetournamentroom", { userId: userInfo.userId });
}

(window as any).generateTournament = generateTournament;
