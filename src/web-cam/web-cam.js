let localStream = null; // 스트림을 저장할 변수

export const video = document.createElement('video');
video.autoplay = true;

// [시작] 버튼 함수
export async function startCamera() {
    try {
        // 이미 스트림이 있다면 중복 실행 방지
        if (localStream) return;

        localStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: 'environment',
                width: {ideal: 640},
                height: {ideal: 640},
                frameRate: {
                    ideal: 60,
                    max: 120
                }
            }
        });
        video.srcObject = localStream;
    } catch (err) {
        console.error("에러 발생:", err);
    }
}

// [정지] 버튼 함수
export function stopCamera() {
    if (localStream) {
        // 모든 트랙(비디오, 오디오 등)을 찾아서 정지시킴
        const tracks = localStream.getTracks();

        tracks.forEach(track => {
            track.stop(); // 하드웨어(카메라 불빛)가 꺼짐
        });

        video.srcObject = null; // 비디오 화면 초기화
        localStream = null;     // 변수 초기화
    }
}
