
const player = document.getElementById("player");

console.log("Karakter berhasil ditemukan:", player);


let isJumping = false;

let jumpProgress = 0;

const JUMP_DURATION = 600;
const JUMP_HEIGHT = 110;
const PLAYER_GROUND_BOTTOM = 40;


let jumpUpTimer = null;
let jumpDownTimer = null;





function jump() {

    if (isJumping || gameOver) {
        return;
    }

    isJumping = true;
    soundJump();

    jumpProgress = 0;

    player.classList.remove(
        "running",
        "sliding",
        "paused"
    );

    player.style.transition = "none";

    gameStatus.textContent = "JUMPING";
}


function updateJump(deltaMs) {

    if (!isJumping) {
        return;
    }

    jumpProgress += deltaMs;

    const progress = Math.min(
        jumpProgress / JUMP_DURATION,
        1
    );

    // Kurva lompatan: naik lalu turun
    const jumpOffset =
        Math.sin(progress * Math.PI) * JUMP_HEIGHT;

    player.style.bottom =
        (PLAYER_GROUND_BOTTOM + jumpOffset) + "px";

    // Jika lompatan selesai
    if (progress >= 1) {

        isJumping = false;
        jumpProgress = 0;

        player.style.bottom =
            PLAYER_GROUND_BOTTOM + "px";

        if (currentGesture === "RUN") {

            setGameState("RUN");

        } else if (currentGesture === "SLIDE") {

            setGameState("SLIDE");

        } else if (currentGesture === "JUMP") {

            gameStatus.textContent = "READY";

        } else {

            setGameState("PAUSE");
        }
    }
}




// Mengambil elemen HTML
const webcam = document.getElementById("webcam");

const startCameraButton =
    document.getElementById("start-camera");

const cameraStatus =
    document.getElementById("camera-status");

// Fungsi mengaktifkan kamera
async function startCamera() {
    if (webcam.srcObject && webcam.readyState >= 2) {
        return true;
    }

    try {
        cameraStatus.textContent = "Mengaktifkan kamera...";
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });
        webcam.srcObject = stream;
        await webcam.play();
        startHandDetection();
        cameraStatus.textContent = "Kamera berhasil diaktifkan!";
        cameraStatus.style.color = "#42f5d1";
        startCameraButton.textContent = "Kamera Aktif";
        startCameraButton.disabled = true;
        return true;
    } catch (error) {
        console.error("Error kamera:", error);
        cameraStatus.textContent = "Gagal mengaktifkan kamera. Periksa izin webcam.";
        cameraStatus.style.color = "#ff4757";
        return false;
    }
}

// Event ketika tombol diklik
startCameraButton.addEventListener(
    "click",
    startCamera
);


// =================================
// COMPUTER VISION - MEDIAPIPE HANDS
// =================================

// Mengambil canvas dari HTML
const handCanvas =
    document.getElementById("hand-canvas");

const canvasCtx =
    handCanvas.getContext("2d");

const handStatus =
    document.getElementById("hand-status");

// Membuat objek MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

// Konfigurasi MediaPipe
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

// Fungsi menerima hasil deteksi
function onHandResults(results) {

    handCanvas.width = webcam.videoWidth;
    handCanvas.height = webcam.videoHeight;

    canvasCtx.clearRect(
        0,
        0,
        handCanvas.width,
        handCanvas.height
    );

    if (
        results.multiHandLandmarks &&
        results.multiHandLandmarks.length > 0
    ) {

        const landmarks =
            results.multiHandLandmarks[0];

        // Mengenali gestur tangan
        const gesture = recognizeGesture(landmarks);


        // Kontrol karakter dari gestur tangan
        if (gesture !== currentGesture) {

            currentGesture = gesture;
            updatePauseDisplay();

            if (gesture === "RUN") {

                setGameState("RUN");

            } else if (gesture === "JUMP") {

                setGameState("JUMP");

            } else if (gesture === "SLIDE") {

                setGameState("SLIDE");

            } else {

                setGameState("PAUSE");

            }
        }


        // Menampilkan jenis gestur
        const gestureName =
            document.getElementById("gesture-name");

        const gestureAction =
            document.getElementById("gesture-action");

        gestureName.textContent = gesture;

        if (gesture === "RUN") {

            gestureAction.textContent =
                "Tangan mengepal - RUN";

        } else if (gesture === "JUMP") {

            gestureAction.textContent =
                "Telapak terbuka - JUMP";

        } else if (gesture === "SLIDE") {

            gestureAction.textContent =
                "Dua jari - SLIDE";

        } else {

            gestureAction.textContent =
                "Gesture tidak dikenali";
        }

        // Menggambar garis tangan
        drawConnectors(
            canvasCtx,
            landmarks,
            HAND_CONNECTIONS,
            {
                color: "#00FF00",
                lineWidth: 3
            }
        );

        // Menggambar titik tangan
        drawLandmarks(
            canvasCtx,
            landmarks,
            {
                color: "#FF0000",
                lineWidth: 1,
                radius: 4
            }
        );

        handStatus.textContent =
            "Tangan Terdeteksi!";

        handStatus.style.color =
            "#42f5d1";

    } else {

        handStatus.textContent =
            "Tidak Ada Tangan";

        handStatus.style.color =
            "#ff4757";

        document.getElementById(
            "gesture-name"
        ).textContent = "NO HAND";

        document.getElementById(
            "gesture-action"
        ).textContent = "PAUSE";


        // Hentikan permainan jika tangan hilang
        if (currentGesture !== "NO HAND") {

            currentGesture = "NO HAND";

            setGameState("PAUSE");
        }

    }
}

