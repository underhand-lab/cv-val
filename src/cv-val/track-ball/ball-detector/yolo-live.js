export class YOLOLiveBallDetector {

    constructor(weightURL) {
        this.weightURL = weightURL;
        this.offscreenCanvas = document.createElement('canvas');
        this.detector = null;
        
        // --- 다중 히스토리 관리 ---
        this.prevCandidates = []; // 이전 프레임의 후보군 배열
        this.trackingWeight = 0.35; // 가중치 비중
        this.historyThreshold = 0.25; // 히스토리에 저장할 최소 신뢰도
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

        const transposedTensor = tf.transpose(outputTensor, [0, 2, 1]);
        const detections = await transposedTensor.array();
        const [allDetections] = detections;

        let bestBallInfo = null;
        let highestFinalScore = -1;
        const currentCandidates = []; // 이번 프레임에서 발견된 후보들을 담을 배열
        const classIdToFilter = 32;

        const maxDiagonal = Math.sqrt(Math.pow(originalWidth, 2) + Math.pow(originalHeight, 2));

        for (const detection of allDetections) {
            const [x, y, width, height, ...classProbs] = detection;
            const maxProb = Math.max(...classProbs);
            const classId = classProbs.indexOf(maxProb);

            if (classId !== classIdToFilter) continue;

            let finalScore = maxProb;

            // --- 모든 이전 후보들과 비교하여 최대 가중치 탐색 ---
            if (this.prevCandidates.length > 0) {
                let maxBonus = 0;
                const currX = x * scale;
                const currY = y * scale;

                for (const prev of this.prevCandidates) {
                    const prevX = prev.bbox[0] + prev.bbox[2] / 2;
                    const prevY = prev.bbox[1] + prev.bbox[3] / 2;

                    const distance = Math.sqrt(Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2));
                    const proximity = Math.max(0, 1 - (distance / (maxDiagonal * 0.12))); // 근접성 점수

                    // 이전 후보의 신뢰도가 높을수록 더 큰 보너스 부여
                    const bonus = proximity * prev.confidence * this.trackingWeight;
                    if (bonus > maxBonus) maxBonus = bonus;
                }
                finalScore += maxBonus;
            }

            const x1 = (x - width / 2) * scale;
            const y1 = (y - height / 2) * scale;
            const scaledW = width * scale;
            const scaledH = height * scale;

            const currentCandidate = {
                bbox: [x1, y1, scaledW, scaledH],
                confidence: maxProb,
                finalScore: finalScore,
                classId: classId
            };

            // 히스토리에 저장 (일정 수준 이상인 것들만)
            if (maxProb > this.historyThreshold) {
                currentCandidates.push(currentCandidate);
            }

            // 화면에 그릴 최종 'Best' 선정
            if (finalScore > highestFinalScore) {
                highestFinalScore = finalScore;
                bestBallInfo = currentCandidate;
            }
        }

        // 히스토리 교체 (현재 후보들이 다음 프레임의 이전 후보가 됨)
        this.prevCandidates = currentCandidates;

        transposedTensor.dispose();
        return bestBallInfo;
    }
}

await tf.setBackend('webgl'); // 또는 'webgpu' (최신 브라우저)
await tf.ready();