# Voice transcripts

To set up, run:

```bash
export LLMFOUNDRY_TOKEN=your_token  # From https://llmfoundry.straive.com/code
bash convert-audio.sh   # Convert audio/* to audio/*.ogg and transcripts/*.json via Whisper
node convert-transcripts.js  # Analyze transcripts and create results.json
```
