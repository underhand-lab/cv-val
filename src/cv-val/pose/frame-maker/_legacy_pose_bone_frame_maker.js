import { IPoseFrameMaker } from "./pose.js"

const POSE_CONNECTIONS = [
    ("L_SHOULDER","L_ELBOW"),
    ("L_ELBOW","L_WRIST"),
    ("R_SHOULDER","R_ELBOW"),
    ("R_ELBOW","R_WRIST"),
    ("L_HIP","L_KNEE"),
    ("L_KNEE","L_ANKLE"),
    ("L_ANKLE","L_HEEL"),
    ("L_HEEL","L_FOOT_INDEX"),
    ("R_HIP","R_KNEE"),
    ("R_KNEE","R_ANKLE"),
    ("R_ANKLE","R_HEEL"),
    ("R_HEEL","R_FOOT_INDEX"),
    ("L_SHOULDER","R_SHOULDER"),
    ("L_HIP","R_HIP"),
    ("L_SHOULDER","L_HIP"),
    ("R_SHOULDER","R_HIP")
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
    constructor(canvas) {
        super();
        this.raw_img_list = null
        this.target_idx = 0;
        this.canvas = canvas;
    }

    set_data(raw_img_list, landmark_2d_list, visibility_score_list) {
        this.raw_img_list = raw_img_list;
        this.landmarks_2d_list = landmark_2d_list;
        this.visibility_list = visibility_score_list;
    }
/*
    set_data(data, df) {
        if (!data) return;
        this.df = df;
        this.bv_data = data;
        this.raw_img_list = data.get_raw_img_list(this.target_idx);
        this.landmarks_2d_list = data.get_landmarks_2d_list(this.target_idx);
        this.visibility_list = data.get_visibility_score_list(this.target_idx);
    }
*/
/*
    get_size() {
        const width = this.bv_data.raw_video_width_list[this.target_idx];
        const height = this.bv_data.raw_video_height_list[this.target_idx];
        return { width: parseInt(width), height: parseInt(height) };
    }
*/
    get_img_at(idx) {
        if (this.raw_img_list == null) return;
        if (idx >= this.raw_img_list.length) {
            return null;
        }
        return draw_pose_on_frame(
            this.raw_img_list[idx],
            this.landmarks_2d_list[idx],
            this.visibility_list[idx]
        );
    }
}

// Python의 PoseOnlyFrameMaker 클래스를 JavaScript로 변환
export class PoseOnlyFrameMaker extends IPoseFrameMaker {
    constructor(data = null, df = null) {
        super();
        this.set_data(data, df);
        this.target_idx = 0;
    }

    set_data(data, df) {
        if (!data) return;
        this.df = df;
        this.bv_data = data;
        this.landmark_2d_list = data.get_landmarks_2d_list(this.target_idx);
        this.visibility_list = data.get_visibility_score_list(this.target_idx);
    }

    get_size() {
        const width = this.bv_data.raw_video_width_list[this.target_idx];
        const height = this.bv_data.raw_video_height_list[this.target_idx];
        return { width: parseInt(width), height: parseInt(height) };
    }

    get_img_at(idx) {
        if (idx >= this.bv_data.get_frame_cnt()) {
            return null;
        }
        // NumPy의 np.zeros_like와 유사한 기능
        const img = new cv.Mat(
            this.bv_data.get_raw_img_list(this.target_idx)[0].rows,
            this.bv_data.get_raw_img_list(this.target_idx)[0].cols,
            this.bv_data.get_raw_img_list(this.target_idx)[0].type(),
            new cv.Scalar(0, 0, 0)
        );

        return draw_pose_on_frame(
            img,
            this.landmark_2d_list[idx],
            this.visibility_list[idx]
        );
    }
}

function draw_landmarks_custom(image, landmarks_dict, image_width, image_height, visibility_dict) {
    for (const key in landmarks_dict) {
        const coord = landmarks_dict[key];
        const landmark_x = coord[0];
        const landmark_y = coord[1];

        const center_coordinates = new cv.Point(
            parseInt(landmark_x * image_width),
            parseInt(landmark_y * image_height)
        );

        if (key === 'nose') { // 코 랜드마크 그리기
            cv.circle(image, center_coordinates, 5, new cv.Scalar(255, 255, 255, 255), -1); // 흰색
        } else if (JOINTS[key]) {
            cv.circle(image, center_coordinates, 2, new cv.Scalar(64, 64, 64, 255), -1); // 회색
        }
    }
}

function draw_connections_custom(image, landmarks_dict, image_width, image_height, visibility_dict) {
    for (const connection of POSE_CONNECTIONS) {
        const idx1 = connection[0];
        const idx2 = connection[1];
        
        let color = CONNECTIONS_COLORS[`${idx1},${idx2}`];
        if (!color) {
            color = CONNECTIONS_COLORS[`${idx2},${idx1}`];
        }

        if (color) {
            const point1 = new cv.Point(
                parseInt(landmarks_dict[idx1][0] * image_width),
                parseInt(landmarks_dict[idx1][1] * image_height)
            );
            const point2 = new cv.Point(
                parseInt(landmarks_dict[idx2][0] * image_width),
                parseInt(landmarks_dict[idx2][1] * image_height)
            );
            cv.line(image, point1, point2, new cv.Scalar(color[0], color[1], color[2], 255), 2);
        }
    }
}

function draw_pose_on_frame(background_mat, pose_landmarks_2d, visibility_score) {
    if (!pose_landmarks_2d || !visibility_score) {
        return background_mat;
    }
    
    const img = background_mat.clone();
    const w = img.cols;
    const h = img.rows;

    draw_connections_custom(img, pose_landmarks_2d, w, h, visibility_score);
    draw_landmarks_custom(img, pose_landmarks_2d, w, h, visibility_score);
    
    return img;
}