import { FFMPEGVideoConverter } from '../video-to-img-list/ffmpeg.js'

export class Processor {

    constructor() {
        this.ballposeDetector = null;
        this.onProgressCallback = null;
        this.videoConverter = new FFMPEGVideoConverter();
    }

    setting(ballDetector, onProgress) {
        this.detector = ballDetector;
        this.onProgressCallback = onProgress;
    }

    async processVideo(videoList, data) {

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("process-ready");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        await this.videoConverter.load();
        
        const videoMetaData = 
            await this.videoConverter.getVideoMetadata(videoList[0]);
        const imageList =
            await this.videoConverter.convert(videoList[0]);

        console.log(imageList.length);

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("on-process");
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        await this.detector.initialize();
        let frameIndex = 0;

        data.initialize([videoMetaData]);

        for (const image of imageList) {
            const ballData = await this.detector.process(image);

            data.addDataAt(0, image, ballData);

            if (this.onProgressCallback) {
                this.onProgressCallback.onProgress
                    (frameIndex + 1, imageList.length);
            }

            await new Promise(resolve => setTimeout(resolve, 0));
            frameIndex++;
        }

        if (this.onProgressCallback) {
            this.onProgressCallback.onState("after-process");
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        return data;

    }

}