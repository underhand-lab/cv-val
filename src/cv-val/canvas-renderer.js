class CanvasRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.layout = null;
        this.sourceW = 0; // 레이아웃 재계산을 위해 원본 크기 저장
        this.sourceH = 0;
    }

    setCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    updateLayout(sourceW, sourceH) {
        if (!this.canvas) return;
        this.sourceW = sourceW;
        this.sourceH = sourceH;

        const targetW = this.canvas.width;
        const targetH = this.canvas.height;
        const sourceAspect = sourceW / sourceH;
        const targetAspect = targetW / targetH;

        let drawW, drawH, x, y;

        if (sourceAspect > targetAspect) {
            drawW = targetW;
            drawH = targetW / sourceAspect;
            x = 0;
            y = (targetH - drawH) / 2;
        } else {
            drawH = targetH;
            drawW = targetH * sourceAspect;
            x = (targetW - drawW) / 2;
            y = 0;
        }

        // 정수 좌표로 변환하여 선명도 향상
        this.layout = { 
            x: Math.floor(x), 
            y: Math.floor(y), 
            width: Math.floor(drawW), 
            height: Math.floor(drawH) 
        };
    }

    drawImage(source) {
        if (!this.canvas || !source) return;

        // 1. 화면 표시 크기(style)와 내부 해상도 동기화 체크
        const currentRatio = this.canvas.height / this.canvas.width;
        const newW = this.canvas.clientWidth;
        const newH = Math.floor(newW * (isNaN(currentRatio) ? 0.5 : currentRatio));

        if (this.canvas.width !== newW || this.canvas.height !== newH) {
            this.canvas.width = newW;
            this.canvas.height = newH;
            // 캔버스 크기가 바뀌었으므로 레이아웃 강제 업데이트
            if (this.sourceW && this.sourceH) {
                this.updateLayout(this.sourceW, this.sourceH);
            }
        }

        // 2. 렌더링 설정 (Canvas 크기 변경 시 초기화될 수 있으므로 다시 설정)
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.layout) {
            this.ctx.drawImage(source, this.layout.x, this.layout.y, this.layout.width, this.layout.height);
        }
    }

    drawLayer(source) {
        if (!this.ctx || !source || !this.layout) return;
        // 레이어 그릴 때도 스무딩 설정을 유지하는 것이 좋습니다.
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.drawImage(source, this.layout.x, this.layout.y, this.layout.width, this.layout.height);
    }
}

export { CanvasRenderer }