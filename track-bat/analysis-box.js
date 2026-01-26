import { BoxList } from "../src/easy-h/ui/box-list.js";
import { TrackFrameMaker } from "../src/cv-val/track-bat/frame-maker/frame-maker.js";

let frameMakers = [];
let processedData = null;

const confInput = document.getElementById('confInput');
confInput.addEventListener('change', () => {
    updateImage();
});

const frameMaker = new TrackFrameMaker();

const trailInput = document.getElementById('trailInput');
trailInput.addEventListener('change', () => {
    updateImage();
});

const slider = document.getElementById('frameSlider');
slider.max = 0;

function nowIdx() {
    return parseInt(slider.value, 10);
}

function updateImage() {

    if (!processedData) return;

    frameMaker.setConf(parseFloat(confInput.value));
    frameMaker.setTrail(parseInt(trailInput.value));
    frameMaker.drawImageAt(parseInt(slider.value));
}

// --- 나머지 UI 및 데이터 설정 로직 ---

slider.addEventListener('input', updateImage);

function setData(data) {
    if (data == null) return;
    processedData = data;
    
    frameMaker.setData(data);
    const frameCount = processedData.getFrameCnt();
    const maxValue = frameCount > 0 ? frameCount - 1 : 0;

    slider.max = maxValue;
    trailInput.max = maxValue;
    updateImage();
}

const analysisSelect = document.getElementById('analysis');
const addVideoBoxBtn = document.getElementById('add-video-box-button');
const boxList = new BoxList(document.getElementById("boxes"));

function addToolDefault(src, frameMaker, func) {
    return new Promise((resolve) => {
        boxList.addBoxTemplate(src, () => {}, (box) => {
            box.className = 'container neumorphism';
            func(box);
            resolve();
        });
    });
}

addVideoBoxBtn.addEventListener('click', () => {
    addToolDefault("../template/video.html", null, (box) => {
        const newCanvas = box.querySelectorAll("canvas")[0];
        frameMaker.setInstance(newCanvas);
    }).then(() => {
        let bottom = document.body.scrollHeight;
        window.scrollTo({ top: bottom, behavior: 'smooth' });
    });
});

// 초기 실행
addToolDefault("../template/video.html", null, (box) => {
    const newCanvas = box.querySelectorAll("canvas")[0];
    frameMaker.setInstance(newCanvas);
});

export { setData };