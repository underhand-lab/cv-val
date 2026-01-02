export class YOLOBallDetector {
    
    constructor(weightURL) {
        this.weightURL = weightURL;
        // 내부 캔버스는 패딩(레터박스) 처리가 필요할 때만 제한적으로 사용합니다.
        this.offscreenCanvas = document.createElement('canvas');
    }

    async initialize() {
        console.log("모델 로딩:", this.weightURL);
        this.detector = await tf.loadGraphModel(this.weightURL);
        await tf.setBackend('webgl'); // 또는 'webgpu' (최신 브라우저)
        await tf.ready();
    }

    /**
     * @param {HTMLCanvasElement | HTMLImageElement | HTMLVideoElement} imageSource 
     */
    async process(imageSource) {
        // 1. 전처리: 소스(캔버스 등)로부터 텐서 생성
        const inputTensor = await this.preProcess(imageSource);

        // 2. 모델 입력 크기(640x640)로 조정 및 정규화
        const resizedTensor = tf.tidy(() => {
            return tf.image.resizeBilinear(inputTensor, [640, 640])
                .div(255.0)
                .expandDims(0);
        });

        // 3. 추론 실행
        const predictions = await this.detector.execute(resizedTensor);
        
        // 4. 후처리 (원본 소스의 크기 전달)
        const detectedObjects = await this.postProcess(
            predictions, 
            imageSource.width || imageSource.videoWidth, 
            imageSource.height || imageSource.videoHeight
        );

        // 5. 메모리 관리
        inputTensor.dispose();
        resizedTensor.dispose();
        // 만약 predictions가 배열로 반환된다면 개별 해제가 필요할 수 있음
        if (Array.isArray(predictions)) {
            predictions.forEach(p => p.dispose());
        } else {
            predictions.dispose();
        }

        return detectedObjects;
    }

    async preProcess(imageSource) {
        const width = imageSource.width || imageSource.videoWidth;
        const height = imageSource.height || imageSource.videoHeight;
        
        // 정방형(Square) 레터박스 처리가 필요한 경우
        const size = Math.max(width, height);
        const ctx = this.offscreenCanvas.getContext('2d');

        this.offscreenCanvas.width = size;
        this.offscreenCanvas.height = size;
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(imageSource, 0, 0, width, height);
        
        // 캔버스 자체를 텐서로 변환
        return tf.browser.fromPixels(this.offscreenCanvas);
    }

    async postProcess(predictions, originalWidth, originalHeight) {
        const outputTensor = predictions;
        const originalSize = Math.max(originalWidth, originalHeight);
        const scale = originalSize / 640;

        // [1, 84, 8400] -> [1, 8400, 84] 전치
        const transposedTensor = tf.transpose(outputTensor, [0, 2, 1]);
        const detections = await transposedTensor.array();

        let bestBallInfo = null;
        let highestConf = -1;
        const classIdToFilter = 32; // 야구공 클래스 ID

        const [allDetections] = detections;

        for (const detection of allDetections) {
            const [x, y, width, height, ...classProbs] = detection;
            const maxProb = Math.max(...classProbs);

            const classId = classProbs.indexOf(maxProb);
            if (classId !== classIdToFilter) continue;
            if (maxProb < highestConf) continue;

            highestConf = maxProb;

            // YOLO 중심점 좌표 -> 좌상단 좌표 변환
            const x1 = (x - width / 2) * scale;
            const y1 = (y - height / 2) * scale;
            const scaledW = width * scale;
            const scaledH = height * scale;

            bestBallInfo = {
                bbox: [x1, y1, scaledW, scaledH],
                confidence: highestConf,
                classId: classId
            };
        }

        transposedTensor.dispose();
        return bestBallInfo;
    }
}

await tf.setBackend('webgl'); // 또는 'webgpu' (최신 브라우저)
await tf.ready();