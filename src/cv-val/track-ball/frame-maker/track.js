import { CanvasRenderer } from "../../canvas-renderer.js";

export class TrackFrameMaker {
    constructor() {
        this.conf = 0.01;
        this.trackData = null;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.renderer = new CanvasRenderer();
    }

    setInstance(instance) { this.renderer.setCanvas(instance); }
    setData(trackData) {
        this.trackData = trackData;
        if (trackData == null) return;
        const image = this.trackData.getRawImgList(0)[0];
        if (image) {
            this.renderer.updateLayout(image.width, image.height);
            // 오프스크린 크기를 원본 이미지 크기로 고정
            this.offscreenCanvas.width = image.width;
            this.offscreenCanvas.height = image.height;
        }
    }
    setConf(conf) { this.conf = conf; }

    getBall(idx) {
        if (!this.trackData || idx < 0) return null;
        const ballData = this.trackData.getBallList();
        if (!ballData || !ballData[idx]) return null;
        if (ballData[idx]["confidence"] < this.conf) return null;
        return ballData[idx];
    }

    /**
     * 레이어 생성: 궤적(Line), 박스(Rect), 신뢰도(Text) 모두 포함
     */
    _generateBallLayer(idx) {
        const ctx = this.offscreenCtx;
        ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

        const ballList = this.trackData.getBallList();
        if (!ballList) return null;

        // 1. 궤적 그리기 (과거 ~ 현재)
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5; 
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        let isDrawing = false;
        for (let i = 0; i <= idx; i++) {
            const ball = this.getBall(i);
            if (ball) {
                const x = ball.bbox[0] + ball.bbox[2] / 2;
                const y = ball.bbox[1] + ball.bbox[3] / 2;
                if (!isDrawing) {
                    ctx.moveTo(x, y);
                    isDrawing = true;
                } else {
                    ctx.lineTo(x, y);
                }
            } else {
                if (isDrawing) {
                    ctx.stroke();
                    ctx.beginPath();
                    isDrawing = false;
                }
            }
        }
        ctx.stroke();

        // 2. 현재 프레임 정보 출력 (박스 + 텍스트)
        const nowBall = this.getBall(idx);
        if (nowBall) {
            const [bx, by, bw, bh] = nowBall.bbox;
            const confidence = nowBall.confidence;

            // 바운딩 박스
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, by, bw, bh);

            // 신뢰도 텍스트 (원본 이미지 크기에 맞춰 폰트 크기 조절)
            ctx.fillStyle = 'white';
            ctx.font = 'bold 30px Arial'; // 레이어가 크므로 폰트도 크게 설정
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(`Conf: ${confidence.toFixed(2)}`, bx, by - 10);
            ctx.shadowBlur = 0; // 초기화
        }

        return this.offscreenCanvas;
    }

    drawImageAt(idx) {
        if (!this.trackData || idx < 0) return;
        const image = this.trackData.getRawImgList(0)[idx];
        if (!image) return;

        // 배경 이미지 (CanvasRenderer 활용)
        this.renderer.drawImage(image);

        // 오프스크린 레이어 생성 및 합성
        const ballLayer = this._generateBallLayer(idx);
        if (ballLayer) {
            this.renderer.drawLayer(ballLayer);
        }
    }
}