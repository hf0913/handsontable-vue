/* eslint-disable no-case-declarations */
import address from "./address";
let addressOtps = [];
/**
 * @description 根据键名和键值，在数组中查询并返回item
 * @param {Array} data 查询数据集合
 * @param {Any} currentValue 当前键值
 * @param {String} currentKey 当前键名
 * @returns {Object} 返回符合条件的item
 */
function exchange({ data, currentValue, currentKey }) {
    let o = {};

    if (currentValue == "" || currentValue == null) return o;
    for (let item of data.values()) {
        if (item[currentKey] == currentValue) {
            o = item;
            break;
        }
    }

    return o;
}
/**
 * @description 发送数据给后端，使用原生的ajax请求
 * @param {String} url 请求后端的完整路径
 * @param {String} method 请求方式，默认GET
 * @param {Object} header 请求头
 * @param {Object} data 发送body数据
 * @param {Object} param 以查询方式发送数据
 * @param {String} result 根据后端返回数据的结构，给出一个链结构，来表示可以根据这个链结构找到数据，举例：后端返回数据结构为{data:{data:[],message:null}},则result赋值为data.data
 */
function ajax({ url, method = "GET", header, data, param, result = "" }) {
    let d = "";

    header = header || {};
    data = data || {};
    method = method.toLocaleUpperCase();
    result = result.split(".");
    if (param || method === "GET") {
        for (let [k, v] of Object.entries(data)) {
            d += `${k}=${v}&`;
        }
        url = `${url}?${d.slice(0, d.length - 1)}`;
    }

    return new Promise(resolve => {
        const xmlhttp = window.XMLHttpRequest
            ? new window.XMLHttpRequest()
            : new window.ActiveXObject("Microsoft.XMLHTTP");

        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4) {
                if (xmlhttp.status == 200) {
                    const responseText = JSON.parse(xmlhttp.responseText);
                    let res = "mapleLoveCDC";

                    for (let k of result.values()) {
                        if (res == null) break;
                        if (res === "mapleLoveCDC") {
                            res = responseText[k];
                        } else res = res[k];
                    }
                    res = res === "mapleLoveCDC" || res == null ? [] : res;
                    resolve(res);
                } else {
                    resolve([]);
                }
            }
        };
        xmlhttp.open(method, url, true);
        if (method === "POST") {
            header = {
                "Content-Type": "application/json",
                ...header
            };
        }
        for (let [k, v] of Object.entries(header)) {
            xmlhttp.setRequestHeader(k, v);
        }
        param || method === "GET"
            ? xmlhttp.send()
            : xmlhttp.send(JSON.stringify(data));
    });
}
/**
 * @description 防抖函数
 * @param {*} fn 接受
 * @param {*} delay
 */
function debounce(fn, delay = 128) {
    let t = null;

    return function () {
        let self = this;
        let args = arguments;

        t && clearTimeout(t);
        t = setTimeout(function () {
            fn.apply(self, args);
            t = null;
        }, delay);
    };
}
/**
 * @description 检查数据类型
 * @param {Any} value 被检查值
 * @param {Object} item 每一项
 */
function checkType({ value, item }) {
    let state = true;
    const { subType } = item;
    let opts = item.options;

    if (opts instanceof Function) {
        opts = opts() || [];
    }
    if (value === "" || value == null) return !!item.allowEmpty;
    if (subType === "datePicker") {
        const charReg = /^[\u4e00-\u9fa5]+$/;
        const { valueFormat = "yyyy-MM-dd HH:mm:ss" } = item.props || {};

        state = value.length === valueFormat.length && !charReg.test(value);
    }
    if (subType === "cascader" || subType === "address") {
        if (addressOtps.length === 0 && subType === "address") {
            addressOtps = collageAddress(address);
        }
        let v = getCascaderLabelValue({
            data: subType === "address" ? addressOtps : opts,
            value: (value + "").split("/"),
            matchFieldName: "label"
        });
        v = v.map(({ label }) => label).join("/");
        state = value === v;
    }

    return state;
}
/**
 * @description 整理普通级联数据
 * @param {Array} data 后端返回的数组数据
 * @param {Array} valueFields 指定选项的值为选项对象的某个属性值，值字段名集合
 * @param {Array} labelFields 指定选项标签为选项对象的某个属性值，标签字段名集合
 * @param {Array} childrenFields 指定选项的子选项为选项对象的某个属性值，子选项字段名集合
 * @param {Function} changeItemData 修改每一项的方法，入参是每一项，必须返回一个需要修改的对象
 */
function collageCascaderData({
    data = [],
    valueFields = ["value"],
    labelFields = ["label"],
    childrenFields = ["children"],
    changeItemData = () => {}
}) {
    const fn = children => {
        children.map(item => {
            const { value } = getHasValue(item, childrenFields);
            item = Object.assign(
                item,
                {
                    label: getHasValue(item, labelFields).value,
                    value: getHasValue(item, valueFields).value,
                    children: value || null
                },
                changeItemData(item)
            );
            if (value) {
                fn(value);
            }
        });
    };
    fn(data);
    return data;
}
/**
 * @description 处理级联数据，提供value，返回label
 * @param {Array} data 后端返回的数组数据
 * @param {String} valueName 指定选项的值为选项对象的某个属性值
 * @param {String} labelName 指定选项标签为选项对象的某个属性值
 * @param {String} childrenName 指定选项的子选项为选项对象的某个属性值
 * @param {String} matchFieldName 匹配字段名
 * @param {Array} value 当前的value
 * @returns {Array}
 */
function getCascaderLabelValue({
    data = [],
    valueName = "value",
    labelName = "label",
    childrenName = "children",
    matchFieldName = "value",
    value = []
}) {
    let arr = [];
    const m = item => {
        let matchVal = item[matchFieldName];
        let i = value.indexOf(matchVal);
        let k = value[i];

        item = Object.assign(item, {
            label: item[labelName],
            value: item[valueName]
        });

        if (matchVal === k) {
            arr.push(item);
            if (item[childrenName]) fn(item.children);
            return true;
        }
        if (item[childrenName]) fn(item.children);
    };
    const fn = children => {
        if (children instanceof Array) {
            for (let item of children.values()) {
                if (m(item)) break;
            }
        } else {
            for (let item of Object.values(children)) {
                if (m(item)) break;
            }
        }
    };
    fn(data);
    return arr;
}
/**
 * @description 从后到前遍历，返回最终不为空的值
 * @param {Object} o 存在属性的对象
 * @param {Array} atrs 属性名集合
 */
function getHasValue(o, atrs) {
    let v = { value: "", key: "" };

    for (let i = atrs.length - 1; i >= 0; i--) {
        let f = atrs[i];

        if (o[f]) {
            v = o[f];
            v = {
                value: o[f],
                key: f
            };
            break;
        }
    }
    return v;
}
/**
 * @description 整理级联地址数据
 * @param {Array} address 地址集合
 */
function collageAddress(address) {
    let options = [];

    for (let [k1, v1] of Object.entries(address["100000"])) {
        let children1 = [];

        for (let [k2, v2] of Object.entries(address[k1] || [])) {
            let children2 = [];

            for (let [k3, v3] of Object.entries(address[k2] || [])) {
                children2.push({
                    value: k3,
                    label: v3
                });
            }

            children1.push({
                value: k2,
                label: v2,
                children: children2
            });
        }

        options.push({
            value: k1,
            label: v1,
            children: children1
        });
    }
    return options;
}

export default {
    exchange,
    ajax,
    debounce,
    checkType,
    collageCascaderData,
    getCascaderLabelValue,
    getHasValue,
    collageAddress,
    address
};
