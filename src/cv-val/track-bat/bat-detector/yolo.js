export class YOLOBatDetector {

    constructor(weightURL, classId) {
        this.weightURL = weightURL;
        this.offscreenCanvas = document.createElement('canvas');
        this.inputSize = 640;
        this.batClassId = classId; // COCO 데이터셋 기준 야구 배트 ID (예: 34)
    }

    async initialize() {
        await tf.setBackend('webgl');
        await tf.ready();
        this.detector = await tf.loadGraphModel(this.weightURL);
    }

    async process(imageSource) {
        const width = imageSource.width || imageSource.videoWidth;
        const height = imageSource.height || imageSource.videoHeight;

        // 1. 전처리: 이미지를 정사각형 중앙에 배치 (Letterboxing)
        const inputTensor = await this.preProcess(imageSource);

        const resizedTensor = tf.tidy(() => {
            return tf.image.resizeBilinear(inputTensor, [this.inputSize, this.inputSize])
                .div(255.0)
                .expandDims(0);
        });

        // 2. 모델 추론: executeAsync를 사용하여 다중 출력 수신
        const predictions = await this.detector.executeAsync(resizedTensor);

        // 3. 후처리: 오프셋 보정 및 마스크 필터링
        const bestBat = await this.postProcess(predictions, width, height);

        // 메모리 정리
        inputTensor.dispose();
        resizedTensor.dispose();
        predictions.forEach(p => p.dispose());

        return bestBat;
    }

    async preProcess(imageSource) {
        const width = imageSource.width || imageSource.videoWidth;
        const height = imageSource.height || height;

        // 원본 이미지의 긴 쪽을 기준으로 정사각형 캔버스 생성
        const size = Math.max(width, height);
        const ctx = this.offscreenCanvas.getContext('2d');

        this.offscreenCanvas.width = size;
        this.offscreenCanvas.height = size;

        // 배경 검은색 채우기
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);

        // 이미지를 중앙에 배치 (오프셋 계산)
        const xOffset = (size - width) / 2;
        const yOffset = (size - height) / 2;
        ctx.drawImage(imageSource, xOffset, yOffset, width, height);

        return tf.browser.fromPixels(this.offscreenCanvas);
    }

    async postProcess(predictions, originalWidth, originalHeight) {
        const [output0, proto] = predictions;
        const originalSize = Math.max(originalWidth, originalHeight);
        const scale = originalSize / this.inputSize;

        return tf.tidy(() => {
            const transposed = output0.squeeze().transpose([1, 0]);
            const boxes = transposed.slice([0, 0], [-1, 4]);
            const scores = transposed.slice([0, 4], [-1, 80]);
            const maskCoeffs = transposed.slice([0, 84], [-1, 32]);

            const batScores = scores.slice([0, this.batClassId], [-1, 1]).squeeze();
            const bestIdx = batScores.argMax().dataSync()[0];
            const highestConf = batScores.gather(bestIdx).dataSync()[0];

            if (highestConf < 0.25) return null;

            const box = boxes.gather(bestIdx).dataSync();
            const coeffs = maskCoeffs.gather(bestIdx).expandDims(0);

            // 1. 전체 마스크 생성 (160x160)
            const rawMask = this.generateConfidenceMap(proto, coeffs);

            // 2. 마스크 좌표계(160) 기준 박스 좌표 계산
            // box[0,1,2,3]은 640px 기준이므로 4로 나누어 160px 기준으로 맞춤
            const mScale = 160 / 640;
            const mx1 = (box[0] - box[2] / 2) * mScale;
            const my1 = (box[1] - box[3] / 2) * mScale;
            const mx2 = (box[0] + box[2] / 2) * mScale;
            const my2 = (box[1] + box[3] / 2) * mScale;

            // 3. 레터박스(검은 여백) 제거 범위 계산
            const xStart = Math.round(((originalSize - originalWidth) / 2) * (160 / originalSize));
            const yStart = Math.round(((originalSize - originalHeight) / 2) * (160 / originalSize));
            const mWidth = Math.round(originalWidth * (160 / originalSize));
            const mHeight = Math.round(originalHeight * (160 / originalSize));

            // 4. 마스크 추출 및 박스 외부 제로화 (Zero-out)
            const croppedMask = [];
            for (let j = 0; j < mHeight; j++) {
                const y = yStart + j;
                const row = [];
                for (let i = 0; i < mWidth; i++) {
                    const x = xStart + i;

                    let val = 0;
                    // rawMask가 존재하고, 현재 좌표(x, y)가 박스 영역(mx, my) 안에 있을 때만 값 할당
                    if (rawMask[y] && x >= mx1 && x <= mx2 && y >= my1 && y <= my2) {
                        val = rawMask[y][x] * highestConf;
                    }
                    row.push(val);
                }
                croppedMask.push(row);
            }

            // 5. 최종 결과 반환 (여백 보정된 BBox 포함)
            const xOffset640 = ((originalSize - originalWidth) / 2) / originalSize * 640;
            const yOffset640 = ((originalSize - originalHeight) / 2) / originalSize * 640;

            return {
                bbox: [
                    (box[0] - box[2] / 2 - xOffset640) * scale,
                    (box[1] - box[3] / 2 - yOffset640) * scale,
                    box[2] * scale,
                    box[3] * scale
                ],
                confidence: highestConf,
                maskConfidenceMap: croppedMask
            };
        });
    }

    generateConfidenceMap(proto, coeffs) {
        return tf.tidy(() => {
            // proto: [1, 32, 160, 160]
            let p = proto.squeeze();

            const [h, w, c] = p.shape;
            const proto2D = p.reshape([h * w, c]);

            // 마스크 합성 연산
            let mask = tf.matMul(coeffs, proto2D, false, true);

            // 시그모이드 활성화 및 2D 배열 변환
            mask = mask.reshape([h, w]).sigmoid();
            return mask.arraySync();
        });
    }
}