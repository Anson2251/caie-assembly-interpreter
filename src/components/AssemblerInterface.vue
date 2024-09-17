<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Codemirror } from 'vue-codemirror';
import { NSplit, NList, NListItem, NTabs, NTabPane, NEmpty, NButton, NInputNumber, NSpace, NLog } from "naive-ui";

import { Error, Run } from "@vicons/carbon";
import { Icon } from "@vicons/utils"

import { debounce } from "@/utils";
import { assembler } from "@/libs/interpreter-core/src/assembler";
import { machine } from "@/libs/interpreter-core/src/machine";
import { type instructionPieceType } from "@/libs/interpreter-core/src/instruction";

const assemblyCode = ref("");
const assemblyCodePlaceHolder = `start:  LDM #0\n        END    ; End of program`;
const errors = ref<string[]>([]);

const byteCodes = ref<instructionPieceType[]>([]);

const bits = ref(8);
const vmOutput = ref("");

const inputDevice = async () => {
    const input = prompt("Enter a number", "");
    if (input !== null) {
        return parseInt(input);
    }
    return 0;
}
const outputDevice = async (value: number) => {
    vmOutput.value += `(0x${value.toString(16).padStart(Math.ceil(bits.value / 4), "0")}, ${value.toString(10)}, 0b${value.toString(2).padStart(bits.value, "0")}, CHAR: "${String.fromCharCode(value)}")` + "\n";
}

function initVM(): machine{
    if(bits.value < 8) bits.value = 8;
    const m = new machine(bits.value);
    m.addDevice("output", outputDevice);
    m.addDevice("input", inputDevice);
    return m;
}

const vm = ref(initVM());

function updateByteCodesDebounced() {
    errors.value = [];
    try {
        byteCodes.value = assembler(assemblyCode.value);
    } catch (e) {
        console.error(e);
        errors.value.push(String(e));
        byteCodes.value = [];
    }
}

watch(assemblyCode, debounce(updateByteCodesDebounced, 100));
watch(bits, () => {vm.value = initVM()});

const shownByteCodes = computed(() => {
    const padNum = (val: number) => val.toString(16).padStart(Math.ceil(bits.value / 4), "0");
    return byteCodes.value.map((byteCode) => {
        return `0x${padNum(byteCode.opcode)}    0x${padNum(byteCode.operand)}`;
    }).join("\n");
})
</script>

<template>
    <n-split direction="vertical" style="height: 100%; width: 100%;" :default-size="0.70" :min="0.50" :max="0.9">
        <template #1>
            <div class="container">
                <n-split direction="horizontal" style="height: 100%" :max="0.75" :min="0.25">
                    <template #1>
                        <Codemirror :indent-with-tab="true" :tab-size="4" class="codeArea" :style="{ height: '100%' }"
                            :placeholder="assemblyCodePlaceHolder" v-model:model-value="assemblyCode" />
                    </template>
                    <template #2>
                        <Codemirror :indent-with-tab="true" :tab-size="4" class="codeArea" :style="{ height: '100%' }"
                            :placeholder="'Byte Codes are shown here'" :model-value="shownByteCodes" :disabled="true" />
                    </template>
                </n-split>
            </div>
        </template>
        <template #2>
            <div class="container-bottom">
                    <n-space class="tools-container">
                        <n-button type="tertiary" size="small" @click="vm.execute(byteCodes)">
                            <template #icon>
                                <Icon :size="24">
                                    <Run/>
                                </Icon>
                            </template>
                        </n-button>
                        <label style="display: flex; align-items: center;">Bits:&ensp;
                        <n-input-number :min="8" v-model:value="bits" size="small" style="width: 64px" :show-button="false" :placeholder="'bits'"> </n-input-number>
                    </label>
                    </n-space>
                <n-tabs style="padding: 8px; grid-row: 2 / 3; grid-column: 1 / 2;" animated>
                    <n-tab-pane name="output" tab="Outputs">
                        <n-log :log="vmOutput"/>
                    </n-tab-pane>
                    <n-tab-pane name="errors" tab="Errors">
                        <n-list v-if="errors.length > 0">
                            <n-list-item v-for="(error, index) in errors" :key="index" style="color: red">
                                <template #prefix>
                                    <Icon :size="18" style="display: grid; align-items: center">
                                        <Error />
                                    </Icon>
                                </template>
                                {{ error }}
                            </n-list-item>
                        </n-list>
                        <n-empty description="No errors found" v-if="errors.length === 0">
                            <template #extra>
                                <p style="color: var(--n-text-color);">Maybe you can create some?</p>
                            </template>
                        </n-empty>
                    </n-tab-pane>
                </n-tabs>
            </div>
        </template>
    </n-split>
</template>

<style scoped>
.container {
    width: 100%;
    height: 100%;
    position: relative;
}

.container-bottom {
    display: grid;
    grid-template-columns: auto;
    grid-template-rows: 32px auto;

    width: 100%;
    height: 100%;
}

.codeArea {
    font-family: monospace;
    cursor: text;
}

.tools-container {
    grid-row: 1 / 2;
    grid-column: 1 / 2;

    display: flex;
    align-items: center;

    padding: 0px 8px 0px 8px;

    border-bottom: var(--n-resize-trigger-color) 2px solid;
}
</style>