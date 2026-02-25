/**
 * AudioWorklet Processor - Custom Reverb
 * Phase 2: Advanced Audio Systems
 */

class ReverbProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 44100 * 2; // 2 seconds at 44.1kHz
    this.leftBuffer = new Float32Array(this.bufferSize);
    this.rightBuffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.dryWet = 0.5;
    this.decay = 0.7;
  }

  static get parameterDescriptors() {
    return [
      {
        name: 'dryWet',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1
      },
      {
        name: 'decay',
        defaultValue: 0.7,
        minValue: 0,
        maxValue: 0.99
      }
    ];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const dryWet = parameters.dryWet.length > 1 ? parameters.dryWet : parameters.dryWet[0];
    const decay = parameters.decay.length > 1 ? parameters.decay : parameters.decay[0];

    if (input.length === 0) return true;

    const inputL = input[0] || new Float32Array(128);
    const inputR = input[1] || inputL;
    const outputL = output[0];
    const outputR = output[1];

    for (let i = 0; i < 128; i++) {
      // Write input to buffer
      this.leftBuffer[this.writeIndex] = inputL[i];
      this.rightBuffer[this.writeIndex] = inputR[i];

      // Read from buffer (delayed)
      const readIndex = (this.writeIndex - Math.floor(44100 * 0.05) + this.bufferSize) % this.bufferSize;
      
      // Apply reverb
      const wetL = this.leftBuffer[readIndex] * decay;
      const wetR = this.rightBuffer[readIndex] * decay;

      // Mix dry and wet
      outputL[i] = inputL[i] * (1 - dryWet) + wetL * dryWet;
      outputR[i] = inputR[i] * (1 - dryWet) + wetR * dryWet;

      // Update write index
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }

    return true;
  }
}

registerProcessor('reverb-processor', ReverbProcessor);
