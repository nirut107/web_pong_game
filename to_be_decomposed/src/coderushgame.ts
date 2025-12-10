import { engRowLower, engRowUpper, keyNames } from "./words.js";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { socketService } from "./services.js";
import { userInfo, navigateTo, token } from "./route.js";
import { showNotification } from "./manage.js";
import { translateWord } from "./translate.js";

interface Enemies {
  mesh: BABYLON.AbstractMesh;
  label: BABYLON.Mesh;
}

let keyLow = engRowLower;
let keyUp = engRowUpper;
let textinput = "";
let hearts: BABYLON.AbstractMesh[] = [];
let scene: BABYLON.Scene;
let engine: BABYLON.Engine;
let enemies: Enemies[] = [];
let roomId: string = "";
let isPlayer = 0;
let enemyNormalTemplate: BABYLON.AbstractMesh | null = null;

interface dataChnage {
  status: any;
}

const socket = socketService.getSocket();

socket.on("connect", async () => {
  socket.emit("registerSocket", { userUID: userInfo.userId });
});

socket.on("spawnEnemy", (data: any) => {
  const { text, randomNumber, randomIndexPosition } = data;
  spawnEnemy(text, randomNumber, randomIndexPosition, false, 0);
});

socket.on("changePosition", (data: dataChnage) => {
  const { status } = data;
  changePosition(status.inputWord);
  if (status.time) {
    const timeCountdown = document.getElementById(
      "timeCountdown"
    ) as HTMLElement;
    if (!timeCountdown) return;
    if (status.time == "0:30") {
      timeCountdown.classList.add("siren-mode");
    }
    timeCountdown.textContent = status.time;
  }
});

socket.on("updateScoreBoard", (data: any) => {
  const { scoreObj, playersWithNames } = data;
  console.log("allplayer", playersWithNames, scoreObj);
  const scoreList = document.getElementById("scoreList");
  if (!scoreList) return;
  scoreList.innerHTML = "";

  const sorted = Object.entries(scoreObj).sort((a: any, b: any) => b[1] - a[1]);

  for (const [userUID, score] of sorted) {
    console.log(userUID, score);
    const scoreItem = document.createElement("div");
    scoreItem.innerHTML = `<span>${playersWithNames[userUID]}</span><span>${score}</span>`;
    scoreList.appendChild(scoreItem);
  }
});

socket.on("deleteEnermy", (data: any) => {
  const { index } = data;
  deleteEnermy(index);
});

socket.on("deleteHeart", (data: any) => {
  const { index } = data;
  deleteHeart(index);
});

socket.on("inputRespone", (data: any) => {
  const { correct } = data;
  updateRespone(correct);
});

socket.on("setenermy", (data: any) => {
  const { enemy, allPlayer } = data;
  isPlayer = 1;
  console.log("setIspalyer", allPlayer, enemy);
  if (allPlayer.findIndex((id: any) => id == userInfo.userId) == -1) {
    isPlayer = 0;
  }
  const giveup1 = document.getElementById("giveup") as HTMLButtonElement;
  if (isPlayer) {
    giveup1.onclick = () => {
      showNotification(
        "Are you sure you want to give up?",
        [
          {
            text: "Cancel",
            onClick: () => console.log("User chose not to block."),
            datatsl: "cancel",
          },
          {
            text: "Give up",
            onClick: async () => {
              socket.emit("giveup", { roomId, userUID: userInfo.userId });
              deleteAll();
              navigateTo("/coderush/mode");
            },
            danger: true,
            datatsl: "giveup",
          },
        ],
        "notiGiveup"
      );
    };
  } else {
    giveup1.textContent = translateWord("exit");
    giveup1.classList.add("tsl");
    giveup1.setAttribute("data-tsl", "exit");
    giveup1.onclick = () => {
      deleteAll();
      navigateTo("/coderush/mode");
    };
    translateWord("exit");
  }
  for (let i = 0; i < enemy.length; i++) {
    console.log("setenemy", enemy[i].text, enemy[i].z);
    spawnEnemy(
      enemy[i].text,
      enemy[i].randomNumber,
      enemy[i].randomIndexPosition,
      true,
      enemy[i].z
    );
  }
});

