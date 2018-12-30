import Tone from 'tone';

// remembering how exports work...
var man = 10;

// something is not quite right with the import of tone. probably some option
// in the commonjs rollup plugin. In any case, play an 8th note with pitch C4.
// var synth = new Tone.__moduleExports.Synth().toMaster();
var synth = new Tone.Synth().toMaster();
synth.triggerAttackRelease("C4", "8n");

export {
  man,
  Tone,
};