// Menghubungkan hasil ke fungsi
hands.onResults(onHandResults);


// =================================
// LOOP DETEKSI VIDEO
// =================================

let isDetecting = false;
let handLoopRunning = false;

async function detectHands() {

    if (!handLoopRunning) {
        return;
    }

    if (
        webcam.readyState >= 2 &&
        !isDetecting
    ) {

        isDetecting = true;

        try {

            await hands.send({
                image: webcam
            });

        } catch (error) {

            console.error(
                "Kesalahan deteksi tangan:",
                error
            );

            handStatus.textContent =
                "Deteksi tangan mengalami kesalahan";

        } finally {

            isDetecting = false;
        }
    }

    if (handLoopRunning) {
        requestAnimationFrame(detectHands);
    }
}

function startHandDetection() {

    if (handLoopRunning) {
        return;
    }

    handLoopRunning = true;

    detectHands();
}


// ======================================
// KLASIFIKASI GESTUR TANGAN
// ======================================

// Menghitung jarak antara dua titik
function calculateDistance(point1, point2) {

    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;

    return Math.sqrt(dx * dx + dy * dy);
}

// Memeriksa apakah satu jari terbuka
function isFingerOpen(landmarks, tip, pip) {

    const wrist = landmarks[0];

    const tipDistance =
        calculateDistance(landmarks[tip], wrist);

    const pipDistance =
        calculateDistance(landmarks[pip], wrist);

    return tipDistance > pipDistance * 1.1;
}

// Mengenali gestur dari posisi jari
function recognizeGesture(landmarks) {

    const indexOpen =
        isFingerOpen(landmarks, 8, 6);

    const middleOpen =
        isFingerOpen(landmarks, 12, 10);

    const ringOpen =
        isFingerOpen(landmarks, 16, 14);

    const pinkyOpen =
        isFingerOpen(landmarks, 20, 18);

    const openCount = [
        indexOpen,
        middleOpen,
        ringOpen,
        pinkyOpen
    ].filter(Boolean).length;

    // Dua jari: telunjuk dan tengah
    if (
        indexOpen &&
        middleOpen &&
        !ringOpen &&
        !pinkyOpen
    ) {
        return "SLIDE";
    }

    // Empat jari terbuka
    if (openCount === 4) {
        return "JUMP";
    }

    // Empat jari tertutup
    if (openCount === 0) {
        return "RUN";
    }

    // Gestur belum dikenali
    return "UNKNOWN";
}


// ====================================
// KONTROL GAME DENGAN COMPUTER VISION
// ====================================

const gameStatus =
    document.getElementById("game-status");

let currentGesture = "NO HAND";
let gameState = "PAUSE";


// Status apakah permainan sudah dimulai
let gameStarted = false;

// Elemen menu utama
const mainMenu =
    document.getElementById("main-menu");

const playButton =
    document.getElementById("play-button");

// Fungsi memulai permainan
async function startGame() {
    if (gameStarted || gameOver || playButton.disabled) return;

    playButton.disabled = true;
    playButton.textContent = "MENYIAPKAN KAMERA...";
    const cameraReady = await startCamera();
    if (!cameraReady) {
        playButton.disabled = false;
        playButton.textContent = "▶ MULAI GAME";
        return;
    }

    gameStarted = true;
    initAudio();
    soundStart();
    mainMenu.classList.add("hidden");
    setGameState(currentGesture === "UNKNOWN" || currentGesture === "NO HAND"
        ? "PAUSE" : currentGesture);
    updatePauseDisplay();
    playButton.disabled = false;
    playButton.textContent = "▶ MULAI GAME";
    console.log("Game dimulai!");
}

// Tombol untuk memulai permainan
playButton.addEventListener(
    "click",
    startGame
);



const gameArea = document.getElementById("game-area");


