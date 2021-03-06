<template>
    <el-cascader
        v-if="cascaderAbled"
        ref="cascaderRef"
        v-model="value"
        :options="options"
        clearable
        filterable
        size="mini"
        :style="{
            position: 'fixed',
            zIndex: 1208,
            width: `${width}px`,
            top: `${top}px`,
            left: `${left}px`
        }"
        :class="{ 'maple-hidden': show && neddInput }"
        v-bind="prop"
        @change="change"
        @visible-change="visible"
    />
</template>

<script>
import utils from "../utils/index";
import { Cascader } from "element-ui";

export default {
    name: "MapleCascader",
    props: {
        neddInput: {
            type: Boolean,
            default: true
        }
    },
    components: { "el-cascader": Cascader },
    data() {
        return {
            options: [],
            value: null,
            show: true,
            coords: {},
            top: 0,
            left: 0,
            width: "auto",
            core: {},
            prop: {},
            columns: [],
            $body: null,
            $input: null,
            cascaderAbled: false,
            address: [],
            cascaderVals: {}
        };
    },
    mounted() {
        this.$body = document.body;
        this.$body.appendChild(this.$el);
    },
    methods: {
        visible(v) {
            this.show = !v;
        },
        change(v) {
            const { col } = this.coords;
            const { subType } = this.columns[col];
            const key = this.columns[col].key || this.columns[col].data;
            const value = v;

            if (subType === "address" || subType === "cascader") {
                if (this.cascaderVals[`key-${key}-value-${value}`]) {
                    v = this.cascaderVals[`key-${key}-value-${value}`].label;
                } else {
                    v = utils
                        .getCascaderLabelValue({
                            data: this.options,
                            value: v
                        })
                        .map(({ label }) => label)
                        .join("/");
                }
                this.cascaderVals = {
                    ...this.cascaderVals,
                    [`key-${key}-value-${v}`]: {
                        value,
                        label: v
                    },
                    [`key-${key}-value-${value}`]: {
                        value,
                        label: v
                    }
                };
            }
            this.controlPickerPanel(false);
            this.changeDate(v);
        },
        changeDate(v) {
            const { row, nowCol } = this.coords;

            if (
                nowCol !== -1208 &&
                row !== -1208 &&
                nowCol != null &&
                row != null
            ) {
                this.core.setDataAtCell(row, nowCol, v, "changeDate");
            }
        },
        controlOpen({
            open = false,
            col = 0,
            row = 0,
            width = "auto",
            top = 0,
            left = 0,
            core = {},
            columns = [],
            nowCol = 0
        } = {}) {
            if (!open) {
                return (this.cascaderAbled = false);
            }
            this.core = core;
            this.coords = {
                col,
                row,
                nowCol
            };
            if (col !== -1208 && row !== -1208 && col != null && row != null) {
                const { subType = "", props = {}, type } = columns[col];
                const key = columns[col].key || columns[col].data;

                if (!type) {
                    let opts =
                        columns[col].source || columns[col].options || [];
                    if (opts instanceof Function) opts = opts();
                    this.options = opts;
                    this.columns = columns;
                    if (subType === "address") {
                        if (this.address.length) {
                            this.options = this.address;
                        } else {
                            this.options = utils.collageAddress(utils.address);
                            this.address = this.options;
                        }
                    }
                    if (subType === "address" || subType === "cascader") {
                        this.value = this.core.getDataAtCell(row, nowCol);
                        const value = this.value;
                        if (this.value) {
                            if (
                                this.cascaderVals[`key-${key}-value-${value}`]
                            ) {
                                this.value = this.cascaderVals[
                                    `key-${key}-value-${value}`
                                ].value;
                            } else {
                                this.value = utils
                                    .getCascaderLabelValue({
                                        data: this.options,
                                        value: this.value.split("/"),
                                        matchFieldName: "label"
                                    })
                                    .map(({ value }) => value);
                            }

                            if (!this.value.length) {
                                this.core.setDataAtCell(
                                    row,
                                    nowCol,
                                    "",
                                    "changeDate"
                                );
                            }
                        }
                        this.show = !open;
                        this.controlPickerPanel(open);
                        this.width = width;
                        this.top = top;
                        this.left = left;
                        this.prop = Object.assign({}, props);
                    }
                }
            }
        },
        controlPickerPanel(bl) {
            this.cascaderAbled = false;
            if (bl) {
                let t1 = setTimeout(() => {
                    this.cascaderAbled = true;
                    let t2 = setTimeout(() => {
                        this.$el.click();
                        this.$el.querySelector("input").focus();
                        clearTimeout(t2);
                        t2 = null;
                    }, 128);

                    clearTimeout(t1);
                    t1 = null;
                }, 60);
            }
        }
    },
    beforeDestroy() {
        Object.assign(this.$data, {});
    }
};
</script>
