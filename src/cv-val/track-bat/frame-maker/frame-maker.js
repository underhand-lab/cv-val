export class TrackFrameMaker {
    constructor() {
        this.conf = 0.5;
        this.trail = 15;
        this.instance = null; // targetCanvas
        this.trackData = null; // processedData
    }

    setInstance(instance) { this.instance = instance; }
    setData(trackData) { this.trackData = trackData; }
    setConf(conf) { this.conf = conf; }
    setTrail(trail) { this.trail = trail; }

    // --- 마스크 처리 유틸리티 함수들 ---

    isPointInPolygon(poly, x, y) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    fillQuadrilateral(pixelData, points, color, canvasW, canvasH) {
        let minX = Math.max(0, Math.floor(Math.min(...points.map(p => p.x))));
        let maxX = Math.min(canvasW - 1, Math.ceil(Math.max(...points.map(p => p.x))));
        let minY = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
        let maxY = Math.min(canvasH - 1, Math.ceil(Math.max(...points.map(p => p.y))));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.isPointInPolygon(points, x, y)) {
                    const idx = (y * canvasW + x) * 4;
                    pixelData[idx] = color[0];
                    pixelData[idx + 1] = color[1];
                    pixelData[idx + 2] = color[2];
                    pixelData[idx + 3] = color[3];
                }
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
                    pixelData[idx + 1] = color[1];
                    pixelData[idx + 2] = color[2];
                    pixelData[idx + 3] = color[3];
                }
            }
        }
    }

    getMaskMinMaxY(maskMap, threshold) {
        if (!maskMap || maskMap.length === 0) return null;
        const rows = maskMap.length;
        const cols = maskMap[0].length;
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
    masking(pixelData, prevMask, currMask, threshold, color, maskW, maskH) {
        this.applyMaskToBuffer(pixelData, prevMask, threshold, color, maskW, maskH);
        this.applyMaskToBuffer(pixelData, currMask, threshold, color, maskW, maskH);

        const ptsA = this.getMaskMinMaxY(prevMask, threshold);
        const ptsB = this.getMaskMinMaxY(currMask, threshold);

        if (ptsA && ptsB) {
            const points = [ptsA.top, ptsA.bottom, ptsB.top, ptsB.bottom];

            // 1. 기준점(가장 아래에 있고, 같다면 가장 왼쪽에 있는 점) 찾기
            // 정렬의 기준이 되는 점을 하나 고정합니다.
            points.sort((a, b) => a.y - b.y || a.x - b.x);
            const base = points[0];

            // 2. 나머지 점들을 기준점과의 '기울기(삼각비)' 순으로 정렬
            // 외적(Cross Product)을 이용하여 atan2 없이 두 점의 상대적 위치 비교
            const sortedPoints = points.sort((a, b) => {
                if (a === base) return -1;
                if (b === base) return 1;

                // 벡터 (base -> a)와 (base -> b)의 외적 계산
                // (x1*y2 - x2*y1)
                const crossProduct = (a.x - base.x) * (b.y - base.y) - (a.y - base.y) * (b.x - base.x);

                if (crossProduct > 0) return -1; // a가 b보다 반시계 방향에 있음
                if (crossProduct < 0) return 1;  // a가 b보다 시계 방향에 있음

                // 거리가 가까운 순서로 정렬 (일직선상에 있을 경우 대비)
                const distA = Math.pow(a.x - base.x, 2) + Math.pow(a.y - base.y, 2);
                const distB = Math.pow(b.x - base.x, 2) + Math.pow(b.y - base.y, 2);
                return distA - distB;
            });

            this.fillQuadrilateral(pixelData, sortedPoints, color, maskW, maskH);
        }
    }
    drawImageAt(idx) {
        if (!this.trackData || !this.instance || idx < 0) return;

        const ctx = this.instance.getContext('2d');
        const image = this.trackData.getRawImgList(0)[idx];
        if (!image) return;

        // 1. 캔버스 크기 결정 및 초기화 (비율 2:1 가정 - clientWidth * 0.5)
        this.instance.width = this.instance.clientWidth;
        this.instance.height = this.instance.clientWidth * 0.5;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.instance.width, this.instance.height);

        // 2. 레터박스 계산
        const imageAspectRatio = image.width / image.height;
        const canvasAspectRatio = this.instance.width / this.instance.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imageAspectRatio > canvasAspectRatio) {
            drawWidth = this.instance.width;
            drawHeight = this.instance.width / imageAspectRatio;
            offsetX = 0;
            offsetY = (this.instance.height - drawHeight) / 2;
        } else {
            drawHeight = this.instance.height;
            drawWidth = this.instance.height * imageAspectRatio;
            offsetX = (this.instance.width - drawWidth) / 2;
            offsetY = 0;
        }

        // 3. 원본 이미지 그리기
        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

        // 4. 마스크 및 궤적 생성 (저해상도 버퍼)
        const batList = this.trackData.getBatList();
        const firstBat = batList.find(b => b && b.maskConfidenceMap);
        if (firstBat) {
            const maskW = firstBat.maskConfidenceMap[0].length;
            const maskH = firstBat.maskConfidenceMap.length;

            const maskImageData = new ImageData(maskW, maskH);
            const pixelBuffer = maskImageData.data;
            const startIdx = Math.max(1, idx - this.trail + 1);

            // 잔상 루프
            for (let i = startIdx; i <= idx; i++) {
                const prev = batList[i - 1];
                const curr = batList[i];
                if (prev?.maskConfidenceMap && curr?.maskConfidenceMap) {
                    this.masking(pixelBuffer, prev.maskConfidenceMap, curr.maskConfidenceMap,
                        this.conf, [0, 255, 0, 100], maskW, maskH);
                }
            }

            // 현재 프레임 강조
            const nowBat = batList[idx];
            if (nowBat?.maskConfidenceMap) {
                this.applyMaskToBuffer(pixelBuffer, nowBat.maskConfidenceMap, this.conf, [255, 128, 0, 180], maskW, maskH);
            }

            // 5. 마스크 오프스크린 -> 메인 캔버스 투영
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = maskW;
            tempCanvas.height = maskH;
            tempCanvas.getContext('2d').putImageData(maskImageData, 0, 0);

            // 중요: 이미지 영역(drawWidth, drawHeight)과 시작점(offsetX, offsetY)에 맞춰서 확대 출력
            ctx.drawImage(tempCanvas, offsetX, offsetY, drawWidth, drawHeight);
        }
    }
}