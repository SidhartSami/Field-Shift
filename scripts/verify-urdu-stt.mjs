// Integration verification; downloads a public model. Not part of offline unit tests.
import fs from 'node:fs';import {pipeline} from '@huggingface/transformers';import {synthesizeLocal} from '../dist/speech-worker.js';import {toMono16k,URDU_TRANSCRIPTION} from '../dist/stt-audio.js';
const model=JSON.parse(fs.readFileSync(new URL('../dist/stt-models.json',import.meta.url))).base;
const reference='پانی کی ضرورت کتنی ہے؟';
const speech=await synthesizeLocal({text:reference,language:'ur',rate:145});const view=new DataView(speech.buffer),pcm=new Float32Array(speech.samples);for(let j=0;j<pcm.length;j++)pcm[j]=view.getInt16(44+j*2,true)/32768;const audio=toMono16k([pcm],speech.sampleRate);
const transcriber=await pipeline('automatic-speech-recognition',model.id,{revision:model.revision,dtype:'q8',device:'cpu',cache_dir:'/tmp/fieldshift-whisper-cache',progress_callback:p=>{if(['initiate','ready'].includes(p.status))console.log(JSON.stringify({status:p.status,file:p.file}))}});
const output=await transcriber(audio,URDU_TRANSCRIPTION);console.log(JSON.stringify({model:model.id,revision:model.revision,language:'urdu',task:'transcribe',reference,transcript:output.text,testInput:'synthetic Urdu speech; not a human-speaker accuracy benchmark'},null,2));await transcriber.dispose();if(!/[\u0600-\u06ff]/.test(output.text))throw Error('Expected a nonempty Urdu-script transcript.');
