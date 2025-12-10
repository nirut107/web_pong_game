import { formatDistanceToNow, parseISO } from "date-fns";
import { fetchHtmlFileManage } from "./manage.ts";
import { userInfo } from "./route.ts";
import { translatePage, translateWord } from "./translate.ts";
import { enUS, th, ja, es, Locale } from "date-fns/locale";

interface HistoryList {
  id: number;
  game_id: number;
  game_type: string;
  opponent_id: number;
  opponent_username: string;
  user_score: number;
  opponent_score: number;
  result: string;
  created_at: string;
  wpm: number;
}

interface GameStat {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
}

export async function fetchStatPong(stat: GameStat) {
  try {
    const totalMatch: number = stat.total;
    const totalWin: number = stat.wins;
    const totalLoss: number = stat.losses;
    const totalDraw: number = stat.draws;
    const totalWinRate = totalMatch === 0 ? 0 : (totalWin / totalMatch) * 100;
    const totalDrawRate = totalMatch === 0 ? 0 : (totalDraw / totalMatch) * 100;

    const pieChart = document.getElementById(
      "total-win-rate-pie"
    ) as HTMLElement;
    const totalWinRateVal = document.getElementById(
      "total-win-rate-val"
    ) as HTMLElement | null;
    const totalMatchVal = document.getElementById(
      "total-match-val"
    ) as HTMLElement | null;
    const totalLossVal = document.getElementById(
      "total-loss-val"
    ) as HTMLElement | null;
    const totalWinVal = document.getElementById(
      "total-win-val"
    ) as HTMLElement | null;
    const totalDrawVal = document.getElementById(
      "total-draw-val"
    ) as HTMLElement | null;

    if (pieChart && totalWinRateVal) {
      if (totalMatch === 0) {
        pieChart.style.background = "conic-gradient(#d1d5db 0% 100%)";
        totalWinRateVal.textContent = "No data";
      } else {
        pieChart.style.background = `conic-gradient(
          #14b8a6 0% ${totalWinRate}%,
          #6b7280 ${totalWinRate}% ${totalWinRate + totalDrawRate}%,
          #ef4444 ${totalWinRate + totalDrawRate}% 100%
        )`;
        totalWinRateVal.textContent = totalWinRate.toFixed(1) + "%";
      }
    }

    if (totalMatchVal) totalMatchVal.textContent = totalMatch.toString();
    if (totalWinVal) totalWinVal.textContent = totalWin.toString();
    if (totalLossVal) totalLossVal.textContent = totalLoss.toString();
    if (totalDrawVal) totalDrawVal.textContent = totalDraw.toString();
  } catch (error) {
    console.error("Failed to fetch PongGame stat: ", error);
  }
}

export async function fetchStatCodeRush(stat: GameStat) {
  try {
    console.log("coderush stat", stat);

    const token = localStorage.getItem("token");
    const response = await fetch(
      `/api/v1/analytics/metrics/coderush/user/${userInfo.userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch dashboard stats");
    }
    const metrics = await response.json();
    console.log("coderush metrics", metrics);

    const crTotal = document.getElementById("cr-total-game") as HTMLElement;
    crTotal.textContent = metrics.countTotal.toString();
    const crHigh = document.getElementById("cr-high") as HTMLElement;
    crHigh.textContent = metrics.maxWpm.toFixed(2);
    const crAvg = document.getElementById("cr-avg") as HTMLElement;
    crAvg.textContent = metrics.avgWpm.toFixed(2);
  } catch (error) {
    console.error("Failed to fetch CodeRush stat: ", error);
  }
}

export async function fetchHistoryPong() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/v1/games/history?game_type=pong`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      console.error("Failed to fetch PongGame history");
    }
    const history: HistoryList[] = await response.json();
    console.log("pong history", history);

    const historyContainer = document.getElementById(
      "history-pong-container"
    ) as HTMLElement;
    historyContainer.innerHTML = "";

    if (!history || !Array.isArray(history) || history.length === 0) {
      const card = document.createElement("div");
      card.classList.add("history-card", "tsl");
      card.setAttribute("data-tsl", "noponghistory");
      card.textContent = "No PongGame history. Start playing a game!";
      historyContainer?.appendChild(card);
      return;
    }

    const historyCards: HTMLElement[] = (
      await Promise.all(
        history.map(async (match) => {
          const opponentResponse = await fetch(
            `/api/v1/users/${match.opponent_id}/profile`
          );
          if (!opponentResponse.ok) {
            console.error("Failed to fetch opponent info");
            return undefined;
          }
          const opponentInfo = await opponentResponse.json();
          const card = document.createElement("div");
          card.classList.add("history-card");
          if (match.result.toLowerCase() === "win") {
            card.classList.add("bg-teal-500");
          } else if (match.result.toLowerCase() === "loss") {
            card.classList.add("bg-red-500");
          } else {
            card.classList.add("bg-sky-950");
          }
          const timestamp = document.createElement("span");
          const createdAt = parseISO(match.created_at);
          createdAt.setHours(
            createdAt.getHours() - new Date().getTimezoneOffset() / 60
          );
          const localeMap: Record<string, Locale> = {
            en: enUS,
            th: th,
            jp: ja,
            sp: es,
          };
          let language: string | null = localStorage.getItem("language");
          if (!language) {
            language = "en";
          }

          timestamp.innerHTML = `${formatDistanceToNow(createdAt, {
            addSuffix: true,
            locale: localeMap[language],
          })}`;
          card.appendChild(timestamp);

          const opponentP = document.createElement("p");
          opponentP.innerHTML = `<span class="tsl" data-tsl="opponent">${translateWord(
            "opponent"
          )}</span>`;
          const opponent = document.createElement("span");
          opponent.textContent = `: ${opponentInfo.displayName}`;
          opponentP.appendChild(opponent);
          card.appendChild(opponentP);

          const result = document.createElement("div");
          result.classList.add("flex", "items-center", "justify-between");
          result.innerHTML = `
          <span><span class="tsl" data-tsl="result">${translateWord(
            "result"
          )}</span>: <span class="tsl" data-tsl="${match.result.toLowerCase()}">${translateWord(
            match.result.toLowerCase()
          )}</span></span>
          <span><span class="tsl" data-tsl="score">${translateWord(
            "score"
          )}</span><span>: ${match.user_score} - ${
            match.opponent_score
          }</span></span>
        `;
          card.appendChild(result);
          return card;
        })
      )
    ).filter((card): card is HTMLDivElement => card !== undefined);
    historyCards.forEach((card) => {
      if (card) {
        historyContainer?.appendChild(card);
      }
    });
    translatePage();
  } catch (error) {
    console.error("Failed to fetch ponggame history:", error);
  }
}

