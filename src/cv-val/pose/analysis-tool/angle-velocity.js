import {AngleAnalysisTool} from "./angle.js"

class AngleVelocityAnalysisTool {
    constructor() {
        this.angleCalcer = new AngleAnalysisTool();
    }
    calc(data) {
        const t = this.angleCalcer.calc(data);
        const labels = Object.keys(t);

        let ret = {}

        for (const name of labels) {
            ret[name] = [null];
            
            for (let i = 1; i < t[name].length; i++) {
                if (t[name][i - 1] != null &&
                    t[name][i] != null) {
                        ret[name].push(
                            Math.abs(t[name][i]- t[name][i - 1]));
                    }
            }
        }

        return ret;

    }
}

export {AngleVelocityAnalysisTool}