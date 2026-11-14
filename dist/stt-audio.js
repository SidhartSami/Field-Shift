export const SAMPLE_RATE=16000,MAX_AUDIO_SECONDS=45;
export function toMono16k(channels,sampleRate){
 if(!Array.isArray(channels)||!channels.length||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid audio format.');
 const length=channels[0].length;if(!length||channels.some(c=>c.length!==length))throw Error('Audio is empty or channels do not align.');
 if(length/sampleRate>MAX_AUDIO_SECONDS)throw Error('Use an audio clip of 45 seconds or less.');
 const mono=new Float32Array(length);for(const c of channels)for(let j=0;j<length;j++)mono[j]+=c[j]/channels.length;
 const out=new Float32Array(Math.max(1,Math.round(length/sampleRate*SAMPLE_RATE)));for(let j=0;j<out.length;j++){const at=j*sampleRate/SAMPLE_RATE,lo=Math.min(length-1,Math.floor(at)),hi=Math.min(length-1,lo+1);out[j]=Math.max(-1,Math.min(1,mono[lo]+(mono[hi]-mono[lo])*(at-lo)))}return out;
}
export function hasSpeechEnergy(samples){let sum=0;for(const x of samples)sum+=x*x;return samples.length>0&&Math.sqrt(sum/samples.length)>.001}
export const URDU_TRANSCRIPTION={language:'urdu',task:'transcribe',return_timestamps:false,chunk_length_s:25,stride_length_s:3};
