// 전역 변수
let player;
let target;
let noises = [];
let maxNoises;
let gameState = "start";
let typedChars = 0;
let endTimer = 0;
let playerSize = 15;
let endPause = 0;
let clearColorT = 0;
let clearColorO = 0;
let noiseSound;
let noiseFilter;
let bgm;
let clearPlayerX;
let clearPlayerY;
let clearPlayerAlpha;
let clearPlayerSize;
let restartDelay = 0;

let gameOverText = `THE NOISE
STOPPED
SO DID I
I COULDN'T
HEAR THE WORLD
ANYMORE`;

let clearText = `THE NOISE
NEVER LEFT

I JUST MADE

IT THROUGH`;

let endingPlayerX;
let endingPlayerY;

let endingTargetX;
let endingTargetY;

let playerAlpha = 255;

// HP 관련 변수
let hp = 1.0;
const HP_DECAY = 0.00012;
const HP_REGEN = 0.005;
const HP_HIT = 0.01;

function setup() {
  createCanvas(854, 528);
  noCursor();
  noStroke();

  maxNoises = 33 * width;

  player = new Player(width / 2, height / 2);
  target = new Target();

  noiseSound = new p5.Noise("white");

  noiseFilter = new p5.LowPass();

  noiseSound.disconnect();
  noiseSound.connect(noiseFilter);

  noiseSound.start();
}

function draw() {
  if (gameState === "start") {
    drawStartScreen();
    noiseSound.amp(0, 0.3);
    return;
  }
  if (gameState === "gameover") {
    drawGameOver();
    return;
  }

  if (gameState === "clear") {
    drawClear();
    return;
  }

  // 스페이스바 -> 고립
  let isIsolated = keyIsDown(32);
  let noiseRatio = min(noises.length / maxNoises, 1);
  let noiseVolume = map(noiseRatio, 0, 1, 0.01, 0.25);

  // 배경 및 HP / 고립 -> 회복 / 평소 -> 지속감소
  if (isIsolated) {
    background(245, 150);
    hp = min(1.0, hp + HP_REGEN);
    noiseSound.amp(0.005, 0.2);
    noiseFilter.freq(400);
  } else {
    background(255);
    hp = max(0, hp - HP_DECAY);
    noiseSound.amp(noiseVolume, 0.2);
    noiseFilter.freq(8000);
  }


  // 노이즈
  let newNoises = [];

  for (let i = noises.length - 1; i >= 0; i--) {
    let n = noises[i];
    n.update(isIsolated, noiseRatio, newNoises);
    n.display(isIsolated);

    // 플레이어 충돌 및 데미지
    if (!isIsolated) {
      if (n.hitCooldown > 0) {
        n.hitCooldown--;
      } else {
        let d = dist(player.x, player.y, n.x, n.y);
        if (d < player.size / 2 + n.size * 0.5) {
          hp = max(0, hp - HP_HIT);
          n.hitCooldown = 18;
        }
      }
    }
  }

  // 노이즈 증식
  if (newNoises.length > 0 && noises.length < maxNoises) {
    noises.push(...newNoises);
  }

  // 종료 조건
  if (hp <= 0 && gameState === "playing") {
    gameState = "gameover";
    endTimer = 0;
    typedChars = 0;
    endingPlayerX = player.x;
    endingPlayerY = player.y;
    playerSize = 25;
    endPause = 0;
    restartDelay = 0;
  }

  if (noises.length >= maxNoises && gameState === "playing") {
    gameState = "clear";
    clearPlayerX = player.x;
    clearPlayerY = player.y;
    clearPlayerAlpha = 255;
    clearPlayerSize = player.size;
    endTimer = 0;
    typedChars = 0;
    endingPlayerX = player.x;
    endingPlayerY = player.y;
    playerSize = 25;
    clearFlashDone = false;
    clearColorT = 0;
    restartDelay = 0;
  }


  // 타겟 및 플레이어 업데이트
  target.update(noiseRatio);
  target.display();

  player.update(isIsolated, noiseRatio);
  player.display(isIsolated);

  // HP바 UI
  drawHPBar();
}

