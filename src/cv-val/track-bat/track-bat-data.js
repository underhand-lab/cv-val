class TrackBatData {
    constructor() {
        this.rawImgListList = [];
        this.batList = [];
    }

    initialize(videoMetaDataList) {

        this.videoMetaDataList = videoMetaDataList;
        
        this.rawImgListList =
            Array.from({ length: videoMetaDataList.length }, () => []);
    }

    addDataAt(idx, rawImg, data) {
        this.rawImgListList[idx].push(rawImg);
        this.batList.push(data);
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
    
    getBatList() {
        return this.batList;
    }

}

export { TrackBatData };