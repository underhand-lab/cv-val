class TrackBallData {
    constructor() {
        this.rawImgListList = [];
        this.ballList = [];
    }

    initialize(videoMetaDataList) {

        this.videoMetaDataList = videoMetaDataList;
        
        this.rawImgListList =
            Array.from({ length: videoMetaDataList.length }, () => []);
    }

    addDataAt(idx, rawImg, data) {
        this.rawImgListList[idx].push(rawImg);
        this.ballList.push(data);
    }

    getVideoMetadata(idx) {
        return this.videoMetaDataList[idx];
    }

    getFrameCnt() {
        if (this.rawImgListList.length > 0) {
            return this.rawImgListList[0].length;
        }
        return 0;
    }

    getRawImgList(idx) {
        return this.rawImgListList[idx];
    }
    
    getBallList() {
        return this.ballList;
    }
    
}

export { TrackBallData };