import { IPoseFrameMaker } from "./pose.interface.js"

const POSE_CONNECTIONS = [
    ["L_SHOULDER", "L_ELBOW"],
    ["L_ELBOW", "L_WRIST"],
    ["R_SHOULDER", "R_ELBOW"],
    ["R_ELBOW", "R_WRIST"],
    ["L_HIP", "L_KNEE"],
    ["L_KNEE", "L_ANKLE"],
    ["L_ANKLE", "L_HEEL"],
    ["L_HEEL", "L_FOOT_INDEX"],
    ["R_HIP", "R_KNEE"],
    ["R_KNEE", "R_ANKLE"],
    ["R_ANKLE", "R_HEEL"],
    ["R_HEEL", "R_FOOT_INDEX"],
    ["L_SHOULDER", "R_SHOULDER"],
    ["L_HIP", "R_HIP"],
    ["L_SHOULDER", "L_HIP"],
    ["R_SHOULDER", "R_HIP"]
]

const COLOR_LEFT_ARM = [255, 0, 0]        // Blue (Left Arm)
const COLOR_RIGHT_ARM = [0, 0, 255]       // Red (Right Arm)
const COLOR_LEFT_LEG = [255, 255, 0]      // Cyan (Left Leg)
const COLOR_RIGHT_LEG = [0, 255, 255]     // Yellow (Right Leg)
const COLOR_TORSO = [0, 255, 0]           // Green (Torso)
const COLOR_HEAD_NECK = [255, 255, 255]   // White (Head/Neck)

const CONNECTIONS_COLORS = {
    // Arms
    ["L_SHOULDER,L_ELBOW"]: COLOR_LEFT_ARM,
    ["L_ELBOW,L_WRIST"]: COLOR_LEFT_ARM,
    ["R_SHOULDER,R_ELBOW"]: COLOR_RIGHT_ARM,
    ["R_ELBOW,R_WRIST"]: COLOR_RIGHT_ARM,

    // Legs
    ["L_HIP,L_KNEE"]: COLOR_LEFT_LEG,
    ["L_KNEE,L_ANKLE"]: COLOR_LEFT_LEG,
    ["L_ANKLE,L_HEEL"]: COLOR_LEFT_LEG,
    ["L_HEEL,L_FOOT_INDEX"]: COLOR_LEFT_LEG,
    ["R_HIP,R_KNEE"]: COLOR_RIGHT_LEG,
    ["R_KNEE,R_ANKLE"]: COLOR_RIGHT_LEG,
    ["R_ANKLE,R_HEEL"]: COLOR_RIGHT_LEG,
    ["R_HEEL,R_FOOT_INDEX"]: COLOR_RIGHT_LEG,

    // Torso
    ["L_SHOULDER,R_SHOULDER"]: COLOR_TORSO,
    ["L_HIP,R_HIP"]: COLOR_TORSO,
    ["L_SHOULDER,L_HIP"]: COLOR_TORSO,
    ["R_SHOULDER,R_HIP"]: COLOR_TORSO,

    // Head/Neck [Nose to shoulders to represent neck for simplified face"]
    ["NOSE,L_SHOULDER"]: COLOR_HEAD_NECK,
    ["NOSE,R_SHOULDER"]: COLOR_HEAD_NECK,

}
// IPoseFrameMaker 인터페이스는 JavaScript에서 클래스를 통해 구현합니다.
// IPoseFrameMaker를 위한 클래스 (추상화)

// Python의 PoseFrameMaker 클래스를 JavaScript로 변환
export class PoseBoneFrameMaker extends IPoseFrameMaker {
    constructor() {
        super();
        this.targetIdx = 0;
        this.canvas = null;
    }
    setInstance(canvas) {
        this.canvas = canvas;
        
    }

    setData(processedData) {
        if (processedData == null) return;

        this.processedData = processedData;
        this.size = processedData.getVideoMetadata(this.targetIdx);
        this.rawImgList = processedData.getRawImgList(this.targetIdx);
        this.landmark2dList = processedData.getLandmarks2dList(this.targetIdx);

    }

    drawImageAt(idx) {
        if (this.processedData == null) return;

        const ctx = this.canvas.getContext('2d');
        const image = this.rawImgList[idx];

        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientWidth * 0.5;

        if (!image) {
            console.error("Image not found at index", idx);
            return;
        }

        // 1. 캔버스 전체를 검정색으로 채웁니다 (레터박스 배경)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. 이미지와 캔버스의 종횡비를 계산합니다.
        const imageAspectRatio = image.width / image.height;
        const canvasAspectRatio = this.canvas.width / this.canvas.height;

        let drawWidth;
        let drawHeight;
        let offsetX;
        let offsetY;

        // 3. 종횡비에 따라 이미지를 그릴 크기와 위치를 결정합니다.
        if (imageAspectRatio > canvasAspectRatio) {
            // 이미지가 캔버스보다 가로로 긴 경우 (상하 레터박스)
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imageAspectRatio;
            offsetX = 0;
            offsetY = (this.canvas.height - drawHeight) / 2;
        }
        else {
            // 이미지가 캔버스보다 세로로 긴 경우 (좌우 레터박스)
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * imageAspectRatio;
            offsetX = (this.canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        // 4. 계산된 크기와 위치에 맞춰 이미지를 그립니다.
        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

        // 5. 포즈 랜드마크도 동일한 비율과 위치에 맞춰 그립니다.
        drawLandmarks(ctx, this.landmark2dList[idx], drawWidth, drawHeight, offsetX, offsetY);
    }
}

function drawLandmarks(ctx, landmarks, drawWidth, drawHeight, offsetX, offsetY) {
    if (!landmarks) return;

    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'white';
    ctx.lineWidth = 2;

    for (let key in landmarks) {
        const landmark = landmarks[key];
        const x = landmark[0] * drawWidth + offsetX;
        const y = landmark[1] * drawHeight + offsetY;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    POSE_CONNECTIONS.forEach((value) => {

        const start = value[0];
        const end = value[1];
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];

        if (startPoint && endPoint) {
            let color = CONNECTIONS_COLORS[`${start},${end}`];
            if (!color) {
                color = CONNECTIONS_COLORS[`${end},${start}`];
            }

            ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            ctx.beginPath();
            ctx.moveTo(startPoint[0] * drawWidth + offsetX, startPoint[1] * drawHeight + offsetY);
            ctx.lineTo(endPoint[0] * drawWidth + offsetX, endPoint[1] * drawHeight + offsetY);
            ctx.stroke();
        }
    });
}