// UI 함수
function drawHPBar() {
  let BAR_X = 20,
    BAR_Y = 16,
    BAR_W = 160,
    BAR_H = 7;
  let filled = hp * BAR_W;

  let r = map(hp, 0, 1, 200, 80);
  let g = map(hp, 0, 1, 60, 160);
  let b = map(hp, 0, 1, 60, 180);

  push();
  rectMode(CORNER);
  noStroke();

  fill(220, 220, 215, 180);
  rect(BAR_X, BAR_Y, BAR_W, BAR_H, 4);

  if (filled > 0) {
    fill(r, g, b, 210);
    rect(BAR_X, BAR_Y, filled, BAR_H, 4);
  }

  noFill();
  stroke(180, 180, 175, 120);
  strokeWeight(0.5);
  rect(BAR_X, BAR_Y, BAR_W, BAR_H, 4);
  pop();
}

// 클래스
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 15;
    this.speed = 4;
  }

  update(isIsolated, noiseRatio) {
    let moved = false;
    let dx = 0;
    let dy = 0;

    // 고립 모드가 아닐 때만 이동 가능
    if (!isIsolated) {
      if (keyIsDown(LEFT_ARROW)) {
        dx -= this.speed;
        moved = true;
      }
      if (keyIsDown(RIGHT_ARROW)) {
        dx += this.speed;
        moved = true;
      }
      if (keyIsDown(UP_ARROW)) {
        dy -= this.speed;
        moved = true;
      }
      if (keyIsDown(DOWN_ARROW)) {
        dy += this.speed;
        moved = true;
      }

      this.x += dx;
      this.y += dy;

      this.x = constrain(this.x, this.size / 2, width - this.size / 2);
      this.y = constrain(this.y, this.size / 2, height - this.size / 2);
    }

    // 움직일 때 노이즈 생성
    if (moved && !isIsolated && noises.length < maxNoises) {
      if (random() < 0.5) {
        let baseSpawnSize = map(noiseRatio, 0, 1, 25, 4);
        let currentSpawnSize = baseSpawnSize * random(0.65, 1.15);

        let minSafeDist = this.size / 2 + currentSpawnSize / 2 + 5;
        let spawnDist = minSafeDist + random(0, 10);

        // 이동 방향의 반대에 노이즈 생성
        let moveAngle = atan2(dy, dx);
        let spawnAngle = moveAngle + PI + random(-HALF_PI, HALF_PI);

        noises.push(
          new NoiseBlock(
            this.x + cos(spawnAngle) * spawnDist,
            this.y + sin(spawnAngle) * spawnDist,
            currentSpawnSize,
            0,
          ),
        );
      }
    }
  }

  display(isIsolated) {
    noStroke();
    fill(120);
    circle(this.x, this.y, this.size);

    if (isIsolated) {
      fill(180, 180, 255, 14);
      circle(this.x, this.y, 60);
    }
  }
}

class NoiseBlock {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.needsRemoval = false;
  }

  update(isIsolated, noiseRatio, newNoises) {
    if (isIsolated) {
      this.x += random(-0.2, 0.2);
      this.y += random(-0.2, 0.2);
      return;
    }

    let jitterBase = map(noiseRatio, 0, 1, 0.5, 2.5);
    this.x += random(-jitterBase, jitterBase);
    this.y += random(-jitterBase, jitterBase);

    let spreadSpeed = map(noiseRatio, 0, 1, 0.001, 0.005);
    if (
      random() < spreadSpeed &&
      noises.length + newNoises.length < maxNoises
    ) {
      newNoises.push(
        new NoiseBlock(
          this.x + random(-this.size * 1.2, this.size * 1.2),
          this.y + random(-this.size * 1.2, this.size * 1.2),
          this.size,
        ),
      );
    }

    // 노이즈 분할
    let idealMaxSize = map(noiseRatio, 0, 1, 35, 6);
    if (this.size > idealMaxSize && this.size > 3) {
      let half = this.size / 2;
      newNoises.push(
        new NoiseBlock(this.x - half / 2, this.y - half / 2, half),
      );
      newNoises.push(
        new NoiseBlock(this.x + half / 2, this.y - half / 2, half),
      );
      newNoises.push(
        new NoiseBlock(this.x - half / 2, this.y + half / 2, half),
      );
      newNoises.push(
        new NoiseBlock(this.x + half / 2, this.y + half / 2, half),
      );
    }
  }

  display(isIsolated) {
    push();
    rectMode(CENTER);
    let flicker = random(0, 20);

    if (isIsolated) {
      fill(50, 40);
    } else {
      fill(flicker, 210);
    }
    noStroke();
    rect(this.x, this.y, this.size, this.size);
    pop();
  }
}