function updatePauseDisplay() {

    const isPaused =
        gameStarted &&
        !gameOver &&
        (
            currentGesture === "NO HAND" ||
            currentGesture === "UNKNOWN"
        );

    gameArea.classList.toggle(
        "is-paused",
        isPaused
    );
}



// Mengubah keadaan karakter

function setGameState(state) {

    if (gameOver) {
        return;
    }


    if (!gameStarted) {
        return;
    }


    gameState = state;

    // Jangan mengganggu animasi lompatan
    if (isJumping) {
        return;
    }

    player.classList.remove(
        "running",
        "sliding",
        "paused"
    );

    if (state === "RUN") {

        player.classList.add("running");
        gameStatus.textContent = "RUNNING";

    } else if (state === "JUMP") {

        gameStatus.textContent = "JUMPING";
        jump();

    } else if (state === "SLIDE") {

        player.classList.add("sliding");
        gameStatus.textContent = "SLIDING";

    } else {

        player.classList.add("paused");
        gameStatus.textContent = "GAME PAUSED";
    }
}



// ==================================
// SISTEM RINTANGAN DAN SKOR
// ==================================

const obstacle =
    document.getElementById("obstacle");

const scoreElement =
    document.getElementById("score");

let score = 0;
let obstacleX = 0;


// Variabel sistem koin
const coin = document.getElementById("coin");

const coinCountElement =
    document.getElementById("coin-count");

const levelElement =
    document.getElementById("level");

let coinX = 0;
let coinCount = 0;
let level = 1;
let coinActive = true;

const COIN_BONUS = 10;


let obstacleSpeed = 4;
let gameOver = false;

let lastFrameTime = 0;

// Mengembalikan rintangan ke kanan

let obstacleType = "JUMP";

function resetObstacle() {

    const gameArea =
        document.getElementById("game-area");

    // Pilih jenis rintangan secara acak
    obstacleType =
        Math.random() < 0.5 ? "JUMP" : "SLIDE";

    // Hapus class sebelumnya
    obstacle.classList.remove(
        "obstacle-jump",
        "obstacle-slide"
    );

    // Tentukan jenis rintangan
    if (obstacleType === "JUMP") {

        obstacle.classList.add("obstacle-jump");

    } else {

        obstacle.classList.add("obstacle-slide");
    }

    // Kembalikan ke kanan arena
    obstacleX = gameArea.clientWidth + 40;

    obstacle.style.left = obstacleX + "px";
}


// Mengecek tabrakan dua elemen
function isColliding(element1, element2) {

    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    return (
        rect1.left < rect2.right &&
        rect1.right > rect2.left &&
        rect1.top < rect2.bottom &&
        rect1.bottom > rect2.top
    );
}

// Mengakhiri permainan

function endGame() {

    if (gameOver) {
        return;
    }

    gameOver = true;
    soundGameOver();

    isJumping = false;
    jumpProgress = 0;
    gameState = "GAME_OVER";

    player.classList.remove(
        "running",
        "sliding"
    );

    player.classList.add("paused");

    gameStatus.textContent =
        "GAME OVER - PRESS R";

    gameStatus.classList.add("game-over");

    console.log("Game Over! Skor:", Math.floor(score));
}


// Loop utama game
function gameLoop(timestamp) {

    if (!lastFrameTime) {
        lastFrameTime = timestamp;
    }

    const deltaTime = Math.min(
        (timestamp - lastFrameTime) / 16.67,
        2
    );

    lastFrameTime = timestamp;


    // Delta waktu dalam milidetik
    const deltaMs = deltaTime * 16.67;


    // Game hanya berjalan saat gestur valid

    if (
        gameStarted &&
        !gameOver &&
        (
            currentGesture === "RUN" ||
            currentGesture === "JUMP" ||
            currentGesture === "SLIDE"
        )
    ) {



        if (
            !gameOver &&
            (
                currentGesture === "RUN" ||
                currentGesture === "JUMP" ||
                currentGesture === "SLIDE"
            )
        ) {

            // Perbarui lompatan hanya saat game berjalan
            updateJump(deltaMs);

            // Kode gerakan rintangan,
            // skor, koin, dan tabrakan
            // tetap berada di bawahnya.
        }


        // Gerakkan rintangan ke kiri
        obstacleX -= obstacleSpeed * deltaTime;

        obstacle.style.left = obstacleX + "px";

        // Hitung skor selama permainan
        score += 0.1 * deltaTime;


        // =================================
        // LEVEL DAN KESULITAN
        // =================================

        // Naik level setiap 100 poin
        level = Math.floor(score / 100) + 1;

        // Batasi kecepatan maksimal
        obstacleSpeed = Math.min(
            4 + (level - 1) * 0.5,
            9
        );

        // Perbarui level di layar
        levelElement.textContent = level;


        scoreElement.textContent =
            Math.floor(score);


        // =================================
        // GERAKAN DAN KOLEKSI KOIN
        // =================================

        // Koin bergerak ke kiri
        coinX -= obstacleSpeed * deltaTime;

        coin.style.left = coinX + "px";

        // Periksa apakah pemain mengambil koin
        if (
            coinActive &&
            isColliding(player, coin)
        ) {

            coinCount++;
            soundCoin();

            score += COIN_BONUS;

            coinCountElement.textContent = coinCount;

            coinActive = false;
            coin.style.display = "none";

            // Siapkan koin berikutnya
            resetCoin();
        }

        // Jika koin terlewat
        if (coinX < -40) {

            resetCoin();
        }

        // Perbarui skor setelah mendapat bonus
        scoreElement.textContent =
            Math.floor(score);


        // Rintangan keluar layar
        if (obstacleX < -50) {

            resetObstacle();
        }

        // Periksa tabrakan
        if (isColliding(player, obstacle)) {

            endGame();
        }
    }

    requestAnimationFrame(gameLoop);
}