socket.on("navigatoGame", async (data: any) => {
  const { roomId, id } = data;
  console.log(data);
  const res = await fetch(`/api/v1/games/${Number(id)}/join`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const datas = await res.json();
  console.log("participant_id", datas, roomId, userInfo.userId);
  if (datas.participant_id) {
    socket.emit("setParticipantId", {
      participant_ids: datas.participant_id,
      roomId,
      UUID: userInfo.userId,
    });
  }
  await navigateTo(`/coderush/gameplay/${roomId}`);
});
socket.on("roomHaveEnd", () => {
  navigateTo("/coderush/mode");
});
socket.on("youWin", () => {
  console.log("youwin");
});
socket.on("end", async (datas: any) => {
  const { activePlayers, gaveUpPlayers, time_used, participants, score } =
    datas;
  console.log(participants, score, token);
  // try {
  //   const res = await fetch("/api/v1/analytics/metrics/coderush", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${token}`,
  //     },
  //     body: JSON.stringify({
  //       participant_id: participants[userInfo.userId],
  //       wpm: (score[userInfo.userId] / time_used).toFixed(2),
  //     }),
  //   });
  //   console.log(res);
  // } catch (err) {
  //   console.log("build coderush error", err);
  // }

  const resultList = document.getElementById("resultContainer") as HTMLElement;
  resultList.innerHTML = "";

  for (const player of activePlayers) {
    const divPlayer = document.createElement("div");
    divPlayer.className = "player-result";
    const name = document.createElement("div");
    name.className = "player-name";
    const score = document.createElement("div");
    score.className = "player-score";
    name.textContent = player.name;
    score.textContent = `${(player.score / time_used).toFixed(2)} WPM`;
    divPlayer.appendChild(name);
    divPlayer.appendChild(score);
    resultList.appendChild(divPlayer);
  }

  for (const player of gaveUpPlayers) {
    const divPlayer = document.createElement("div");
    divPlayer.className = "player-result";
    const name = document.createElement("div");
    name.className = "player-name";
    const score = document.createElement("div");
    score.className = "player-score";
    name.textContent = player.name;
    score.textContent = "Gave Up";
    score.style.opacity = "0.6";
    score.style.fontStyle = "italic";
    score.style.color = "red";
    divPlayer.appendChild(name);
    divPlayer.appendChild(score);
    resultList.appendChild(divPlayer);
  }

  const modal = document.getElementById("GameResultModal") as HTMLElement;
  const giveup = document.getElementById("giveup") as HTMLButtonElement;
  const scoreBoard = document.getElementById("scoreBoard") as HTMLElement;
  const returnbtn = document.getElementById("returnbtn") as HTMLButtonElement;
  modal.style.display = "flex";
  giveup.style.display = "none";
  scoreBoard.style.display = "none";
  returnbtn.onclick = () => {
    deleteAll();
    navigateTo(`/coderush/mode`);
  };
});
socket.on("heartGenerate", (data: any) => {
  const { life } = data;
  heartGenerate(life);
});

async function startSinglePlay() {
  socket.emit("serverStartSingleGame", {
    userUID: userInfo.userId,
    username: userInfo.displayName,
    roomId: userInfo.userId.toString(),
    tokenuser: token,
  });
}

function deleteAll() {
  for (let i = 0; i < enemies.length; i++) {
    enemies[i].mesh.dispose();
    enemies[i].label.dispose();
  }
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].dispose();
  }
  enemies.length = 0;
  hearts.length = 0;
  scene?.animationGroups.forEach((group: any) => group.stop());
  scene?.dispose();
  engine?.dispose();

  const textDiv = document.getElementById("textDiv");
  if (textDiv) {
    textDiv.style.left = "";
    textDiv.style.top = "";
  }

  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (canvas) {
    canvas.style.display = "none";
  }
  document.removeEventListener("keydown", handleKeyDown);
}

