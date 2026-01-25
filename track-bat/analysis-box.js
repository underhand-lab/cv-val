import * as FrameMaker from '../src/cv-val/track-ball/frame-maker/index.js';
import * as Analysis from "../src/cv-val/track-ball/calc/analysis.js";
import { BoxList } from "../src/easy-h/ui/box-list.js";

let frameMakers = [];
let processedData = null;

let targetCanvas = null;

const confInput = document.getElementById('confInput');
confInput.addEventListener('change', () => {
    updateImage();
});

const slider = document.getElementById('frameSlider');
slider.max = 0;

function nowIdx() {
    return parseInt(slider.value, 10);
}
// 마스크 전용 임시 캔버스 생성 (한 번만 생성해서 재사용)
const maskOffscreen = document.createElement('canvas');
const maskCtx = maskOffscreen.getContext('2d');

// 마스크를 누적할 버퍼 데이터를 처리하는 함수로 변경
function applyMaskToBuffer(pixelData, currentMaskMap, threshold, color, canvasW, canvasH) {
    if (!currentMaskMap || currentMaskMap.length === 0) return;

    const maskH = currentMaskMap.length;
    const maskW = currentMaskMap[0].length;
    const thresh = parseFloat(threshold);

    // 가로/세로 스케일링 비율 미리 계산
    const scaleY = maskH / canvasH;
    const scaleX = maskW / canvasW;

    for (let y = 0; y < canvasH; y++) {
        const my = Math.floor(y * scaleY);
        const row = currentMaskMap[my];
        if (!row) continue;

        for (let x = 0; x < canvasW; x++) {
            const mx = Math.floor(x * scaleX);
            const prob = row[mx];

            if (prob >= thresh) {
                const pixelIdx = (y * canvasW + x) * 4;
                
                // [데이터 변경 지점] 버퍼에 직접 색상 적용 (나중에 그릴 데이터)
                // 여러 마스크가 겹칠 경우 마지막 마스크 색상이 우선됨
                pixelData[pixelIdx] = color[0];     // R
                pixelData[pixelIdx + 1] = color[1]; // G
                pixelData[pixelIdx + 2] = color[2]; // B
                pixelData[pixelIdx + 3] = color[3]; // A
            }
        }
    }
}

// 업데이트 함수
function updateImage() {
    if (!processedData || !targetCanvas) return;
    
    const img = processedData.getRawImgList(0)[nowIdx()];
    if (!img) return;

    const canvasW = 640;
    const canvasH = 640;
    targetCanvas.width = canvasW;
    targetCanvas.height = canvasH;
    const ctx = targetCanvas.getContext('2d');

    // 1. 원본 이미지를 먼저 그립니다.
    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    // 2. 캔버스 크기의 투명한 ImageData 객체(데이터 버퍼)를 생성합니다.
    const maskImageData = ctx.createImageData(canvasW, canvasH);
    const pixelBuffer = maskImageData.data; // Uint8ClampedArray (RGBA)

    const trailLength = 15;
    const threshold = parseFloat(confInput.value);

    // 3. 이전 프레임들의 마스크 데이터를 버퍼에 누적 (데이터 조작)
    const startIdx = Math.max(0, nowIdx() - trailLength);
    for (let i = startIdx; i < nowIdx(); i++) {
        const batData = processedData.getBatList()[i];
        if (batData && batData.maskConfidenceMap) {
            // 잔상은 초록색으로 데이터 기록
            applyMaskToBuffer(pixelBuffer, batData.maskConfidenceMap, threshold, [0, 255, 0, 100], canvasW, canvasH);
        }
    }

    // 4. 현재 프레임의 마스크 데이터를 버퍼에 기록
    const nowBat = processedData.getBatList()[nowIdx()];
    if (nowBat && nowBat.maskConfidenceMap) {
        // 현재 위치는 주황색으로 데이터 기록
        applyMaskToBuffer(pixelBuffer, nowBat.maskConfidenceMap, threshold, [255, 128, 0, 150], canvasW, canvasH);
    }

    // 5. [최종 단계] 가공된 데이터(버퍼)를 캔버스에 한 번에 적용합니다.
    // 별도의 임시 캔버스 생성 없이 직접 그리되, 
    // 투명도가 있는 ImageData이므로 putImageData 대신 임시 캔버스를 이용해 drawImage로 덮어씌웁니다.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasW;
    tempCanvas.height = canvasH;
    tempCanvas.getContext('2d').putImageData(maskImageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);
}

slider.addEventListener('input', updateImage);

function setData(data) {

    if (data == null) return;

    processedData = data;
    
    console.log(data);

    const frameCount = processedData.getFrameCnt();
    slider.max = frameCount > 0 ? frameCount - 1 : 0;

    updateImage();

    return;

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].setData(data);
    }


}

const analysisSelect = document.getElementById('analysis')

const addVideoBoxBtn = document.getElementById('add-video-box-button');
const addTableBoxBtn = document.getElementById('add-table-box-button');

const boxList = new BoxList(document.getElementById("boxes"));

function addToolDefault(src, frameMaker, func, toBottom = true) {
    return new Promise((resolve, reject) => {
        boxList.addBoxTemplate(src, () => {
            //frameMakers = frameMakers.filter(fm => fm !== frameMaker);
    
        }, (box) => {
            box.className = 'container neumorphism';
            func(box);
            resolve();
        });
    });

}

function addTool(src, frameMaker, func) {
    addToolDefault(src, frameMaker, func).then(() => {
        analysisSelect.closeAction();
        let bottom = document.body.scrollHeight;
        window.scrollTo({ top: bottom, left: 0, behavior: 'smooth' })

    });
}

addVideoBoxBtn.addEventListener('click', () => {
    console.log("add");
    addTool("../template/video.html", null,
        (box) => {
            targetCanvas = box.querySelectorAll("canvas")[0];

        });

});

addToolDefault("../template/video.html", null,
    (box) => {
        targetCanvas = box.querySelectorAll("canvas")[0];
        
    });


export { setData }