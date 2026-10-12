import { count } from './catalog';
import { coinContacts } from './physics';
import type { Merchant } from './catalog';
export class CoinSound {
    private context: AudioContext | undefined;
    private buffer: AudioBuffer | undefined;
    private live = new Set<AudioBufferSourceNode>();
    enabled = true;
    error = '';
    async unlock() {
        try {
            this.context ??= new AudioContext();
            await this.context.resume();
            if (!this.buffer) this.buffer = await this.context.decodeAudioData(await (await fetch('/sfx/lore-v5/coinLand.mp3')).arrayBuffer());
        } catch (e) { this.error = String(e); }
    }
    private chink(black: boolean, i: number, speed: number, x: number) {
        if (!this.enabled || !this.buffer || this.context?.state !== 'running') return;
        const ctx = this.context, s = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
        s.buffer = this.buffer;
        s.playbackRate.value = (black ? .72 : 1.31) + (i * .137 % .25);
        gain.gain.value = Math.min(black ? .19 : .34, .035 + speed * (black ? .043 : .088));
        pan.pan.value = Math.max(-.7, Math.min(.7, x * .55));
        s.connect(gain).connect(pan).connect(ctx.destination); s.start(); this.live.add(s);
        s.onended = () => { this.live.delete(s); s.disconnect(); gain.disconnect(); pan.disconnect(); };
    }
    advance(from: number, to: number, id: Merchant, v: number) {
        if (to < from) return;
        const black = id === 'DARK_MERCHANT';
        const n = black ? [18, 24, 12, 26][v] : count(id);
        for (const event of coinContacts(v, n, black)) {
            if (event.ms > from && event.ms <= to && (!black || event.ms < 5950)) {
                this.chink(black, event.i, event.speed, event.x);
            }
        }
    }
    stop() {
        for (const s of this.live) { try { s.stop(); } catch { /* Already ended. */ } }
        this.live.clear();
    }
    get state() { return { enabled: this.enabled, unlocked: this.context?.state === 'running', loaded: !!this.buffer, active: this.live.size, error: this.error }; }
    dispose() { this.stop(); void this.context?.close(); }
}