function deleteEnermy(index: number) {
  // console.log("B enemies", enemies, index);
  // enemies[index].label.material.diffuseTexture.dispose();
  enemies[index].mesh.dispose();
  enemies[index].label.dispose();
  enemies.splice(index, 1);
  // console.log("A enemies", enemies);
}

function deleteHeart(index: number) {
  console.log("heart", index);
  hearts[index].dispose();
  hearts.splice(index, 1);
}

function changePosition(enemy: any) {
  if (enemies.length != enemy.length) {
    return;
  }
  for (let i = 0; i < enemies.length; i++) {
    enemies[i].mesh.position.z = enemy[i].z;
    enemies[i].label.position.z = enemy[i].z;
  }
}

async function heartGenerate(number: number): Promise<void> {
  const position = 100;
  const loaders = [];

  for (let i = 0; i < number; i++) {
    loaders.push(
      BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "/model/",
        "heart_in_love.glb",
        scene
      ).then((result) => {
        const heart = result.meshes[0];
        heart.scaling.set(0.2, 0.2, 0.2);
        heart.position.set(position - i * 50, 50, 400);
        heart.lookAt(new BABYLON.Vector3(position - i * 50, 50, 900));
        return heart;
      })
    );
  }

  const loadedHearts = await Promise.all(loaders);
  hearts.push(...loadedHearts);
}

function loadEnemyModel(): Promise<BABYLON.AbstractMesh> {
  return new Promise((resolve, reject) => {
    if (enemyNormalTemplate) {
      const enemy = enemyNormalTemplate.clone("enemyClone", null)!;
      enemy.setEnabled(true);
      return resolve(enemy);
    }

    BABYLON.SceneLoader.ImportMesh(
      "",
      "/model/",
      "fly.glb",
      scene,
      function (meshes, _particleSystems, _skeletons, animationGroups) {
        enemyNormalTemplate = meshes[0];
        enemyNormalTemplate.setEnabled(false);

        const group = animationGroups[0];
        group.stop();

        const startFrame = 1 * 60;
        const endFrame = 15 * 60;

        group.from = startFrame;
        group.to = endFrame;
        group.start(true);

        const enemy = enemyNormalTemplate.clone("enemyClone", null)!;
        enemy.setEnabled(true);
        resolve(enemy);
      },
      null,
      (error) => reject(error)
    );
  });
}

