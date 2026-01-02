class PoseData {
    constructor() {
        this.rawImgListList = [];
        this.landmarks3dList = [];
        this.landmarks2dListList = [];
        this.visibilityScoreListList = [];
    }

    initialize(videoMetaDataList) {

        this.videoMetaDataList = videoMetaDataList;

        this.rawImgListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.landmarks2dListList = Array.from({ length: videoMetaDataList.length }, () => []);
        this.visibilityScoreListList = Array.from({ length: videoMetaDataList.length }, () => []);

    }

    addDataAt(idx, rawImg, data) {
        this.rawImgListList[idx].push(rawImg);
        this.landmarks2dListList[idx].push(data.landmarks2dList[idx]);
        this.visibilityScoreListList[idx].push(data.visibilityScoreList[idx]);

        this.landmarks3dList.push(data.landmarks3d);
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

    getLandmarks3d() {
        return this.landmarks3dList;
    }

    getLandmarks2dList(idx) {
        return this.landmarks2dListList[idx];
    }

    getVisibilityScoreList(idx) {
        return this.visibilityScoreListList[idx];
    }
}

export { PoseData };