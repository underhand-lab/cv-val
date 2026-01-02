import * as FrameMaker from '../src/cv-val/track/frame-maker/index.js';
import * as Analysis from "../src/cv-val/track/calc/analysis.js";
import { BoxList } from "../src/easy-h/ui/box-list.js";

let frameMakers = [];
let processedData = null;

const confInput = document.getElementById('confInput');
confInput.addEventListener('change', () => {
    updateImage();
});

const slider = document.getElementById('frameSlider');
slider.max = 0;

function nowIdx() {
    return parseInt(slider.value, 10);
}

// 슬라이더를 움직일 때마다 이미지를 업데이트하는 함수
function updateImage() {

    if (!processedData) return;

    const frameIdx = nowIdx();

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].setConf(confInput.value);
        frameMakers[i].drawImageAt(frameIdx);
    }

}

slider.addEventListener('input', updateImage);

function setData(data) {

    if (data == null) return;

    processedData = data;

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].setData(data);
    }

    const frameCount = processedData.getFrameCnt();
    slider.max = frameCount > 0 ? frameCount - 1 : 0;

    updateImage();

}

const analysisSelect = document.getElementById('analysis')

const addVideoBoxBtn = document.getElementById('add-video-box-button');
const addTableBoxBtn = document.getElementById('add-table-box-button');

const boxList = new BoxList(document.getElementById("boxes"));

function addToolDefault(src, frameMaker, func, toBottom = true) {
    return new Promise((resolve, reject) => {
        boxList.addBoxTemplate(src, () => {
            frameMakers = frameMakers.filter(fm => fm !== frameMaker);
    
        }, (box) => {
            box.className = 'container neumorphism';
            func(box);
            frameMaker.setData(processedData);
    
            frameMakers.push(frameMaker);
            frameMaker.drawImageAt(nowIdx());
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
    const newPoseFrameMaker = new FrameMaker.TrackFrameMaker();
    console.log("add");
    addTool("../template/video.html", newPoseFrameMaker,
        (box) => {
            const newCanvas = box.querySelectorAll("canvas")[0];
            newPoseFrameMaker.setInstance(newCanvas);

        });

});

addTableBoxBtn.addEventListener('click', () => {
    const newTableFrameMaker = new FrameMaker.CustomTableFrameMaker();

    console.log("add");
    addTool("../template/table-track.html", newTableFrameMaker,
        (box) => {
            const newDiv = box.getElementsByClassName("table")[0];
            newTableFrameMaker.setInstance(newDiv);

            newTableFrameMaker.changeAnalysisTool(
                new Analysis.BallAnalysisTool());
        });

});

const newPoseFrameMaker = new FrameMaker.TrackFrameMaker();

addToolDefault("../template/video.html", newPoseFrameMaker,
    (box) => {
        const newCanvas = box.querySelectorAll("canvas")[0];
        newPoseFrameMaker.setInstance(newCanvas);
        
    }).then(() => {
        const newTableFrameMaker = new FrameMaker.CustomTableFrameMaker();

        addToolDefault("../template/table-track.html",
             newTableFrameMaker,
            (box) => {
                const newDiv = box.getElementsByClassName("table")[0];
                newTableFrameMaker.setInstance(newDiv);
                newTableFrameMaker.changeAnalysisTool(
                    new Analysis.BallAnalysisTool());

            });

    });


export { setData }