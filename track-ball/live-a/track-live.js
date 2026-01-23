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

const detectorSelect = document.getElementById("model");
const retCanvas = document.querySelector('canvas');
const retCtx = retCanvas.getContext('2d');
const frameSlider = document.querySelector('#frameSlider');

let detector = null;
let isLive = false;           
let currentAnalysisId = 0;    

const MAX_HISTORY = 90; 
let frameQueue = []; // { bitmap: ImageBitmap, result: { bbox, confidence, ... } }

/**
 * 1. 촬영 및 수집 루프
 */
async function liveLoop() {
    if (!isLive) return;

    if (webcam.video.videoWidth > 0) {
        if (retCanvas.width !== webcam.video.videoWidth) {
            retCanvas.width = webcam.video.videoWidth;
            retCanvas.height = webcam.video.videoHeight;
        }
        retCtx.drawImage(webcam.video, 0, 0, retCanvas.width, retCanvas.height);

        const bitmap = await createImageBitmap(webcam.video);
        frameQueue.push({ bitmap, result: null });

        if (frameQueue.length > MAX_HISTORY) {
            const old = frameQueue.shift();
            if (old.bitmap) old.bitmap.close();
        }
    }
    requestAnimationFrame(liveLoop);
}

/**
 * 2. 백그라운드 분석 루프
 */
async function runBackgroundAnalysis(analysisId) {
    for (let i = 0; i < frameQueue.length; i++) {
        if (analysisId !== currentAnalysisId) return;

        const frame = frameQueue[i];
        if (!frame.result) {
            try {
                const result = await detector.process(frame.bitmap);
                if (result && result.bbox) {
                    frame.result = result;
                    // 현재 사용자가 보고 있는 프레임이라면 즉시 갱신
                    if (!isLive && parseInt(frameSlider.value) === i) {
                        updateFrameBySlider();
                    }
                }
            } catch (e) { console.error("Analysis Error:", e); }
        }
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}

/**
 * 3. [개선] 즉석 물리 계산 로직
 */
function calculateMetricsOnTheFly(idx) {
    const fps = 30;
    const currentFrame = frameQueue[idx];
    
    if (!currentFrame || !currentFrame.result || !currentFrame.result.bbox) return null;

    // 직전 혹은 이웃한 프레임 중 분석 완료된 것 탐색 (양방향 5프레임 이내)
    let refFrame = null;
    let gap = 0;

    // 우선 순위: 직전 프레임 -> 이후 프레임
    for (let offset of [-1, 1, -2, 2, -3, 3]) {
        let checkIdx = idx + offset;
        if (checkIdx >= 0 && checkIdx < frameQueue.length) {
            if (frameQueue[checkIdx].result && frameQueue[checkIdx].result.bbox) {
                refFrame = frameQueue[checkIdx];
                gap = offset;
                break;
            }
        }
    }

    if (refFrame) {
        try {
            const isPast = gap < 0;
            const v1 = isPast ? refFrame.result : currentFrame.result;
            const v2 = isPast ? currentFrame.result : refFrame.result;
            const timeStep = fps / Math.abs(gap);

            // velocity.js 호출
            const speed = Calc.calcVelocity(v1, v2, timeStep);
            const angle = Calc.calcAngle(v1, v2);

            // 유효성 검사: NaN이나 null이 반환될 경우 방어
            if (speed === null || isNaN(speed) || !isFinite(speed)) {
                return { speed: "N/A", angle: "0" };
            }

            return { 
                speed: parseFloat(speed).toFixed(1), 
                angle: parseFloat(angle).toFixed(1) 
            };
        } catch (err) {
            console.error("Metric Calc Failure:", err);
            return null;
        }
    }
    return null;
}

/**
 * 4. 슬라이더 기반 렌더링
 */
function updateFrameBySlider() {
    if (isLive || frameQueue.length === 0) return;

    const idx = parseInt(frameSlider.value);
    const frame = frameQueue[idx];

    if (frame && frame.bitmap) {
        retCtx.drawImage(frame.bitmap, 0, 0, retCanvas.width, retCanvas.height);

        if (frame.result && frame.result.bbox) {
            const metrics = calculateMetricsOnTheFly(idx);
            drawOverlay(frame.result, metrics);
        } else {
            drawStatusOverlay(`Frame ${idx}: 분석 대기 중...`);
        }
    }
}

/**
 * 5. 시각화
 */
function drawOverlay(result, metrics) {
    const [x, y, w, h] = result.bbox;
    
    // 박스는 무조건 그림
    retCtx.strokeStyle = "#00FF00";
    retCtx.lineWidth = 3;
    retCtx.strokeRect(x, y, w, h);
    
    // 수치 표시
    if (metrics) {
        retCtx.fillStyle = "yellow";
        retCtx.font = "bold 22px Arial";
        const txt = metrics.speed === "N/A" ? "Calculating..." : `${metrics.speed} km/h`;
        retCtx.fillText(txt, x, y - 10);
    } else {
        retCtx.fillStyle = "#00FF00";
        retCtx.font = "14px Arial";
        retCtx.fillText("Object Tracking...", x, y - 10);
    }
}

function drawStatusOverlay(text) {
    retCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
    retCtx.fillRect(10, 10, 200, 35);
    retCtx.fillStyle = "white";
    retCtx.font = "16px Arial";
    retCtx.fillText(text, 20, 33);
}

// 이벤트 리스너
frameSlider.addEventListener('input', updateFrameBySlider);

retCanvas.addEventListener('click', async () => {
    if (isLive) {
        isLive = false;
        document.querySelector('nav').classList.remove("hidden");
        const slider = document.querySelector('.slider');
        if (slider) slider.style.display = "block";
        webcam.stopCamera();
        if (frameQueue.length > 0) {
            frameSlider.max = frameQueue.length - 1;
            frameSlider.value = 0;
            updateFrameBySlider();
        }
        runBackgroundAnalysis(currentAnalysisId);
    } else {
        currentAnalysisId++;
        frameQueue.forEach(f => f.bitmap && f.bitmap.close());
        frameQueue = [];
        frameSlider.value = 0;
        frameSlider.max = 0;
        
        detector = detectors[detectorSelect.value];
        await detector.initialize();
        isLive = true;
        document.querySelector('nav').classList.add("hidden");
        const slider = document.querySelector('.slider');
        if (slider) slider.style.display = "none";
        await webcam.startCamera();
        liveLoop();
    }
});