// media_pipe_pose_detector.js
import { PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const MEDIAPIPE_LANDMARK_NAMES = {
    0: 'NOSE', 1: 'L_EYE_INNER', 2: 'L_EYE', 3: 'L_EYE_OUTER',
    4: 'R_EYE_INNER', 5: 'R_EYE', 6: 'R_EYE_OUTER',
    7: 'L_EAR', 8: 'R_EAR', 9: 'L_MOUTH', 10: 'R_MOUTH',
    11: 'L_SHOULDER', 12: 'R_SHOULDER', 13: 'L_ELBOW', 14: 'R_ELBOW',
    15: 'L_WRIST', 16: 'R_WRIST', 17: 'L_PINKY', 18: 'R_PINKY',
    19: 'L_INDEX', 20: 'R_INDEX', 21: 'L_THUMB', 22: 'R_THUMB',
    23: 'L_HIP', 24: 'R_HIP', 25: 'L_KNEE', 26: 'R_KNEE',
    27: 'L_ANKLE', 28: 'R_ANKLE', 29: 'L_HEEL', 30: 'R_HEEL',
    31: 'L_FOOT_INDEX', 32: 'R_FOOT_INDEX'
};

export class MediaPipePoseDetector {
    poseDetector = undefined;

    constructor(option) {
        // 더 이상 내부 canvas가 필요하지 않습니다.
        this.option = option;
        this.frameIdx = 0;
    }

    async initialize() {
        console.log("MediaPipe Pose 초기화 중...");
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
            );

            this.poseDetector = await PoseLandmarker.createFromOptions(
                vision,
                {
                    baseOptions: { modelAssetPath: this.option },
                    runningMode: "VIDEO", // ImageBitmap을 VIDEO 모드 타임스탬프와 함께 사용
                    minPoseDetectionConfidence: 0.3,
                    minTrackingConfidence: 0.3
                }
            );
        } catch (error) {
            console.error("PoseLandmarker 초기화 중 오류 발생:", error);
        }
    }

    /**
     * @param {ImageBitmap} image - 입력 이미지 비트맵
     */
    async process(image) {
        if (!this.poseDetector) {
            console.error('PoseLandmarker가 초기화되지 않았습니다.');
            return null;
        }

        // [수정 포인트] canvas에 그리지 않고 ImageBitmap을 직접 전달합니다.
        // detectForVideo(imageSource, timestamp)
        const results = await this.poseDetector.detectForVideo(image, this.frameIdx);

        // 프레임 인덱스(타임스탬프 대용) 증가
        this.frameIdx++;

        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks2d = results.landmarks[0].map(l => [l.x, l.y, l.z]);
            const landmarks3d = results.worldLandmarks[0].map(l => [l.x, -l.y, l.z]);
            const visibilityScores = results.landmarks[0].map(l => l.visibility);

            return {
                landmarks3d: this._arrayToDict(landmarks3d),
                landmarks2dList: [this._arrayToDict(landmarks2d)], // 이전 인터페이스 유지
                visibilityScoreList: [this._arrayToDict(visibilityScores, 'visibility')],
            };
        }

        return null;
    }

    _arrayToDict(arr, valueKey = null) {
        if (!arr) return null;
        const result = {};
        for (let i = 0; i < arr.length; i++) {
            const landmarkName = MEDIAPIPE_LANDMARK_NAMES[i];
            result[landmarkName] = arr[i];
        }
        return result;
    }
}