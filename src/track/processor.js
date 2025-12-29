import { FFMPEGVideoConverter } from '../video-to-img-list/ffmpeg.js'

export class TrackProcessor {

    constructor() {
        this.ballposeDetector = null;
        this.onProgressCallback = null;
        this.videoConverter = new FFMPEGVideoConverter();
    }

    setting(ballDetector, onProgress) {
        this.ballDetector = ballDetector;
        this.onProgressCallback = onProgress;
    }

    async processVideo(videoList) {

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("준비 중");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        await this.videoConverter.load();

        const videoMetaData = 
            await this.videoConverter.getVideoMetadata(videoList[0]);
        const imageList =
            await this.videoConverter.convert(videoList[0]);

        console.log(imageList.length);

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("처리 중");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // --- 2단계: 저장된 프레임 리스트를 순회하며 포즈 처리 및 데이터 저장 ---
        await this.ballDetector.initialize();
        let frameIndex = 0;

        const ballDataList = [];

        for (const image of imageList) {
            const ballData =
                await this.ballDetector.process(image);

            ballDataList.push(ballData);

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
        
        return {
            metaData: videoMetaData,
            rawImage: imageList,
            ballData: ballDataList
        }; // 모든 데이터가 저장된 data 객체를 반환
    }

}