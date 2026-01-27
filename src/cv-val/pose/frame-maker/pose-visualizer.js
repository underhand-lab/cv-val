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

export class PoseVisualizer {
    /**
     * @param {CanvasRenderingContext2D} ctx 오프스크린 컨텍스트
     * @param {Object} landmarks 랜드마크 데이터
     * @param {number} width 캔버스 너비
     * @param {number} height 캔버스 높이
     */
    draw(ctx, landmarks, width, height) {
        if (!landmarks) return;

        // 2. 뼈대(선) 그리기
        ctx.lineWidth = 8;
        POSE_CONNECTIONS.forEach(([start, end]) => {
            const p1 = landmarks[start];
            const p2 = landmarks[end];

            if (p1 && p2) {
                let color = CONNECTIONS_COLORS[`${start},${end}`] || CONNECTIONS_COLORS[`${end},${start}`] || [255, 255, 255];
                
                ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                ctx.beginPath();
                ctx.moveTo(p1[0] * width, p1[1] * height);
                ctx.lineTo(p2[0] * width, p2[1] * height);
                ctx.stroke();
            }
        });

        // 1. 관절(점) 그리기
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;

        for (let key in landmarks) {
            const [nx, ny] = landmarks[key]; // 정규화된 좌표 (0~1)
            const x = nx * width;
            const y = ny * height;

            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
}