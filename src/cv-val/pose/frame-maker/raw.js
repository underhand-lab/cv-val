import { IPoseFrameMaker } from "./pose.interface.js"

export class RawFrameMaker extends IPoseFrameMaker {
    constructor() {
        super();
        this.rawImgList = null
        this.targetIdx = 0;
        this.canvas = null;
    }

    setInstance(canvas) {
        this.canvas = canvas;
        
    }

    setData(processedData) {
        this.processedData = processedData;
        this.size = processedData.getVideoMetadata(this.targetIdx);
        this.rawImgList = processedData.getRawImgList(this.targetIdx);
        this.landmark2dList = processedData.getLandmarks2dList(this.targetIdx);

    }

    drawImageAt(idx) {

        const ctx = this.canvas.getContext('2d');

        const image = this.rawImgList[idx];

        if (!image) {
            console.error("Image not found at index", idx);
            return;
        }

        // 1. 캔버스 전체를 검정색으로 채웁니다 (레터박스 배경)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. 이미지와 캔버스의 종횡비를 계산합니다.
        const imageAspectRatio = image.width / image.height;
        const canvasAspectRatio = this.canvas.width / this.canvas.height;

        let drawWidth;
        let drawHeight;
        let offsetX;
        let offsetY;

        // 3. 종횡비에 따라 이미지를 그릴 크기와 위치를 결정합니다.
        if (imageAspectRatio > canvasAspectRatio) {
            // 이미지가 캔버스보다 가로로 긴 경우 (상하 레터박스)
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imageAspectRatio;
            offsetX = 0;
            offsetY = (this.canvas.height - drawHeight) / 2;
        }
        else {
            // 이미지가 캔버스보다 세로로 긴 경우 (좌우 레터박스)
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * imageAspectRatio;
            offsetX = (this.canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        // 4. 계산된 크기와 위치에 맞춰 이미지를 그립니다.
        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    }

    getImageAt(idx) {
        if (this.rawImgList == null) return;
        if (idx >= this.rawImgList.length) {
            return null;
        }
        return drawPoseOnFrame(this.rawImgList[idx]);
    }
}