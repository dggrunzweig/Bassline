#pragma once
#include <assert.h>

#include <iostream>

#include "audio_utils.hpp"

typedef struct WAVHeader {
  /* RIFF Chunk Descriptor */
  uint8_t RIFF[4] = {'R', 'I', 'F', 'F'};  // RIFF Header Magic header
  uint32_t file_size;                      // RIFF Chunk Size
  uint8_t WAVE[4] = {'W', 'A', 'V', 'E'};  // WAVE Header
  /* "fmt" sub-chunk */
  uint8_t fmt[4] = {'f', 'm', 't', ' '};  // FMT header
  uint32_t format_len = 16;               // Size of the fmt chunk
  uint16_t audio_format = 1;  // Audio format 1=PCM,6=mulaw,7=alaw,     257=IBM
                              // Mu-Law, 258=IBM A-Law, 259=ADPCM
  uint16_t channels;          // Number of channels 1=Mono 2=Sterio
  uint32_t sample_rate;       // Sampling Frequency in Hz
  uint32_t bytes_per_second;  // bytes per second
  uint16_t bytes_per_frame;   // 2=16-bit mono, 4=16-bit stereo
  uint16_t bits_per_sample;   // Number of bits per sample
  /* "data" sub-chunk */
  uint8_t data_id[4] = {'d', 'a', 't', 'a'};  // "data"  string
  uint32_t data_size;                         // Sampled data length
} WAVHeader;

class WAVWriter {
 public:
  WAVWriter() { wav_stream = new uint8_t[0]; }
  ~WAVWriter() { delete[] wav_stream; }
  uint8_t* Write(float* data, unsigned int num_channels,
                 unsigned int num_frames, unsigned int sample_rate) {
    WAVHeader header;
    // 16 bit int output
    const int bit_depth = 16;
    const int bytes_per_sample = bit_depth / 8;
    header.bits_per_sample = bit_depth;
    header.channels = num_channels;
    header.bytes_per_frame = (bit_depth * num_channels) / 8;
    header.sample_rate = sample_rate;
    header.bytes_per_second = (sample_rate * bit_depth * num_channels) / 8;
    const uint32_t data_size = num_channels * num_frames * (bit_depth / 8);
    header.file_size = data_size + sizeof(header) - 8;
    header.data_size = data_size;

    const unsigned long header_size = sizeof(header);
    assert(header_size == 44);

    // convert header to bytes
    const char* header_bytes = reinterpret_cast<char*>(&header);
    const int stream_size = data_size + header_size;
    delete[] wav_stream;
    wav_stream = new uint8_t[stream_size];
    // copy header to stream
    memcpy(wav_stream, header_bytes, header_size);
    uint8_t* write_ptr = &wav_stream[header_size];
    const uint16_t bit_int_conv = 1 << (bit_depth - 1);
    for (int i = 0; i < num_channels * num_frames; ++i) {
      float fval = audio_utils::clamp(data[i], -1, 1);
      int16_t value_int = static_cast<int16_t>(floorf(fval * bit_int_conv));
      for (int b = 0; b < bytes_per_sample; ++b) {
        *write_ptr = value_int & 0xFF;
        value_int = value_int >> 8;
        write_ptr++;
      }
    }

    return wav_stream;
  }

 private:
  uint8_t* wav_stream;
};