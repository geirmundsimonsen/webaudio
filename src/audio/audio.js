window.ctx = new AudioContext()
console.log('audiocontext is active.')

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
        args.beats = beats;
        args.clock = this;
        args.ctx = this.ctx;
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
            if (nextEntry[1][1].fnId === fnId) {
                keysToBeDeleted.push(nextEntry[0]);
                let f = nextEntry[1][0];
                let args = nextEntry[1][1];
                if (args.stop) {
                    args.t = this.ctx.currentTime;
                    f(args);
                }
            }
        }
        keysToBeDeleted.forEach((key) => this.scheduledFuncs.delete(key));
    }

    getNextBeat() {
        return Math.ceil(this.prevBeat);
    }
}

window.p2f = (pitch) => {
    return 440 * Math.pow(2, (pitch-69)/12);
}

window.makeClock = (bpm) => {
    return new Clock(ctx, 0.1, bpm);
}

window.telephone = (args) => {
    if (!args.count) args.count = 4;
    let oscillators = [];
    for (let i = 0; i < args.count; i++) {
        let oscillator = args.ctx.createOscillator();
        oscillator.frequency.value = Math.random() * 1500 + 500;
        oscillator.connect(args.ctx.destination)
        oscillator.start(args.t)
        oscillators.push(oscillator);
    }

    args.clock.addFunction(args.beats + 0.05, (args) => {
        oscillators.forEach(osc => osc.stop(args.t));
    }, Object.assign({ stop: true }, args))

    args.clock.addFunction(args.beats + 0.25, telephone, args)
}

window.preset1 = (args) => {
    let freq = p2f(args.pitch) || 440
    args.length = args.length || 1

    let vib = args.ctx.createOscillator();
    vib.frequency.value = 6;
    
    let vibgain = args.ctx.createGain();
    vibgain.gain.value = 0.001;
    
    let carrier = args.ctx.createOscillator();
    carrier.type = "sawtooth";
    carrier.frequency.value = freq;
    
    let gain = args.ctx.createGain();
    gain.gain.value = 0.1

    let releasegain = args.ctx.createGain();
    releasegain.gain.value = 1;
    
    vib.connect(vibgain);
    vibgain.connect(carrier.frequency);
    carrier.connect(gain);
    gain.connect(releasegain);
    releasegain.connect(args.ctx.destination);
    
    vibgain.gain.exponentialRampToValueAtTime(freq * 0.02, args.t + 1);
    gain.gain.exponentialRampToValueAtTime(gain.gain.value * 0.1, args.t + 4)

    vib.start(args.t)
    carrier.start(args.t)

    args.clock.addFunction(args.beats + args.length, (args) => {
        releasegain.gain.exponentialRampToValueAtTime(0.001, args.t + 4)
        carrier.stop(args.t + 4);
    }, Object.assign({ stop: true}, args));
}

window.kick1 = (args) => {
    let length = 0.2;

    let carrier = args.ctx.createOscillator()
    carrier.type = 'square'
    carrier.frequency.value = 20;
    
    let amp = args.ctx.createGain()
    amp.gain.value = 0.5

    amp.gain.exponentialRampToValueAtTime(amp.gain.value * 0.01, args.t + length);

    carrier.connect(amp)
    amp.connect(args.ctx.destination)

    carrier.start(args.t)
    carrier.stop(args.t + length)
}

window.poop = (args) => {
    let length = 4;

    //let vib = args.ctx.createOscillator();
    //vib.type = 'square';
    //vib.frequency.value = 8;

    //let vibgain = args.ctx.createGain();
    //vibgain.gain.value = 66;

    let carrier = args.ctx.createOscillator()
    carrier.type = 'square'
    carrier.frequency.value = 200;
    
    //let amp = args.ctx.createGain()
    //amp.gain.value = 0.5

    carrier.frequency.exponentialRampToValueAtTime(40, 4);
    setInterval(() => console.log(carrier.frequency.value), 100)
    // amp.gain.exponentialRampToValueAtTime(amp.gain.value * 0.01, args.t + length);
    
    //vib.connect(vibgain)
    //vibgain.connect(carrier.frequency)
    carrier.connect(args.ctx.destination)
    //amp.connect(args.ctx.destination)
    
    carrier.start(args.t)
    //vib.start(args.t)
    carrier.stop(args.t + length)
}

window.seq = (args) => {
    let length = 0.84;
    args.clock.addFunction(args.beats, preset1, Object.assign({}, args, { pitch: 50, length: length }))
    args.clock.addFunction(args.beats + 1, preset1, Object.assign({}, args, { pitch: 53, length: length }))
    args.clock.addFunction(args.beats + 2, preset1, Object.assign({}, args, { pitch: 57, length: length }))
    args.clock.addFunction(args.beats + 3, preset1, Object.assign({}, args, { pitch: 62, length: length }))
    args.clock.addFunction(args.beats + 4, preset1, Object.assign({}, args, { pitch: 60, length: length }))
    args.clock.addFunction(args.beats + 5, preset1, Object.assign({}, args, { pitch: 59, length: length }))
    args.clock.addFunction(args.beats + 6, preset1, Object.assign({}, args, { pitch: 57, length: length }))
    args.clock.addFunction(args.beats + 7, preset1, Object.assign({}, args, { pitch: 52, length: length }))

    args.clock.addFunction(args.beats, preset1, Object.assign({}, args, { pitch: 77, length: 3 }))
    args.clock.addFunction(args.beats + 4, preset1, Object.assign({}, args, { pitch: 76, length: 3 }))
    args.clock.addFunction(args.beats + 8, seq, Object.assign({}, args));
}

window.scheduletest = () => {
    
}