async function spawnEnemy(
  text: string,
  randomNumber: number,
  randomIndexPosition: number,
  position: boolean,
  z: number
) {
  const positionOptions = [
    { x: 0, z: -1500, lookAt: new BABYLON.Vector3(0, 0, 800) },
    { x: 150, z: -1500, lookAt: new BABYLON.Vector3(150, 0, 800) },
    { x: -150, z: -1500, lookAt: new BABYLON.Vector3(-150, 0, 800) },
  ];
  const randomPosition = positionOptions[randomIndexPosition];

  console.log("spawnEnemy", text, randomNumber, randomPosition);
  const enemy = await loadEnemyModel();
  if (!enemy) return;
  enemy.scaling = new BABYLON.Vector3(50, 50, 50);
  enemy.lookAt(new BABYLON.Vector3(300, 0, -300));
  if (position) {
    enemy.position.set(randomPosition.x, 10, z);
  } else {
    enemy.position.set(randomPosition.x, 10, randomPosition.z);
  }
  enemy.rotation.y = Math.PI;

  let font_size = 80;
  let font = `bold ${font_size}px Orbitron`;
  let DTHeight = 1.5 * font_size;
  let padding = 20;
  let borderRadius = 10;

  let colour = "black";
  let strokeColor = "black";
  if (randomNumber == 9) {
    enemy.position.y += 50;
    colour = "red";
    strokeColor = "red";
  }

  let tempTexture = new BABYLON.DynamicTexture(
    "tempTexture",
    { width: 1024, height: 512 },
    scene
  );
  let tmpctx = tempTexture.getContext();
  tmpctx.font = font;
  let textWidth = tmpctx.measureText(text).width;
  let DTWidth = textWidth + padding * 2;

  let dynamicTexture = new BABYLON.DynamicTexture(
    "DynamicTexture",
    { width: DTWidth, height: DTHeight },
    scene,
    false
  );
  let ctx = dynamicTexture.getContext() as CanvasRenderingContext2D;

  function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string,
    strokeColor: string,
    strokeWidth: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (strokeColor && strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  }

  ctx.clearRect(0, 0, DTWidth, DTHeight);
  drawRoundedRect(
    ctx,
    0,
    0,
    DTWidth,
    DTHeight,
    borderRadius,
    "white",
    strokeColor,
    20
  );

  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, DTWidth / 2, DTHeight / 2);

  dynamicTexture.update(true);
  let mat = new BABYLON.StandardMaterial("mat", scene);
  mat.diffuseTexture = dynamicTexture;
  mat.diffuseTexture.updateSamplingMode(
    BABYLON.Texture.NEAREST_NEAREST_MIPNEAREST
  );

  let plane = BABYLON.MeshBuilder.CreatePlane(
    "plane",
    { width: DTWidth / 2, height: DTHeight / 3 },
    scene
  );
  plane.material = mat;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
  plane.isPickable = false;
  plane.position = new BABYLON.Vector3(
    enemy.position.x,
    enemy.position.y + 80,
    enemy.position.z
  );

  tempTexture.dispose();

  const enemyObject = {
    mesh: enemy,
    label: plane,
  };
  enemies.push(enemyObject);
  console.log("afterpush", enemies);
}
const createScene = async function () {
  let promises: Promise<void>[] = [];
  scene = new BABYLON.Scene(engine);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 2.5,
    800,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.setTarget(BABYLON.Vector3.Zero());

  camera.minZ = 0.1;
  camera.maxZ = 5000;
  camera.setTarget(BABYLON.Vector3.Zero());

  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(400, 500, 500),
    scene
  );
  light.intensity = 2;

  // <=============load enermy model ===================>

  BABYLON.SceneLoader.ImportMesh(
    "",
    "/model/",
    "fly.glb",
    scene,
    function (
      meshes: BABYLON.AbstractMesh[],
      _particleSystems: BABYLON.IParticleSystem[],
      _skeletons: BABYLON.Skeleton[],
      animationGroups: BABYLON.AnimationGroup[]
    ) {
      enemyNormalTemplate = meshes[0];
      console.log("animation", animationGroups);
      enemyNormalTemplate.setEnabled(false);

      const group = animationGroups[0];
      group.stop();

      const startFrame = 1 * 60;
      const endFrame = 15 * 60;

      group.from = startFrame;
      group.to = endFrame;
      group.start(true);
    }
  );

  const gateMiddlePromise = new Promise<void>((resolve) => {
    BABYLON.SceneLoader.ImportMesh(
      "",
      "/model/",
      "blood_blossom_grove.glb",
      scene,
      function (meshes: any) {
        const skyboxMesh = meshes[0];

        skyboxMesh.scaling = new BABYLON.Vector3(80, 80, 80);
        skyboxMesh.position = new BABYLON.Vector3(0, -200, -1600);
        skyboxMesh.lookAt(new BABYLON.Vector3(-35000, -300, 0));

        resolve();
      }
    );
  });
  promises.push(gateMiddlePromise);

  // <=================== Function to spawn a new enemy ===================== >

  let planeInput = BABYLON.MeshBuilder.CreatePlane(
    "plane",
    { width: 300, height: 100 },
    scene
  );
  planeInput.position = new BABYLON.Vector3(0, 0, 400);

  scene.registerBeforeRender(() => {
    const camera = scene.activeCamera;
    if (!camera) {
      return;
    }
    const planePosition = planeInput.position;

    const planeScreenPosition = BABYLON.Vector3.Project(
      planePosition,
      BABYLON.Matrix.Identity(),
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(
        engine.getRenderWidth(),
        engine.getRenderHeight()
      )
    );

    const backgroundPlane = BABYLON.MeshBuilder.CreatePlane(
      "background",
      { width: 6000, height: 3000 },
      scene
    );
    backgroundPlane.position = new BABYLON.Vector3(0, 2000, -2500);
    backgroundPlane.rotation.x = 0;

    const bgMaterial = new BABYLON.StandardMaterial("bgMaterial", scene);
    bgMaterial.diffuseTexture = new BABYLON.Texture(
      "/model/bg_image.jpg",
      scene
    );
    bgMaterial.diffuseTexture.hasAlpha = true;
    bgMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);

    backgroundPlane.material = bgMaterial;

    const textDiv = document.getElementById("textDiv");
    if (!textDiv) return;
    textDiv.style.left = `${planeScreenPosition.x - textDiv.offsetWidth / 2}px`;
    textDiv.style.top = `${planeScreenPosition.y - textDiv.offsetHeight / 2}px`;
  });
  await Promise.all(promises);
  return scene;
};

