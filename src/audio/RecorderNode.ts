// to download once it's finished, you can use some code like this
//
//  if (recorder.GetBlobURL() != null) {
//     const link = document.createElement("a");
//     link.href = recorder.GetBlobURL();
//     link.download = "recording.webm";
//     link.innerHTML = "Click here to download the file";
//     document.body.appendChild(link);
//  }

class RecorderNode {
  private chunks: BlobPart[];
  private msd: MediaStreamAudioDestinationNode;
  private media_recorder: MediaRecorder;
  private blob_url: string;
  private started = false;
  private blob_ready = false;
  constructor(context: AudioContext, input_node: AudioNode) {
    this.chunks = new Array<BlobPart>();
    this.started = false;
    this.msd = context.createMediaStreamDestination();
    input_node.connect(this.msd);
    this.media_recorder = new MediaRecorder(this.msd.stream);
    this.blob_ready = false;
    this.blob_url = '';

    // setup callbacks
    this.media_recorder.ondataavailable = (evt: BlobEvent) => {
      this.chunks.push(evt.data);
    };
    this.media_recorder.onstop = () => {
      let blob;
      // true on Chrome and Opera
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        blob = new Blob(this.chunks, {type: 'audio/webm; codecs=opus'});
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        // true on Firefox
        blob = new Blob(this.chunks, {type: 'audio/ogg; codecs=opus'});
      } else {
        // can't save, no supported formats
        console.log('RecorderNode: No supported formats for saving!');
        return;
      }

      this.blob_url = URL.createObjectURL(blob);
      this.blob_ready = true;
    }
  }
  StartRecording() {
    this.media_recorder.start();
    this.started = true;
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

  GetNode() {
    return this.msd;
  }
}

export default RecorderNode;