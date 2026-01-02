import { PoseData } from '../src/cv-val/pose/pose-data.js';
import { Processor } from '../src/cv-val/processor.js';
import * as PoseDetector from '../src/cv-val/pose/pose-detector/index.js';
import * as AnalysisBox from './analysis-box.js';

const fileInput = document.getElementById('video-files');
fileInput.addEventListener('change', () => {
    processButton.disabled = fileInput.files.length < 1;
});

const detectorSelect = document.getElementById("model");
const detectors = {
    "mediapipe_heavy": new PoseDetector.MediaPipePoseDetector(
        "../external/models/mediapipe/pose_landmarker_heavy.task"),
    "mediapipe_full": new PoseDetector.MediaPipePoseDetector(
        "../external/models/mediapipe/pose_landmarker_full.task"),
}

const processButton = document.getElementById('process-button');
const statusMessage = document.getElementById('status-message');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');

const processPopUp = document.getElementById('process-pop-up');

// 초기화 및 비디오 처리
processButton.addEventListener('click', async () => {

    // 버튼을 비활성화하여 중복 클릭 방지
    processButton.disabled = true
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
                console.log();
            },
            onProgress: (current, total) => {
                const percentage = (current / total) * 100;
                progressText.textContent = `: ${current} / ${total}`;
                progressBar.style.width = `${percentage}%`;
            }
        });
        
        const ret = await processor.processVideo(
            fileInput.files, new PoseData());

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