function handleKeyDown(event: KeyboardEvent) {
  if (!isPlayer) return;

  if (event.key == "Backspace") {
    if (textinput.length > 0) {
      textinput = textinput.slice(0, -1);
      updateInput();
    }
    return;
  }

  console.log("roomId", roomId, event.key);
  if (event.key == " " || (event.key == "Enter" && textinput != "")) {
    socket.emit("textintput", { textinput, userUID: userInfo.userId, roomId });
    updateInput();
    return;
  }

  if (textinput && textinput.length > 10) return;

  if (event.shiftKey) {
    if (event.key != "Shift") {
      if (
        keyUp[keyNames.indexOf(event.code.toLowerCase())] &&
        keyUp[keyNames.indexOf(event.code.toLowerCase())].length == 1
      ) {
        textinput += keyUp[keyNames.indexOf(event.code.toLowerCase())];
      }
    }
  } else if (
    keyLow[keyNames.indexOf(event.code.toLowerCase())] &&
    keyLow[keyNames.indexOf(event.code.toLowerCase())].length == 1
  ) {
    textinput += keyLow[keyNames.indexOf(event.code.toLowerCase())];
  }

  updateInput();
}

async function startGame() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (!canvas) return;
  canvas.style.display = "";
  engine = new BABYLON.Engine(canvas, true);

  createScene().then((scene) => {
    engine.runRenderLoop(() => {
      scene.render();
    });

    const loader = document.getElementById("loader") as HTMLElement;
    const timeCountdown = document.getElementById(
      "timeCountdown"
    ) as HTMLElement;
    const Score = document.getElementById("Score") as HTMLElement;
    const giveup = document.getElementById("giveup") as HTMLElement;
    if (!timeCountdown) return;
    timeCountdown.classList.remove("hidden");
    Score.classList.remove("hidden");
    giveup.classList.remove("hidden");
    requestAnimationFrame(() => {
      timeCountdown.classList.add("show");
      Score.classList.add("show");
      giveup.classList.add("show");
    });

    if (loader) {
      loader.classList.add("fade-out");
      setTimeout(() => loader.remove(), 3000);
    }

    window.addEventListener("resize", () => engine.resize());
  });

  document.addEventListener("keydown", handleKeyDown);
}

function updateInput() {
  console.log(textinput);
  const textDiv = document.getElementById("textDiv");
  if (!textDiv) return;
  textDiv.textContent = textinput;
  const textWidth = textDiv.offsetWidth;
  if (textinput.length > 10) {
    textDiv.style.color = "red";
    textDiv.classList.add("shake");
  } else {
    textDiv.style.color = "white";
    textDiv.classList.remove("shake");
  }
  textDiv.style.left = `${textWidth}px`;
}

function updateRespone(correct: any) {
  const textDiv = document.getElementById("textDiv");
  if (!textDiv) return;
  if (correct) {
    textinput = "";
    textDiv.textContent = textinput;
  } else {
    textDiv.style.color = "red";
    textDiv.classList.add("shake");
  }
}

export async function joinGameCoderush(Id: string) {
  console.log("joingame");
  const header = document.getElementById("header") as HTMLElement;
  if (header) {
    header.style.display = "none";
  }

  roomId = Id;
  await startGame();
  socket.emit("joinViewroom", { roomId });
}

export { startSinglePlay };