class Target {
  constructor() {
    this.x = random(100, width - 100);
    this.y = random(100, height - 100);
    this.baseSize = 18;
  }

  update(noiseRatio) {
    let d = dist(player.x, player.y, this.x, this.y);
    if (d < map(noiseRatio, 0, 1, 65, 35)) {
      // 플레이어와 부딪히면 비교적 노이즈가 없는 구역을 찾아서 이동
      this.moveToCleanSpot();
    }
    this.currentSize = max(20, this.baseSize * (1 - noiseRatio) * 1.1);
  }

  moveToCleanSpot() {
    let bestX = random(80, width - 80);
    let bestY = random(80, height - 80);
    let minNoiseCount = Infinity;

    for (let i = 0; i < 8; i++) {
      let sampleX = random(80, width - 80);
      let sampleY = random(80, height - 80);
      let noiseCount = 0;
      for (let n of noises) {
        if (dist(sampleX, sampleY, n.x, n.y) < 150) {
          noiseCount++;
        }
      }

      if (noiseCount < minNoiseCount) {
        minNoiseCount = noiseCount;
        bestX = sampleX;
        bestY = sampleY;
      }
    }

    this.x = bestX;
    this.y = bestY;
  }

  display() {
    push();
    let ts = this.currentSize;
    let gr = ts * 2.8;

    for (let r = gr; r > 0; r -= 2) {
      noStroke();
      fill(255, 245, 120, map(r, 0, gr, 60, 0));
      this.drawDiamondShape(this.x, this.y, r * 2);
    }

    fill(255);
    noStroke();
    strokeWeight(0.8);
    this.drawDiamondShape(this.x, this.y, ts * 2);
    pop();
  }

  drawDiamondShape(x, y, s) {
    beginShape();
    vertex(x, y - s / 2);
    vertex(x + s / 2, y);
    vertex(x, y + s / 2);
    vertex(x - s / 2, y);
    endShape(CLOSE);
  }
}

function drawGameOver() {
  noiseSound.amp(0, 1);
  endTimer++;

  if (endTimer < 25) {
    background(0);
    return;
  }

  background(0);

  if (endTimer > 90) {
    fill(255);
    textAlign(LEFT, TOP);
    textSize(height * 0.11);
    typedChars += 0.55;
    let visible = gameOverText.substring(0, floor(typedChars));
    text(visible, width * 0.05, height * 0.08);

    if (typedChars > gameOverText.length + 30) {
      endingTargetX = width * 0.256;
      endingTargetY = height * 0.82;

      endingPlayerX = lerp(endingPlayerX, endingTargetX, 0.04);
      endingPlayerY = lerp(endingPlayerY, endingTargetY, 0.04);

      fill(120);
      circle(endingPlayerX, endingPlayerY, playerSize);

      let d = dist(endingPlayerX, endingPlayerY, endingTargetX, endingTargetY);
      if (d < 5) {
        endPause++;
        if (endPause > 60) {
          playerSize *= 0.97;
        }
      }
    }
  }
  if (typedChars > gameOverText.length + 30) {
    restartDelay++;

    if (restartDelay > 250) {
      push();
      fill(255, 120);
      textSize(16);
      textAlign(RIGHT, BOTTOM);

      text("PRESS R TO RESTART", width - 20, height - 20);

      pop();
    }
  }
}

