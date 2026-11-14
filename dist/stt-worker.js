import {pipeline,env} from './vendor/transformers/transformers.min.js';
import {URDU_TRANSCRIPTION} from './stt-audio.js';
env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
let recognizerPromise,activeModel;
async function recognizer(model,id){if(activeModel!==model.id){if(recognizerPromise){try{await (await recognizerPromise).dispose()}catch{}}activeModel=model.id;recognizerPromise=pipeline('automatic-speech-recognition',model.id,{revision:model.revision,dtype:'q8',device:'wasm',progress_callback:progress=>self.postMessage({id,type:'progress',progress})}).catch(e=>{recognizerPromise=null;activeModel=null;throw e})}return recognizerPromise;}
self.onmessage=async event=>{const {id,type,model,audio}=event.data;try{const transcriber=await recognizer(model,id);if(type==='load'){self.postMessage({id,type:'ready'});return}const result=await transcriber(audio,URDU_TRANSCRIPTION);self.postMessage({id,type:'transcript',text:result.text||'',model:model.id,language:'ur',task:'transcribe'})}catch(error){self.postMessage({id,type:'error',message:error.message})}};
