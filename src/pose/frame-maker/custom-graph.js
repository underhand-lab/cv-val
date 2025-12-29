import { GraphVisualizer } from "../../visualizer/graph.js"
import { IPoseFrameMaker } from "./pose.interface.js"


export class CustomGraphFrameMaker extends IPoseFrameMaker {
    
    constructor() {
        super();
        this.tableVisualizer = null;
        this.analysisTool = null;
    }

    setInstance(canvas) {
        this.tableVisualizer = new GraphVisualizer(canvas);
        this.tableVisualizer.setDefault();
    }

    changeAnalysisTool(analysisTool) {
        this.analysisTool = analysisTool;
        this.setData(this.data);
    }

    setData(data) {
        
        if (data == null) return;
        
        this.data = data;
        let graphData = null;

        if (this.analysisTool == null) graphData = data;
        else graphData = this.analysisTool.calc(data);

        this.tableVisualizer.setData(graphData);

    }

    drawImageAt(idx) {
        this.tableVisualizer.drawImageAt(idx);
    }
}