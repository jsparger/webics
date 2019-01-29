import Tone from 'tone';
import {Draggable, TweenLite} from 'gsap/all';
import * as d3 from "d3";

// A quick demo
//set the bpm and time signature first
Tone.Transport.timeSignature = [6, 4];
Tone.Transport.bpm.value = 30;

//a little reverb
var reverb = new Tone.Freeverb({
  "roomSize" : 0.2,
  "wet" : 0.9
}).toMaster();

// a pitch shift control
// var pitchShift = new Tone.PitchShift({
//   "wet" : 1.0,
// }).connect(reverb);

//the synth settings

let settings = {
    "frequency": "E1",
    "type": "triangle3",
  };

// create the synth.
var osc = new Tone.Oscillator(settings).connect(reverb);
// osc.start();

// create the sequence
// var seq = new Tone.Sequence(function(time, note){
// 			synth.triggerAttackRelease(note, "8n", time);
// 		}, ["E1"], "8n").start();

// start the "song"
// Tone.Transport.start("+0.1");

// ramp the tempo up to 180 over 10 seconds.
// Tone.Transport.bpm.linearRampTo(180, 10);

let grody_url = "http://localhost:5000/pv/";

let caget = async function(pv) {
  return fetch(grody_url + pv, {
      method: "GET",
      mode: 'cors',
      headers: new Headers({
        'content-type': 'application/json'
      }),
    }
  ).then((r)=>{return r.json()});
}

