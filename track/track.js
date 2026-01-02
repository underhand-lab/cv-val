import { Processor } from '../src/cv-val/processor.js';
import { TrackData } from "../src/cv-val/track/track-data.js"
import * as BallDetector from '../src/cv-val/track/ball-detector/index.js';
import * as AnalysisBox from './analysis-box.js';

const fileInput = document.getElementById('video-files');
fileInput.addEventListener('change', () => {
    processButton.disabled = fileInput.files.length < 1;
});

const detectorSelect = document.getElementById("model");
const detectors = {
    "yolo11x": new BallDetector.YOLOBallDetector(
        "../external/models/yolo11/yolo11x_web_model/model.json"),
    "yolo11l": new BallDetector.YOLOBallDetector(
        "../external/models/yolo11/yolo11l_web_model/model.json"),
    "yolo11m": new BallDetector.YOLOBallDetector(
        "../external/models/yolo11/yolo11m_web_model/model.json"),
    "yolo11s": new BallDetector.YOLOBallDetector(
        "../external/models/yolo11/yolo11s_web_model/model.json"),
    "yolo11n": new BallDetector.YOLOBallDetector(
        "../external/models/yolo11/yolo11n_web_model/model.json")
}

const processButton = document.getElementById('process-button');
const statusMessage = document.getElementById('status-message');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');

const processPopUp = document.getElementById('process-pop-up');

// 초기화 및 비디오 처리
processButton.addEventListener('click', async () => {

    // 버튼을 비활성화하여 중복 클릭 방지
    processButton.disabled = true;
    progressText.textContent = "";  
    progressBar.style.width = `0%`;

    // 프로세서 및 탐지기 초기화
    const processor = new Processor();
    const detector = detectors[detectorSelect.value];
    
    // 프로세서 설정 및 비디오 처리
    try {
        processor.setting(detector, {
            onState: (state) => {
                statusMessage.setAttribute('key', `label-${state}`);
            },
            onProgress: (current, total) => {
                const percentage = (current / total) * 100;
                progressText.textContent = `: ${current} / ${total}`;
                progressBar.style.width = `${percentage}%`;
            }
        });

        // data 변수에 모든 처리된 데이터를 저장
        const ret = await processor.processVideo(fileInput.files, new TrackData());

        statusMessage.setAttribute('key', `label-after-process`);
        progressText.textContent = "";

        AnalysisBox.setData(ret);
        processPopUp.closeAction();
        console.log('비디오 처리가 완료되었습니다.');

    } catch (error) {

        alert("비디오 처리 중 오류 발생")
        console.error("비디오 처리 중 오류 발생:", error);

    } finally {
        // 처리가 완료되면 버튼을 다시 활성화
        processButton.disabled = false;
    }

});