import * as PoseAnalysis from "../src/cv-val/pose/analysis-tool/index.js";
import * as PoseFrameMaker from '../src/cv-val/pose/frame-maker/index.js';
import { BoxList } from "../src/easy-h/ui/box-list.js"

const currentFrameIdxSpan = document.getElementById('currentFrameIdx');
const totalFramesSpan = document.getElementById('totalFrames');

let frameMakers = [];
let processedData = null;

const slider = document.getElementById('frameSlider');
slider.max = 0;

function nowIdx() {
    return parseInt(slider.value, 10);
}

function updateImage() {

    if (!processedData) return;

    const frameIdx = nowIdx();

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].drawImageAt(frameIdx);
    }

}

slider.addEventListener('input', updateImage);

function setData(data) {

    if (data == null) return;

    processedData = data;

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].setData(processedData);
    }

    const frameCount = processedData.getFrameCnt();
    slider.max = frameCount > 0 ? frameCount - 1 : 0;

    updateImage();

}

const analysisSelect = document.getElementById('analysis');

const addVideoBoxBtn =
    document.getElementById('add-video-box-button');
const add3dVideoBoxBtn =
    document.getElementById('add-3d-video-box-button');
const addGraphBoxBtn =
    document.getElementById('add-graph-box-button');
const addTableBoxBtn =
    document.getElementById('add-table-box-button');

const boxList = new BoxList(document.getElementById("boxes"));

const analysisTool = {
    "angle": new PoseAnalysis.AngleAnalysisTool(),
    "angle-velocity": new PoseAnalysis.AngleVelocityAnalysisTool(),
    "velocity": new PoseAnalysis.VelocityAnalysisTool(),
    "height": new PoseAnalysis.HeightAnalysisTool(),
}

function addToolDefault(src, frameMaker, func) {
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
        window.scrollTo({ top: bottom, left: 0, behavior: 'smooth' });
    })
}

addVideoBoxBtn.addEventListener('click', () => {
    const newPoseFrameMaker = new PoseFrameMaker.PoseBoneFrameMaker();
    addTool("../template/video.html", newPoseFrameMaker, (box) => {

        const newCanvas = box.querySelectorAll("canvas")[0];
        newPoseFrameMaker.setInstance(newCanvas);
    });

});

add3dVideoBoxBtn.addEventListener('click', () => {
    const newPoseFrameMaker = new PoseFrameMaker.Pose3DFrameMaker();

    addTool("../template/3d-video.html", newPoseFrameMaker, (box) => {

        const newCanvas = box.querySelectorAll("canvas")[0];
        newPoseFrameMaker.setInstance(newCanvas);

    });

});

addGraphBoxBtn.addEventListener('click', () => {
    const newGraphFrameMaker = new PoseFrameMaker.CustomGraphFrameMaker();

    addTool("../template/graph.html", newGraphFrameMaker, (box) => {

        const newCanvas = box.querySelectorAll("canvas")[0];
        newGraphFrameMaker.setInstance(newCanvas);

        const options = box.querySelectorAll("select")[0];

        options.addEventListener("change", () => {
            newGraphFrameMaker.changeAnalysisTool(analysisTool[options.value]);
            newGraphFrameMaker.drawImageAt(nowIdx());
        });

        newGraphFrameMaker.changeAnalysisTool(analysisTool[options.value]);
    });

});

addTableBoxBtn.addEventListener('click', () => {
    const newTableFrameMaker = new PoseFrameMaker.CustomTableFrameMaker();

    addTool("../template/table-pose.html", newTableFrameMaker,
        (box) => {
            const newDiv = box.getElementsByClassName("table")[0];
            newTableFrameMaker.setInstance(newDiv);

            const options = box.querySelectorAll("select")[0];

            options.addEventListener("change", () => {
                newTableFrameMaker.changeAnalysisTool(analysisTool[options.value]);
                newTableFrameMaker.drawImageAt(nowIdx());
            });

            newTableFrameMaker.changeAnalysisTool(analysisTool[options.value]);

        });

});

const newPoseFrameMaker = new PoseFrameMaker.PoseBoneFrameMaker();

addToolDefault("../template/video.html", newPoseFrameMaker,
    (box) => {
    const newCanvas = box.querySelectorAll("canvas")[0];
    newPoseFrameMaker.setInstance(newCanvas);

    }).then(() => {

        const newGraphFrameMaker = new PoseFrameMaker.CustomGraphFrameMaker();

        addToolDefault("../template/graph.html",
            newGraphFrameMaker,
            (box) => {
                const newCanvas = box.querySelectorAll("canvas")[0];
                newGraphFrameMaker.setInstance(newCanvas);
                const options = box.querySelectorAll("select")[0];

                options.addEventListener("change", () => {
                    newGraphFrameMaker.changeAnalysisTool(
                        analysisTool[options.value]);
                    newGraphFrameMaker.drawImageAt(nowIdx());
                });

                newGraphFrameMaker.changeAnalysisTool(
                    analysisTool[options.value]);

            });

    });

export { setData }