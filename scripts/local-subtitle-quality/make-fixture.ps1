Add-Type -AssemblyName System.Speech
$fixtureDirectory = Join-Path (Get-Location).Path 'artifacts/local-subtitle-quality'
New-Item -ItemType Directory -Path $fixtureDirectory -Force | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $speaker.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
  $speaker.Rate = 0
  $speaker.SetOutputToWaveFile((Join-Path $fixtureDirectory 'editing-terminology.wav'))
  $speaker.Speak('Is it possible to master editing A-roll to the point where B-roll becomes optional? I use After Effects and Premiere Pro for motion graphics. Our SaaS product does not replace the editor. We will see, and in the end, you are going to be the judge, right?')
} finally { $speaker.Dispose() }
