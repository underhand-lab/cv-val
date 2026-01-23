import { YOLOBallDetector } from '../../src/track/ball-detector/index.js';

let detector = null;
let isInitialized = false;

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        try {
            detector = new YOLOBallDetector(payload.weightURL);
            await tf.setBackend('webgl'); // 워커 내 GPU 가속 활성화
            await detector.initialize();
            isInitialized = true;
            self.postMessage({ type: 'INIT_DONE' });
        } catch (err) {
            console.error("Worker 초기화 실패:", err);
        }
    }

    if (type === 'PROCESS') {
        if (!isInitialized || !detector) {
            if (payload.bitmap) payload.bitmap.close();
            return;
        }

        try {
            // 추론 실행
            const result = await detector.process(payload.bitmap);
            // 소유권이 이전된 비트맵은 사용 후 명시적으로 닫아야 메모리 누수가 없음
            payload.bitmap.close(); 
            self.postMessage({ type: 'RESULT', payload: { result } });
        } catch (err) {
            console.error("Worker 추론 에러:", err);
            if (payload.bitmap) payload.bitmap.close();
        }
    }
};