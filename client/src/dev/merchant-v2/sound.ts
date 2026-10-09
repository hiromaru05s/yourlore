import { coinPose, count, hit } from './catalog';
import type { Merchant } from './catalog';
export class CoinSound {
    private context: AudioContext | undefined;
    private buffer: AudioBuffer | undefined;
    private live = new Set<AudioBufferSourceNode>();
    enabled = true;
    error = '';
    async unlock() { try {
        this.context ??= new AudioContext();
        await this.context.resume();
        if (!this.buffer)
            this.buffer = await this.context.decodeAudioData(await (await fetch('/sfx/lore-v5/coinLand.mp3')).arrayBuffer());
    }
    catch (e) {
        this.error = String(e);
    } }
    private chink(black: boolean, i: number, volume: number) { if (!this.enabled || !this.buffer || this.context?.state !== 'running')
        return; const ctx = this.context, s = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner(); s.buffer = this.buffer; s.playbackRate.value = (black ? .72 : 1.45) + (i % 3) * .09; gain.gain.value = volume; pan.pan.value = (i % 2 ? 1 : -1) * .38; s.connect(gain).connect(pan).connect(ctx.destination); s.start(); this.live.add(s); s.onended = () => { this.live.delete(s); s.disconnect(); gain.disconnect(); pan.disconnect(); }; }
    advance(from: number, to: number, id: Merchant, v: number) { if (to < from)
        return; if (id === 'DARK_MERCHANT') {
        const times = Array.from({ length: [18, 24, 12, 26][v] }, (_, i) => ({ i, ms: (.9 + i * (v === 2 ? .16 : .075) + (v === 1 ? .77 : v === 2 ? .7 : 1.6)) * 1000 }));
        for (const e of times)
            if (from < e.ms && to >= e.ms)
                this.chink(true, e.i, .16);
    }
    else {
        const n = count(id);
        if (from < hit && to >= hit)
            this.chink(false, 0, .45);
        for (let i = 0; i < n; i++) {
            const ms = coinPose(v, i, n, hit).impact;
            if (from < ms && to >= ms)
                this.chink(false, i, .28);
            if (v === 2 && from < ms + 400 && to >= ms + 400)
                this.chink(false, i, .12);
        }
    } }
    stop() { for (const s of this.live) {
        try {
            s.stop();
        }
        catch { }
    } this.live.clear(); }
    get state() { return { enabled: this.enabled, unlocked: this.context?.state === 'running', loaded: !!this.buffer, active: this.live.size, error: this.error }; }
    dispose() { this.stop(); void this.context?.close(); }
}
