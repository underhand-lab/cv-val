
import * as Calc from "./velocity.js"

class BallAnalysisTool {
    calc(data) {
        
        if (!data) return;
        
        let tableData = {
            "속도(km/h)": [ null ],
            "각도(도)": [ null ],
            "confidence": [ null ]
        }

        const ballList = data.getBallList();

        for (let i = 1; i < data.getFrameCnt(); i++) {
            tableData["속도(km/h)"].push(
                Calc.calcVelocity(
                    ballList[i - 1],
                    ballList[i],
                    data.getVideoMetadata(0)["fps"]));

            tableData["각도(도)"].push(
                Calc.calcAngle(
                    ballList[i - 1],
                    ballList[i]));
            
            const conf1 = ballList[i - 1] ? ballList[i - 1]["confidence"] : 0;
            const conf2 = ballList[i] ? ballList[i]["confidence"] : 0;

            tableData["confidence"].push(conf1 > conf2 ? conf2 : conf1);
        }
        
        return tableData

    }
}

export { BallAnalysisTool }