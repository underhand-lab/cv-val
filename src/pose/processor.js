// processor.js
import { ProcessedData } from './pose-data.js';
import { FFMPEGVideoConverter } from '../video-to-img-list/ffmpeg.js'

export class PoseProcessor {

    constructor() {
        this.poseDetector = null;
        this.onProgressCallback = null;
        this.videoConverter = new FFMPEGVideoConverter();
    }

    setting(poseDetector, onProgress) {
        this.poseDetector = poseDetector;
        this.onProgressCallback = onProgress;
    }

    async processVideo(videoList) {
        
        const data = new ProcessedData();

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("준비 중");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        await this.videoConverter.load();

        const videoMetaData =
            await this.videoConverter.getVideoMetadata(videoList[0]);
        
        data.initialize([videoMetaData]);

        const imageList =
            await this.videoConverter.convert(videoList[0]);

        // --- 2단계: 저장된 프레임 리스트를 순회하며 포즈 처리 및 데이터 저장 ---
        console.log(imageList.length);

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("처리 중");
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // MediaPipe 초기화
        await this.poseDetector.initialize();
        let frameIndex = 0;

        for (const image of imageList) {
            const { landmarks3d, landmarks2dList, visibilityScoreList } =
                await this.poseDetector.process([image]);

            // 모든 프레임의 데이터를 data 객체에 저장
            data.addDataAt([image], landmarks3d, landmarks2dList, visibilityScoreList);

            if (this.onProgressCallback) {
                this.onProgressCallback.onState(
                    `처리 중: ${frameIndex + 1} / ${imageList.length}`);
                this.onProgressCallback.onProgress
                    (frameIndex + 1, imageList.length);
            }
            
            await new Promise(resolve => setTimeout(resolve, 0));
            frameIndex++;
        }

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("처리 완료");
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        return data; // 모든 데이터가 저장된 data 객체를 반환
    }

}