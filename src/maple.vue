<template>
    <div id="maple-table">
        <hot-table
            :settings="settings"
            ref="mapleTable"
            :data="value"
            :columns="myColumns"
            id="maple-handsontable"
            :style="customStyle"
        />
        <MapleDatePicker ref="datePickerRef" />
        <MapleCascader ref="cascaderRef" />
        <div
            class="empty"
            v-if="!value.length && !settings.minRows && !settings.minSpareRows"
        >
            暂无数据
        </div>
    </div>
</template>

<script>
import { HotTable } from "@handsontable/vue";
import {
    customColumns,
    beforeChange,
    afterValidate,
    afterOnCellMouseDown,
    colHeaders
} from "./utils/handsontable";
import MapleCascader from "./components/MapleCascader";
import MapleDatePicker from "./components/MapleDatePicker";

export default {
    name: "handsontable",
    props: {
        value: {
            required: true,
            type: Array
        },
        columns: {
            required: true,
            type: Array
        },
        options: {
            type: Object
        },
        widthAuto: {
            type: Boolean
        },
        customStyle: {
            type: Object
        }
    },
    data() {
        return {
            configs: {
                hiddenColumns: true,
                persistentState: true,
                viewportColumnRenderingOffset: 128,
                licenseKey: "non-commercial-and-evaluation",
                language: "zh-CN",
                className: "htCenter htMiddle",
                bindRowsWithHeaders: true,
                manualColumnMove: true,
                rowHeaders: true,
                readOnlyCellClassName: "maple-readOnly-cell",
                comments: true,
                renderAllRows: false,
                manualColumnResize: true,
                manualRowResizeboolean: true,
                contextMenu: {
                    items: {
                        row_above: {},
                        row_below: {},
                        remove_row: {},
                        clear_column: {},
                        hidden_columns_hide: {
                            name: "隐藏列"
                        },
                        hidden_columns_show: {
                            name: "展示列"
                        },
                        undo: {},
                        redo: {},
                        cut: {},
                        copy: {}
                    }
                }
            },
            keyOpts: {},
            selectVals: {},
            core: null,
            hasColumnSummary: false,
            validate: {},
            checkboxAllIndex: -1208,
            checkedabled: false,
            tableData: []
        };
    },
    computed: {
        settings() {
            return {
                ...this.configs,
                ...this.options,
                beforeChange: beforeChange.bind(this),
                afterValidate: afterValidate.bind(this),
                afterOnCellMouseDown: afterOnCellMouseDown.bind(this),
                colHeaders: colHeaders.bind(this)
            };
        },
        myColumns() {
            return customColumns.call(this);
        }
    },
    components: { HotTable, MapleCascader, MapleDatePicker },
    created() {
        this.$nextTick(() => {
            this.core = this.$refs.mapleTable.hotInstance;
            this.$emit("getCore", this.core);
        });
    },
    mounted() {
        this.hasColumnSummary = !!(
            this.settings.summaryColumn && this.settings.summaryColumn.length
        );
        this.$el.addEventListener("dblclick", this.cellDblClick);
        this.$el.addEventListener("click", this.cellClick);
    },
    methods: {
        cellClick(mouseEvent) {
            const $el = mouseEvent.target;
            if ($el.id === "maple-all-checkbox") {
                const c = JSON.parse(
                    localStorage.getItem(
                        "maple-handsontable_manualColumnMove"
                    ) || "[]"
                );
                for (let [index, item] of c.entries()) {
                    if (item === this.checkboxAllIndex) {
                        this.checkboxAllIndex = index;
                        break;
                    }
                }
                let checkAllableds = [];
                this.checkedabled = $el.checked;
                for (let i = 0; i < this.core.countRows(); i++) {
                    if (
                        this.hasColumnSummary &&
                        i === this.core.countRows() - 1
                    ) {
                        break;
                    }
                    checkAllableds.push([
                        i,
                        this.checkboxAllIndex,
                        this.checkedabled
                    ]);
                }
                this.core.setDataAtCell(checkAllableds);
            }
            this.$emit("cellsClick", mouseEvent);
        },
        cellDblClick(mouseEvent) {
            const [[row, col]] = this.core.getSelected() || [[]];
            if (this.columns[col] == null) return;
            const reg = /(<\/?span.*?>)/gi;
            const $el = mouseEvent.target;
            const { width, top, left, height } = $el.getBoundingClientRect();
            const i = this.columns.findIndex(item => {
                let title = this.core.getColHeader(col);
                if (title && title.includes("</span>")) {
                    title = title.replace(reg, "");
                    title = title.trim();
                }
                return item.title === title;
            });
            if (i < 0) return;
            let { subType, readOnly = false, editor = true } = this.columns[i];

            if (subType === "address") subType = "cascader";
            if (
                this.$refs[`${subType}Ref`] &&
                row >= 0 &&
                !readOnly &&
                editor &&
                ((this.hasColumnSummary && row !== this.core.countRows() - 1) ||
                    !this.hasColumnSummary)
            ) {
                const customCellDblClick = this.settings.customCellDblClick;
                if (customCellDblClick instanceof Function) {
                    if (
                        customCellDblClick({
                            row,
                            col,
                            nowCol: col,
                            $el,
                            core: this.core
                        })
                    ) {
                        return;
                    }
                }

                this.$refs[`${subType}Ref`].controlOpen({
                    nowCol: col,
                    col: i,
                    row,
                    width,
                    height,
                    top,
                    left,
                    open: true,
                    core: this.core,
                    columns: this.columns
                });
            }
            this.$emit("cellDblClick", {
                mouseEvent,
                $el,
                coord: {
                    row,
                    col: i,
                    nowCol: col
                }
            });
        },
        getKeyChange(key, changes, filterSummaryRow = true, precise = true) {
            let o = [];

            for (let item of changes.values()) {
                if (
                    filterSummaryRow &&
                    this.hasColumnSummary &&
                    item[0] === this.core.countRows() - 1
                ) {
                    return o;
                }
                if (precise) {
                    if (item[1] === key && item[2] !== item[3]) {
                        o.push(item);
                    }
                } else if (item[1] === key) {
                    o.push(item);
                }
            }
            return o;
        },
        filterKeysChanges({
            keys,
            changes,
            callback,
            filterSummaryRow = true,
            precise = true // 精确过滤
        }) {
            for (let [index, item] of changes.entries()) {
                const [row, key, oldVal, newVal] = item;
                const i = keys.indexOf(key);

                if (
                    filterSummaryRow &&
                    this.hasColumnSummary &&
                    row === this.core.countRows() - 1
                ) {
                    return;
                }
                if (precise) {
                    if (keys[i] === key && oldVal !== newVal) {
                        callback({
                            row,
                            key,
                            oldVal,
                            newVal,
                            changeCurrentCell: item,
                            index
                        });
                    }
                } else if (keys[i] === key) {
                    callback({
                        row,
                        key,
                        oldVal,
                        newVal,
                        changeCurrentCell: item,
                        index
                    });
                }
            }
        },
        sum(o) {
            let sumKey = [];
            if (this.settings.summaryColumn instanceof Array) {
                this.settings.summaryColumn.forEach(item => {
                    if (item.type === "sum") {
                        sumKey.push(item.key);
                    }
                });
            }
            o.filterKeysChanges({
                filterSummaryRow: true, // 过滤监听合计一行的数据变化，默认是true，即过滤
                changes: o.changes,
                keys: sumKey,
                callback: ({ key, oldVal, newVal }) => {
                    let diff = 0,
                        lastData = this.value[this.value.length - 1];

                    newVal = newVal - 0 || 0;
                    oldVal = oldVal - 0 || 0;
                    diff = newVal - oldVal;
                    lastData[key] = (lastData[key] - 0 || 0) + diff;
                }
            });
        }
    },
    destroyed() {
        Object.assign(this.$data, {});
        this.$el.removeEventListener("dblclick", this.cellDblClick);
        this.$el.removeEventListener("click", this.cellClick);
    }
};
</script>

<style scoped>
@import url("./scoped.css");
</style>