let caput = function(pv, value) {
  return fetch(grody_url + pv, {
      method: "POST",
      mode: 'cors',
      headers: new Headers({
        'content-type': 'application/json'
      }),
      body: JSON.stringify({"value": value}),
    }
  );
}

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
      // url : "/files/smooth-melody.wav",
      // url : "/files/kygo-style-chords.wav",
      // url : "/files/country-waltz.mp3",
      loop : true,
    }).connect(this.pedal);

    Tone.Buffer.on('load',this.enable.bind(this));
  }

  enable(value=true) {
    value ? this.player.start() : this.player.stop();
  }

  _set_tempo(value) {
    Tone.Transport.bpm.linearRampTo(value*82, 1);
    this.player.playbackRate = value;
  }

  _set_effect(value) {
    this.pedal.wet.linearRampTo(value, 1);
    // osc.frequency.linearRampTo(osc.frequency*(1+value));
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
    let json = null;
    try {
      json = await (await fetch(this.url)).json();
    }
    catch (err) {
      console.log ("OH NO");
      console.log(err);
    }
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



let loader_duration = "2s";
let loader = document.getElementById("loader");
let set_loader_speed = () => {
  loader.style.animationDuration = loader_duration;
};
// loader.addEventListener("webkitAnimationIteration", set_loader_speed,false);
loader.addEventListener("animationiteration", set_loader_speed, false);
// loader.addEventListener("oanimationiteration", set_loader_speed, false);

let speed_poller = new Poller(grody_url + "LabS-VIP:Chop-Drv-01:Spd", 1000, (json) => {
  let speed = json && json.value || 0;
  let fraction = speed/14.0;
	widget.tempo.input = fraction > 0.01 ? fraction + 0.3 : 0;
  document.getElementById("speed_rb").innerHTML = `${Number.parseFloat(Math.abs(speed)).toFixed(1)}`

  osc.frequency.linearRampTo(osc.toFrequency('E1')*(1+2*fraction), 1.0);

  let period = Math.abs(1.0/(speed));
  loader_duration = `${Number.parseFloat(period).toFixed(1)}s`;
});

// This works, but there is no phase control at the moment for chopper?
let phase_poller = new Poller(grody_url + "LabS-Utgard-VIP:Chop-Drv-0201:Chopper-Delay-SP", 1000, (json) => {
  if (!(json && json.value)) return;
  let ms = json.value/1000000.0;
  let phase = ms/71.4;
  let pitch = (phase-0.5)*12.0;
  document.getElementById("phase_rb").innerHTML = `${Number.parseFloat(phase*360).toFixed(0)}`

  // console.log(phase, ": ", pitch, ": ", json.value);
	widget.pedal.pitch = pitch
});




// use checkbox to enable chopper:
let chopper_enable_toggle = document.getElementById("chopper_enable");
chopper_enable_toggle.addEventListener("change", (event) => {
    let pv = event.target.checked ? "LabS-VIP:Chop-Drv-01:Start_Cmd" : "LabS-VIP:Chop-Drv-01:Stop_Cmd";

    fetch(grody_url + pv, {
        method: "POST",
        mode: 'cors',
        headers: new Headers({
          'content-type': 'application/json'
        }),
        body: JSON.stringify({"value": 1}),
      }
    );
  }
);

// Chopper speed knob
let speed_knob_busy = false;
let speed_block = false;
let speed_knob = document.getElementById("chopper_speed_knob");
let speed_knob_draggable = Draggable.create(speed_knob, {
  type:"rotation",
  bounds:{minRotation:0, maxRotation:360},
  onDrag: function() {
    speed_knob_busy = true;
  },
  onDragEnd: async function() {
    if (speed_block) { return; }
    speed_block = true;
    let fraction = this.rotation/360;
    let speed_sp = fraction*14;
    console.log(speed_sp);
    await caput("LabS-VIP:Chop-Drv-01:Spd_SP", speed_sp);
    document.getElementById("speed_sp").innerHTML = `${Number.parseFloat(Math.abs(speed_sp)).toFixed(1)}`
    speed_block = false;
    speed_knob_busy = false;
  }
})[0];

// Chopper phase knob
let phase_knob_busy = false;
let phase_block = false;
let phase_knob = document.getElementById("chopper_phase_knob");
let rotation_snap = 60;
let phase_knob_draggable = Draggable.create(phase_knob, {
  type:"rotation",
  bounds:{minRotation:0, maxRotation:360},
  onDrag: async function() {
    phase_knob_busy = true;
    if (phase_block) { return; }
    phase_block = true;
    let fraction = this.rotation/360;
    let phase_sp = fraction*72e6;
    console.log(this.x, fraction, phase_sp);
    await caput("LabS-Utgard-VIP:Chop-Drv-0201:Chopper-Delay-SP", phase_sp);
    phase_block = false;
  },
  onDragEnd: function() {
    phase_knob_busy = false;
  }

})[0];

// use checkbox to fix speed to max, disable speed control, and show color wheel.
let color_enable_toggle = document.getElementById("color_enable");
let color_wheel = document.getElementById("color_wheel");
let previous_speed_sp = 14;
color_enable_toggle.addEventListener("change", (event) => {
  console.log("yo");
  if (event.target.checked) {
    speed_knob_draggable.disable();
    previous_speed_sp = speed_knob_draggable.rotation/360*14;
    color_wheel.style.display = "block";
    TweenLite.to(speed_knob, .7, {"rotation": 360});
    caput("LabS-VIP:Chop-Drv-01:Spd_SP", 14.0);
  }
  else {
    speed_knob_draggable.enable();
    color_wheel.style.display = "none";
    TweenLite.to(speed_knob, .7, {"rotation": previous_speed_sp/14*360});
    caput("LabS-VIP:Chop-Drv-01:Spd_SP", previous_speed_sp);
  }
})

// sync the controls to the IOC value (for startup and if another interface is used)
let sync_controls = async () => {
  let enable = ((await caget("LabS-VIP:Chop-Drv-01:Spd")).value > 0.1);
  chopper_enable_toggle.checked = enable;
  document.getElementById("loader").style.animationPlayState = enable ? "" : "paused";
  let phase_sp = (await caget("LabS-Utgard-VIP:Chop-Drv-0201:Chopper-Delay-SP")).value/72e6*360;
  if (!phase_knob_busy) {
    TweenLite.to(phase_knob, .7, {"rotation": phase_sp});
  }
  let speed_sp = (await caget("LabS-VIP:Chop-Drv-01:Spd_SP")).value;
  if (!speed_knob_busy) {
    TweenLite.to(speed_knob, .7, {"rotation": speed_sp/14*360});
    document.getElementById("speed_sp").innerHTML = `${Number.parseFloat(Math.abs(speed_sp)).toFixed(1)}`
  }
  setTimeout(sync_controls, 1000);
};

sync_controls();


let pi = Math.PI,
    tau = 2 * pi,
    n = 500;

let width = 400,
    height = 400,
    outerRadius = width / 2,
    innerRadius = outerRadius - 80;

d3.select("#color_wheel")
  .attr("preserveAspectRatio", "xMinYMin meet")
  .attr("viewBox", `0 0 ${width} ${height}`)
.append("g")
    .attr("transform", "translate(" + width / 2 + "," + width / 2 + ")")
  .selectAll("path")
    .data(d3.range(0, tau, tau / n))
  .enter().append("path")
    .attr("d", d3.arc()
        .outerRadius(outerRadius)
        .innerRadius(innerRadius)
        .startAngle(function(d) { return d; })
        .endAngle(function(d) { return d + tau / n * 1.1; }))
    .style("fill", function(d) { return d3.hsl(d * 360 / tau, 1, 0.5); });

d3.select(self.frameElement).style("height", height + "px");

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
  caput,
  caget,
  phase_knob,
  phase_knob_draggable,
  Draggable,
  TweenLite,
  d3,
  osc,
  // phase_poller,
};
