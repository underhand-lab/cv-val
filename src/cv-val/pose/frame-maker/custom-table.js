import { TableVisualizer } from "../../../visualizer/table.js"
import { IPoseFrameMaker } from "./pose.interface.js"


class CustomTableFrameMaker extends IPoseFrameMaker {
    
    constructor() {
        super();
        this.tableVisualizer = null;
        this.analysisTool = null;
    }

    setInstance(instance) {
        this.tableVisualizer = new TableVisualizer(instance);
        this.tableVisualizer.setDefault();

    }

    changeAnalysisTool(analysisTool) {
        this.analysisTool = analysisTool;
        this.setData(this.data);
    }

    setData(data) {
        
        if (data == null) return;
        
        this.data = data;
        let tableData = null;

        if (this.analysisTool == null) tableData = data;
        else tableData = this.analysisTool.calc(data);

        this.tableVisualizer.setData(tableData);

    }

    drawImageAt(idx) {
        this.tableVisualizer.drawImageAt(idx);
    }

}

export { CustomTableFrameMaker }