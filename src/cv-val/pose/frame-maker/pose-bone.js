import { IPoseFrameMaker } from "./pose.interface.js";
import { CanvasRenderer } from "../../canvas-renderer.js";
import { PoseVisualizer } from "./pose-visualizer.js";

export class PoseBoneFrameMaker extends IPoseFrameMaker {
    constructor() {
        super();
        this.targetIdx = 0;
        this.renderer = new CanvasRenderer();
        this.visualizer = new PoseVisualizer();
        
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    setInstance(canvas) {
        this.renderer.setCanvas(canvas);
    }

    setData(processedData) {
        if (!processedData) return;
        this.processedData = processedData;
        this.rawImgList = processedData.getRawImgList(this.targetIdx);
        this.landmark2dList = processedData.getLandmarks2dList(this.targetIdx);

        const firstImg = this.rawImgList[0];
        if (firstImg) {
            this.renderer.updateLayout(firstImg.width, firstImg.height);
            // 오프스크린 캔버스 크기를 원본 해상도와 동일하게 설정
            this.offscreenCanvas.width = firstImg.width;
            this.offscreenCanvas.height = firstImg.height;
        }
    }

    /**
     * 오프스크린 레이어를 생성하는 내부 메서드
     */
    _generatePoseLayer(idx) {
        const landmarks = this.landmark2dList[idx];
        if (!landmarks) return null;

        const { width, height } = this.offscreenCanvas;
        
        // 투명하게 초기화
        this.offscreenCtx.clearRect(0, 0, width, height);
        
        // 분리된 Visualizer 클래스에 그리기 위임
        this.visualizer.draw(this.offscreenCtx, landmarks, width, height);

        return this.offscreenCanvas;
    }

    drawImageAt(idx) {
        if (!this.processedData) return;
        const image = this.rawImgList[idx];
        if (!image) return;

        // 1. 메인 이미지 그리기 (레터박스 자동 적용)
        this.renderer.drawImage(image);

        // 2. 오프스크린 포즈 레이어 생성
        const poseLayer = this._generatePoseLayer(idx);

        // 3. 레이어 합성
        if (poseLayer) {
            this.renderer.drawLayer(poseLayer);
        }
    }
}