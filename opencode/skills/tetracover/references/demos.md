# Demo production

## Tool check

```bash
command -v vhs
command -v ffmpeg
command -v gifsicle
command -v magick
command -v identify
```

VHS requires `ttyd` and `ffmpeg`. Its current command reference is available
with `vhs manual` or at <https://github.com/charmbracelet/vhs>.

## VHS tape starting point

```vhs
Output docs/demo.gif

Require my-command

Set Shell "bash"
Set Width 1440
Set Height 840
Set FontSize 15
Set Framerate 24
Set TypingSpeed 45ms
Set Theme "Catppuccin Mocha"
Set CursorBlink false

Env APP_CONFIG "/tmp/project-demo-config.json"
Env APP_HISTORY "/tmp/project-demo-history.db"

Hide
Type "my-command"
Enter
Wait+Screen /ready/
Show

Sleep 1s
Type "representative input"
Enter
Wait+Screen /expected output/
Sleep 3s
```

Notes:

- `Output` may also target `.mp4`, `.webm`, `.ascii`, or a directory of PNG
  frames.
- `Screenshot path.png` captures the current frame from inside the tape.
- `Hide` and `Show` exclude setup from the output.
- `Env` isolates application state without modifying the user's normal config.
- `Wait+Screen /regex/` is preferable to guessing completion time. Its default
  timeout is 15 seconds; use a bounded `Sleep` when the state has no stable text.
- `Set LoopOffset 50%` can make a more useful frame appear first, but do not hide
  necessary context.
- Modifier combinations may not accept repeat counts in every VHS version.
  Validate the tape before a long run.

Validate and render:

```bash
vhs validate docs/demo.tape
vhs docs/demo.tape
```

## Slow startup

Warm the service before recording when startup is not itself the feature. For a
remote model or scaled-to-zero service:

1. Send a tiny health or completion request outside VHS.
2. Confirm the service is warm.
3. Start the recording immediately afterward.
4. Keep a realistic short loading state in the application if one normally
   appears, but omit minutes of weight loading.

If a one-time setup command must run inside the VHS shell, place it between
`Hide` and `Show`.

## Inspecting a GIF

Check dimensions, frames, duration, and size:

```bash
identify docs/demo.gif
ffprobe -v error -show_entries format=duration,size \
  -of default=noprint_wrappers=1 docs/demo.gif
du -h docs/demo.gif
```

Sample one frame every five seconds:

```bash
mkdir -p /tmp/tetracover-frames
ffmpeg -y -i docs/demo.gif -vf "fps=1/5" \
  /tmp/tetracover-frames/frame-%02d.png
```

Read or open all sampled frames. Check focus, clipping, scroll position, input
text, intermediate control state, and the final output. A correct final frame
does not prove the animation is clean.

## Optimization

VHS already writes delta-compressed GIFs. Try lossless optimization first:

```bash
gifsicle -O3 docs/demo.gif -o docs/demo.optimized.gif
```

Compare both files visually before replacing the original. If the GIF remains
too large, shorten idle pauses, reduce dimensions or frame rate, and record
again. Lossy GIF optimization is a last resort because terminal text develops
visible noise quickly.

Practical goals:

- readable at GitHub's content width
- preferably below 5 MB, comfortably below GitHub's file display limits
- roughly 10-30 seconds for one workflow
- 20-30 fps for terminal motion
- a final state held for 2-4 seconds

Use PNG for static terminal or UI captures. Use WebP only when the target renderer
is known to support the desired animation behavior. GitHub README video playback
is inconsistent; a linked MP4 does not replace an inline GIF.

## Browser and desktop capture

- Set an explicit viewport.
- Wait for fonts, data, animations, and lazy images to settle.
- Hide cursor, devtools, password managers, and notifications unless relevant.
- Capture a real success state, not an empty landing page.
- Test both light and dark assets if using `<picture>` sources.
- Use full-page screenshots only when the whole page is meant to be read; a
  focused crop is usually stronger in a README.
