import * as webcam from "../../src/web-cam/web-cam.js";
import * as BallDetector from '../../src/cv-val/track/ball-detector/index.js';
import * as Calc from "../../src/cv-val/track/calc/velocity.js";

const detectors = {
    "yolo11x": new BallDetector.YOLOLiveBallDetector("../../external/models/yolo11/yolo11x_web_model/model.json"),
    "yolo11l": new BallDetector.YOLOLiveBallDetector("../../external/models/yolo11/yolo11l_web_model/model.json"),
    "yolo11m": new BallDetector.YOLOLiveBallDetector("../../external/models/yolo11/yolo11m_web_model/model.json"),
    "yolo11s": new BallDetector.YOLOLiveBallDetector("../../external/models/yolo11/yolo11s_web_model/model.json"),
    "yolo11n": new BallDetector.YOLOLiveBallDetector("../../external/models/yolo11/yolo11n_web_model/model.json")
}

// --- 설정 및 상태 변수 ---
const detectorSelect = document.getElementById("model");
const confInput = document.querySelector('#confInput');
const retCanvas = document.querySelector('canvas');
const retCtx = retCanvas.getContext('2d');

let detector = null;
let isPlay = false;
let isAnalyzing = false;

// 실시간 데이터 저장소
let currentResult = null;   // 화면 표시용 최신 박스
let lastResult = null;      // 물리 계산용 직전 프레임 데이터
let lastTimestamp = 0;      // FPS 역산을 위한 시간 기록
let ballMetrics = { speed: 0, angle: 0 }; 
let confValue = 0.5;

/**
 * 1. 결과 시각화 함수 (박스 + 수치)
 */
function drawOverlay(result, metrics) {
    if (!result || result.confidence < confValue) return;

    const [x, y, w, h] = result.bbox;
    
    // 박스 그리기
    retCtx.strokeStyle = "#00FF00";
    retCtx.lineWidth = 3;
    retCtx.strokeRect(x, y, w, h);

    // 정보 텍스트 배경
    retCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
    retCtx.fillRect(x, y - 45, 150, 40);

    // 정보 텍스트 (신뢰도, 속도, 각도)
    retCtx.fillStyle = "#00FF00";
    retCtx.font = "16px Arial";
    retCtx.fillText(`Conf: ${Math.round(result.confidence * 100)}%`, x + 5, y - 28);
    retCtx.fillStyle = "yellow";
    retCtx.fillText(`Speed: ${metrics.speed} km/h`, x + 5, y - 10);
}

/**
 * 2. 메인 렌더링 루프 (영상 재생 및 오버레이)
 */
async function processLoop() {
    if (!isPlay) return;

    if (webcam.video.videoWidth > 0) {
        // 캔버스 크기 동기화
        if (retCanvas.width !== webcam.video.videoWidth) {
            retCanvas.width = webcam.video.videoWidth;
            retCanvas.height = webcam.video.videoHeight;
        }

        // [STEP 1] 배경 영상 그리기
        retCtx.drawImage(webcam.video, 0, 0, retCanvas.width, retCanvas.height);

        // [STEP 2] 최신 결과가 있다면 그 위에 덮어쓰기
        if (currentResult) {
            drawOverlay(currentResult, ballMetrics);
        }

        // [STEP 3] 분석이 끝나면 즉시 다음 분석 요청
        if (!isAnalyzing) {
            runAnalysis(webcam.video);
        }
    }

    requestAnimationFrame(processLoop);
}

/**
 * 3. 비동기 분석 및 물리 법칙 계산
 */
async function runAnalysis(videoElement) {
    isAnalyzing = true;
    const now = performance.now();

    try {
        const result = await detector.process(videoElement);
        
        if (result) {
            // [물리 계산] 이전 데이터가 있을 때만 수행
            if (lastResult && lastTimestamp > 0) {
                // 실제 프레임 간 시간 간격 계산 (초 단위)
                const deltaT = (now - lastTimestamp) / 1000;
                const actualFps = 1 / deltaT;

                // 속도 및 각도 계산
                const speed = Calc.calcVelocity(lastResult, result, actualFps);
                const angle = Calc.calcAngle(lastResult, result);

                if (speed !== null) ballMetrics.speed = speed.toFixed(1);
                if (angle !== null) ballMetrics.angle = angle.toFixed(1);
            }
            
            // 데이터 업데이트
            lastResult = result;
            lastTimestamp = now;
            currentResult = result;
        } else {
            // 공을 놓쳤을 때 연속성 끊기
            lastResult = null;
            lastTimestamp = 0;
            // currentResult = null; // 필요 시 주석 해제 (공이 없으면 박스 즉시 제거)
        }
    } catch (err) {
        console.error("분석 중 에러:", err);
    }
    
    isAnalyzing = false;
}

/**
 * 4. 이벤트 리스너 및 초기화
 */
retCanvas.addEventListener('click', async () => {
    if (isPlay) {
        // 중지 로직
        isPlay = false;
        document.querySelector('nav').classList.remove("hidden");
        const slider = document.querySelector('.slider');
        if (slider) slider.style.display = "block";
        
        webcam.stopCamera();
        currentResult = null;
        lastResult = null;
    } else {
        // 시작 로직
        isPlay = true;
        document.querySelector('nav').classList.add("hidden");
        const slider = document.querySelector('.slider');
        if (slider) slider.style.display = "none";

        // 슬라이더 값 반영
        confValue = parseFloat(confInput.value) || 0.5;
        
        // 선택된 모델 초기화
        detector = detectors[detectorSelect.value];
        console.log("선택된 모델 초기화 중:", detectorSelect.value);
        
        await detector.initialize();
        await webcam.startCamera();
        
        lastTimestamp = performance.now(); // 시간 측정 시작
        processLoop(); 
    }
});

// 페이지 이탈 시 카메라 종료
window.addEventListener('beforeunload', () => {
    if (isPlay) webcam.stopCamera();
});