function drawClear() {
  noiseSound.amp(0, 1);
  endTimer++;

  if (endTimer < 20) {
    background(0);

    fill(120, clearPlayerAlpha);
    circle(clearPlayerX, clearPlayerY, player.size);

    return;
  }

  if (endTimer < 80) {
    let fade = map(endTimer, 20, 80, 0, 255);

    background(fade);

    fill(120, clearPlayerAlpha);
    circle(clearPlayerX, clearPlayerY, player.size);

    return;
  }

  if (endTimer < 310) {
    background(255);

    if (endTimer > 100) {
      clearPlayerAlpha -= 1.5;
    }

    fill(120, clearPlayerAlpha);
    circle(clearPlayerX, clearPlayerY, player.size);

    return;
  }

  background(255);

  fill(0);
  textAlign(LEFT, TOP);
  textSize(height * 0.11);
  typedChars += 0.35;
  let visible = clearText.substring(0, floor(typedChars));
  text(visible, width * 0.05, height * 0.08);

  if (typedChars > clearText.length + 40) {
    endingTargetX = width * 0.285;
    endingTargetY = height * 0.824;

    endingPlayerX = lerp(endingPlayerX, endingTargetX, 0.04);
    endingPlayerY = lerp(endingPlayerY, endingTargetY, 0.04);

    let d = dist(endingPlayerX, endingPlayerY, endingTargetX, endingTargetY);
    if (d < 5) {
      clearColorO = min(clearColorO + 0.01, 1);
    }

    let op1 = lerp(0, 30, clearColorO);
    let op2 = lerp(0, 50, clearColorO);
    let op3 = lerp(0, 80, clearColorO);

    fill(70, 230, 220, op1);
    circle(endingPlayerX, endingPlayerY, playerSize * 2.5);

    fill(70, 230, 220, op2);
    circle(endingPlayerX, endingPlayerY, playerSize * 2);

    fill(70, 230, 220, op3);
    circle(endingPlayerX, endingPlayerY, playerSize * 1.5);

    if (d < 5) {
      clearColorT = min(clearColorT + 0.02, 1);
    }

    let r = lerp(120, 70, clearColorT);
    let g = lerp(120, 230, clearColorT);
    let b = lerp(120, 220, clearColorT);

    fill(r, g, b);
    circle(endingPlayerX, endingPlayerY, playerSize);
  }
  if (typedChars > clearText.length + 40) {
    restartDelay++;

    if (restartDelay > 250) {
      push();
      fill(0, 120);
      textSize(16);
      textAlign(RIGHT, BOTTOM);

      text("PRESS R TO RESTART", width - 20, height - 20);

      pop();
    }
  }
}

function keyPressed() {
  if (gameState === "start" && keyCode === ENTER) {
    userStartAudio();
    bgm.loop();
    bgm.setVolume(0.07);
    gameState = "playing";
  }
  if ((gameState === "gameover" || gameState === "clear") && key === "r") {
    restartGame();
  }
}

function drawStartScreen() {
  background(255);

  fill(0);
  textAlign(CENTER, CENTER);

  textSize(height * 0.08);
  text("THE NOISE", width / 2, height * 0.25);

  textSize(height * 0.03);

  text(
    "ARROW KEYS : MOVE\n\nSPACE : REST IN ISOLATION\n\nFOLLOW THE LIGHT",
    width / 2,
    height * 0.52,
  );

  textSize(height * 0.025);

  text("PRESS ENTER", width / 2, height * 0.82);
}

function restartGame() {
  noises = [];

  hp = 1.0;

  typedChars = 0;
  endTimer = 0;

  player = new Player(width / 2, height / 2);

  target = new Target();

  gameState = "start";
}

function preload() {
  bgm = loadSound("assets/anton_vlasov-ambient-drone-theme-15792.mp3");
}
