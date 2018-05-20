class BypassProcessor extends AudioWorkletProcessor {
    process (inputs, outputs) {
      // Single input, single channel.
      let input = inputs[0];
      let output = outputs[0];
      output[0].set(input[0]);
  
      // To keep this processor alive.
      return true;
    }
};
  
registerProcessor('bypass-processor', BypassProcessor);