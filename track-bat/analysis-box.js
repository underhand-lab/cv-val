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

function drawMask(currentMaskMap, threshold) {
    if (!currentMaskMap || currentMaskMap.length === 0) return;

    const ctx = targetCanvas.getContext('2d');
    const canvasW = targetCanvas.width;   // 640
    const canvasH = targetCanvas.height;  // 640

    // [중요] 마스크 데이터의 실제 크기를 여기서 측정합니다.
    const maskH = currentMaskMap.length;
    const maskW = currentMaskMap[0].length;

    const imageData = ctx.createImageData(canvasW, canvasH);
    const data = imageData.data;

    // 숫자로 확실히 변환
    const thresh = parseFloat(threshold);

    for (let y = 0; y < canvasH; y++) {
        for (let x = 0; x < canvasW; x++) {
            
            // 640 좌표를 마스크의 좌표(160)로 스케일링
            const my = Math.floor((y / canvasH) * maskH);
            const mx = Math.floor((x / canvasW) * maskW);

            // 데이터 접근
            const prob = currentMaskMap[my][mx];
            const pixelIdx = (y * canvasW + x) * 4;

            if (prob >= thresh) {
                data[pixelIdx] = 0;     // R
                data[pixelIdx + 1] = 255; // G (형광 초록)
                data[pixelIdx + 2] = 0;   // B
                data[pixelIdx + 3] = 180; // A (반투명)
            } else {
                data[pixelIdx + 3] = 0; // 배경 투명
            }
        }
    }

    // 임시 캔버스에 그려서 원본 이미지 위에 합성 (이미지 덮어씌움 방지)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasW;
    tempCanvas.height = canvasH;
    tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);
}

// 업데이트 함수
function updateImage() {
    if (!processedData) return;
    
    const img = processedData.getRawImgList(0)[nowIdx()];
    if (!img) return;

    // 화면 캔버스 설정
    targetCanvas.width = 640;
    targetCanvas.height = 640;
    const ctx = targetCanvas.getContext('2d');

    // 1. 먼저 원본 이미지를 그린다.
    ctx.drawImage(img, 0, 0, 640, 640);
    
    // 2. 그 위에 마스크를 투명하게 덮어씌운다.
    const maskMap = processedData.getBatList()[nowIdx()].maskConfidenceMap;
    drawMask(maskMap, parseFloat(confInput.value));
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