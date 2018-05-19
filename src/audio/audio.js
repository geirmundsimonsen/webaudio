window.ctx = new AudioContext()
console.log('audiocontext is active.')

class Clock {
    constructor(ctx, lookaheadInSec) {
        this.bpm = 120;
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
                f(this.calculateCtxTimeFromBeat(nextBeat), nextBeat, this, args);
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
        this.scheduledFuncs.set([beats, Math.random()], [func, args]);
    }

    getNextBeat() {
        return Math.ceil(this.prevBeat);
    }
}

window.makeClock = () => {
    return new Clock(ctx, 0.1);
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