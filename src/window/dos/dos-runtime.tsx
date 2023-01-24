import { useSelector } from "react-redux";
import { FitConstant } from "../../store/dos";
import { State, store } from "../../store";
import { CommandInterface } from "emulators";
import { keyboard } from "./controls/keyboard";
import { webGl as webglRender } from "./render/webgl";
import { canvas as canvasRender } from "./render/canvas";
import { audioNode } from "./sound/audio-node";
import { useEffect } from "preact/hooks";
import { mouse } from "./controls/mouse";

export function useDosRuntime(canvas: HTMLCanvasElement | null,
                              ci: CommandInterface | null): void {
    usePause(ci);
    useKeyboard(ci);
    useMouse(canvas, ci);
    useRenderBackend(canvas, ci);
    useAudioBackend(ci);
}

function useMouse(canvas: HTMLCanvasElement | null,
                  ci: CommandInterface | null): void {
    const mouseLock = useSelector((state: State) => state.dos.mouseLock);
    const mouseSensitivity = useSelector((state: State) => state.dos.mouseSensitivity);
    useEffect(() => {
        if (canvas === null || ci === null) {
            return;
        }

        const sensistiviy = 0.5 + mouseSensitivity * 7;
        return mouse(mouseLock, sensistiviy, 0, canvas, ci);
    }, [canvas, ci, mouseLock, mouseSensitivity]);
}

function useKeyboard(ci: CommandInterface | null): void {
    useEffect(() => {
        if (ci === null) {
            return;
        }

        return keyboard(window as any, ci);
    }, [ci]);
}

function useRenderBackend(canvas: HTMLCanvasElement | null,
                          ci: CommandInterface | null): void {
    const renderBackend = useSelector((state: State) => state.dos.renderBackend);
    const renderAspect = useSelector((state: State) => state.dos.renderAspect);

    let aspect: number | undefined = undefined;
    switch (renderAspect) {
        case "1/1": aspect = 1; break;
        case "5/4": aspect = 5 / 4; break;
        case "4/3": aspect = 4 / 3; break;
        case "16/10": aspect = 16 / 10; break;
        case "16/9": aspect = 16 / 9; break;
        case "Fit": aspect = FitConstant;
        default:
    }

    useEffect(() => {
        if (canvas === null || ci === null) {
            return;
        }

        let unbind = () => { };

        if (renderBackend === "canvas") {
            unbind = canvasRender(canvas, ci, aspect);
        } else {
            try {
                unbind = webglRender(canvas, ci, aspect);
            } catch (e) {
                console.error("Unalbe to start webgl render", e);
                unbind = canvasRender(canvas, ci, aspect);
            }
        }

        return unbind;
    }, [canvas, ci, renderBackend, aspect]);
}

function useAudioBackend(ci: CommandInterface | null): void {
    useEffect(() => {
        if (ci === null) {
            return;
        }

        const unbind = audioNode(ci, (setVolume) => {
            let volume = 1;

            const updateVolumeIfNeeded = () => {
                const newVolume = store.getState().dos.volume;
                if (Math.abs(volume - newVolume) >= 0.05) {
                    setVolume(newVolume);
                    volume = newVolume;
                }
            };

            const unsubscribe = store.subscribe(updateVolumeIfNeeded);
            return unsubscribe;
        });

        return unbind;
    }, [ci]);
}

function usePause(ci: CommandInterface | null): void {
    const paused = useSelector((state: State) => state.dos.paused);
    useEffect(() => {
        if (ci === null) {
            return;
        }

        paused ? ci.pause() : ci.resume();
    }, [paused, ci]);
}