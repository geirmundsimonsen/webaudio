window.ctx = new AudioContext()
console.log('audiocontext is active.')


ctx.audioWorklet.addModule('bypass-processor.js').then(() => {
  let bypassNode = new AudioWorkletNode(ctx, 'bypass-processor');
});

class Clock {
    constructor(ctx, lookaheadInSec, bpm) {
        this.bpm = bpm || 120;
        this.calculateBeats2s();
        this.updateLookahead(lookaheadInSec);
        this.prevT = ctx.currentTime;
        this.prevBeat = 0;
        this.ctx = ctx;
        this.scheduledFuncs = SortedMap()
        this.scheduledFuncs.contentCompare = (a, b) => { 
            if (a[0] === b[0]) { 
                return a[1] - b[1] 
            } else { 
                return a[0] - b[0] 
            } 
        }

        this.run();
    }

    beats() {
        return this.prevBeat;
    }

    run() {
        setInterval(() => {
            this.updateClock();
            this.runAndDeleteUpcomingFunctions();
        }, this.pollingInterval);
    }

    // obviously tempo-dependant - change when tempo changes.
    calculateBeats2s() {
        this.beats2s = 60 / this.bpm;
    }

    // important when changing tempo
    updateLookahead(s) {
        this.lookahead = s / this.beats2s;
        this.pollingInterval = s * 0.25;
    }

    runAndDeleteUpcomingFunctions() {
        let entries = this.scheduledFuncs.entries();
        let keysToBeDeleted = [];
        while (true) {
            let nextEntry = entries.next().value;
            if (nextEntry === undefined) {
                break;
            } 
            
            let nextBeat = nextEntry[0][0];
            if (nextBeat < (this.prevBeat - this.lookahead)) {
                keysToBeDeleted.push(nextEntry[0])
                let f = nextEntry[1][0]
                let args = nextEntry[1][1]
                args.t = this.calculateCtxTimeFromBeat(nextBeat)
                f(args);
            } else {
                break;
            }
        }
        keysToBeDeleted.forEach((key) => this.scheduledFuncs.delete(key));
    }

    // this value gets stale when tempo changes.
    calculateCtxTimeFromBeat(scheduledBeat) {
        return this.prevT + (scheduledBeat - this.prevBeat) * this.beats2s;
    }

    updateClock() {
        let now = this.ctx.currentTime;
        let delta = now - this.prevT;
        this.prevBeat += delta * this.bpm / 60;
        this.prevT = now;
    }

    addFunction(beats, func, args) {
        if (args.fnId === undefined) {
            args.fnId = Math.random()
        }
        args.beats = beats
        args.clock = this
        args.ctx = this.ctx
        this.scheduledFuncs.set([beats, Math.random()], [func, args]);
    }

    stopFunction(fnId) {
        let entries = this.scheduledFuncs.entries();
        let keysToBeDeleted = [];
        while (true) {
            let nextEntry = entries.next().value;
            if (nextEntry === undefined) {
                break;
            } 
            
            let nextBeat = nextEntry[0][0];
            if (nextEntry[1][1].fnId === fnId) {
                keysToBeDeleted.push(nextEntry[0])
                if (nextEntry[1][1].stop) {
                    let f = nextEntry[1][0]
                    let args = nextEntry[1][1]
                    args.t = this.ctx.currentTime
                    f(args)
                }
            }
        }
        keysToBeDeleted.forEach((key) => this.scheduledFuncs.delete(key));
    }

    getNextBeat() {
        return Math.ceil(this.prevBeat);
    }
}

window.makeClock = (bpm) => {
    return new Clock(ctx, 0.1, bpm);
}

window.p2f = (pitch) => {
    return 440 * Math.pow(2, (pitch-69) / 12);
}

window.powerShaperArray = (power, points) => {
    var array = [];
    var spacing = 2 / points;
    for (let n = -1; n <= 1; n += spacing) {
        if (n < 0) {
            array.push(-Math.pow(n, power))
        } else {
            array.push(Math.pow(n, power))
        }
    }
    return new Float32Array(array)
}

window.shaperHexagonic = powerShaperArray(10, 1024);

window.pulsar = (args) => {
    let freq = p2f(args.pitch) || 440

    let triangleLFO = args.ctx.createOscillator()
    triangleLFO.type = "triangle"
    triangleLFO.frequency.value = 1

    let waveshaper = args.ctx.createWaveShaper()
    waveshaper.curve = shaperHexagonic

    let lfogain = args.ctx.createGain()
    lfogain.gain.value = freq * 0.2

    let saw1 = args.ctx.createOscillator()
    saw1.type = 'sawtooth'
    saw1.frequency.value = freq

    let saw2 = args.ctx.createOscillator()
    saw2.type = 'sawtooth'
    saw2.frequency.value = freq

    let amp = args.ctx.createGain()
    amp.gain.value = 0.2

    triangleLFO.connect(waveshaper)
    waveshaper.connect(lfogain)
    lfogain.connect(saw1.frequency)
    saw1.connect(amp)
    saw2.connect(amp)
    amp.connect(args.ctx.destination)

    saw1.start(args.t)
    saw2.start(args.t)
    triangleLFO.start(args.t)

    args.clock.addFunction(args.beats + 4, () => {
        saw1.stop(args.t);
        saw2.stop(args.t);
    }, args)
}

window.telephone = (t, beats, clock, count) => {
    let oscillatorCount = count || 4;
    let oscillators = [];
    for (let i = 0; i < oscillatorCount; i++) {
        let oscillator = ctx.createOscillator();
        oscillator.frequency.value = Math.random() * 1500 + 500;
        oscillator.connect(ctx.destination)
        oscillator.start(t)
        oscillators.push(oscillator);
    }

    clock.addFunction(beats + 0.05, (t, beats, clock, args) => {
        oscillators.forEach(osc => osc.stop(t));
    })

    clock.addFunction(beats + 0.25, telephone, oscillatorCount)
}

window.oscillatorTest = (t, count) => {
    let oscillatorCount = count || 4;
    let oscillators = [];
    for (let i = 0; i < oscillatorCount; i++) {
        let oscillator = ctx.createOscillator();
        oscillator.frequency.value = Math.random() * 1500 + 500;
        oscillator.connect(ctx.destination)
        oscillators.push(oscillator);
    }

    oscillators.forEach(osc => {
        osc.start(t)
        osc.stop(t + 0.02)
    })
}

window.scheduletest = () => {
    
}