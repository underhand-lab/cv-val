import * as Table from "../../visualizer/lib/table.js"

class CustomTableFrameMaker {
    
    constructor() {
        this.table = null;
        this.analysisTool = null;
        this.conf = 1;
    }

    setInstance(canvas) {
        this.table = new Table.Table(canvas);
    }

    changeAnalysisTool(analysisTool) {
        this.analysisTool = analysisTool;
        this.setData(this.data);
    }

    setConf(conf) {
        this.conf = conf;
    }

    setData(data) {
        
        if (data == null) return;

        if (this.analysisTool == null) this.data = data;
        else this.data = this.analysisTool.calc(data);

    }

    drawImageAt(idx) {
        if (this.data == null) return;
        
        let d = {}

        for (let key of Object.keys(this.data)) {
            if (key == "confidence") continue;
            if (this.data["confidence"][idx] < this.conf) {
                d[key] = null;
                continue;
            }
            d[key] = this.data[key][idx].toFixed(2);
        }

        this.table.setData(d);
    }

}

export { CustomTableFrameMaker }