export async function fetchHistoryCodeRush() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/v1/games/history?game_type=coderush`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      console.error("Failed to fetch CodeRush history");
    }
    const history: HistoryList[] = await response.json();
    const historyContainer = document.getElementById(
      "history-coderush-container"
    ) as HTMLElement;
    historyContainer.innerHTML = "";

    console.log("coderush history", history);
    if (!history || !Array.isArray(history) || history.length === 0) {
      const card = document.createElement("div");
      card.classList.add("history-card", "tsl");
      card.setAttribute("data-tsl", "nocrhistory");
      card.textContent = "No CodeRush history. Start playing a game!";
      historyContainer?.appendChild(card);
      return;
    }

    const historyCards: HTMLElement[] = (
      await Promise.all(
        history.map(async (match) => {
          try {
            const opponentResponse = await fetch(
              `/api/v1/users/${match.opponent_id}/profile`
            );
            if (!opponentResponse.ok) {
              console.error("Failed to fetch opponent info");
              return null;
            }
            const opponentInfo = await opponentResponse.json();

            const card = document.createElement("div");
            card.classList.add("history-card");

            // Set color by result
            const resultLower = match.result.toLowerCase();
            if (resultLower === "win") {
              card.classList.add("bg-teal-500");
            } else if (resultLower === "loss") {
              card.classList.add("bg-red-500");
            } else {
              card.classList.add("bg-sky-950");
            }

            // Timestamp
            const timestamp = document.createElement("span");
            const createdAt = parseISO(match.created_at);
            createdAt.setHours(
              createdAt.getHours() - new Date().getTimezoneOffset() / 60
            );
            const localeMap: Record<string, Locale> = {
              en: enUS,
              th: th,
              jp: ja,
              sp: es,
            };
            let language: string | null = localStorage.getItem("language");
            if (!language) {
              language = "en";
            }

            timestamp.innerHTML = `${formatDistanceToNow(createdAt, {
              addSuffix: true,
              locale: localeMap[language],
            })}`;
            card.appendChild(timestamp);

            // Opponent name
            const opponentP = document.createElement("p");
            opponentP.innerHTML = `<span class="tsl" data-tsl="opponent">${translateWord(
              "opponent"
            )}</span>`;
            const opponent = document.createElement("span");
            opponent.textContent = `: ${opponentInfo.displayName}`;
            opponentP.appendChild(opponent);
            card.appendChild(opponentP);

            // Match result and score
            const result = document.createElement("div");
            result.innerHTML = `
              <div class="flex items-center justify-between">
                <span>
                  <span class="tsl" data-tsl="result">${translateWord(
                    "result"
                  )}</span>:
                  <span class="tsl" data-tsl="${resultLower}">${
              match.result
            }</span>
                </span>
                <span>
                  <span class="tsl" data-tsl="score">${translateWord(
                    "score"
                  )}</span>:
                  ${match.user_score} - ${match.opponent_score}
                </span>
              </div>
            `;
            card.appendChild(result);

            historyContainer?.appendChild(card);
            return card;
          } catch (err) {
            console.error("Error building history card:", err);
            return null;
          }
        })
      )
    ).filter((card) => card !== null);
    historyCards.forEach((card) => {
      if (card) {
        historyContainer?.appendChild(card);
      }
    });
    translatePage();
  } catch (error) {
    console.error("Failed to fetch coderush history:", error);
  }
}

export async function fetchHistory() {
  fetchHistoryPong();
  fetchHistoryCodeRush();
}

export async function fetchDashboard() {
  try {
    await fetchHtmlFileManage("dashboard.html", "dashboard-content");
    const token = localStorage.getItem("token");
    const response = await fetch(
      `/api/v1/analytics/metrics/user/${userInfo.userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch dashboard stats");
    }
    const stats = await response.json();
    console.log("game stats", stats);
    if (!stats) {
      return;
    }
    if (stats.games_by_type.pong) {
      fetchStatPong(stats.games_by_type.pong);
    }
    if (stats.games_by_type.coderush) {
      fetchStatCodeRush(stats.games_by_type.coderush);
    }
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
  }
}
