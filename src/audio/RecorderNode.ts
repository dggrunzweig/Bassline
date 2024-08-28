// to download once it's finished, you can use some code like this
//
//  if (recorder.GetBlobURL() != null) {
//     const link = document.createElement("a");
//     link.href = recorder.GetBlobURL();
//     link.download = "recording.webm";
//     link.innerHTML = "Click here to download the file";
//     document.body.appendChild(link);
//  }

import {MediaRecorder, register} from 'extendable-media-recorder';
import {connect} from 'extendable-media-recorder-wav-encoder';
class RecorderNode {
  private chunks: BlobPart[];
  private msd: MediaStreamAudioDestinationNode;
  private media_recorder: MediaRecorder;
  private blob_url: string;
  private started = false;
  private blob_ready = false;
  private extension = '.webm';
  constructor(context: AudioContext, input_node: AudioNode) {
    this.chunks = new Array<BlobPart>();
    this.started = false;
    this.msd = context.createMediaStreamDestination();
    input_node.connect(this.msd);
    this.blob_ready = false;
    this.blob_url = '';
    // create generic media recorder
    // @ts-ignore
    this.media_recorder = new MediaRecorder(this.msd.stream);
    // register and create extendable media recorder with wave format
    connect().then(
        (msg_port) => {register(msg_port).then(() => {
          // @ts-ignore
          this.media_recorder =
              new MediaRecorder(this.msd.stream, {mimeType: 'audio/wav'});
          // setup callbacks
          this.media_recorder.ondataavailable = (evt: BlobEvent) => {
            this.chunks.push(evt.data);
          };
          this.media_recorder.onstop = () => {
            let blob;
            if (MediaRecorder.isTypeSupported('audio/wav')) {
              // with extendable wave recorder
              blob = new Blob(this.chunks, {type: 'audio/wav'});
              this.extension = '.wav';
            } else if (MediaRecorder.isTypeSupported(
                           'audio/webm;codecs=opus')) {
              // true on Chrome and Opera
              blob = new Blob(this.chunks, {type: 'audio/webm; codecs=opus'});
              this.extension = '.webm';
            } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
              // true on Firefox
              blob = new Blob(this.chunks, {type: 'audio/ogg; codecs=opus'});
              this.extension = '.webm';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              // true for safari
              blob = new Blob(this.chunks, {type: 'audio/mp4; codecs=aac'});
              this.extension = '.mp4';
            } else {
              // can't save, no supported formats
              console.log('RecorderNode: No supported formats for saving!');
              return;
            }
            this.blob_url = URL.createObjectURL(blob);
            this.blob_ready = true;
          }
        })});
  }

  StartRecording() {
    this.media_recorder.start();
    this.started = true;
    this.blob_ready = false;
    this.blob_url = '';
    this.chunks = new Array<BlobPart>();
  }

  Pause() {
    if (!this.started) {
      console.log('Must start recorder before calling pause');
      return;
    }
    this.media_recorder.pause();
  }

  Resume() {
    if (!this.started) {
      console.log('Must start recorder before calling resume');
      return;
    }
    this.media_recorder.resume();
  }

  StopRecording() {
    this.media_recorder.stop();
    this.started = false;
  }

  GetBlobURL() {
    if (this.blob_ready)
      return this.blob_url;
    else
      return null;
  }

  GetExtension() {
    return this.extension;
  }

  GetNode() {
    return this.msd;
  }
}

export default RecorderNode;