// Memulai posisi rintangan
resetObstacle();

// Menjalankan game loop
requestAnimationFrame(gameLoop);


// ==================================
// RESTART GAME
// ==================================


function restartGame() {


    initAudio();
    soundRestart();

    // 1. Reset status permainan
    gameOver = false;

    gameStarted = true;
    mainMenu.classList.add("hidden");

    gameState = "PAUSE";
    currentGesture = "NO HAND";
    updatePauseDisplay();

    // 2. Reset skor
    score = 0;
    scoreElement.textContent = "0";

    // 3. Reset koin
    coinCount = 0;
    coinCountElement.textContent = "0";
    coinActive = true;

    // 4. Reset level dan kecepatan
    level = 1;
    levelElement.textContent = "1";
    obstacleSpeed = 4;

    // 5. Reset posisi rintangan dan koin
    resetObstacle();
    resetCoin();

    updatePauseDisplay();

    // 6. Reset tampilan karakter
    player.classList.remove(
        "running",
        "sliding",
        "paused"
    );

    player.style.transition = "none";
    player.style.bottom = "40px";

    isJumping = false;
    jumpProgress = 0;

    player.style.transition = "none";
    player.style.bottom = PLAYER_GROUND_BOTTOM + "px";

    // 7. Reset tampilan Game Over
    gameStatus.classList.remove("game-over");

    gameStatus.textContent = "GAME PAUSED";

    player.classList.add("paused");

    // 8. Reset waktu game loop
    lastFrameTime = 0;

    console.log("Game berhasil di-restart!");
}


// Tombol R untuk restart
document.addEventListener("keydown", function (event) {

    if (
        event.code === "KeyR" &&
        gameOver
    ) {
        restartGame();
    }

});


// =================================
// POSISI DAN RESET KOIN
// =================================

function resetCoin() {

    const gameArea =
        document.getElementById("game-area");

    coinX = gameArea.clientWidth + 200;

    coinActive = true;

    coin.style.display = "block";
    coin.style.left = coinX + "px";
}

// Jalankan setelah fungsi dibuat
resetCoin();


// ======================================
// TAHAP 13 - SISTEM AUDIO GAME
// ======================================

let audioContext = null;

// Mengaktifkan sistem audio browser
function initAudio() {

    if (!audioContext) {
        audioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}

// Membuat suara menggunakan frekuensi
function playTone(
    frequency,
    duration,
    type = "sine",
    volume = 0.1
) {

    if (!audioContext ||
        audioContext.state !== "running") {
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
        frequency,
        audioContext.currentTime
    );

    gainNode.gain.setValueAtTime(
        volume,
        audioContext.currentTime
    );

    gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(
        audioContext.currentTime + duration
    );
}


// ======================================
// EFEK SUARA PERMAINAN
// ======================================

// Suara saat game dimulai
function soundStart() {
    playTone(440, 0.15, "sine", 0.08);

    setTimeout(() => {
        playTone(660, 0.2, "sine", 0.08);
    }, 150);
}

// Suara kucing melompat
function soundJump() {
    playTone(550, 0.18, "triangle", 0.07);
}

// Suara mengambil koin
function soundCoin() {
    playTone(880, 0.12, "sine", 0.08);

    setTimeout(() => {
        playTone(1200, 0.18, "sine", 0.08);
    }, 100);
}

// Suara saat Game Over
function soundGameOver() {
    playTone(330, 0.3, "sawtooth", 0.04);

    setTimeout(() => {
        playTone(180, 0.4, "sawtooth", 0.04);
    }, 200);
}

// Suara restart
function soundRestart() {
    playTone(520, 0.15, "triangle", 0.07);
}
