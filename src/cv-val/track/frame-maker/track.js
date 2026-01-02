export class TrackFrameMaker {

    constructor() {
        this.conf = 0.01;
        this.instance = null;
    }
    
    setInstance(instance) {
        this.instance = instance;
    }

    setData(trackData) {
        this.trackData = trackData;
    }

    setConf(conf) {
        this.conf = conf;
    }

    getBall(idx) {
        if (idx < 0) return null;
        const ballData = this.trackData.getBallList();
        if (ballData == null) return null;
        if (ballData[idx] == null) return null;
        if (ballData[idx]["confidence"] < this.conf) return null;

        return ballData[idx];
    }

    drawImageAt(idx) {

        if (this.trackData == null) return;

        if (idx < 0) return;

        const ctx = this.instance.getContext('2d');
        const image = this.trackData.getRawImgList(0)[idx];

        this.instance.width = this.instance.clientWidth;
        this.instance.height = this.instance.clientWidth * 0.5;

        if (!image) {
            console.error("Image not found at index", idx);
            return;
        }

        // 1. 캔버스 전체를 검정색으로 채웁니다 (레터박스 배경)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.instance.width, this.instance.height);

        // 2. 이미지와 캔버스의 종횡비를 계산합니다.
        const imageAspectRatio = image.width / image.height;
        const canvasAspectRatio = this.instance.width / this.instance.height;

        let drawWidth;
        let drawHeight;
        let offsetX;
        let offsetY;

        // 3. 종횡비에 따라 이미지를 그릴 크기와 위치를 결정합니다.
        if (imageAspectRatio > canvasAspectRatio) {
            // 이미지가 캔버스보다 가로로 긴 경우 (상하 레터박스)
            drawWidth = this.instance.width;
            drawHeight = this.instance.width / imageAspectRatio;
            offsetX = 0;
            offsetY = (this.instance.height - drawHeight) / 2;
        }
        else {
            // 이미지가 캔버스보다 세로로 긴 경우 (좌우 레터박스)
            drawHeight = this.instance.height;
            drawWidth = this.instance.height * imageAspectRatio;
            offsetX = (this.instance.width - drawWidth) / 2;
            offsetY = 0;
        }

        // 4. 계산된 크기와 위치에 맞춰 이미지를 그립니다.
        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

        // 5. 궤적을 그리는 새로운 로직 추가
        // 궤적을 시작할 때, 이전 프레임의 공 위치 정보가 있어야 합니다.
        ctx.beginPath();
        // 궤적을 위한 스타일 설정
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;

        let startPoint = null;

        for (let i = 0; i <= idx; i++) {
            const current = this.getBall(i); // i로 수정하여 모든 프레임을 순회
            const previous = this.getBall(i - 1);

            // 현재 프레임에서 공이 감지되었는지 확인
            const isCurrentBallDetected = (current !== null);

            // 이전 프레임에서 공이 감지되었는지 확인
            const isPreviousBallDetected = (previous !== null);

            if (isCurrentBallDetected) {

                // 원본 이미지 좌표를 캔버스에 맞게 변환
                const ballX = (current["bbox"][0] + current["bbox"][2] / 2) * (drawWidth / image.width) + offsetX;
                const ballY = (current["bbox"][1] + current["bbox"][3] / 2) * (drawHeight / image.height) + offsetY;

                // 1. 첫 번째 공 감지이거나, 이전 프레임에서 공이 감지되지 않았을 경우 (궤적 끊김)
                if (!isPreviousBallDetected) {
                    // 새로운 궤적 시작
                    ctx.moveTo(ballX, ballY);
                }
                // 2. 이전 프레임에서도 공이 감지되었을 경우 (연속적인 궤적)
                else {
                    // 현재 위치로 선 긋기
                    ctx.lineTo(ballX, ballY);
                }
            }
            else if (isPreviousBallDetected) {
                ctx.stroke();
            }
        }

        ctx.stroke(); // 궤적 그리기 실행

        // 6. 현재 프레임의 공 이미지와 정보 표현
        const ballData = this.getBall(idx);

        if (ballData) {
            const { bbox, confidence } = ballData;

            // 원본 이미지 좌표를 캔버스에 맞게 변환
            const ballX = bbox[0] * (drawWidth / image.width) + offsetX;
            const ballY = bbox[1] * (drawHeight / image.height) + offsetY;
            const ballWidth = bbox[2] * (drawWidth / image.width);
            const ballHeight = bbox[3] * (drawHeight / image.height);

            // 바운딩 박스 그리기
            ctx.strokeStyle = 'blue'; // 궤적과 구분하기 위해 다른 색상 사용
            ctx.lineWidth = 2;
            ctx.strokeRect(ballX, ballY, ballWidth, ballHeight);

            // 신뢰도 텍스트 표시
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(`Confidence: ${confidence.toFixed(2)}`, ballX, ballY - 5);
        }

    }
}