export function BrowserSupportsMIDI(): boolean {
  return (navigator.requestMIDIAccess != undefined);
}

export function MidiInit(): Promise<MIDIAccess> {
  return navigator.requestMIDIAccess();
}

export function ListMidiInputs(midi_access: MIDIAccess): string[] {
  const names = new Array<string>();
  midi_access.inputs.forEach((input) => {
    names.push(input.name ?? '');
  })
  return names;
}

export function ListMidiOutputs(midi_access: MIDIAccess): string[] {
  const names = new Array<string>();
  midi_access.outputs.forEach((output) => {
    names.push(output.name ?? '');
  })
  return names;
}

export function SetDeviceInputEventListener(
    midi_access: MIDIAccess, device_name: string, funct: Function): boolean {
  let device_found = false;
  midi_access.inputs.forEach((input: MIDIInput) => {
    if (input.name == device_name) {
      input.onmidimessage = (midi_msg: MIDIMessageEvent) => {
        funct(midi_msg.data)
      };
      device_found = true;
    }
  });
  if (!device_found) {
    console.log('Could not find midi input with name', device_name);
    console.log('Here is a list of available midi inputs: ');
    ListMidiInputs(midi_access);
  }
  return device_found;
}

export function RemoveAllDeviceListeners(midi_access: MIDIAccess) {
  midi_access.inputs.forEach((input: MIDIInput) => {
    input.onmidimessage = () => {};
  });
}


export function GetTypeAndChannelFromData(data: number[]) {
  const lower_half = data[0] & 0b00001111;
  const upper_half = (data[0] & 0b11110000) >> 4;
  let type = '';
  switch (upper_half) {
    case 8:
      type = 'Note Off'
      break;
    case 9:
      type = 'Note On'
      break;
    case 10:
      type = 'Aftertouch'
      break;
    case 11:
      type = 'CC'
      break;
    case 14:
      type = 'Pitchbend'
      break;
    case 16:
      type = 'Sysex';
      break;
    default:
      break;
  }
  return {type: type, ch: lower_half};
}