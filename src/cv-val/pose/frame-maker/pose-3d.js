import { IPoseFrameMaker } from "./pose.interface.js";
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

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
];

const CONNECTIONS_COLORS_RGB = {
    "L_SHOULDER,L_ELBOW": [255, 0, 0],
    "L_ELBOW,L_WRIST": [255, 0, 0],
    "R_SHOULDER,R_ELBOW": [0, 0, 255],
    "R_ELBOW,R_WRIST": [0, 0, 255],
    "L_HIP,L_KNEE": [255, 255, 0],
    "L_KNEE,L_ANKLE": [255, 255, 0],
    "L_ANKLE,L_HEEL": [255, 255, 0],
    "L_HEEL,L_FOOT_INDEX": [255, 255, 0],
    "R_HIP,R_KNEE": [0, 255, 255],
    "R_KNEE,R_ANKLE": [0, 255, 255],
    "R_ANKLE,R_HEEL": [0, 255, 255],
    "R_HEEL,R_FOOT_INDEX": [0, 255, 255],
    "L_SHOULDER,R_SHOULDER": [0, 255, 0],
    "L_HIP,R_HIP": [0, 255, 0],
    "L_SHOULDER,L_HIP": [0, 255, 0],
    "R_SHOULDER,R_HIP": [0, 255, 0],
    "NOSE,L_SHOULDER": [255, 255, 255],
    "NOSE,R_SHOULDER": [255, 255, 255],
};

export class Pose3DFrameMaker extends IPoseFrameMaker {
    constructor() {
        super();
        this.canvas3d = null;
    }
    setInstance(canvas3d) {
        this.canvas3d = canvas3d;
        this.init3DScene();
    }

    init3DScene() {
        this.scene = new THREE.Scene();
        
        // 캔버스의 초기 클라이언트 크기를 사용
        const initialWidth = this.canvas3d.clientWidth;
        const initialHeight = this.canvas3d.clientHeight;

        this.camera = new THREE.PerspectiveCamera(75, initialWidth / initialHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas3d, antialias: true });
        
        // 렌더러의 크기만 설정하고 스타일은 CSS가 관리하도록 설정
        this.renderer.setSize(initialWidth, initialHeight, false);
        this.camera.position.z = 2;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.directionalLight.position.set(5, 5, 5);
        this.scene.add(this.directionalLight);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.animate();
    }

    onWindowResize() {
        // 캔버스의 실제 클라이언트 크기를 사용
        const newWidth = this.canvas3d.clientWidth;
        const newHeight = this.canvas3d.clientHeight;

        this.camera.aspect = newWidth / newHeight;
        this.camera.updateProjectionMatrix();

        // 렌더러의 크기만 설정하고 스타일은 변경하지 않음 (false)
        this.renderer.setSize(newWidth, newHeight, false); 
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setData(processedData) {
        if (processedData == null) return;
        this.processedData = processedData;
        this.targetIdx = 0;
        this.landmark3dList = processedData.getLandmarks3d(this.targetIdx);
        this.lastIdx = 0;
    }

    drawImageAt(idx) {
        if (this.processedData == null) return;

        this.lastIdx = idx;
        const landmarks3d = this.landmark3dList[idx];

        while(this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        this.scene.add(this.directionalLight);

        if (!landmarks3d || Object.keys(landmarks3d).length === 0) {
            return;
        }

        const jointPositions = {};
        const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);

        for (const key in landmarks3d) {
            const landmark = landmarks3d[key];
            const position = new THREE.Vector3(landmark[0], landmark[1], -landmark[2]);
            jointPositions[key] = position;

            const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.copy(position);
            this.scene.add(sphere);
        }

        POSE_CONNECTIONS.forEach(connection => {
            const startKey = connection[0];
            const endKey = connection[1];
            const startPoint = jointPositions[startKey];
            const endPoint = jointPositions[endKey];
            
            if (startPoint && endPoint) {
                let color = CONNECTIONS_COLORS_RGB[`${startKey},${endKey}`];
                if (!color) {
                    color = CONNECTIONS_COLORS_RGB[`${endKey},${startKey}`];
                }

                const lineMaterial = new THREE.LineBasicMaterial({
                    color: new THREE.Color(`rgb(${color[0]}, ${color[1]}, ${color[2]})`)
                });
                const points = [startPoint, endPoint];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                this.scene.add(line);
            }
        });
    }
}