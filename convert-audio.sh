#!/bin/bash

# Directory containing the audio files
input_dir="audio"
# Directory to store the transcripts
transcript_dir="transcripts"

# Create the transcript directory if it doesn't exist
mkdir -p "$transcript_dir"

# Convert all audio files to .ogg if they don't already exist
for file in "$input_dir"/*; do
  # Extract the filename without the extension
  filename=$(basename -- "$file")
  base="${filename%.*}"

  # Define the output file path with .ogg extension
  output_file="$input_dir/$base.ogg"

  # Check if the output file already exists
  if [ -f "$output_file" ]; then
    echo "$output_file already exists, skipping..."
  else
    # Convert the file to .ogg with Opus codec and high compression
    ffmpeg -i "$file" -c:a libopus -b:a 16k "$output_file"
  fi
done

# Process each .ogg file for transcription
for ogg_file in "$input_dir"/*.ogg; do
  # Extract the filename without the extension
  filename=$(basename -- "$ogg_file")
  base="${filename%.*}"

  # Define the output transcript file path
  transcript_file="$transcript_dir/$base.json"

  # Check if the transcript file already exists
  if [ -f "$transcript_file" ]; then
    echo "$transcript_file already exists, skipping..."
  else
    # Run faster-whisper-xxl on the .ogg file
    echo "Creating transcript for $ogg_file... as $transcript_file"
    faster-whisper-xxl --language en --output_format json --output_dir "$transcript_dir" "$ogg_file"
  fi
done

# Create analysis folder if it doesn't exist
mkdir -p "analysis"
