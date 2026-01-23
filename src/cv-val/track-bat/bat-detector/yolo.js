export class YOLOBatDetector {

    constructor(weightURL) {
        this.weightURL = weightURL;
        this.offscreenCanvas = document.createElement('canvas');
        this.inputSize = 640;
        this.batClassId = 34; // COCO 데이터셋 기준 야구 배트 ID
    }

    async initialize() {
        await tf.setBackend('webgl');
        await tf.ready();
        this.detector = await tf.loadGraphModel(this.weightURL);
    }

    async process(imageSource) {
        const width = imageSource.width || imageSource.videoWidth;
        const height = imageSource.height || imageSource.videoHeight;
        const inputTensor = await this.preProcess(imageSource);

        const resizedTensor = tf.tidy(() => {
            return tf.image.resizeBilinear(inputTensor, [this.inputSize, this.inputSize])
                .div(255.0)
                .expandDims(0);
        });

        // executeAsync를 사용하여 다중 출력 수신
        const predictions = await this.detector.executeAsync(resizedTensor);

        // 후처리: 가장 신뢰도가 높은 배트 하나만 반환 (확률 배열 포함)
        const bestBat = await this.postProcess(predictions, width, height);

        inputTensor.dispose();
        resizedTensor.dispose();
        predictions.forEach(p => p.dispose());

        return bestBat;
    }

    async preProcess(imageSource) {
        const width = imageSource.width || imageSource.videoWidth;
        const height = imageSource.height || imageSource.videoHeight;
        const size = Math.max(width, height);
        const ctx = this.offscreenCanvas.getContext('2d');
        this.offscreenCanvas.width = size;
        this.offscreenCanvas.height = size;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(imageSource, 0, 0, width, height);
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

            // 배트 클래스(34)에 해당하는 스코어만 추출
            const batScores = scores.slice([0, this.batClassId], [-1, 1]).squeeze();

            // 신뢰도가 가장 높은 인덱스 찾기 (임계값 0 적용)
            const bestIdx = batScores.argMax().dataSync()[0];
            const highestConf = batScores.gather(bestIdx).dataSync()[0];

            if (highestConf <= 0) return null; // 감지된 배트 없음

            const box = boxes.gather(bestIdx).dataSync();
            const coeffs = maskCoeffs.gather(bestIdx).expandDims(0);

            // 마스크 생성 (0.5 임계값 적용 전의 Raw 확률값 배열)
            const confidenceMap = this.generateConfidenceMap(proto, coeffs);

            return {
                bbox: [
                    (box[0] - box[2] / 2) * scale,
                    (box[1] - box[3] / 2) * scale,
                    box[2] * scale,
                    box[3] * scale
                ],
                confidence: highestConf, // 객체 자체의 탐지 신뢰도
                maskConfidenceMap: confidenceMap // 2차원 확률 배열 (0.0 ~ 1.0)
            };
        });
    }
    generateConfidenceMap(proto, coeffs) {
        return tf.tidy(() => {
            const [c, h, w] = [32, 160, 160];
            const reshapedProto = proto.reshape([c, h * w]);

            // 1. 마스크 합성 (1x32 * 32x25600 = 1x25600)
            let mask = tf.matMul(coeffs, reshapedProto);

            // 2. 160x160으로 변환 후 활성화 함수 적용
            mask = mask.reshape([h, w]).sigmoid();

            // 640으로 키우지 않고 160x160 배열 상태 그대로 CPU로 가져옵니다.
            return mask.arraySync();
        });
    }
}