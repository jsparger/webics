import Tone from 'tone';

// A quick demo
//set the bpm and time signature first
Tone.Transport.timeSignature = [6, 4];
Tone.Transport.bpm.value = 30;

// //a little reverb
// var reverb = new Tone.Freeverb({
//   "roomSize" : 0.2,
//   "wet" : 0.9
// }).toMaster();
//
// // a pitch shift control
// var pitchShift = new Tone.PitchShift({
//   "wet" : 1.0,
// }).connect(reverb);
//
// //the synth settings
// var synthSettings = {
//   "oscillator": {
//     // "detune": 0,
//     "type": "sine",
//     // "partials" : [2, 1, 2, 2],
//     // "phase": 0,
//     // "volume": 0
//   },
//   // "envelope": {
//   //   "attack": 0.005,
//   //   "decay": 0.3,
//   //   "sustain": 0.2,
//   //   "release": 1,
//   // },
//   "portamento": 0.05,
//   // "volume": -20
// };
//
// // create the synth.
// var synth = new Tone.Synth(synthSettings).connect(pitchShift);
//
// // create the sequence
// var seq = new Tone.Sequence(function(time, note){
// 			synth.triggerAttackRelease(note, "8n", time);
// 		}, ["E1", "F2", "F#3", "G4", "D#3", "F4", "G#4", "A#4", "A3", "F#3", "D3", "A#2"], "8n").start();
//
// // start the "song"
// Tone.Transport.start("+0.1");
//
// // ramp the tempo up to 180 over 10 seconds.
// Tone.Transport.bpm.linearRampTo(180, 10);

function convert(value, zero, slope) {
  return (value - zero)/(slope);
}

function clamp(value, min=0, max=1) {
  return Math.min(Math.max(value,min),max);
}

// convert from one unit to another
class UnitConversion {
  constructor(zero=0, slope=1) {
    this._zero = zero;
    this._slope = slope;
  }
  apply(value) {
    return convert(value, this._zero, this._slope);
  }
};

// A class which automatically applies a unit conversion and calls a callback
class Adapter {
  constructor(conversion, callback) {
    this._conversion = conversion;
    this._callback = callback;
    this._input = null;
    this._output = null;
  }
  get output() { return this._output; }
  get input() { return this._input; }
  set input(value) {
    this._input = value;
    this._output = this._conversion.apply(this._input);
    this._callback(this._input);
  }
};

class SoundWidget {
  constructor(options) {
    this.tempo = new Adapter(options['tempo']['conversion'], this._set_tempo.bind(this));
    this.effect = new Adapter(options['pitch']['conversion'], this._set_effect.bind(this));
    this.pedal = new Tone.PitchShift({spread: 60}).toMaster();
    // this.compressor = new Tone.Compressor().toMaster():
    // this.effect = new Tone.Filter({rolloff: -48, type: "bandpass"}).connect(this.compressor);
    // this.synth = new Tone.Synth().toMaster();
    // this.seq = new Tone.Sequence((time, note) => {
    // 			this.synth.triggerAttackRelease(note, "8n", time);
    // 		}, ["C3",], "8n").start();
    this.player = new Tone.Player({
      url : "/files/boom_bap_drum.wav",
      loop : true,
    }).connect(this.pedal);

    Tone.Buffer.on('load',this.enable.bind(this));
  }

  enable(value=true) {
    value ? this.player.start() : this.player.stop();
  }

  _set_tempo(value) {
    // Tone.Transport.bpm.linearRampTo(value, 1);
    this.player.playbackRate = value;
  }

  _set_effect(value) {
    this.pedal.wet.linearRampTo(value, 1);
  }
};

class Poller {
  constructor(url, interval, callback, enabled=true) {
    this.url = url;
    this.interval = interval;
    this.callback = callback;
    this.enable(enabled);
  }

  async poll() {
    if (!this.enabled) return;
    let json = await (await fetch(this.url)).json();
    this.callback(json);
    setTimeout(this.poll.bind(this), this.interval);
  }

  enable(value=true) {
    this.enabled = value;
    this.poll();
  }
};


let widget = new SoundWidget({
    tempo: {
        conversion: new UnitConversion(),
    },
    pitch: {
        conversion: new UnitConversion(),
    }
});

Tone.Transport.start();

let speed_poller = new Poller("http://localhost:5000/pv/LabS-VIP:Chop-Drv-01:Spd", 1000, (json) => {
	console.log(json.value);
  let fraction = json.value/7.0;
	widget.tempo.input = fraction > 0.01 ? fraction + 0.3 : 0;
});

// This works, but there is no phase control at the moment for chopper?
// let phase_poller = new Poller("http://localhost:5000/pv/LabS-VIP:Chop-Drv-01:Pos", 1000, (json) => {
// 	console.log(json.value);
//   let fraction = json.value/360;
// 	widget.pedal.pitch = fraction*12.0;
// });

export {
  // synth,
  // reverb,
  // man,
  // seq,
  // pitchShift,
  Tone,
  SoundWidget,
  UnitConversion,
  widget,
  Poller,
  speed_poller,
  // phase_poller,
};
