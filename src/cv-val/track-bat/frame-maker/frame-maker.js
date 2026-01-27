import { CanvasRenderer } from "../../canvas-renderer.js";

export class TrackFrameMaker {
    constructor() {
        this.conf = 0.5;
        this.trail = 15;
        this.trackData = null;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.renderer = new CanvasRenderer();
        this.cachedImageData = null;
    }

    setInstance(instance) { this.renderer.setCanvas(instance); }
    setConf(conf) { this.conf = conf; }
    setTrail(trail) { this.trail = trail; }
    
    setData(trackData) {
        this.trackData = trackData;
        if (trackData == null) return;
        const image = this.trackData.getRawImgList(0)[0];
        if (image) this.renderer.updateLayout(image.width, image.height);
    }

    drawImageAt(idx) {
        if (!this.trackData || idx < 0) return;
        const image = this.trackData.getRawImgList(0)[idx];
        if (!image) return;

        // 1. 배경 이미지 렌더링
        this.renderer.drawImage(image);

        // 2. 마스크 레이어 생성 및 합성
        const batList = this.trackData.getBatList();
        const maskLayer = this._generateMaskLayer(idx, batList);
        if (maskLayer) {
            this.renderer.drawLayer(maskLayer);
        }
    }

    _generateMaskLayer(idx, batList) {
        const firstBat = batList.find(b => b && b.maskConfidenceMap);
        if (!firstBat) return null;

        const maskW = firstBat.maskConfidenceMap[0].length;
        const maskH = firstBat.maskConfidenceMap.length;

        // 버퍼 최적화: 크기 변경 시에만 재생성
        if (this.offscreenCanvas.width !== maskW || this.offscreenCanvas.height !== maskH) {
            this.offscreenCanvas.width = maskW;
            this.offscreenCanvas.height = maskH;
            this.cachedImageData = this.offscreenCtx.createImageData(maskW, maskH);
        }

        // 버퍼 초기화 및 픽셀 연산
        this.cachedImageData.data.fill(0);
        const pixelBuffer = this.cachedImageData.data;
        const startIdx = Math.max(1, idx - this.trail + 1);

        for (let i = startIdx; i <= idx; i++) {
            const prev = batList[i - 1];
            const curr = batList[i];
            const alpha = Math.floor(((i - startIdx + 1) / (idx - startIdx + 1)) * 100);
            this.masking(pixelBuffer, prev, curr, this.conf, [0, 255, 0, alpha], maskW, maskH);
        }

        // 현재 위치 강조
        const nowBat = batList[idx];
        if (nowBat?.maskConfidenceMap) {
            this.applyMaskToBuffer(pixelBuffer, nowBat.maskConfidenceMap, this.conf, [255, 128, 0, 180], maskW, maskH);
        }

        this.offscreenCtx.putImageData(this.cachedImageData, 0, 0);
        return this.offscreenCanvas;
    }

    masking(pixelData, prevBat, currBat, threshold, color, maskW, maskH) {
        if (prevBat?.maskConfidenceMap) {
            this.applyMaskToBuffer(pixelData, prevBat.maskConfidenceMap, threshold, color, maskW, maskH);
        }
        if (currBat?.maskConfidenceMap) {
            this.applyMaskToBuffer(pixelData, currBat.maskConfidenceMap, threshold, color, maskW, maskH);
        }
        if (prevBat?.maskConfidenceMap && currBat?.maskConfidenceMap) {
            const ptsA = this.getMaskMinMaxY(prevBat.maskConfidenceMap, threshold);
            const ptsB = this.getMaskMinMaxY(currBat.maskConfidenceMap, threshold);
            if (ptsA && ptsB) {
                this.fillQuadrilateral(pixelData, [ptsA.top, ptsA.bottom, ptsB.top, ptsB.bottom], color, maskW, maskH);
            }
        }
    }

    applyMaskToBuffer(pixelData, maskMap, threshold, color, maskW, maskH) {
        if (!maskMap) return;
        for (let y = 0; y < maskH; y++) {
            const row = maskMap[y];
            for (let x = 0; x < maskW; x++) {
                if (row[x] >= threshold) {
                    const idx = (y * maskW + x) * 4;
                    pixelData[idx] = color[0];
                    pixelData[idx+1] = color[1];
                    pixelData[idx+2] = color[2];
                    pixelData[idx+3] = color[3];
                }
            }
        }
    }

    getMaskMinMaxY(maskMap, threshold) {
        if (!maskMap || maskMap.length === 0) return null;
        const rows = maskMap.length, cols = maskMap[0].length;
        let top = null, bottom = null;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (maskMap[y][x] >= threshold) { top = { x, y }; break; }
            }
            if (top) break;
        }
        for (let y = rows - 1; y >= 0; y--) {
            for (let x = 0; x < cols; x++) {
                if (maskMap[y][x] >= threshold) { bottom = { x, y }; break; }
            }
            if (bottom) break;
        }
        return (top && bottom) ? { top, bottom } : null;
    }

    fillQuadrilateral(pixelData, points, color, canvasW, canvasH) {

        const sortedPoints = this._getSortedPoints(points);
        let minX = Math.max(0, Math.floor(Math.min(...points.map(p => p.x))));
        let maxX = Math.min(canvasW - 1, Math.ceil(Math.max(...points.map(p => p.x))));
        let minY = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
        let maxY = Math.min(canvasH - 1, Math.ceil(Math.max(...points.map(p => p.y))));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.isPointInPolygon(sortedPoints, x, y)) {
                    const idx = (y * canvasW + x) * 4;
                    pixelData[idx] = color[0];
                    pixelData[idx+1] = color[1];
                    pixelData[idx+2] = color[2];
                    pixelData[idx+3] = color[3];
                }
            }
        }
    }

    _getSortedPoints(points) {
        const base = [...points].sort((a, b) => a.y - b.y || a.x - b.x)[0];
        return points.sort((a, b) => {
            if (a === base) return -1;
            if (b === base) return 1;
            const cp = (a.x - base.x) * (b.y - base.y) - (a.y - base.y) * (b.x - base.x);
            return cp > 0 ? -1 : cp < 0 ? 1 : (Math.hypot(a.x-base.x, a.y-base.y) - Math.hypot(b.x-base.x, b.y-base.y));
        });
    }

    isPointInPolygon(poly, x, y) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    }
}