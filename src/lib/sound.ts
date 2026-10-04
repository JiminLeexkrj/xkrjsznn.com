// 음원 파일 없이 Web Audio로 합성하는 앰비언트.
// 낮은 드론이 깔려 있고, 진입 화면에서 누르는 동안 긴장이 올라가며, 영역이 열릴 때 한 번 충격음이 난다.

const STORAGE_KEY = "xk-sound";

function createImpulse(ctx: AudioContext, seconds: number, decay: number) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function createNoise(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

type Graph = {
  ctx: AudioContext;
  master: GainNode;
  reverb: ConvolverNode;
  filter: BiquadFilterNode;
  drone: GainNode;
  voices: OscillatorNode[];
};

class DomainSound {
  private graph: Graph | null = null;
  private enabled = false;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  isEnabled = () => this.enabled;

  /** 이전 방문에서 소리를 켜 두었는지 */
  wasEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  private setEnabled(value: boolean) {
    this.enabled = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {}
    this.listeners.forEach((l) => l());
  }

  private build(): Graph {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = createImpulse(ctx, 3.5, 2.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    reverb.connect(wet).connect(master);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 140;
    filter.Q.value = 6;
    const drone = ctx.createGain();
    drone.gain.value = 0.18;
    filter.connect(drone);
    drone.connect(master);
    drone.connect(reverb);

    // A1 두 개를 살짝 어긋나게 겹치고 5도와 옥타브를 얹는다
    const voices = [55, 55.4, 82.6, 110.3].map((frequency, i) => {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? "sawtooth" : "triangle";
      osc.frequency.value = frequency;
      const gain = ctx.createGain();
      gain.gain.value = i < 2 ? 0.3 : 0.15;
      osc.connect(gain).connect(filter);
      osc.start();
      return osc;
    });

    // 필터가 아주 느리게 숨 쉬듯 열렸다 닫힌다
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 60;
    lfo.connect(depth).connect(filter.frequency);
    lfo.start();

    return { ctx, master, reverb, filter, drone, voices };
  }

  async enable() {
    this.graph ??= this.build();
    const { ctx, master } = this.graph;
    await ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4);
    this.setEnabled(true);
  }

  disable() {
    this.setEnabled(false);
    if (!this.graph) return;
    const { ctx, master } = this.graph;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(() => {
      if (!this.enabled) void ctx.suspend();
    }, 800);
  }

  toggle() {
    return this.enabled ? this.disable() : this.enable();
  }

  /** 0–1. 진입 화면에서 누르고 있는 정도 */
  setTension(value: number) {
    if (!this.graph || !this.enabled) return;
    const { ctx, filter, drone, voices } = this.graph;
    const t = ctx.currentTime;
    filter.frequency.setTargetAtTime(140 + value * value * 2600, t, 0.08);
    drone.gain.setTargetAtTime(0.18 + value * 0.35, t, 0.1);
    voices.forEach((osc, i) => osc.detune.setTargetAtTime(value * (i % 2 ? 35 : -20), t, 0.1));
  }

  /** 영역이 열리는 순간의 충격음 */
  impact() {
    if (!this.graph || !this.enabled) return;
    const { ctx, master, reverb } = this.graph;
    const t = ctx.currentTime;

    const sub = ctx.createOscillator();
    sub.frequency.setValueAtTime(110, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 1.6);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, t);
    subGain.gain.linearRampToValueAtTime(0.9, t + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    sub.connect(subGain);
    subGain.connect(master);
    subGain.connect(reverb);
    sub.start(t);
    sub.stop(t + 2.5);

    const burst = ctx.createBufferSource();
    burst.buffer = createNoise(ctx, 2);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.8;
    band.frequency.setValueAtTime(4000, t);
    band.frequency.exponentialRampToValueAtTime(150, t + 1.2);
    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(0.5, t);
    burstGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    burst.connect(band).connect(burstGain);
    burstGain.connect(master);
    burstGain.connect(reverb);
    burst.start(t);

    this.setTension(0.06);
  }
}

export const sound = new DomainSound();
