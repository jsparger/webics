import Tone from 'tone';

// remembering how exports work...
var man = 10;

// A quick demo
//set the bpm and time signature first
Tone.Transport.timeSignature = [6, 4];
Tone.Transport.bpm.value = 30;

//a little reverb
var reverb = new Tone.Freeverb({
  "roomSize" : 0.2,
  "wet" : 0.3
}).toMaster();

// a pitch shift control
var pitchShift = new Tone.PitchShift().connect(reverb);

//the synth settings
var synthSettings = {
  "oscillator": {
    "detune": 0,
    "type": "custom",
    "partials" : [2, 1, 2, 2],
    "phase": 0,
    "volume": 0
  },
  "envelope": {
    "attack": 0.005,
    "decay": 0.3,
    "sustain": 0.2,
    "release": 1,
  },
  "portamento": 0.01,
  "volume": -20
};

// create the synth.
var synth = new Tone.Synth(synthSettings).connect(pitchShift);

// create the sequence
var seq = new Tone.Sequence(function(time, note){
			synth.triggerAttackRelease(note, "8n", time);
		}, ["E4", "F#4", "B4", "C#5", "D5", "F#4", "E4", "C#5", "B4", "F#4", "D5", "C#5"], "8n").start();

// start the "song"
Tone.Transport.start("+0.1");

// ramp the tempo up to 180 over 10 seconds.
Tone.Transport.bpm.linearRampTo(180, 10);

export {
  man,
  seq,
  pitchShift,
  Tone,
};
