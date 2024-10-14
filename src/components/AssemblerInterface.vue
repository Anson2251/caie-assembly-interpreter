<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Codemirror } from 'vue-codemirror';
import { NSplit, NList, NListItem, NTabs, NTabPane, NEmpty, NButton, NInputNumber, NSpace, NA } from "naive-ui";
import { Error, Play, LogoGithub, Stop } from "@vicons/carbon";
import { Icon } from "@vicons/utils";
import { debounce } from "@/utils";
import { assembler } from "@/libs/interpreter-core/src/assembler";
import { type InstructionPieceType } from "@/libs/interpreter-core/src/instruction";

const assemblyCode = ref("");
const assemblyCodePlaceHolder = `start:  LDM #0\n        END    ; End of program`;
const errors = ref<string[]>([]);
const byteCodes = ref<InstructionPieceType[]>([]);
const bits = ref(8);
const vmOutput = ref([""]);
const runningFlag = ref(false);

const initWorker = () => {
    const worker = new Worker(
        new URL('@/libs/vm-worker', import.meta.url),
        { type: 'module' }
    );

    worker.onmessage = (e) => {
        if (e.data.action === "output") {
            vmOutput.value.push(e.data.msg);
        }
        if (e.data.action === "input") {
            vm.postMessage({
                action: "input-reply",
                msg: prompt("Input a number: "),
            });
        }
        if (e.data.action === "stop") {
            terminateVM();
            runningFlag.value = false;
        }
    }
    return worker;
};

let vm = initWorker();

function updateByteCodesDebounced() {
    errors.value = [];
    try {
        byteCodes.value = assembler(assemblyCode.value);
    } catch (e) {
        console.log(String(e));
        errors.value.push(String(e));
        byteCodes.value = [];
    }
}

function executeByteCode() {
    runningFlag.value = true;
    vm.postMessage({
        action: "run",
        code: byteCodes.value.map(i => ({ ...i })),
        bits: bits.value,
        verbose: false,
    });
}

function terminateVM() {
    vm.terminate();
    vm = initWorker();
    runningFlag.value = false;
}

watch(assemblyCode, debounce(updateByteCodesDebounced, 100));

const shownByteCodes = computed(() => {
    const padNum = (val: number) => val.toString(16).padStart(Math.ceil(bits.value / 4), "0");
    return byteCodes.value.map((byteCode) => {
        return `0x${padNum(byteCode.opcode)}    0x${padNum(byteCode.operand)}`;
    }).join("\n");
});
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
                    <n-button type="tertiary" size="small"
                        @click="() => (!runningFlag ? executeByteCode : terminateVM)()"
                        style="height: 28px; width: 28px;">
                        <template #icon>
                            <Icon :size="16" v-if="!runningFlag">
                                <Play />
                            </Icon>
                            <Icon :size="16" v-else>
                                <Stop />
                            </Icon>
                        </template>
                    </n-button>
                    <label style="display: flex; align-items: center;">Bits:&ensp;
                        <n-input-number :min="8" v-model:value="bits" size="small" style="width: 64px"
                            :show-button="false" :placeholder="'bits'"> </n-input-number>
                    </label>
                </n-space>
                <n-button quaternary size="small" circle style="float: right;">
                    <template #icon>
                        <n-a href="https://github.com/Anson2251/caie-assembly-interpreter">
                            <Icon :size="24">
                                <LogoGithub />
                            </Icon>
                        </n-a>
                    </template>
                </n-button>

                <div class="tabs-container">
                    <n-tabs animated style="height: 100%;">
                        <n-tab-pane name="output" tab="Outputs" style="height: 100%;">
                            <div class="scrollable-pane">
                                <div style="padding-bottom: 12px;">
                                    <p v-for="(line, index) in vmOutput" :key="index">
                                        {{ line }}
                                    </p>
                                </div>
                            </div>
                        </n-tab-pane>
                        <n-tab-pane name="errors" tab="Errors">
                            <n-list v-if="errors.length > 0" style="height: 100%;">
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
    grid-template-columns: auto 32px;
    grid-template-rows: 32px calc(100% - 40px);
    align-items: center;
    width: 100%;
    height: 100%;
}

.codeArea {
    font-family: monospace;
    cursor: text;
}

.tools-container {
    display: flex;
    align-items: center;
    padding: 0px 8px;
}

.tabs-container {
    width: 100%;
    height: 100%;
    padding: 0 12px;
    border-top: var(--n-resize-trigger-color) 2px solid;
}

.scrollable-pane {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    position: relative;
    padding-bottom: 8px;
}

.scrollable-pane > div > p {
    line-height: 1em;
    padding: 0;
    margin: 0;
    padding-top: 2px;
    padding-bottom: 2px;
    cursor: text;
    user-select: text;
    font-family: monospace;
}
</style>
